"""Matched width/depth/T-count study. Local Aer only; no IBM credentials."""
import json
import sys
from pathlib import Path
from itertools import product
from importlib.metadata import version
from qiskit import QuantumCircuit
from qiskit.quantum_info import Pauli, Operator

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.missions.simulation import exact_density,ideal_reference,accepted_metrics
from backend.learning.common import instruction


def workload(repetitions,t_count):
    qc=QuantumCircuit(3)
    for _ in range(repetitions):
        qc.h(0);qc.h(1);qc.cx(0,1);qc.h(2);qc.cz(1,2)
    # Every family member has four doping slots: identity is replaced by T.
    for i in range(4):
        getattr(qc,'t' if i<t_count else 'id')(i%3)
    return qc


def score(circuit,base,noisy=True):
    items=[];measured=set()
    for gate in circuit.data:
        name=gate.operation.name;qs=[circuit.find_bit(q).index for q in gate.qubits]
        if name=='barrier':continue
        if name=='measure':measured.update(qs);continue
        items.append(instruction(name,qs,'Research gate'))
        if noisy:
            # Uniform synthetic study model: lambda=.01 on every live wire
            # after each serialized gate, including check gates and T gates.
            for q in range(circuit.num_qubits):
                if q not in measured:
                    items.append(instruction('noise',[q],'Synthetic hardware',noise={'channel':'depolarizing','strength':.01}))
    return accepted_metrics(exact_density(items,circuit.num_qubits),ideal_reference(base),base.num_qubits)


def resources(circuit,base):
    two=lambda qc:sum(len(g.qubits)==2 for g in qc.data)
    clean=circuit.remove_final_measurements(inplace=False)
    return dict(addedAncillas=circuit.num_qubits-base.num_qubits,
                addedTwoQubit=two(circuit)-two(base),addedDepth=clean.depth()-base.depth())


def z_shell(base,label):
    from backend.quantum_core.pauli import propagate
    frame=Pauli(label)
    try:
        for g in base.data:
            if g.operation.name!='id':frame=propagate(frame,g.operation.name,[base.find_bit(q).index for q in g.qubits],3)
    except ValueError:return None
    qc=QuantumCircuit(4);qc.h(3)
    for q,p in enumerate(reversed(label)):
        if p=='Z':qc.cz(3,q)
    qc.compose(base,inplace=True,qubits=[0,1,2])
    matrix=Operator(base).data@Pauli(label).to_matrix()@Operator(base).data.conj().T
    from backend.missions.service import single_term
    term=single_term(matrix.conj().T)
    if term is None:return None
    closing,coefficient=term
    for q,p in enumerate(reversed(closing)):
        if p!='I':getattr(qc,'c'+p.lower())(3,q)
    phase=min([(1,None),(-1,'z'),(1j,'s'),(-1j,'sdg')],key=lambda pair:abs(pair[0]-coefficient))[1]
    if phase:getattr(qc,phase)(3)
    qc.h(3)
    return qc


def experiment():
    rows=[]
    for repetitions in (1,3):
        for t_count in (0,1,2,4):
            base=workload(repetitions,t_count);baseline=score(base,base)
            variants=[('unchecked',base,dict(engine='none',targets=[]))]
            # Common state-fidelity protocol, identical for Clifford and T.
            # Do not treat Paulice's measurement-parity checks as bare ancilla=0
            # coherent shells: its observable estimator is reported separately.
            for letters in product('IZ',repeat=3):
                label=''.join(letters)
                if label=='III':continue
                checked=z_shell(base,label)
                if checked is not None:variants.append(('custom-Z-search',checked,dict(engine='custom full-span Z/I search',opening=label)))
            for name,circuit,metadata in variants:
                ideal=score(circuit,base,noisy=False)
                assert abs(ideal['fidelity']-1)<1e-8 and abs(ideal['retention']-1)<1e-8
                metrics=score(circuit,base)
                rows.append(dict(repetitions=repetitions,tCount=t_count,dataQubits=3,payloadDepth=base.depth(),
                    method=name,uncheckedFidelity=baseline['fidelity'],**metrics,minimumKept=None,trusted_fidelity=None,**resources(circuit,base),**metadata))
    from backend.research import run_research
    from backend.models import ResearchRequest
    paulice=[]
    for repetitions in (1,3):
        for targets in ([0],[1],[0,1],[1,0]):
            result=run_research(ResearchRequest(levelId=7,targets=targets,repetitions=repetitions))
            paulice.append(dict(repetitions=repetitions,targets=targets,**result))
    return dict(objective='Unbudgeted matched study: correct_shot_yield; score is its legacy alias. Trusted Fidelity is not applicable without an assigned level budget. F_ps and S_keep are unchanged.',pauliceObservableBenchmarks=paulice,seed=2026,packages={n:version(n) for n in ('qiskit','qiskit-aer','qiskit-paulice','numpy')},
        noise='Uniform synthetic depolarizing lambda=.01 after each serialized gate on every live wire; identities retain doping slots. Separate Paulice observable benchmarks use gate_noise=.01, readout_noise=.015 and the documented legacy gate-local Aer noise; do not numerically merge those estimators with coherent state-fidelity rows. No readout error, hardware execution or calibration claim.',
        scope='Matched 3-data-qubit backbone, repetitions 1/3 and four identity-or-T doping slots. Separate Paulice Clifford benchmarks: budgets 1/2 and orders [0,1]/[1,0]. T search enumerates seven full-span Z/I openings with one helper; best found, not an unrestricted optimum.',rows=rows)


if __name__=='__main__':
    result=experiment();path=ROOT/'docs/TRACK_EXPERIMENTS.json'
    path.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(f'{len(result["rows"])} independently scored configurations written to {path}')
