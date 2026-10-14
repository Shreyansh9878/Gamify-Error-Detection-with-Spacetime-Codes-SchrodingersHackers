"""Exact small-circuit evaluation with coherent Pauli sandwich checks.

The paper's general spacetime construction is explored through Paulice in research.py.
These playable checks are the fully closed coherent-Pauli special case, not an
implementation of the paper's complete optimization algorithm.
"""
import hashlib
import json
import math
import time
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector, DensityMatrix, Operator, Pauli, SparsePauliOp, partial_trace, state_fidelity
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, pauli_error, depolarizing_error, phase_damping_error, amplitude_damping_error, ReadoutError
from .levels import get_level
from .models import RunRequest, Gate

VERSION = 'shield-stage1-1.0.0'
SEED = 2026
BASIS = ['id','h','x','y','z','s','sdg','sx','sxdg','rz','t','tdg','cx','cy','cz']

def apply_gate(qc, gate):
    if gate.name == 'rz':
        qc.rz(gate.quarterTurns * math.pi / 2, gate.qubits[0])
    else:
        getattr(qc, gate.name)(*gate.qubits)

def columns(level, gates):
    result = []
    for column in range(level['slots']):
        qc = QuantumCircuit(level['qubits'])
        occupied = set()
        for gate in sorted((g for g in gates if g.column == column), key=lambda g:g.qubits):
            apply_gate(qc, gate)
            occupied.update(gate.qubits)
        for q in range(level['qubits']):
            if q not in occupied:
                qc.id(q)
        result.append(qc)
    return result

def payload(level, gates):
    qc = QuantumCircuit(level['qubits'])
    for column in columns(level, gates):
        qc.compose(column, inplace=True)
    return qc

def validate(request, level):
    if len(request.gates) > level['gateBudget']:
        raise ValueError('The payload gate budget is exceeded.')
    if len(request.checks) > level['checkBudget']:
        raise ValueError('The ancilla budget is exceeded.')
    ids, cells = set(), set()
    for g in request.gates:
        if g.id in ids:
            raise ValueError('Gate IDs must be unique.')
        ids.add(g.id)
        if g.name not in level['allowed']:
            raise ValueError(f'{g.name.upper()} is not allowed in this mission.')
        arity = 2 if g.name in ('cx','cz') else 1
        if len(g.qubits) != arity or len(set(g.qubits)) != arity:
            raise ValueError('Choose distinct control and target wires for two-qubit gates.')
        if g.column >= level['slots'] or any(q < 0 or q >= level['qubits'] for q in g.qubits):
            raise ValueError('A gate is outside the circuit grid.')
        for q in g.qubits:
            if (q,g.column) in cells:
                raise ValueError('Two gates cannot occupy the same wire and time slot.')
            cells.add((q,g.column))
    if level['fixed']:
        canonical = lambda gates: sorted((g.name,tuple(g.qubits),g.column,g.quarterTurns) for g in gates)
        if canonical(request.gates) != canonical([Gate(**g) for g in level['target']]):
            raise ValueError('This research payload is fixed; edit its checks instead.')
    for check in request.checks:
        if check.qubit >= level['qubits'] or check.end > level['slots']:
            raise ValueError('A check is outside the payload boundaries.')

def as_pauli(matrix):
    decomposition = SparsePauliOp.from_operator(Operator(matrix), atol=1e-8).simplify(atol=1e-8)
    if len(decomposition) != 1 or abs(abs(decomposition.coeffs[0].real)-1) > 1e-7 or abs(decomposition.coeffs[0].imag)>1e-7:
        raise ValueError('Invalid check: a T crossing transforms X/Y into a non-Pauli operator. Choose I/Z on that wire or a shorter interval.')
    return decomposition.paulis[0].to_label(), 1 if decomposition.coeffs[0].real > 0 else -1

def check_paths(level, gates, checks):
    layers = columns(level,gates)
    paths = []
    for check in checks:
        label = ['I'] * level['qubits']
        label[level['qubits']-1-check.qubit] = check.pauli
        opening = ''.join(label)
        current = Pauli(opening).to_matrix()
        trace = {}
        for column in range(check.start,check.end):
            # Validate after each operation, including every non-Clifford crossing.
            for instruction in layers[column].data:
                unit = QuantumCircuit(level['qubits'])
                unit.append(instruction.operation, [layers[column].find_bit(q).index for q in instruction.qubits])
                u = Operator(unit).data
                current = u @ current @ u.conj().T
                as_pauli(current)
            trace[column] = as_pauli(current)[0]
        closing, sign = as_pauli(current)
        paths.append(dict(opening=opening, closing=closing, sign=sign, start=check.start,end=check.end,trace=trace))
    return paths

def controlled_pauli(qc, ancilla, label, sign=1):
    if sign < 0:
        qc.z(ancilla)
    for q,p in enumerate(reversed(label)):
        if p != 'I':
            getattr(qc, {'X':'cx','Y':'cy','Z':'cz'}[p])(ancilla,q)

def checked_circuit(level, gates, paths):
    n = level['qubits']
    qc = QuantumCircuit(n+len(paths))
    layers = columns(level,gates)
    for boundary in range(level['slots']+1):
        for i,p in enumerate(paths):
            if p['end'] == boundary:
                controlled_pauli(qc,n+i,p['closing'],p['sign'])
                qc.h(n+i)
        for i,p in enumerate(paths):
            if p['start'] == boundary:
                qc.h(n+i)
                controlled_pauli(qc,n+i,p['opening'])
        if boundary < len(layers):
            qc.compose(layers[boundary],qubits=list(range(n)),inplace=True)
            for i,p in enumerate(paths):
                if p['start'] <= boundary < p['end']:
                    qc.id(n+i)
    return qc

def make_noise(level, scale):
    p = level['noise'] * scale
    model = NoiseModel()
    if p == 0:
        return model
    channel = level['channel']
    error = {'bitflip':lambda:pauli_error([('X',p),('I',1-p)]),
             'phase':lambda:pauli_error([('Z',p),('I',1-p)]),
             'dephasing':lambda:phase_damping_error(p),
             'relaxation':lambda:amplitude_damping_error(p),
             'depolarizing':lambda:depolarizing_error(p,1)}[channel]()
    # Idle storage sees the mission noise. Active operations also have gate noise.
    model.add_all_qubit_quantum_error(error,'id')
    model.add_all_qubit_quantum_error(depolarizing_error(0.002*scale,1),BASIS[1:-3])
    model.add_all_qubit_quantum_error(depolarizing_error(0.008*scale,2),['cx','cy','cz'])
    model.add_all_qubit_readout_error(ReadoutError([[1-0.005*scale,0.005*scale],[0.005*scale,1-0.005*scale]]))
    return model

def density(qc, noise):
    sim = AerSimulator(method='density_matrix',noise_model=noise,max_parallel_threads=1,max_parallel_experiments=1)
    circuit = transpile(qc, basis_gates=BASIS, optimization_level=0, seed_transpiler=SEED)
    circuit.save_density_matrix()
    return DensityMatrix(sim.run(circuit,shots=1,seed_simulator=SEED).result().data(0)['density_matrix'])

def condition(dm, n, ancillas, readout):
    d = 1 << n
    kept = np.zeros((d,d),dtype=complex)
    distribution = {}
    for reported in range(1 << ancillas):
        block = np.zeros((d,d),dtype=complex)
        for true in range(1 << ancillas):
            weight = math.prod((1-readout) if ((true>>j)&1)==((reported>>j)&1) else readout for j in range(ancillas))
            block += weight * dm.data[true*d:(true+1)*d,true*d:(true+1)*d]
        distribution[format(reported,f'0{max(1,ancillas)}b')] = float(np.trace(block).real)
        if reported == 0:
            kept = block
    p = float(np.trace(kept).real)
    if p < 1e-12:
        raise ValueError('No retained state: try another check configuration.')
    return DensityMatrix(kept/p),min(1.,max(0.,p)),{k:min(1.,max(0.,v)) for k,v in distribution.items()}

def radar(level,paths):
    heat,covered,total = [],0,0
    errors = ['X'] if level['channel']=='bitflip' else ['Z'] if level['channel'] in ('phase','dephasing') else ['X','Y','Z']
    for q in range(level['qubits']):
        row=[]
        for col in range(level['slots']):
            detected=0
            for error in errors:
                found=any(col in path['trace'] and path['trace'][col][-1-q] not in ('I',error) for path in paths)
                detected += int(found)
            covered += detected
            total += len(errors)
            row.append(detected/len(errors))
        heat.append(row)
    return heat,covered/max(1,total)

def score_metrics(fidelity, retention, coverage, added_two, extra_depth):
    quality = fidelity * math.sqrt(retention)
    efficiency = 1 / (1 + .015*added_two + .005*max(0,extra_depth))
    return min(1000,int(math.floor(1000*quality*efficiency*(.90+.10*coverage)+.5)))

def evaluate(request: RunRequest):
    started=time.perf_counter()
    level=get_level(request.levelId)
    validate(request,level)
    target=Statevector.from_instruction(payload(level,[Gate(**g) for g in level['target']]))
    bare=payload(level,request.gates)
    actual=Statevector.from_instruction(bare)
    ideal_match=float(state_fidelity(target,actual))
    paths=check_paths(level,request.gates,request.checks)
    checked=checked_circuit(level,request.gates,paths)
    # Overlapping checks may fail even when each check is valid in isolation.
    clean=DensityMatrix(Statevector.from_instruction(checked))
    clean_state,clean_keep,_=condition(clean,level['qubits'],len(paths),0)
    if clean_keep < 1-1e-8 or state_fidelity(actual,clean_state)<1-1e-8:
        raise ValueError('These overlapping checks interfere. Use one check or disjoint intervals.')
    noise=make_noise(level,request.noiseScale)
    baseline_dm=density(bare,noise)
    dm=density(checked,noise)
    selected,retention,syndromes=condition(dm,level['qubits'],len(paths),.005*request.noiseScale)
    fidelity=float(state_fidelity(target,selected))
    baseline=float(state_fidelity(target,baseline_dm))
    heat,coverage=radar(level,paths)
    physical=lambda qc:sum(len(ins.qubits)==2 for ins in qc.data)
    added_two=physical(checked)-physical(bare)
    added=len(checked.data)-len(bare.data)
    score=score_metrics(fidelity,retention,coverage,added_two,checked.depth()-bare.depth())
    eligible=abs(request.noiseScale-1)<1e-9
    passed=eligible and ideal_match>.999 and fidelity>=level['fidelityGoal'] and retention>=level['retentionGoal'] and len(paths)>=level['minChecks']
    stars=0 if not passed else 1+int(fidelity>=min(.97,level['fidelityGoal']+.04) and retention>=.6)+int(fidelity>=min(.99,level['fidelityGoal']+.08) and retention>=.75 and added_two<=6)
    # Sample actual measurements with Qiskit. These counts are illustrative;
    # exact conditional density metrics above determine score.
    sampled=checked.copy()
    sampled.measure_all()
    sim=AerSimulator(noise_model=noise,max_parallel_threads=1)
    measured=transpile(sampled,basis_gates=BASIS,optimization_level=0,seed_transpiler=SEED)
    counts=sim.run(measured,shots=1024,seed_simulator=SEED).result().get_counts()
    kept=sum(v for bits,v in counts.items() if int(bits.replace(' ',''),2) >> level['qubits']==0)
    bloch=[]
    for q in range(level['qubits']):
        reduced=partial_trace(selected,[j for j in range(level['qubits']) if j!=q]) if level['qubits']>1 else selected
        bloch.append([float(np.real(reduced.expectation_value(Pauli(p)))) for p in 'XYZ'])
    feedback=[]
    if ideal_match<.999: feedback.append('Your noiseless circuit does not match the target yet. Check gate order and control wires.')
    if not eligible: feedback.append('Noise Radar experiment: return noise to 100% for mission stars.')
    if len(paths)<level['minChecks']: feedback.append(f"This mission asks for at least {level['minChecks']} check.")
    if fidelity<level['fidelityGoal']: feedback.append('Try a different Pauli or interval; added check gates can also introduce noise.')
    if fidelity>baseline+.005: feedback.append(f'Post-selection improved fidelity by {(fidelity-baseline)*100:.1f} percentage points.')
    if not feedback: feedback.append('Valid quantum strategy. Compare another placement to explore the fidelity/retention trade-off.')
    canonical=request.model_dump()
    canonical['gates']=sorted([{k:v for k,v in g.items() if k!='id'} for g in canonical['gates']],key=lambda g:(g['column'],g['qubits']))
    digest=hashlib.sha256(json.dumps({'engine':VERSION,'request':canonical},sort_keys=True).encode()).hexdigest()
    return dict(levelId=level['id'],engineVersion=VERSION,metricId='conditional-state-v1',configHash=digest,
        fidelity=fidelity,baseline=baseline,idealMatch=ideal_match,retention=retention,flagRate=1-retention,
        coverage=coverage,score=score,stars=stars,passed=passed,eligible=eligible,depth=checked.depth(),baselineDepth=bare.depth(),
        gates=len(request.gates),addedGates=added,addedTwoQubit=added_two,ancillas=len(paths),
        ideal=target.probabilities().tolist(),noisy=selected.probabilities().tolist(),
        amplitudes=[dict(re=float(z.real),im=float(z.imag)) for z in target.data],bloch=bloch,syndromes=syndromes,
        heatmap=heat,checkDetails=[dict(opening=p['opening'],closing=('-' if p['sign']<0 else '')+p['closing'],start=p['start'],end=p['end']) for p in paths],
        feedback=feedback,shots=1024,keptShots=kept,counts=counts,durationMs=round((time.perf_counter()-started)*1000))
