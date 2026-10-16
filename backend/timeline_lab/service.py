"""Exact density-matrix execution and state-independent ordinary-gate checks.

Hardware channels follow each occupied quantum layer on every unmeasured wire.
Measurements are terminal on their wire, so deferring the projection is exact.
"""
from functools import lru_cache
from importlib.metadata import version
import json
import itertools
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Operator, Clifford, Pauli, partial_trace, state_fidelity, SparsePauliOp
from ..learning.common import instruction, evolve, stats, Observable, fingerprint
from ..learning.visualization import state_visualization
from .models import Draft, Operation, fixed_payload
from ..quantum_core.noise import hardware_items
from ..quantum_core.scoring import trusted_fidelity
from .capstone_config import TARGET_SCORE as CAPSTONE_GOAL, MINIMUM_KEPT as CAPSTONE_MINIMUM_KEPT

CP=('cx','cy','cz')
FAULTS=('bit_flip','phase_flip','decoherence')
PROTOCOL='timeline-hardware-layers-v3-two-data-one-helper'
HOTSPOT={'channel':'decoherence','timeUs':70.,'t1Us':100.,'t2Us':200.}
CHECK_STRENGTH=.02


def operations(d):
    return sorted(d.operations+(fixed_payload(d.lesson) if d.mode=='guided' else []),key=lambda g:(g.column,g.id))


def payload_bounds(d,ops):
    if d.mode=='guided':
        p=fixed_payload(d.lesson)
        return min(g.column for g in p),max(g.column for g in p)
    controls=[g.column for g in ops if g.name in CP and g.qubits[0]>=d.dataQubits and g.qubits[1]<d.dataQubits]
    data=[g.column for g in ops if g.name not in FAULTS+('m',) and all(q<d.dataQubits for q in g.qubits)]
    inside=[c for c in data if controls and min(controls)<c<max(controls)]
    if inside: return min(inside),max(inside)
    if len(set(controls))>1:
        mid=(min(controls)+max(controls))/2
        return mid,mid
    return (min(data),max(data)) if data else (d.columns/2,d.columns/2)


def circuit(ops,n):
    qc=QuantumCircuit(n)
    for g in ops:
        if g.name not in FAULTS+('m',): getattr(qc,g.name)(*(([g.angleRadians] if g.angleRadians is not None else [])+g.qubits))
    return qc


def validation(d):
    ops=operations(d);n=d.dataQubits;lo,hi=payload_bounds(d,ops)
    loops=[]
    for a in range(d.ancillas):
        wire=n+a
        taps=[g for g in ops if g.name in CP and g.qubits[0]==wire and g.qubits[1]<n]
        opening=[g for g in taps if g.column<lo];closing=[g for g in taps if g.column>hi]
        if not taps: continue
        entry={'ancilla':a,'openingColumn':max((g.column for g in opening),default=0),
               'closingColumn':min((g.column for g in closing),default=d.columns-1),'valid':False,
               'opening':None,'expected':None,'closing':None,'nonPauli':False}
        if not opening or not closing:
            entry['message']='Add controlled Pauli interactions on both sides of the data workload.';loops.append(entry);continue
        # All taps of each product count, while the connector uses the nearest endpoints.
        def product(gs):
            qc=QuantumCircuit(n)
            for g in gs: getattr(qc,g.name[1:])(g.qubits[1])
            return Operator(qc).data
        p=product(opening);c=product(closing)
        between=[g for g in ops if entry['openingColumn']<g.column<entry['closingColumn'] and
                 g.name not in FAULTS+('m',) and all(q<n for q in g.qubits)]
        uqc=circuit(between,n);u=Operator(uqc).data
        expected=u@p@u.conj().T
        transported_step=p.copy();unsupported=[]
        for gate in between:
            gate_u=Operator(circuit([gate],n)).data
            transported_step=gate_u@transported_step@gate_u.conj().T
            if len(SparsePauliOp.from_operator(Operator(transported_step),atol=1e-8))!=1:
                unsupported.append(gate.name.upper())
        rotation_info=(' Axis-aligned rotations commute at any angle; other rotations keep a Pauli only at multiples of π/2.' if any(g.name in ('rx','ry','rz') for g in between) else '')
        expansion=SparsePauliOp.from_operator(Operator(expected),atol=1e-9)
        terms=[(str(label),complex(coef)) for label,coef in expansion.to_list() if abs(coef)>1e-8]
        def text(matrix):
            return ' + '.join(f'{complex(v).real:+.3g}{complex(v).imag:+.3g}i {s}' if abs(complex(v).imag)>1e-8 else f'{complex(v).real:+.3g} {s}' for s,v in SparsePauliOp.from_operator(Operator(matrix)).to_list())
        # Exercise the Qiskit tableau for Clifford transport, including signed Paulis.
        if not any(g.name in ('t','tdg','rx','ry','rz') for g in between) and len(SparsePauliOp.from_operator(Operator(p)))==1:
            label=SparsePauliOp.from_operator(Operator(p)).paulis[0]
            transported=label.evolve(Clifford(uqc),frame='s').to_matrix()
            coefficient=SparsePauliOp.from_operator(Operator(p)).coeffs[0]
            if not np.allclose(expected,coefficient*transported,atol=1e-8): raise ValueError('Tableau and operator propagation disagree.')
        match=np.allclose(c@expected,np.eye(2**n),atol=1e-8)
        h_before=any(g.name=='h' and g.qubits==[wire] and g.column<min(t.column for t in opening) for g in ops)
        last_close=max(g.column for g in closing)
        final_h=[g.column for g in ops if g.name=='h' and g.qubits==[wire] and g.column>last_close]
        measured=any(g.name=='m' and g.qubits==[wire] and final_h and g.column>max(final_h) for g in ops)
        compensation=(-1)**sum(g.name=='z' and g.qubits==[wire] and bool(final_h) and last_close<g.column<max(final_h) for g in ops)
        match=np.allclose(compensation*c@expected,np.eye(2**n),atol=1e-8)
        entry.update(opening=text(p),expected=text(expected),closing=text(compensation*c.conj().T),nonPauli=bool(unsupported) or len(terms)!=1,
                     valid=bool(match and h_before and measured and not unsupported))
        entry['message']=('Closed operator identity and complete H / CP / CP / H / M shell.' if entry['valid'] else
                          'Non-Pauli transport at '+', '.join(dict.fromkeys(unsupported))+': the check becomes a coherent Pauli sum; a Pauli-only closure is unsupported.' if unsupported or len(terms)!=1 else
                          'Closing product or sign does not match U P U†.' if not match else 'Operator matches; add the initial H and terminal H then M on this ancilla.')
        entry['message']+=rotation_info
        loops.append(entry)
    # A green local loop alone cannot certify interacting or overlapping ancilla circuits.
    clean=[g for g in ops if g.name not in FAULTS+('m',)]
    width=n+d.ancillas;full=Operator(circuit(clean,width)).data[:,:2**n]
    data=[g for g in clean if all(q<n for q in g.qubits)]
    target=Operator(circuit(data,n)).data
    ideal=np.zeros_like(full);ideal[:2**n,:]=target
    whole=np.allclose(full,ideal,atol=1e-8)
    for loop in loops:
        if loop['valid'] and not whole:
            loop.update(valid=False,message='Local transport matches, but the complete authored circuit disturbs the data or helper. Check intermediate gates and overlapping loops.')
    return {'checks':loops,'valid':bool(loops) and all(c['valid'] for c in loops) and whole,
            'payloadStart':lo,'payloadEnd':hi,'wholeCircuitIdentity':bool(whole),'wireOrder':'q(n−1)…q0; controlled gates list control first'}


def schedule(d,noise=True):
    items=[];measured=set();width=d.dataQubits+d.ancillas
    for _,group in itertools.groupby(operations(d),lambda g:g.column):
        layer=list(group);quantum=False
        for g in layer:
            if g.name=='m':
                items.append(instruction('measure',g.qubits,'Readout',column=g.column));measured.update(g.qubits)
            elif g.name in FAULTS:
                if g.name=='decoherence':
                    for q in g.qubits:items.append(instruction('noise',[q],'Authored waiting channel',noise={'channel':'decoherence','timeUs':g.timeUs,'t1Us':g.t1Us,'t2Us':g.t2Us},column=g.column))
                else:items.append(instruction('x' if g.name=='bit_flip' else 'z',g.qubits,'Injected test fault',column=g.column))
                quantum=True
            else:
                items.append(instruction(g.name,g.qubits,'Authored gate',column=g.column,**({'angleRadians':g.angleRadians} if g.angleRadians is not None else {})));quantum=True
                if noise and d.lesson==6 and d.hardware.enabled:
                    if g.name=='cx' and g.qubits==[0,1] and g.column==5:
                        items.append(instruction('noise',[1],'High-noise CX region: q1 relaxation',noise=HOTSPOT,column=g.column))
                    elif g.name in CP and any(q>=d.dataQubits for q in g.qubits):
                        items.append(instruction('noise',g.qubits,'Controlled-check interaction overhead',noise={'channel':'depolarizing','strength':CHECK_STRENGTH,'numQubits':2},column=g.column))
        if noise and quantum:items.extend(hardware_items(d.hardware,[q for q in range(width) if q not in measured]))
    return items


def measured_state(items,width):
    state=evolve(items,width)
    for q in {i['qubits'][0] for i in items if i['name']=='measure'}:
        # Terminal measurements can be deferred but must dephase displayed states.
        diagonal=np.array([((i>>q)&1) for i in range(2**width)])
        rho=state.data.copy();rho[diagonal[:,None]!=diagonal[None,:]]=0
        state=DensityMatrix(rho)
    return state


def evaluate(d,shots=1024,seed=2026,visuals=True):
    n=d.dataQubits;k=d.ancillas;width=n+k;ops=operations(d)
    data=[g for g in ops if all(q<n for q in g.qubits) and g.name not in FAULTS]
    ideal_items=[instruction('measure' if g.name=='m' else g.name,g.qubits,'Ideal data workload',**({'angleRadians':g.angleRadians} if g.angleRadians is not None else {})) for g in data]
    ideal=measured_state(ideal_items,n)
    # The baseline has only data operations and their own occupied layers.
    temp=d.model_copy(update={'operations':[g for g in ops if all(q<n for q in g.qubits)],'mode':'sandbox','ancillas':1})
    base_items=[i for i in schedule(temp) if all(q<n for q in i['qubits'])]
    baseline=measured_state(base_items,n)
    items=schedule(d);joint=measured_state(items,width)
    measured=[g.qubits[0] for g in ops if g.name=='m' and g.qubits[0]>=n]
    indices=[i for i in range(2**width) if all(((i>>q)&1)==0 for q in measured)]
    accepted=np.zeros_like(joint.data);accepted[np.ix_(indices,indices)]=joint.data[np.ix_(indices,indices)]
    r=max(0.,min(1.,float(np.trace(accepted).real)))
    retained=partial_trace(DensityMatrix(accepted/r),list(range(n,width))) if r>1e-12 else None
    f=min(1.,max(0.,float(state_fidelity(ideal,retained)))) if retained is not None else None
    baseline_fidelity=min(1.,max(0.,float(state_fidelity(ideal,baseline))))
    threshold=max(CAPSTONE_GOAL,baseline_fidelity+.01) if d.lesson==6 else None
    metrics={'baselineScore':baseline_fidelity,'qualificationThreshold':threshold,'fidelity':f,'retention':r,'score':(f or 0)*r,'samplingOverhead':1/r if r>1e-12 else None}
    if d.lesson==6:
        metrics.update(score=trusted_fidelity(f,r,CAPSTONE_MINIMUM_KEPT),
                       minimumKept=CAPSTONE_MINIMUM_KEPT,correct_shot_yield=(f or 0)*r,
                       scoreVersion='trusted-fidelity-v1')
    if not visuals:return metrics
    sampled=joint.copy();sampled.seed(seed);raw=sampled.sample_counts(shots)
    all_counts={format(i,f'0{n}b'):0 for i in range(2**n)};kept_counts=all_counts.copy();syndromes={};kept=0
    for bits,count in raw.items():
        value=int(bits,2);key=format(value%(2**n),f'0{n}b');all_counts[key]+=int(count)
        syndrome=''.join(str((value>>q)&1) for q in reversed(measured)) or 'none'
        syndromes[syndrome]=syndromes.get(syndrome,0)+int(count)
        if all(((value>>q)&1)==0 for q in measured):kept+=int(count);kept_counts[key]+=int(count)
    obs=Observable()
    result={**metrics,'validation':validation(d),'keptShots':kept,'discardedShots':shots-kept,'totalShots':shots,'syndromeCounts':syndromes,
            'ideal':stats(ideal,n,obs,0,seed,ideal),'baseline':stats(baseline,n,obs,shots,seed,ideal),
            'output':stats(retained,n,obs,0,seed,ideal,kept_counts),
            'joint':state_visualization(joint,width,width,list(reversed([f'q{q}' for q in range(n)]+[f'a{a}' for a in range(k)])),stage='terminal-readout',scope='joint'),
            'resources':{'peakQubits':width},'fingerprint':fingerprint(d.model_dump()),'nativeCode':native_code(d,shots,seed),
            'engineVersion':'ordinary-timeline-v2','qiskitVersion':version('qiskit'),
            'hardwareProtocol':PROTOCOL,'warnings':[] if measured else ['No ancilla has been measured. No shots are filtered.']}
    return result


def run(request):return evaluate(request.draft,request.shots,request.seed)


def native_code(d,shots=1024,seed=2026):
    lines=['# Qiskit 2+ / Aer: exact same channels and terminal measurements as the game.',
           'from qiskit import QuantumCircuit, transpile','from qiskit_aer import AerSimulator',
           'from qiskit_aer.noise import pauli_error, depolarizing_error, thermal_relaxation_error',
           f'qc = QuantumCircuit({d.dataQubits+d.ancillas}, {d.dataQubits+d.ancillas})']
    for i in schedule(d):
        name=i['name'];q=i['qubits']
        if name=='measure':lines.append(f'qc.measure({q[0]}, {q[0]})')
        elif name=='noise':
            v=i['noise'];kind=v['channel']
            if kind in ('bit_flip','phase_flip'):expr=f"pauli_error([('{ 'X' if kind=='bit_flip' else 'Z'}',{v['probability']}),('I',{1-v['probability']})])"
            elif kind=='depolarizing':expr=f"depolarizing_error({v['strength']},{v.get('numQubits',1)})"
            else:expr=f"thermal_relaxation_error({v['t1Us']},{v['t2Us']},{v['timeUs']})"
            lines.append(f'qc.append({expr}.to_instruction(), {q})')
        else:
            args=([i['angleRadians']] if 'angleRadians' in i else [])+q
            lines.append(f'qc.{name}({", ".join(map(str,args))})')
    lines += [f'qc.measure(range({d.dataQubits}), range({d.dataQubits}))','sim = AerSimulator(method="density_matrix")',f'print(sim.run(transpile(qc, sim), shots={shots}, seed_simulator={seed}).result().get_counts())']
    return '\n'.join(lines)+'\n'


def compile_source(request):
    # Python syntax is parsed into a bounded teaching API, never executed.
    from ..learning.source import source_calls, literal
    from ..noise_lab.code_parser import integer, number, SourceError
    try:
        n,pi,calls=source_calls(request.code,'FlightCircuit')
        values={'dataQubits':n};ops=[];node=None
        for node,name,args,keys in calls:
            if name=='context':
                if ops or args or 'lesson' in values:raise SourceError('Declare context exactly once before gates.',node)
                if set(keys)!={'lesson','mode','ancillas','columns'}:raise SourceError('Context needs lesson, mode, ancillas, columns.',node)
                values.update({k:literal(v) for k,v in keys.items()})
            elif name=='hardware':
                if args or 'hardware' in values:raise SourceError('Declare hardware once using literal keyword arguments.',node)
                values['hardware']={k:literal(v) for k,v in keys.items()}
            else:
                if set(keys)-{'at','time_us','t1_us','t2_us'}:raise SourceError('Use at=column and waiting-time parameters only.',node)
                rotation=name in ('rx','ry','rz')
                if rotation and len(args)!=2:raise SourceError('Use qc.rx(theta, wire, at=column), likewise ry/rz.',node)
                qs=[integer(a,pi) for a in (args[1:] if rotation else args)]
                ops.append(Operation(id=f'code-{len(ops)}',name=name,qubits=qs,column=integer(keys['at'],pi) if 'at' in keys else len(ops),**({'angleRadians':float(number(args[0],pi))} if rotation else {}),
                                     **{{'time_us':'timeUs','t1_us':'t1Us','t2_us':'t2Us'}[k]:float(number(v,pi)) for k,v in keys.items() if k!='at'}))
        draft=Draft(**values,operations=ops)
        return {'draft':draft.model_dump(),'diagnostics':[]}
    except (ValueError,TypeError) as exc:
        return {'draft':None,'diagnostics':[{'line':getattr(exc,'line',getattr(exc,'lineno',1)),'column':getattr(exc,'column',getattr(exc,'colno',1)),'message':str(exc)}]}


def reference_candidates(noise):
    # Exhaustive bounded reference family: one full-payload Pauli-product check.
    # Does not assert a global optimum across arbitrary shells/two-ancilla loops.
    for label in itertools.product('IXYZ',repeat=2):
        if label==('I','I'):continue
        opening=[Operation(id=f'o{q}',name='c'+p.lower(),qubits=[2,q],column=q+1) for q,p in enumerate(label) if p!='I']
        payload=fixed_payload(6);u=Clifford(circuit(payload,2))
        propagated=Pauli(''.join(reversed(label))).evolve(u,frame='s')
        sign=-1 if propagated.phase==2 else 1
        close=[Operation(id=f'c{q}',name='c'+p.lower(),qubits=[2,q],column=9+q) for q,p in enumerate(reversed(propagated.to_label().lstrip('-+'))) if p!='I']
        tail=[Operation(id='fh',name='h',qubits=[2],column=13),Operation(id='m',name='m',qubits=[2],column=14)]
        if sign<0:tail.insert(0,Operation(id='sign',name='z',qubits=[2],column=12))
        d=Draft(lesson=6,dataQubits=2,ancillas=1,columns=15,hardware=noise,operations=[Operation(id='h',name='h',qubits=[2],column=0)]+opening+close+tail)
        yield {**evaluate(d,visuals=False),'draft':d.model_dump(),'openingPauli':''.join(reversed(label))}


@lru_cache(maxsize=8)
def comparison(noise_json):
    noise=json.loads(noise_json)
    candidates=list(reference_candidates(noise))
    best=max(candidates,key=lambda candidate:candidate['score'])
    count=len(candidates)
    return {'best':best,'candidates':count,'scope':'Exact maximum over 15 single-ancilla full-payload Pauli-product shells; fixed tap order and terminal readout. Arbitrary placements and multi-check circuits are outside this certificate.',
            'globalUpperBound':1.,'protocol':PROTOCOL,'physicsKey':fingerprint({'noise':noise,'protocol':PROTOCOL,'payload':[g.model_dump() for g in fixed_payload(6)],'referenceFamily':'15-full-window-fixed-order-v2'})}


@lru_cache(maxsize=8)
def paulice_search(noise_json):
    from ..quantum_core.paulice import optimize_clifford
    noise=json.loads(noise_json)
    qc=circuit(fixed_payload(6),2);qc.measure_all()
    # Paulice's native cost uses its own gate depolarization model. Report that
    # model, never silently substitute it for the game's all-wire layer channels.
    p=.01  # Organizer-authorized synthetic Paulice search model, not calibration.
    candidate=optimize_clifford(qc,[1],ancilla_limit=1,gate_noise=p)
    if candidate.circuit.num_qubits>3:raise ValueError('Paulice exceeded the fixed one-ancilla budget.')
    instructions=[{'name':g.operation.name,'qubits':[candidate.circuit.find_bit(q).index for q in g.qubits]} for g in candidate.circuit.data]
    if len(instructions)>256:raise ValueError('Research candidate exceeds the display bound.')
    return {'available':True,'ancillaLimit':1,'addedAncillas':candidate.circuit.num_qubits-2,'packageVersion':version('qiskit-paulice'),'nativeCost':float(candidate.cost) if candidate.cost is not None and np.isfinite(candidate.cost) else None,
            'instructions':instructions,'checkSupport':[list(s) for s in candidate.check_support],
            'message':'Actual Paulice gamma/windowed research suggestion. Its native depolarizing gate-cost model differs from the game layer-noise protocol; it is not a certified global maximum or assigned a misleading game score.'}


def reveal(request):
    d=request.draft;player=run(request)
    if d.lesson!=6 or not player['validation']['valid'] or player['score']<player['qualificationThreshold']:
        raise ValueError('First run a complete valid check with Trusted Fidelity above the target and the unchecked baseline + 0.01.')
    key=json.dumps(d.hardware.model_dump(),sort_keys=True)
    try:research=paulice_search(key)
    except Exception as error:research={'available':False,'message':f'Paulice search failed ({type(error).__name__}). Retry; qualification remains valid.'}
    return {'player':{k:player[k] for k in ('fidelity','retention','score','fingerprint')},'reference':comparison(key),'paulice':research}
