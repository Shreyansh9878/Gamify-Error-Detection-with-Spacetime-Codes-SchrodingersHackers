"""Exact small-system check physics with explicit, independent transport policy."""
from functools import lru_cache
from uuid import uuid4
import json
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Clifford, Operator, Pauli, partial_trace
from ..learning.common import ordered, instruction, gate_instruction, append_instruction, circuit_from, evolve, branches, sample_joint, stats, fingerprint, resources, native_export
from .models import Draft, NonCliffordDraft
from ..learning.noise_targets import resolved_targets
from ..learning.visualization import joint_frames


def product(taps, n):
    chars = ['I'] * n
    for tap in taps:
        chars[-1-tap.qubit] = tap.pauli
    return ''.join(chars)


def evolve_terms(terms, item, n):
    """Conjugate Hermitian Pauli expansions, never treating T as a Clifford."""
    output = {}
    if item['name'] in ('t', 'tdg'):
        q = item['qubits'][0]
        direction = 1 if item['name'] == 't' else -1
        for label, coefficient in terms.items():
            axis = label[-1-q]
            replacements = [(axis, 1)]
            if axis == 'X':
                replacements = [('X', 1/np.sqrt(2)), ('Y', direction/np.sqrt(2))]
            elif axis == 'Y':
                replacements = [('Y', 1/np.sqrt(2)), ('X', -direction/np.sqrt(2))]
            for new_axis, weight in replacements:
                chars = list(label); chars[-1-q] = new_axis
                key = ''.join(chars)
                output[key] = output.get(key, 0.) + coefficient * weight
    else:
        qc = QuantumCircuit(n); append_instruction(qc, item)
        clifford = Clifford(qc)
        for label, coefficient in terms.items():
            p = Pauli(label).evolve(clifford, frame='s')
            key = p.to_label()[-n:]
            output[key] = output.get(key, 0.) + coefficient * float(np.real((-1j)**int(p.phase)))
    return {label: float(c) for label, c in sorted(output.items()) if abs(c) > 1e-10}


def describe_terms(terms):
    if len(terms) == 1:
        label, c = next(iter(terms.items()))
        if abs(abs(c)-1) < 1e-8:
            return ('−' if c < 0 else '+') + label
    return ' '.join(f'{c:+.6f} {label}' for label, c in terms.items()) or '0'


def propagation(draft, check):
    n = draft.dataQubits
    terms = {product(check.openingTaps, n): 1.}
    supported = bool(check.openingTaps)
    steps = [{'label':'Opening', 'operator':describe_terms(terms), 'column':check.startBoundary, 'terms':terms.copy(), 'pauliOnly':True}]
    for gate in ordered(draft.payload):
        if not check.startBoundary <= gate.column < check.endBoundary:
            continue
        item = gate_instruction(gate)
        compatible = all(label[-1-gate.qubits[0]] in 'IZ' for label in terms) if gate.name in ('t','tdg') else True
        crossing_factor = next(iter(terms))[-1-gate.qubits[0]] if gate.name in ('t','tdg') and len(terms)==1 else None
        terms = evolve_terms(terms, item, n)
        pauli_only = len(terms) == 1 and abs(abs(next(iter(terms.values())))-1) < 1e-8
        supported = supported and compatible and pauli_only
        steps.append({'label':f'{gate.name.upper()}({",".join(map(str,gate.qubits))})', 'operator':describe_terms(terms), 'column':gate.column, 'terms':terms.copy(), 'pauliOnly':pauli_only, 'tCompatible':compatible if gate.name in ('t','tdg') else None,'crossingFactor':crossing_factor})
    single = len(terms) == 1 and abs(abs(next(iter(terms.values())))-1) < 1e-8
    label, coefficient = next(iter(terms.items())) if single else ('I'*n, 1)
    expected_taps = [{'qubit':q, 'pauli':axis} for q, axis in enumerate(reversed(label)) if axis != 'I'] if single else []
    sign = -1 if coefficient < 0 else 1
    match = bool(check.openingTaps and check.closingTaps) and single and product(check.closingTaps,n) == label and check.closingSign == sign
    return {'expected':describe_terms(terms), 'expectedTaps':expected_taps, 'sign':sign, 'steps':steps, 'match':bool(match), 'transportSupported':bool(supported), 'endpointPauli':single}


def fault_instruction(fault):
    if fault.name == 'decoherence':
        return instruction('noise',[fault.qubit],f'Wait {fault.timeUs} μs',noise={'channel':'decoherence','timeUs':fault.timeUs,'t1Us':fault.t1Us,'t2Us':fault.t2Us},boundary=fault.boundary)
    axis = {'bit_flip':'x','pauli_y':'y','phase_flip':'z'}[fault.name]
    return instruction(axis,[fault.qubit],f'Injected {axis.upper()} error',boundary=fault.boundary,errorRole=True)


def schedule(draft, faults=False, preparation=True, checks=True):
    n = draft.dataQubits
    active = sorted(draft.checks,key=lambda c:c.id) if checks else []
    mapping = {a:n+i for i,a in enumerate(sorted(c.ancilla for c in active))}
    items = [gate_instruction(g,'Input preparation') for g in ordered(draft.preparation)] if preparation else []
    for boundary in range(17):
        if faults:
            items += [dict(fault_instruction(f),qubits=[q]) for f in sorted(draft.faults,key=lambda f:(f.boundary,f.order)) if f.boundary == boundary for q in resolved_targets(f,n,mapping)]
        for check in reversed(active):
            if check.endBoundary != boundary: continue
            anc = mapping[check.ancilla]
            for tap in sorted(check.closingTaps,key=lambda t:t.qubit):
                items.append(instruction('c'+tap.pauli.lower(),[anc,tap.qubit],f'{check.id}: closing',boundary=boundary))
            if check.closingSign == -1: items.append(instruction('z',[anc],f'{check.id}: sign compensation',boundary=boundary))
            if check.closingHadamard: items.append(instruction('h',[anc],f'{check.id}: final H',boundary=boundary))
            if check.measure: items.append(instruction('measure',[anc],f'{check.id}: syndrome',bit=anc-n,boundary=boundary))
        for check in active:
            if check.startBoundary != boundary: continue
            anc = mapping[check.ancilla]
            if check.openingHadamard: items.append(instruction('h',[anc],f'{check.id}: opening H',boundary=boundary))
            for tap in sorted(check.openingTaps,key=lambda t:t.qubit):
                items.append(instruction('c'+tap.pauli.lower(),[anc,tap.qubit],f'{check.id}: opening',boundary=boundary))
        items += [gate_instruction(g) for g in ordered(draft.payload) if g.column == boundary]
    if len(items) > (192 if draft.NON_CLIFFORD else 160):
        raise ValueError('Generated implementation exceeds the instruction budget.')
    return items


@lru_cache(maxsize=128)
def identity_validation(raw, non_clifford):
    d = (NonCliffordDraft if non_clifford else Draft).model_validate_json(raw)
    n = d.dataQubits; k = len(d.checks)
    checks = []
    for c in d.checks:
        missing = [name for name,value in [('opening H',c.openingHadamard),('opening Pauli',c.openingTaps),('closing Pauli',c.closingTaps),('final H',c.closingHadamard),('measurement',c.measure)] if not value]
        checks.append({'id':c.id,'complete':not missing,'missing':missing,**propagation(d,c)})
    complete = bool(checks) and all(c['complete'] for c in checks)
    residual = None; valid_schedule = False
    if complete:
        actual = Operator(circuit_from(schedule(d,False,False),n+k)).data[:,:2**n]
        target = np.zeros_like(actual)
        target[:2**n,:] = Operator(circuit_from([gate_instruction(g) for g in ordered(d.payload)],n)).data
        overlap = np.vdot(target,actual)
        phase = overlap/abs(overlap) if abs(overlap)>1e-12 else 1.
        residual = float(np.linalg.norm(actual-phase*target))
        valid_schedule = residual < 1e-8
    match = bool(checks) and all(c['match'] for c in checks)
    supported = bool(checks) and all(c['transportSupported'] for c in checks)
    valid = complete and match and supported and valid_schedule
    message = 'Add the missing H, taps and measurement.' if not complete else 'Invariant closed — noiseless syndrome predicted 0.' if valid else 'Globally closed / outside stepwise Pauli mode.' if valid_schedule and match else 'Operator/sign mismatch or combined schedule conflict — false-alarm diagnostic.'
    return {'structureComplete':complete,'localOperatorMatch':match,'endpointOperatorMatch':match,'transportSupported':supported,'scheduleValid':valid_schedule,'valid':valid,'residual':residual,'checks':checks,'message':message,'classification':'incomplete' if not complete else 'valid' if valid else 'global_only' if valid_schedule and match else 'invalid_check'}


def validate(request):
    d = request.draft; n = d.dataQubits; k = len(d.checks)
    verdict = identity_validation(d.model_dump_json(),d.NON_CLIFFORD)
    items = schedule(d,request.faultsEnabled)
    variants = {'Ideal':schedule(d,False,True,False),'No faults':schedule(d,False),'Faulted':items}
    resource = resources(items,n+k,n,request.shotsPerVariant,request.shotsPerVariant)
    resource['cxEquivalent'] = sum(3 if i['name']=='swap' else 1 for i in items if len(i['qubits'])==2)
    resource['tCount'] = sum(g.name in ('t','tdg') for g in d.preparation+d.payload)
    return {**verdict,'instructions':items,'wireLabels':[f'q{q}' for q in range(n)]+[f'a{a}' for a in sorted(c.ancilla for c in d.checks)],'resources':resource,'nativeCode':native_export(variants,n+k,n,k,request.shotsPerVariant,request.sampleSeed,request.observable.basis,"\n# Accept the last register only when all active helper bits are zero.\nfor label, counts in results.items():\n    print(label, 'accepted', sum(v for bits,v in counts.items() if int(bits.split()[-1],2)==0))\n" if k else ''),'fingerprint':fingerprint(d.model_dump())}


def run(request):
    v = validate(request); d = request.draft
    if not v['structureComplete']: raise ValueError('Complete the physical H/tap/H/measurement assembly before Run.')
    n = d.dataQubits; k = len(d.checks); N = request.shotsPerVariant; seed = request.sampleSeed; obs = request.observable
    ideal = evolve(schedule(d,False,True,False),n)
    bare_d = d.model_copy(update={'faults':[f.model_copy(update={'targets':[t for t in f.targets if t.kind=='data']}) for f in d.faults if f.targets and any(t.kind=='data' for t in f.targets)]+[f for f in d.faults if f.targets is None]})
    bare = evolve(schedule(bare_d,request.faultsEnabled,True,False),n)
    clean = evolve(schedule(d,False),n+k)
    affected = evolve(schedule(d,request.faultsEnabled),n+k)
    probabilities = branches(affected,n,k); clean_probabilities = branches(clean,n,k)
    zero = '0'*k; retention, retained = probabilities[zero]
    syn, counts, kept = sample_joint(affected,n,k,obs.basis,N,seed)
    clean_syn,_,_ = sample_joint(clean,n,k,obs.basis,N,seed)
    c = d.checks[0]
    guided = d.mode=='guided' and not request.faultsEnabled
    xyz = lambda taps: [(t.qubit,t.pauli) for t in sorted(taps,key=lambda t:t.qubit)]
    four_success = guided and not d.NON_CLIFFORD and v['valid'] and xyz(c.openingTaps)==[(0,'X')] and xyz(c.closingTaps)==[(0,'X'),(1,'X')]
    barrier = guided and d.NON_CLIFFORD and xyz(c.openingTaps)==[(0,'X')] and xyz(c.closingTaps)==[(0,'X')] and c.closingSign==1
    compatible = d.NON_CLIFFORD and v['valid'] and any(step.get('crossingFactor')=='Z' for check in v['checks'] for step in check['steps'])
    nontrivial = any(f.name!='decoherence' or f.timeUs>0 for f in d.faults)
    classification = 'Globally closed / outside stepwise Pauli mode' if v['classification']=='global_only' else 'Invalid check / false-alarm diagnostic' if not v['valid'] else 'Valid — no faults' if not request.faultsEnabled or not d.faults else 'Flagged / caught' if retention<1e-8 else 'Not flagged' if retention>1-1e-8 else 'Probabilistic flagging'
    return {**v,'frames':joint_frames(affected,n,k,list(reversed(v['wireLabels']))),'classification':classification,'draft':d.model_dump(exclude_none=True),'observable':obs.model_dump(),'runId':str(uuid4()),'engineVersion':'advanced-lab-1.0.0','settingsFingerprint':fingerprint(request.model_dump()),'retention':retention,'samplingOverhead':1/retention if retention>1e-12 else None,'flagProbability':max(0.,1-retention),'noiselessFlagProbability':max(0.,1-clean_probabilities[zero][0]),'keptShots':syn[zero],'discardedShots':N-syn[zero],'shots':N,'guidedSuccess':bool(four_success),'barrierSuccess':bool(barrier),'compatibleSuccess':bool(compatible),'sandboxSuccess':d.mode=='sandbox' and v['valid'] and request.faultsEnabled and nontrivial,'syndrome':{'probabilities':{key:p for key,(p,_) in probabilities.items()},'counts':syn,'noiselessProbabilities':{key:p for key,(p,_) in clean_probabilities.items()},'noiselessCounts':clean_syn,'ordering':'Active helpers, descending displayed rail index'},'states':{'ideal':stats(ideal,n,obs,0,seed,ideal),'unprotected':stats(bare,n,obs,N,seed,ideal),'unfiltered':stats(partial_trace(affected,list(range(n,n+k))),n,obs,0,seed,ideal,counts),'retained':stats(retained,n,obs,0,seed,ideal,kept)}}


def trace(request):
    if request.fault.name=='decoherence': raise ValueError('Use Run for a channel; a wait has no unique Pauli trace.')
    d = type(request.draft).model_validate({**request.draft.model_dump(),'faults':[request.fault.model_dump()],'combineFaults':False})
    result = run(request.model_copy(update={'draft':d,'faultsEnabled':True}))
    n = d.dataQubits+len(d.checks)
    chars = ['I']*n
    mapping={a:d.dataQubits+i for i,a in enumerate(sorted(c.ancilla for c in d.checks))}
    for q in resolved_targets(request.fault,d.dataQubits,mapping):chars[-1-q]={'bit_flip':'X','pauli_y':'Y','phase_flip':'Z'}[request.fault.name]
    terms = {''.join(chars):1.}; steps = [{'boundary':request.fault.boundary,'operator':describe_terms(terms),'gate':'Injected Pauli'}]
    for item in schedule(d,False,False):
        b = item.get('boundary',item.get('column',-1))
        if b < request.fault.boundary or item['name']=='measure': continue
        terms = evolve_terms(terms,item,n)
        steps.append({'boundary':b,'operator':describe_terms(terms),'gate':item['stage']+' / '+item['name'].upper()})
    return {**result,'traceSteps':steps}


def coverage(request):
    d = request.draft; verdict = validate(request)
    if not verdict['valid']: raise ValueError('Validate a supported complete check before coverage.')
    n = d.dataQubits; k = len(d.checks)
    positions = [(b,q,axis) for b in range(17) for q in range(n) for axis in 'XYZ']
    start = getattr(request,'cursor',0); page = positions[start:start+32] if d.NON_CLIFFORD else positions
    rows = []
    if not d.NON_CLIFFORD:
        items = schedule(d,False,False)
        for b,q,axis in page:
            suffix = [i for i in items if i.get('boundary',i.get('column',-1))>=b]
            chars = ['I']*(n+k); chars[-1-q]=axis
            p = Pauli(''.join(chars)).evolve(Clifford(circuit_from(suffix,n+k)),frame='s')
            label = p.to_label()[-n-k:]
            flags = [a for a in range(k) if label[-1-n-a] in 'XY']
            rows.append({'boundary':b,'qubit':q,'pauli':axis,'flagProbability':float(bool(flags)),'helpers':flags,'propagated':p.to_label()})
    else:
        # These are exact fixed-input channel probes, not a Clifford surrogate.
        for b,q,axis in page:
            data = d.model_dump(); data.update(combineFaults=False,faults=[{'id':'coverage-fault','name':{'X':'bit_flip','Y':'pauli_y','Z':'phase_flip'}[axis],'qubit':q,'boundary':b,'order':0}])
            probe = type(d).model_validate(data)
            state = evolve(schedule(probe,True),n+k)
            r,_ = branches(state,n,k)['0'*k]
            rows.append({'boundary':b,'qubit':q,'pauli':axis,'flagProbability':max(0.,1-r),'helpers':[],'propagated':'Exact fixed-input quantum-channel probe'})
    next_cursor = start+len(page) if start+len(page)<len(positions) else None
    return {'fingerprint':verdict['fingerprint'],'probes':rows,'nextCursor':next_cursor,'total':len(positions),'meaning':'Exact fixed-input probes; not input-independent coverage.' if d.NON_CLIFFORD else 'Exact whole-schedule Clifford X/Y/Z coverage.'}
