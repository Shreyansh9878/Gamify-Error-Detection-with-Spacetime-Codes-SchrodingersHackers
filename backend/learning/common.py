import hashlib
import json
from math import pi
from typing import Literal
import numpy as np
from pydantic import Field, model_validator
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, partial_trace, state_fidelity
from ..quantum_core.noise import channel
from ..noise_lab.models import StrictModel
from ..noise_lab.simulator import describe


class Gate(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    role: Literal['prepare'] = 'prepare'
    name: Literal['h','x','y','z','s','sdg','rx','ry','rz','cx','cy','cz','m']
    qubits: list[int] = Field(min_length=1, max_length=2)
    column: int = Field(ge=0, le=15)
    angleRadians: float | None = Field(default=None, ge=-2*pi, le=2*pi)

    @model_validator(mode='after')
    def validate_gate(self):
        if len(self.qubits) != (2 if self.name in ('cx','cy','cz') else 1) or len(set(self.qubits)) != len(self.qubits):
            raise ValueError('Controlled gates require distinct control and target; other gates need one wire.')
        if (self.name in ('rx','ry','rz')) != (self.angleRadians is not None):
            raise ValueError('Only rotations require an angleRadians parameter.')
        return self


class Observable(StrictModel):
    qubit: int = Field(default=0, ge=0, le=2)
    basis: Literal['X','Z'] = 'Z'


class Samples(StrictModel):
    shotsPerVariant: Literal[256,1024,4096] = 1024
    sampleSeed: int = Field(default=2026, ge=0, le=2147483647)
    observable: Observable = Field(default_factory=Observable)


def validate_gates(gates, n, clifford=False):
    occupied, ids = set(), set()
    for g in gates:
        if g.id in ids: raise ValueError('Gate IDs must be unique within a circuit section.')
        ids.add(g.id)
        if clifford and g.name in ('rx','ry','rz'): raise ValueError('This check lab accepts Clifford gates only; arbitrary rotations need non-Pauli checks.')
        if clifford and g.name=='m': raise ValueError('This legacy unitary-check API does not accept data measurement; use the ordinary-gate timeline for terminal M.')
        for q in g.qubits:
            if not 0 <= q < n: raise ValueError('A gate targets a missing data wire.')
            if (q,g.column) in occupied: raise ValueError('Gates sharing a wire cannot occupy the same column.')
            occupied.add((q,g.column))


def ordered(gates):
    return sorted(gates, key=lambda g:(g.column,g.qubits,g.id))


def instruction(name, qubits, stage, **extra):
    return {'name':name,'qubits':qubits,'stage':stage,**extra}


def gate_instruction(gate, stage='Payload'):
    return instruction('measure' if gate.name=='m' else gate.name,gate.qubits,stage,**({'bit':gate.qubits[0], 'measureData':True} if gate.name=='m' else {}),**({'angleRadians':gate.angleRadians} if gate.angleRadians is not None else {}),column=gate.column,sourceId=gate.id)


def append_instruction(qc, item):
    if item['name'] == 'noise': qc.append(channel(item['noise']).to_instruction(),item['qubits'])
    elif item['name'] not in ('measure','recovery'):
        getattr(qc,item['name'])(*(([item['angleRadians']] if 'angleRadians' in item else [])+item['qubits']))


def circuit_from(items,n):
    qc=QuantumCircuit(n)
    for item in items: append_instruction(qc,item)
    return qc


def evolve(items,n,state=None):
    state=DensityMatrix.from_label('0'*n) if state is None else state
    for item in items:
        if item['name']=='noise': state=state.evolve(channel(item['noise']).to_quantumchannel(),qargs=item['qubits'])
        elif item['name']=='measure' and item.get('measureData'):
            q=item['qubits'][0];bits=np.array([(v>>q)&1 for v in range(2**n)])
            rho=state.data.copy();rho[bits[:,None]!=bits[None,:]]=0;state=DensityMatrix(rho)
        elif item['name'] not in ('measure','recovery'):
            qc=QuantumCircuit(n);append_instruction(qc,item);state=state.evolve(qc)
    return state


def branches(state,n,k):
    dim=2**n
    result={}
    for a in range(2**k):
        block=state.data[a*dim:(a+1)*dim,a*dim:(a+1)*dim]
        p=max(0.,float(np.trace(block).real))
        result[format(a,f'0{k}b') if k else ''] = (p,DensityMatrix(block/p) if p>1e-12 else None)
    return result


def data_state(state,n,k):
    return partial_trace(state,list(range(n,n+k))) if k else state


def sample_joint(state,n,k,basis,shots,seed):
    qc=QuantumCircuit(n+k)
    if basis=='X': qc.h(range(n))
    measured=state.evolve(qc);measured.seed(seed)
    raw=measured.sample_counts(shots)
    syndromes={format(i,f'0{k}b'):0 for i in range(2**k)} if k else {'':0}
    all_counts={format(i,f'0{n}b'):0 for i in range(2**n)}
    kept=all_counts.copy()
    for key,count in raw.items():
        bits=str(key).zfill(n+k);syn=bits[:k];data=bits[k:]
        syndromes[syn]+=int(count);all_counts[data]+=int(count)
        if not syn or int(syn,2)==0: kept[data]+=int(count)
    return syndromes,all_counts,kept


def stats(state,n,observable,shots,seed,ideal=None,counts=None):
    if state is None: return None
    output=describe(state,n,observable.basis,shots if counts is None else 0,seed)
    if counts is not None:
        output['counts']=counts
        for q,m in enumerate(output['marginals']):
            m['counts']=[sum(v for key,v in counts.items() if key[-1-q]==str(b)) for b in (0,1)]
    m=output['marginals'][observable.qubit]
    output['expectation']=float(m['probabilities'][0]-m['probabilities'][1])
    total=sum(m['counts']);output['sampledExpectation']=(m['counts'][0]-m['counts'][1])/total if total else None
    output['sampleSize']=total
    output['fidelity']=min(1.,max(0.,float(state_fidelity(ideal,state)))) if ideal is not None else 1.
    return output


def fingerprint(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def resources(items,n,data_qubits,method_shots,baseline_shots,reused=0):
    measured=max((i.get('bit',-1) for i in items),default=-1)+1
    qc=QuantumCircuit(n,measured)
    for item in items:
        if item['name']=='measure':qc.measure(item['qubits'][0],item['bit'])
        elif item['name']=='recovery':
            with qc.if_test((qc.cregs[0],item['condition'])):qc.x(item['qubits'][0])
        else:append_instruction(qc,item)
    gates=[i for i in items if i['name'] not in ('noise','measure')]
    return {'peakQubits':n,'addedQubits':n-data_qubits,'oneQubitGates':sum(len(i['qubits'])==1 for i in gates),'twoQubitGates':sum(len(i['qubits'])==2 for i in gates),'depth':qc.depth(),'noiseLocations':sum(i['name']=='noise' for i in items),'methodShots':method_shots,'baselineShots':baseline_shots,'reusedBaselineShots':reused,'totalComparisonShots':method_shots+baseline_shots-reused}


def native_export(variants,n,data_n,k,shots,seed,basis,processing=''):
    def comment(text):
        # Authored check IDs may contain whitespace. Keep their display labels
        # inside one Python comment in the separately copyable native export.
        return str(text).replace('\r', ' ').replace('\n', ' ')
    lines=['# Standalone Qiskit 2+ / Aer. Times in microseconds; channels below define the actual noise.','from qiskit import QuantumCircuit, ClassicalRegister, transpile','from qiskit.quantum_info import DensityMatrix, Kraus','import numpy as np','from qiskit_aer import AerSimulator','from qiskit_aer.noise import pauli_error, depolarizing_error, thermal_relaxation_error','','circuits = {}']
    for label,items in variants.items():
        lines += [f'\n# {label}',f'qc = QuantumCircuit({n})',f'data = ClassicalRegister({data_n}, "data")']
        if k: lines += [f'syndrome = ClassicalRegister({k}, "syndrome")','qc.add_register(syndrome)']
        lines += ['qc.add_register(data)']
        for item in items:
            name=item['name'];q=item['qubits'];args=','.join(map(str,([item['angleRadians']] if 'angleRadians' in item else [])+q))
            if name=='noise':
                noise=item['noise'];kind=noise['channel']
                if kind in ('bit_flip','phase_flip'):
                    p=noise['probability'];expr=f"pauli_error([('{ 'X' if kind=='bit_flip' else 'Z'}',{p}),('I',{1-p})])"
                elif kind=='depolarizing':expr=f"depolarizing_error({noise['strength']},{noise.get('numQubits',1)})"
                else:expr=f"thermal_relaxation_error({noise['t1Us']},{noise['t2Us']},{noise['timeUs']},excited_state_population=0)"
                lines.append(f'qc.append({expr}.to_instruction(), {q}) # {comment(item["stage"])}')
            elif name=='measure':
                if label=='Ideal' and item.get('measureData'):lines.append(f'qc.append(Kraus([np.diag([1,0]),np.diag([0,1])]).to_instruction(), [{q[0]}])')
                else:lines.append(f'qc.measure({q[0]}, '+(f'data[{q[0]}])' if item.get('measureData') else f'syndrome[{item["bit"]}])'))
            elif name=='recovery':lines += [f'with qc.if_test((syndrome, {item["condition"]})):',f'    qc.x({q[0]}) # decoder hypothesis']
            else:lines.append(f'qc.{name}({args}) # {comment(item["stage"])}')
        if basis=='X':lines.append(f'qc.h(range({data_n})) # measurement rotation, not a repair')
        if label=='Ideal':
            lines.append(f'print("Ideal exact probabilities (zero sampled shots)", DensityMatrix.from_instruction(qc).probabilities_dict(qargs=list(range({data_n}))))')
            continue
        lines += [f'qc.measure(range({data_n}), data)',f'circuits[{label!r}] = qc']
    lines += ['\nbackend = AerSimulator()','results = {}', 'for index, (label, qc) in enumerate(circuits.items()):',f'    counts = backend.run(transpile(qc, backend), shots={shots}, seed_simulator=({seed}+index*104729) % 2147483647).result().get_counts()', '    results[label] = counts','    print(label, counts)', '# Data bits are the first space-separated register, q(n-1)...q0.', '# Last register (if present) is syndrome, a(k-1)...a0.',processing]
    return '\n'.join(lines)+'\n'
