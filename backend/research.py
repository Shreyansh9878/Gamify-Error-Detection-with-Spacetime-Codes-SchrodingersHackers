"""Official-style Paulice stabilizer benchmark; never conflated with game fidelity."""
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Clifford, Pauli, Statevector, state_fidelity
from qiskit_aer import AerSimulator
from qiskit_paulice import add_pauli_checks
from qiskit_paulice.noise_models import NoiseModel as PauliceNoise
from .engine import payload, make_noise, density, VERSION, SEED, BASIS
from .levels import get_level, doped
from .models import Gate, ResearchRequest

def expectation(counts, circuit, pauli, select=None):
    mapping={}
    for ins in circuit.data:
        if ins.operation.name=='measure':
            mapping[circuit.find_bit(ins.qubits[0]).index]=circuit.find_bit(ins.clbits[0]).index
    signed=float(np.real((-1j)**int(pauli.phase)))
    support=[i for i in range(pauli.num_qubits) if pauli.x[i] or pauli.z[i]]
    total,value=0,0
    for bits,count in counts.items():
        if select is not None and any(select(bits)):
            continue
        compact=bits.replace(' ','')
        parity=sum(int(compact[-1-mapping[q]]) for q in support)%2
        total += count
        value += count*signed*(-1 if parity else 1)
    if total < 64:
        raise ValueError('Insufficient retained shots for an observable. Try fewer checks.')
    return value/total,total

def run_research(req: ResearchRequest):
    level=get_level(req.levelId)
    if len(set(req.targets))!=len(req.targets) or any(q<0 or q>=level['qubits'] for q in req.targets):
        raise ValueError('Choose distinct target qubits inside the payload.')
    if req.tCount and req.levelId<7:
        raise ValueError('T-family comparisons use missions 7 through 10.')
    if req.tCount and req.targets:
        raise ValueError('Paulice automatic checks require a Clifford circuit. Clear targets for the T-doped baseline.')
    gates=[Gate(**g) for g in (doped(req.tCount) if req.levelId>=7 else level['target'])]
    base=payload(level,gates)
    circuit=QuantumCircuit(base.num_qubits)
    for _ in range(req.repetitions):
        circuit.compose(base,inplace=True)
    noise=make_noise(level,1)
    ideal=Statevector.from_instruction(circuit)
    reference_fidelity=float(state_fidelity(ideal,density(circuit,noise)))
    if req.tCount:
        f=reference_fidelity
        return dict(metricId='unchecked-state-v1',fidelity=f,baseline=f,retention=1,
            exactReference=f,
            shots=0,keptShots=0,checks=0,depth=circuit.depth(),addedTwoQubit=0,tCount=req.tCount*req.repetitions,
            label='T-doped unchecked reference',warning='Exact premeasurement fidelity. Automatic Pauli checks are not supported across T gates; compare these baselines separately from the observable estimator.',settings=0,engineVersion=VERSION)
    generators=[Pauli(label) for label in Clifford(circuit).to_labels(mode='S')]
    group=[Pauli('I'*circuit.num_qubits)]
    for generator in generators:
        group=group+[g.compose(generator) for g in group]
    raw_sum,post_sum=1.,1.
    total_kept,total_shots,max_depth,max_two,checks=0,0,0,0,0
    sim=AerSimulator(noise_model=noise,max_parallel_threads=1)
    for index,observable in enumerate(group[1:]):
        measured=circuit.copy()
        for q in range(circuit.num_qubits):
            if observable.x[q]:
                if observable.z[q]: measured.sdg(q)
                measured.h(q)
        measured.measure_all()
        # Paulice accepts the documented gate set, so remove explicit idle markers
        # from its input. Research circuits have a separately labeled protocol.
        measured.data=[ins for ins in measured.data if ins.operation.name!='id']
        variants=add_pauli_checks(measured,req.targets,PauliceNoise(gate_noise=.008,readout_noise=.005),cost='gamma',method='windowed',seed=SEED)
        checked=variants[-1]
        pair=[transpile(q,basis_gates=BASIS,optimization_level=0,seed_transpiler=SEED) for q in [measured,checked.circuit]]
        result=sim.run(pair,shots=1024,seed_simulator=SEED+index).result()
        before,_=expectation(result.get_counts(0),pair[0],observable)
        after,kept=expectation(result.get_counts(1),pair[1],observable,checked.get_postselection_method())
        raw_sum+=before; post_sum+=after; total_kept+=kept; total_shots+=1024
        checks=max(checks,len(checked.check_qubits))
        max_depth=max(max_depth,checked.circuit.depth())
        two=lambda q:sum(len(ins.qubits)==2 for ins in q.data)
        max_two=max(max_two,two(checked.circuit)-two(measured))
    return dict(metricId='paulice-observable-v1',fidelity=post_sum/len(group),baseline=raw_sum/len(group),
        exactReference=reference_fidelity,
        retention=total_kept/total_shots,shots=total_shots,keptShots=total_kept,checks=checks,
        depth=max_depth,addedTwoQubit=max_two,tCount=0,label='Paulice stabilizer benchmark',
        warning='Finite-shot estimator with observable-specific checks, not one common retained density matrix. Includes readout noise; no mission stars are awarded. Idle markers are omitted from this research protocol.',settings=len(group)-1,engineVersion=VERSION)
