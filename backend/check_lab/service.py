import time
from uuid import uuid4
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Clifford, Operator, Pauli, partial_trace
from ..learning.common import ordered, instruction, gate_instruction, append_instruction, circuit_from, evolve, branches, sample_joint, stats, fingerprint, resources, native_export
from ..learning.noise_targets import resolved_targets
from ..learning.visualization import joint_frames


def product(taps,n):
    chars=['I']*n
    for tap in taps:chars[n-1-tap.qubit]=tap.pauli
    return Pauli(''.join(chars))


def factors(pauli):
    label=pauli.to_label();sign=-1 if label.startswith('-') else 1;body=label.lstrip('-')
    return sign,[{'qubit':q,'pauli':p} for q,p in enumerate(reversed(body)) if p!='I']


def propagation(draft,check):
    if not check.openingTaps:return {'expected':None,'expectedTaps':[],'sign':1,'steps':[],'match':False}
    p=product(check.openingTaps,draft.dataQubits);steps=[{'label':'Opening','operator':p.to_label(),'column':check.startBoundary}]
    for gate in ordered(draft.payload):
        if check.startBoundary<=gate.column<check.endBoundary:
            qc=QuantumCircuit(draft.dataQubits);append_instruction(qc,gate_instruction(gate));p=p.evolve(Clifford(qc),frame='s')
            steps.append({'label':f'{gate.name.upper()}({",".join(map(str,gate.qubits))})','operator':p.to_label(),'column':gate.column})
    sign,taps=factors(p)
    selected=product(check.closingTaps,draft.dataQubits)
    match=bool(check.closingTaps) and np.allclose(check.closingSign*selected.to_matrix(),p.to_matrix(),atol=1e-8)
    return {'expected':p.to_label(),'expectedTaps':taps,'sign':sign,'steps':steps,'match':match}


def fault_instruction(fault):
    if fault.name=='decoherence':
        return instruction('noise',[fault.qubit],f'Wait {fault.timeUs} μs at boundary {fault.boundary}',noise={'channel':'decoherence','timeUs':fault.timeUs,'t1Us':fault.t1Us,'t2Us':fault.t2Us},boundary=fault.boundary)
    return instruction({'bit_flip':'x','phase_flip':'z','pauli_y':'y'}[fault.name],[fault.qubit],f'Injected error at boundary {fault.boundary}',boundary=fault.boundary,errorRole=True)


def schedule(draft,faults=False,preparation=True,checks=True):
    n=draft.dataQubits;items=[gate_instruction(g,'Input preparation') for g in ordered(draft.preparation)] if preparation else []
    active=sorted(draft.checks,key=lambda c:c.id) if checks else []
    mapping={a:n+i for i,a in enumerate(sorted(c.ancilla for c in active))}
    for boundary in range(17):
        if faults:
            items += [dict(fault_instruction(f),qubits=[q]) for f in sorted(draft.faults,key=lambda f:(f.boundary,f.order)) if f.boundary==boundary for q in resolved_targets(f,n,mapping)]
        for c in reversed(active):
            if c.endBoundary!=boundary:continue
            anc=mapping[c.ancilla]
            for tap in sorted(c.closingTaps,key=lambda t:t.qubit):items.append(instruction('c'+tap.pauli.lower(),[anc,tap.qubit],f'{c.id}: closing',boundary=boundary))
            if c.closingSign==-1:items.append(instruction('z',[anc],f'{c.id}: sign compensation',boundary=boundary))
            if c.closingHadamard:items.append(instruction('h',[anc],f'{c.id}: final H',boundary=boundary))
            if c.measure:items.append(instruction('measure',[anc],f'{c.id}: syndrome',bit=anc-n,boundary=boundary))
        for c in active:
            if c.startBoundary!=boundary:continue
            anc=mapping[c.ancilla]
            if c.openingHadamard:items.append(instruction('h',[anc],f'{c.id}: prepare H',boundary=boundary))
            for tap in sorted(c.openingTaps,key=lambda t:t.qubit):items.append(instruction('c'+tap.pauli.lower(),[anc,tap.qubit],f'{c.id}: opening',boundary=boundary))
        items += [gate_instruction(g) for g in ordered(draft.payload) if g.column==boundary]
    if len(items)>128:raise ValueError('Generated check schedule exceeds 128 logical operations.')
    return items


def validate(request):
    d=request.draft;n=d.dataQubits;k=len(d.checks)
    checks=[]
    for c in d.checks:
        missing=[name for name,exists in [('opening H',c.openingHadamard),('opening Pauli',c.openingTaps),('closing Pauli',c.closingTaps),('final H',c.closingHadamard),('syndrome measurement',c.measure)] if not exists]
        checks.append({'id':c.id,'missing':missing,'complete':not missing,**propagation(d,c)})
    complete=bool(checks) and all(c['complete'] for c in checks)
    residual=None;schedule_valid=False
    if complete:
        actual=Operator(circuit_from(schedule(d,False,False),n+k)).data[:,:2**n]
        target=np.zeros_like(actual);unit=Operator(circuit_from([gate_instruction(g) for g in ordered(d.payload)],n)).data;target[:2**n,:]=unit
        overlap=np.vdot(target,actual);phase=overlap/abs(overlap) if abs(overlap)>1e-12 else 1.
        residual=float(np.linalg.norm(actual-phase*target));schedule_valid=residual<1e-8
    local=bool(checks) and all(c['match'] for c in checks)
    valid=complete and local and schedule_valid
    items=schedule(d,request.faultsEnabled)
    code=native_export({'Ideal':schedule(d,False,True,False),'No faults':schedule(d,False),'Faulted':items},n+k,n,k,request.shotsPerVariant,request.sampleSeed,request.observable.basis,"\nfor label, counts in results.items():\n    kept = sum(count for bits,count in counts.items() if int(bits.split()[-1],2)==0)\n    print(label,'all-zero syndrome accepted',kept)\n" if k else '')
    return {'structureComplete':complete,'localOperatorMatch':local,'scheduleValid':schedule_valid,'valid':valid,'residual':residual,'checks':checks,'classification':'incomplete' if not complete else 'valid' if valid else 'invalid_check',
        'message':'Add the missing H/tap/readout stages.' if not complete else 'Invariant closed — noiseless syndrome predicted 0.' if valid else 'Operator/sign mismatch or check scheduling conflict. Nonzero noiseless syndromes are false alarms.',
        'instructions':items,'nativeCode':code,'wireLabels':[f'q{q}' for q in range(n)]+[f'a{a}' for a in sorted(c.ancilla for c in d.checks)],'resources':resources(items,n+k,n,request.shotsPerVariant,request.shotsPerVariant),'fingerprint':fingerprint(d.model_dump())}


def run(request):
    started=time.perf_counter();v=validate(request)
    if not v['structureComplete']:raise ValueError('Complete the opening H, Pauli taps, final H, and measurement before running.')
    d=request.draft;n=d.dataQubits;k=len(v['wireLabels'])-n;N=request.shotsPerVariant;seed=request.sampleSeed;obs=request.observable
    ideal=evolve(schedule(d,False,True,False),n)
    bare_d=d.model_copy(update={'faults':[f.model_copy(update={'targets':[t for t in f.targets if t.kind=='data']}) for f in d.faults if f.targets and any(t.kind=='data' for t in f.targets)]+[f for f in d.faults if f.targets is None]})
    bare=evolve(schedule(bare_d,request.faultsEnabled,True,False),n)
    clean=evolve(schedule(d,False),n+k)
    affected=evolve(schedule(d,request.faultsEnabled),n+k)
    clean_p=branches(clean,n,k);probs=branches(affected,n,k)
    syn,counts,kept=sample_joint(affected,n,k,obs.basis,N,seed)
    clean_syn,_,_=sample_joint(clean,n,k,obs.basis,N,seed)
    zero='0'*k;r,retained=probs[zero];pflag=max(0.,1-r)
    noiseless_flag=max(0.,1-clean_p[zero][0])
    classification='Invalid check / false-alarm diagnostic' if not v['valid'] else 'Valid — no faults' if not request.faultsEnabled or not d.faults else 'Flagged / caught' if pflag>1-1e-8 else 'Not flagged' if pflag<1e-8 else 'Probabilistic flagging'
    guided=d.mode=='guided' and len(d.checks)==1 and [(t.qubit,t.pauli) for t in d.checks[0].openingTaps]==[(0,'X')] and [(t.qubit,t.pauli) for t in d.checks[0].closingTaps]==[(0,'Y')] and d.checks[0].closingSign==1 and not request.faultsEnabled and v['valid'] and noiseless_flag<1e-8
    nontrivial=any(f.name!='decoherence' or f.timeUs>0 for f in d.faults)
    return {**v,'frames':joint_frames(affected,n,k,list(reversed(v['wireLabels']))),'draft':d.model_dump(exclude_none=True),'observable':obs.model_dump(),'faultsEnabled':request.faultsEnabled,'runId':str(uuid4()),'contentVersion':'spacetime-checks-v1','engineVersion':'check-lab-1.0.0','settingsFingerprint':fingerprint(request.model_dump()),'classification':classification,'flagProbability':pflag,'noiselessFlagProbability':noiseless_flag,'retention':r,'samplingOverhead':1/r if r>1e-12 else None,'keptShots':syn[zero],'discardedShots':N-syn[zero],'shots':N,
        'syndrome':{'probabilities':{key:p for key,(p,_) in probs.items()},'counts':syn,'noiselessProbabilities':{key:p for key,(p,_) in clean_p.items()},'noiselessCounts':clean_syn,'ordering':'Active helpers in descending displayed rail index; q0 is rightmost in separate data strings'},
        'states':{'ideal':stats(ideal,n,obs,0,seed,ideal),'unprotected':stats(bare,n,obs,N,seed,ideal),'unfiltered':stats(partial_trace(affected,list(range(n,n+k))),n,obs,0,seed,ideal,counts),'retained':stats(retained,n,obs,0,seed,ideal,kept)},
        'guidedSuccess':bool(guided),'sandboxSuccess':d.mode=='sandbox' and v['valid'] and request.faultsEnabled and nontrivial,'faults': [f.model_dump(exclude_none=True) for f in d.faults] if request.faultsEnabled else [],'durationMs':round((time.perf_counter()-started)*1000,2)}


def trace(request):
    d=request.draft.model_copy(update={'faults':[request.fault],'combineFaults':False})
    # Revalidate direct proposed targets and all draft constraints.
    d=type(d).model_validate(d.model_dump())
    result=run(request.model_copy(update={'draft':d,'faultsEnabled':True}))
    n=d.dataQubits;k=len(d.checks)
    chars=['I']*(n+k)
    for q in resolved_targets(request.fault,n,{a:n+i for i,a in enumerate(sorted(c.ancilla for c in d.checks))}): chars[-1-q]={'bit_flip':'X','phase_flip':'Z','pauli_y':'Y'}[request.fault.name]
    p=Pauli(''.join(chars));steps=[{'boundary':request.fault.boundary,'operator':p.to_label(),'gate':'Injected Pauli'}]
    for item in schedule(d,False,False):
        boundary=item.get('boundary',item.get('column',-1))
        if boundary<request.fault.boundary or item['name']=='measure':continue
        qc=QuantumCircuit(n+k);append_instruction(qc,item);p=p.evolve(Clifford(qc),frame='s')
        steps.append({'boundary':boundary,'operator':p.to_label(),'gate':item['stage']+' / '+item['name'].upper()})
    result['traceSteps']=steps
    return result


def coverage(request):
    v=validate(request)
    if not v['valid']:raise ValueError('Close and validate the full check schedule before sweeping faults.')
    d=request.draft;n=d.dataQubits;k=len(v['wireLabels'])-n;rows=[]
    all_items=schedule(d,False,False)
    for boundary in range(17):
        # Faults occur before every other event at this boundary.
        suffix=[item for item in all_items if item.get('boundary',item.get('column',-1))>=boundary]
        cliff=Clifford(circuit_from(suffix,n+k))
        for q in range(n):
            for axis in ('X','Z'):
                chars=['I']*(n+k);chars[-1-q]=axis
                propagated=Pauli(''.join(chars)).evolve(cliff,frame='s');_,taps=factors(propagated)
                flags=[a for a in range(k) if any(t['qubit']==n+a and t['pauli'] in ('X','Y') for t in taps)]
                rows.append({'boundary':boundary,'qubit':q,'pauli':axis,'flagProbability':float(bool(flags)),'helpers':flags,'propagated':propagated.to_label()})
    return {'fingerprint':v['fingerprint'],'probes':rows,'meaning':'Exact single-Pauli coverage through the entire validated Clifford schedule; not a channel/hardware score.'}
