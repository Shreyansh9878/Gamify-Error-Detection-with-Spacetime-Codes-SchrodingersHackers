"""Qiskit 2 exact mission execution, interval transport and authoritative closure.

Integer ranks are authored columns; generated fractional ranks are immediately
before the player's final H. They never move a payload gate or change its noise.
"""
import ast
import json
from functools import lru_cache
import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Operator, Clifford, Pauli, SparsePauliOp, DensityMatrix
from ..learning.common import instruction, channel, fingerprint
from .models import Draft, Gate
from .levels import get_level

CP = ('cx', 'cy', 'cz')
PROTOCOL = 'main-missions-exact-v1'


@lru_cache(maxsize=32)
def noise_instruction(spec):
    return channel(json.loads(spec)).to_instruction()


def exact_density(items,width):
    """Aer applies channels to a density matrix, without sampled trajectories."""
    qc=QuantumCircuit(width)
    for item in items:
        if item['name']=='noise':
            qc.append(noise_instruction(json.dumps(item['noise'],sort_keys=True)),item['qubits'])
        else:getattr(qc,item['name'])(*item['qubits'])
    qc.save_density_matrix()
    simulator=AerSimulator(method='density_matrix',max_parallel_threads=1)
    return np.asarray(simulator.run(qc,shots=1,seed_simulator=2026).result().data(0)['density_matrix'])


def rank(g):
    return g.boundary*32+g.slot


def authored(d):
    return [dict(id=g.id, name=g.name, qubits=g.qubits, rank=rank(g), column=f'b{g.boundary}s{g.slot}', owner='player') for g in d.operations]


def payload(level):
    return [dict(id=g['id'], name=g['name'], qubits=g['qubits'], rank=g['column']*32+31,
                 column=g['id'], owner='fixed-fixture') for g in level['payload']]


def qc_for(ops, width):
    qc=QuantumCircuit(width)
    for g in sorted(ops, key=lambda g:(g['rank'], g['id'])):
        if g['name'] != 'm': getattr(qc,g['name'])(*g['qubits'])
    return qc


def single_term(matrix):
    terms=SparsePauliOp.from_operator(Operator(matrix),atol=1e-8).to_list()
    return terms[0] if len(terms)==1 else None


@lru_cache(maxsize=128)
def payload_operator(name, qubits, width):
    qc=QuantumCircuit(width);getattr(qc,name)(*qubits)
    return Operator(qc).data, Clifford(qc) if name not in ('t','tdg') else None


@lru_cache(maxsize=256)
def _validate(serialized):
    d=Draft.model_validate_json(serialized); l=get_level(d.levelId); n=l['qubits']
    player=authored(d); u=payload(l); generated=[]; loops=[]
    for a in range(l['ancillas']):
        wire=n+a; ops=sorted([g for g in player if wire in g['qubits']],key=lambda g:g['rank'])
        if not ops: continue
        taps=[g for g in ops if g['name'] in CP]
        hs=[g for g in ops if g['name']=='h']; ms=[g for g in ops if g['name']=='m']
        loop=dict(id=f'a{a}',ancilla=f'a{a}',valid=False,opening=taps[0]['column'] if taps else ops[0]['column'],
                  closing=ops[-1]['column'],message='Complete H / opening check / closing check / H / M.', nonPauli=False)
        loops.append(loop)
        if len(hs)!=2 or len(ms)!=1 or not taps or not (hs[0]['rank']<taps[0]['rank']<hs[1]['rank']<ms[0]['rank']) or any(g['rank']>ms[0]['rank'] for g in ops):
            continue
        start=taps[0]['rank']; end=hs[1]['rank']
        if any(not start<=t['rank']<end for t in taps):
            loop['message']='Put all controlled checks between the initial and final H.'; continue
        inside=[g for g in u if start<g['rank']<end]
        if not inside:
            loop['message']='The check must enclose at least one payload gate.'; continue
        last_payload=max(g['rank'] for g in inside)
        closing=[] if l['assisted'] else [g for g in taps if g['rank']>last_payload]
        if not l['assisted'] and not closing: continue
        opening=[g for g in taps if g not in closing]
        loop['opening']=opening[-1]['column']
        frame=Pauli('I'*n); non_pauli=False
        events=sorted(inside+opening,key=lambda g:g['rank'])
        for event in events:
            if event in opening:
                target=event['qubits'][1]; label=['I']*n;label[n-1-target]=event['name'][1:].upper()
                frame=frame.compose(Pauli(''.join(label)))
            else:
                if event['name'] not in ('t','tdg'):
                    _,tableau=payload_operator(event['name'],tuple(event['qubits']),n)
                    frame=frame.evolve(tableau,frame='s')
                else:
                    # T and Tdg commute with I/Z; X/Y immediately leave the
                    # Pauli family. Inspect the unsigned symplectic component.
                    q=event['qubits'][0]
                    if frame.x[q]: non_pauli=True;break
        if non_pauli:
            loop.update(nonPauli=True,message='Non-Pauli transport: use only Z/I at a T or Tdg crossing.'); continue
        frame=frame.to_matrix()
        if l['assisted']:
            label, coefficient=single_term(frame.conj().T)
            factors=[(f'c{p.lower()}',[wire,q]) for q,p in enumerate(reversed(label)) if p!='I']
            phase=min([(1,None),(-1,'z'),(1j,'s'),(-1j,'sdg')],key=lambda pair:abs(pair[0]-coefficient))[1]
            if phase: factors.append((phase,[wire]))
            if not factors:
                loop['message']='Opening factors cancel to the identity; choose a useful check.'; continue
            for j,(name,qs) in enumerate(factors):
                generated.append(dict(id=f'auto-{a}-{j}',name=name,qubits=qs,rank=end-.9+j*.01,
                                      column=f'auto-{a}-{j}',owner='generated-method'))
            own_generated=[g for g in generated if g['qubits'][0]==wire]
            loop['closing']=own_generated[0]['column']
        else:
            loop['closing']=closing[0]['column']
        # This checks signs, phase compensation and every authored helper gate,
        # not just the displayed Pauli labels. Test the whole input isometry.
        local=ops+[g for g in generated if g['qubits'][0]==wire]+u
        remap=[dict(g,qubits=[n if q==wire else q for q in g['qubits']]) for g in local]
        matrix=Operator(qc_for(remap,n+1)).data[:,:2**n]
        ideal=np.zeros_like(matrix); ideal[:2**n,:]=Operator(qc_for(u,n)).data
        loop.update(valid=bool(np.allclose(matrix,ideal,atol=1e-8)),
                    message='Closed invariant.' if np.allclose(matrix,ideal,atol=1e-8) else 'Closing check or shell does not preserve U.')
    all_ops=sorted(player+u+generated,key=lambda g:(g['rank'],g['id']))
    # Overlapping individually closed checks need not commute. Certify their
    # combined noiseless isometry before permitting any score.
    if len(loops)>1 and all(c['valid'] for c in loops):
        active=sorted({q for g in player for q in g['qubits'] if q>=n})
        mapping={q:n+i for i,q in enumerate(active)}
        compact=[dict(g,qubits=[mapping.get(q,q) for q in g['qubits']]) for g in all_ops]
        matrix=Operator(qc_for(compact,n+len(active))).data[:,:2**n]
        ideal=np.zeros_like(matrix);ideal[:2**n,:]=Operator(qc_for(u,n)).data
        if not np.allclose(matrix,ideal,atol=1e-8):
            for c in loops:c.update(valid=False,message='Overlapping checks interfere; move their endpoints.')
    return dict(checks=loops,valid=bool(loops) and all(c['valid'] for c in loops),generated=generated,
                operations=all_ops,hasChecks=bool(loops),status='Ready.' if not loops or all(c['valid'] for c in loops) else loops[0]['message'])


def validate(d):
    return _validate(d.model_dump_json())


@lru_cache(maxsize=2048)
def _run(serialized):
    d=Draft.model_validate_json(serialized); l=get_level(d.levelId); v=validate(d)
    if v['hasChecks'] and not v['valid']:
        raise ValueError(next(c['message'] for c in v['checks'] if not c['valid']))
    n=l['qubits']; noise=l['noise']; ops=v['operations']
    active=sorted({q for g in ops for q in g['qubits'] if q>=n});mapping={q:n+i for i,q in enumerate(active)}
    items=[]
    for g in ops:
        qs=[mapping.get(q,q) for q in g['qubits']]
        if g['name']=='m': continue  # terminal syndrome measurements, projected exactly below
        items.append(instruction(g['name'],qs,'Mission execution'))
        if g['owner']=='fixed-fixture':
            if g['id']==f'u{noise["hotspotColumn"]}':
                items.append(instruction('noise',[noise['qubit']],'Relaxation hotspot',noise={
                    'channel':'decoherence','timeUs':noise['timeUs'],'t1Us':noise['t1Us'],'t2Us':noise['t2Us']}))
            for q in range(n):
                items.append(instruction('noise',[q],'Background hardware noise',noise={'channel':'depolarizing','strength':noise['background']}))
        elif g['name'] in CP:
            items.append(instruction('noise',qs,'Check gate overhead',noise={'channel':'depolarizing','strength':noise['checkStrength'],'numQubits':2}))
    state=exact_density(items,n+len(active))
    # The target is pure. Its overlap with the unnormalized all-zero ancilla
    # block is exactly F_ps * S_keep, without statistical fluctuations.
    ideal=Operator(qc_for(payload(l),n)).data[:,0]
    block=state[:2**n,:2**n]; retention=float(np.trace(block).real)
    score=float(np.real(ideal.conj()@block@ideal));score=max(0.,min(1.,score))
    return dict(levelId=d.levelId,combinedScore=score,passed=bool(v['valid'] and score+1e-12>=l['targetScore']),
                target=l['targetScore'],status='Target reached.' if v['valid'] and score+1e-12>=l['targetScore'] else
                'Add a closed check.' if not v['hasChecks'] else 'Try a smaller window around the noisy crossing.',
                configHash=fingerprint(dict(protocol=PROTOCOL,level=l,draft=d.model_dump())),
                fidelity=score/retention if retention>1e-12 else 0., retention=retention,
                protocol=PROTOCOL)


def run(d):
    # Do not expose tutorial telemetry on the mission API/UI.
    return {k:v for k,v in _run(d.model_dump_json()).items() if k not in ('fidelity','retention')}


def generate(d):
    lines=['# MissionCircuit is an allowlisted editor API backed by Qiskit 2.',f'qc = MissionCircuit({d.levelId})']
    for boundary,count in sorted(d.bands.items(),key=lambda x:int(x[0])):
        if count: lines.append(f'qc.band({int(boundary)}, {count})')
    for g in sorted(d.operations,key=rank):
        lines.append(f'qc.{g.name}({", ".join(map(str,g.qubits))}, boundary={g.boundary}, slot={g.slot})')
    return '\n'.join(lines)+'\n'


def compile_source(req):
    """Parse literals and allowed method calls, never execute user Python."""
    try:
        tree=ast.parse(req.code); bands={}; gates=[]; initialized=False
        if len(tree.body)>142: raise ValueError('Too many editor statements.')
        for line in tree.body:
            if isinstance(line,ast.Assign) and not initialized:
                if len(line.targets)!=1 or not isinstance(line.targets[0],ast.Name) or line.targets[0].id!='qc': raise ValueError('Use qc = MissionCircuit(levelId).')
                call=line.value
                if not isinstance(call,ast.Call) or not isinstance(call.func,ast.Name) or call.func.id!='MissionCircuit' or call.keywords or len(call.args)!=1 or ast.literal_eval(call.args[0])!=req.levelId:
                    raise ValueError('MissionCircuit must use the current level ID.')
                initialized=True;continue
            if not initialized or not isinstance(line,ast.Expr) or not isinstance(line.value,ast.Call): raise ValueError('Only literal qc gate and band calls are supported.')
            call=line.value
            if not isinstance(call.func,ast.Attribute) or not isinstance(call.func.value,ast.Name) or call.func.value.id!='qc': raise ValueError('Only qc methods are supported.')
            name=call.func.attr; args=[ast.literal_eval(x) for x in call.args]
            if any(k.arg is None for k in call.keywords): raise ValueError('Keyword expansion is not supported.')
            kwargs={k.arg:ast.literal_eval(k.value) for k in call.keywords}
            if len(kwargs)!=len(call.keywords): raise ValueError('Duplicate keyword.')
            if name=='band' and len(args)==2 and not kwargs:
                if not all(type(x)==int for x in args): raise ValueError('Band positions and counts must be integers.')
                if str(args[0]) in bands: raise ValueError('Duplicate editable band.')
                bands[str(args[0])]=args[1]
            elif name in ('h','x','y','z','s','sdg','cx','cy','cz','m') and set(kwargs)=={'boundary','slot'}:
                gates.append(Gate(id=f'g{len(gates)}',name=name,qubits=args,**kwargs))
            else: raise ValueError('Unsupported gate or arguments. Payload gates cannot be edited.')
        if not initialized: raise ValueError('Start with qc = MissionCircuit(levelId).')
        d=Draft(levelId=req.levelId,bands=bands,operations=gates)
        return dict(draft=d.model_dump(),diagnostics=[])
    except (ValueError,TypeError,SyntaxError,RecursionError) as error:
        return dict(draft=None,diagnostics=[dict(line=getattr(error,'lineno',1) or 1,column=getattr(error,'offset',1) or 1,message=str(error))])
