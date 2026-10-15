import math
import time
from uuid import uuid4
import numpy as np
from qiskit.quantum_info import DensityMatrix, partial_trace
from ..learning.common import ordered, gate_instruction, instruction, evolve, branches, sample_joint, stats, fingerprint, resources, native_export
from ..learning.visualization import joint_frames


def pieces(request):
    c=request.experiment;b=c.noise.boundary
    return [gate_instruction(g,'Base A') for g in ordered(c.operations) if g.column<b],[gate_instruction(g,'Base B') for g in ordered(c.operations) if g.column>=b]


def generated(request):
    n=request.experiment.qubits;q=request.experiment.noise.targetQubit
    a,b=pieces(request);noise=request.experiment.noise.model_dump(exclude_none=True)
    e=instruction('noise',[q],'Explicit noise boundary',noise=noise,sourceId='noise')
    errors=[dict(e,qubits=[target]) for target in request.experiment.noise.targetQubits or [q]] if request.experiment.noise.enabled else []
    baseline=a+errors+b
    if request.technique=='mitigation':
        variants={f'Scale {scale}':a+[dict(item,stage=f'Noise copy {j+1}/{scale}') for j in range(scale) for item in errors]+b for scale in (1,3,5)}
        return variants,n,0,baseline
    if request.technique=='detection':
        tap=lambda:instruction('c'+request.detectionPauli.lower(),[n,q],'Controlled Pauli check')
        items=a+[instruction('h',[n],'Prepare ancilla'),tap()]+errors+[tap(),instruction('h',[n],'Read syndrome'),instruction('measure',[n],'Syndrome readout',bit=0)]+b
        return {'Detection':items},n+1,1,baseline
    r1,r2,s0,s1=n,n+1,n+2,n+3
    encode=[instruction('cx',[q,r1],'Encode'),instruction('cx',[q,r2],'Encode')]
    rotate=[instruction('h',[j],'Phase-code basis') for j in (q,r1,r2)] if request.correctionFamily=='phase_flip' else []
    parity=[instruction('cx',[q,s0],'Parity s0'),instruction('cx',[r1,s0],'Parity s0'),instruction('cx',[r1,s1],'Parity s1'),instruction('cx',[r2,s1],'Parity s1')]
    readout=[instruction('measure',[s0],'Measure s0',bit=0),instruction('measure',[s1],'Measure s1',bit=1)]
    recovery=[instruction('recovery',[wire],'Conditional recovery',condition=condition) for condition,wire in ((1,q),(3,r1),(2,r2))]
    decode=[instruction('cx',[q,r2],'Decode'),instruction('cx',[q,r1],'Decode')]
    physical=([dict(e,qubits=[j],stage='Independent physical noise') for j in (q,r1,r2)] if request.experiment.noise.enabled and q in (request.experiment.noise.targetQubits or [q]) else [])+[item for item in errors if item['qubits']!=[q]]
    items=a+encode+rotate+physical+rotate+parity+readout+recovery+decode+b
    return {'Correction':items},n+4,2,baseline


def preview(request):
    variants,width,k,baseline=generated(request)
    items=next(iter(variants.values()));n=request.experiment.qubits;N=request.shotsPerVariant
    processing={'detection':'Keep only syndrome 0; normalize by the number of retained shots. No recovery.',
        'mitigation':'Compose the actual local channel at factors 1, 3, 5; fit measured expectations. No repaired state.',
        'correction':'Measure (s0,s1); recover X on the decoder hypothesis; decode and retain all shots.'}[request.technique]
    extra=''
    if request.technique=='detection':extra="\nkept = {bits.split()[0]: count for bits, count in results['Detection'].items() if int(bits.split()[-1], 2)==0}\nprint('kept data counts', kept)\n"
    elif request.technique=='mitigation':
        weights=[13/12,1/3,-5/12] if request.zneFit=='linear' else [15/8,-5/4,3/8]
        extra=f"\nweights = {weights}\nvalues = [sum((1 if bits.split()[0][-1-{request.observable.qubit}]=='0' else -1)*count for bits,count in results[f'Scale {{factor}}'].items())/{N} for factor in (1,3,5)]\nprint('ZNE observable estimate (not a state)',sum(w*v for w,v in zip(weights,values)))\n"
    export_variants={'Ideal':pieces(request)[0]+pieces(request)[1],**({'Baseline':baseline} if request.technique!='mitigation' else {}),**variants}
    resource=resources(items,width,n,N*(3 if request.technique=='mitigation' else 1),N,N if request.technique=='mitigation' else 0)
    base_count=sum(len(i['qubits'])==2 for i in baseline if i['name']!='noise');resource['addedTwoQubitGates']=resource['twoQubitGates']-base_count
    resource['variantCount']=len(variants)
    return {'variants':variants,'wireLabels':[f'q{i}' for i in range(n)]+(['r1','r2','a0','a1'] if request.technique=='correction' else ['a0'] if k else []),
        'resources':resource,'processingRecipe':processing,'nativeCode':native_export(export_variants,width,n,k,N,request.sampleSeed,request.observable.basis,extra),'experimentFingerprint':fingerprint(request.experiment.model_dump())}


def correct(request,items):
    n=request.experiment.qubits;q=request.experiment.noise.targetQubit
    split=next(i for i,v in enumerate(items) if v['name']=='measure')
    state=evolve(items[:split],n+4)
    decoded=[];probabilities={}
    for key,(p,branch) in branches(state,n+2,2).items():
        probabilities[key]=p
        if branch is None:continue
        condition=int(key,2);recover={1:q,3:n,2:n+1}.get(condition)
        if recover is not None:branch=evolve([instruction('x',[recover],'Recovery')],n+2,branch)
        branch=evolve([instruction('cx',[q,n+1],'Decode'),instruction('cx',[q,n],'Decode')],n+2,branch)
        branch=partial_trace(branch,[n,n+1]);branch=evolve(pieces(request)[1],n,branch)
        decoded.append(p*DensityMatrix.from_label(key).tensor(branch).data)
    joint=DensityMatrix(np.sum(decoded,axis=0))
    return partial_trace(joint,[n,n+1]),joint,probabilities


def run(request):
    started=time.perf_counter();c=request.experiment;n=c.qubits;N=request.shotsPerVariant;seed=request.sampleSeed;obs=request.observable
    a,b=pieces(request);ideal=evolve(a+b,n)
    variants,width,k,baseline_items=generated(request);base=evolve(baseline_items,n)
    ideal_metrics=stats(ideal,n,obs,0,seed,ideal);baseline=stats(base,n,obs,N,seed,ideal)
    result={'runId':str(uuid4()),'experiment':c.model_dump(exclude_none=True),'contentVersion':'protection-basics-v1','engineVersion':'protection-lab-1.0.0','experimentFingerprint':fingerprint(c.model_dump()),'settingsFingerprint':fingerprint(request.model_dump()),'technique':request.technique,'status':'success',
        'ideal':ideal_metrics,'baseline':baseline,'warnings':[],'seed':seed,'shotsPerVariant':N,'observable':obs.model_dump(),**preview(request)}
    if request.technique=='mitigation':
        weights=[13/12,1/3,-5/12] if request.zneFit=='linear' else [15/8,-5/4,3/8]
        scales=[]
        for i,(label,items) in enumerate(variants.items()):
            st=stats(evolve(items,n),n,obs,N,(seed+i*104729)%2147483647,ideal)
            scales.append({'scale':(1,3,5)[i],'weight':weights[i],'state':st,'seed':(seed+i*104729)%2147483647})
        estimate=sum(s['weight']*s['state']['sampledExpectation'] for s in scales)
        exact=sum(s['weight']*s['state']['expectation'] for s in scales)
        variance=sum(s['weight']**2*(1-s['state']['sampledExpectation']**2)/(N-1) for s in scales)
        result.update(outputKind='observable_estimate',output=None,estimate=estimate,exactFitEstimate=exact,variance=variance,interval=[estimate-1.96*math.sqrt(variance),estimate+1.96*math.sqrt(variance)],scales=scales,fit=request.zneFit,processingSteps=[f"Factor {s['scale']}: measured E={s['state']['sampledExpectation']:.6f}; weight {s['weight']:.6f}" for s in scales]+[f'Weighted zero-noise intercept = {estimate:.6f}; not a physical state.'])
        if abs(estimate)>1:result['warnings'].append('Extrapolation overshot the physical observable range. The estimate is intentionally not clipped.')
        result['warnings'].append('Sampling interval is approximate and excludes extrapolation bias; near deterministic outcomes it can underestimate uncertainty.')
    elif request.technique=='detection':
        items=variants['Detection'];joint=evolve(items,width)
        result['frames']=joint_frames(joint,n,1,list(reversed(result['wireLabels'])))
        probs=branches(joint,n,1);r,retained=probs['0']
        syn,counts,kept=sample_joint(joint,n,1,obs.basis,N,seed)
        out=stats(retained,n,obs,0,seed,ideal,kept)
        result.update(outputKind='retained_state',output=out,retention=r,keptShots=syn['0'],discardedShots=syn['1'],samplingOverhead=1/r if r>1e-12 else None,syndrome={'probabilities':{key:v[0] for key,v in probs.items()},'counts':syn,'ordering':'a0'},unfiltered=stats(partial_trace(joint,[n]),n,obs,0,seed,ideal,counts),processingSteps=[f'{N} shots; syndrome 0: {syn["0"]}; syndrome 1: {syn["1"]}.','Keep syndrome 0 only; do not apply recovery.',f'Accepted data normalization denominator: {syn["0"]}.'])
    else:
        out_state,joint,probs=correct(request,variants['Correction']);syn,counts,_=sample_joint(joint,n,2,obs.basis,N,seed)
        correction_items=variants['Correction'];cut=next(i for i,item in enumerate(correction_items) if item['name']=='measure')
        result['frames']=joint_frames(evolve(correction_items[:cut],width),n+2,2,list(reversed(result['wireLabels'])))
        result['frames'].pop('joint-accepted',None) # QEC keeps every syndrome branch.
        out=stats(out_state,n,obs,0,seed,ideal,counts)
        result.update(outputKind='decoded_state',output=out,retention=1.,keptShots=N,discardedShots=0,correctionFamily=request.correctionFamily,syndrome={'probabilities':probs,'counts':syn,'ordering':'s1s0; teaching tuple (s0,s1) is reversed'},decoder=[{'register':key,'tuple':key[::-1],'hypothesis':{0:'None',1:'q'+str(c.noise.targetQubit),3:'r1',2:'r2'}[int(key,2)],'count':syn[key]} for key in probs],processingSteps=['Encode one selected data wire into correlations with r1 and r2.','Apply independent physical channels on the three encoded data wires.','Extract parity, apply conditional recovery to each quantum branch, decode and recombine.','Retain every shot; decoder hypotheses do not uniquely identify actual fault histories.'])
        result['warnings'].append('Restricted repetition code: only the selected single-X or single-Z family is protected. Three physical fault opportunities replace one unencoded noise location.')
    estimate=result.get('estimate') if request.technique=='mitigation' else (result['output']['sampledExpectation'] if result['output'] else None)
    target=ideal_metrics['expectation'];error=abs(estimate-target) if estimate is not None else None
    result.update(estimationError=error,baselineError=abs(baseline['sampledExpectation']-target),improvement=abs(baseline['sampledExpectation']-target)-error if error is not None else None,durationMs=round((time.perf_counter()-started)*1000,2))
    return result
