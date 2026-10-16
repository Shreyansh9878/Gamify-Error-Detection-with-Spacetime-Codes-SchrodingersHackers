import hashlib
import json
import time
from importlib.metadata import version
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Pauli, partial_trace, purity, state_fidelity
from qiskit_aer.noise import thermal_relaxation_error
from .models import LabRunRequest, ordered
from ..learning.visualization import state_visualization

VERSION = 'noise-lab-1.0.0'


def apply(state, op, n):
    if op.name == 'decoherence':
        for q in op.qubits:
            state=state.evolve(thermal_relaxation_error(op.t1Us, op.t2Us, op.timeUs, excited_state_population=0).to_quantumchannel(),qargs=[q])
        return state
    if op.name == 'm':
        q=op.qubits[0];bits=np.array([(i>>q)&1 for i in range(2**n)])
        rho=state.data.copy();rho[bits[:,None]!=bits[None,:]]=0
        return DensityMatrix(rho)
    circuit = QuantumCircuit(n)
    method = {'bit_flip': 'x', 'phase_flip': 'z'}.get(op.name, op.name)
    args = ([op.angleRadians] if op.name in ('rx','ry','rz') else []) + op.qubits
    getattr(circuit, method)(*args)
    return state.evolve(circuit)


def compare(request):
    n = request.circuit.qubits
    affected = DensityMatrix.from_label('0'*n)
    reference = affected.copy()
    for op in ordered(request.circuit):
        if request.comparisonMode == 'selected_error' and op.id == request.selectedErrorId:
            return affected.copy(), apply(affected, op, n)
        affected = apply(affected, op, n)
        if op.role == 'prepare': reference = apply(reference, op, n)
    return reference, affected


def describe(state, n, basis, shots, seed):
    locals_ = []
    for q in range(n):
        local = partial_trace(state, [other for other in range(n) if other != q]) if n > 1 else state
        locals_.append({'qubit': q, 'bloch': [float(np.real(local.expectation_value(Pauli(p)))) for p in ('X','Y','Z')], 'purity': float(np.real(purity(local)))})
    measured = state.copy()
    if basis == 'X':
        rotate = QuantumCircuit(n)
        rotate.h(range(n))
        measured = measured.evolve(rotate)
    measured.seed(seed)
    raw = measured.sample_counts(shots)
    probabilities = {format(i, f'0{n}b'): float(p) for i,p in enumerate(measured.probabilities())}
    counts = {key: int(raw.get(key,0)) for key in probabilities}
    marginals = []
    for q in range(n):
        marginals.append({'qubit':q,
            'probabilities':[sum(v for key,v in probabilities.items() if key[-1-q] == str(b)) for b in (0,1)],
            'counts':[sum(v for key,v in counts.items() if key[-1-q] == str(b)) for b in (0,1)]})
    return {'qubits':locals_, 'globalPurity':float(np.real(purity(state))), 'probabilities':probabilities, 'counts':counts, 'marginals':marginals,'visualization':state_visualization(state,n)}


def explain(before, after, fidelity, request):
    messages = []
    active = [op for op in request.circuit.operations if op.role == 'error' and
              (request.comparisonMode == 'final' or op.id == request.selectedErrorId)]
    for a,b in zip(before['qubits'], after['qubits']):
        x,y,z = a['bloch']; xx,yy,zz = b['bloch']; q = a['qubit']
        if z > .999 and zz < -.999: messages.append(f'q{q}: zero became one. The Z-measurement outcome flips.')
        elif z < -.999 and zz > .999: messages.append(f'q{q}: one became zero.')
        if abs(x) > .999 and abs(xx+x) < 1e-6:
            messages.append(f'q{q}: the X direction reversed (plus ↔ minus). Immediate Z probabilities match; X measurement reveals the phase difference.')
        if any(op.name == 'decoherence' and q in op.qubits for op in active) and (np.hypot(x,y) > np.hypot(xx,yy)+1e-5 or zz > z+1e-5 and abs(zz) < .999):
            messages.append(f'q{q}: phase coherence and/or excited population decreased during this experiment. Waiting changes probabilities over time, not at a scheduled flip instant.')
    if fidelity > 1-1e-8:
        if any(op.name == 'bit_flip' and before['qubits'][op.qubits[0]]['bloch'][0] > .999 for op in active):
            messages.append('X left plus unchanged: plus is an X eigenstate. The input state matters.')
        else: messages.append('The compared states match. This error did not change this state in this comparison; with no error blocks both final branches are identical.')
    if request.comparisonMode == 'final' and fidelity < 1-1e-5 and any(op.name == 'phase_flip' for op in request.circuit.operations):
        errors = [op for op in request.circuit.operations if op.name == 'phase_flip']
        if any(op.name == 'h' and op.column > err.column and op.qubits == err.qubits and abs(before['qubits'][err.qubits[0]]['bloch'][2]-after['qubits'][err.qubits[0]]['bloch'][2]) > 1e-5 for op in request.circuit.operations for err in errors):
            messages.append('A later H converted the phase difference into a difference in the final Z outcome.')
    if any(q['purity'] < .999 for q in before['qubits']) and before['globalPurity'] > .999:
        messages.append('A local mixed state can reflect entanglement: the full preparation is pure even though an individual arrow is short.')
    return messages or ['Compare the Bloch components and exact probabilities. Counts are finite simulator samples, not exact probabilities.']


def run_lab(request: LabRunRequest):
    started = time.perf_counter()
    first, second = compare(request)
    before = describe(first, request.circuit.qubits, request.basis, request.shots, request.sampleSeed)
    after = describe(second, request.circuit.qubits, request.basis, request.shots, request.sampleSeed)
    fidelity = min(1.0, max(0.0, float(state_fidelity(first,second))))
    selected = request.comparisonMode == 'selected_error'
    return {'fingerprint':hashlib.sha256(json.dumps(request.model_dump(),sort_keys=True).encode()).hexdigest(),
        'engineVersion':VERSION, 'qiskitVersion':version('qiskit'), 'contentVersion':'noise-basics-v1',
        'comparisonMode':request.comparisonMode, 'selectedErrorId':request.selectedErrorId if selected else None,
        'labels':['Immediately before selected error','Immediately after selected error'] if selected else ['Final circuit without errors','Final circuit with errors'],
        'states':[before,after], 'fidelity':fidelity, 'shots':request.shots, 'basis':request.basis, 'sampleSeed':request.sampleSeed,
        'parameters':[op.model_dump(exclude_none=True) for op in ordered(request.circuit) if op.role == 'error'],
        'units':'microseconds', 'explanations':explain(before,after,fidelity,request), 'durationMs':round((time.perf_counter()-started)*1000,2)}
