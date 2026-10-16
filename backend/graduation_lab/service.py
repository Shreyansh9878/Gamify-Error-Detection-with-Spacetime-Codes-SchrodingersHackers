from functools import lru_cache
from pathlib import Path
from importlib.metadata import version
from uuid import uuid4
import json
import numpy as np
from qiskit.quantum_info import DensityMatrix, Statevector, partial_trace
from ..learning.common import circuit_from, evolve, branches, sample_joint, stats, resources, native_export, fingerprint
from ..learning.visualization import joint_frames
from .fixture import manifest, FIXTURE, METRIC
from .models import Strategy
from .scheduler import schedule, construction, canonical

ARTIFACT = Path(__file__).parent/'data'/'graduation-fixture-v1-benchmark.json'


@lru_cache(maxsize=1)
def ideal_target():
    empty = Strategy(rails=[{'ancilla':a,'active':False} for a in range(2)])
    return Statevector.from_instruction(circuit_from(schedule(empty,False,False),3))


def overlay_schedule(strategy, overlay):
    from ..advanced_lab.service import fault_instruction
    from ..learning.noise_targets import resolved_targets
    mapping={r.ancilla:3+i for i,r in enumerate(sorted((r for r in strategy.rails if r.active),key=lambda r:r.ancilla))}
    result=[];done=set()
    for item in schedule(strategy):
        boundary=item.get('boundary',item.get('column',0))
        if boundary not in done:
            result += [dict(fault_instruction(f),qubits=[q],stage='Diagnostic overlay — not qualifying') for f in sorted(overlay,key=lambda f:(f.boundary,f.order)) if f.boundary==boundary for q in resolved_targets(f,3,mapping)]
            done.add(boundary)
        result.append(item)
    # Empty boundaries still need a real insertion before the next workload event.
    for f in overlay:
        if f.boundary not in done:
            additions=[dict(fault_instruction(f),qubits=[q],stage='Diagnostic overlay — not qualifying') for q in resolved_targets(f,3,mapping)]
            index=next((i for i,item in enumerate(result) if item.get('boundary',item.get('column',0))>=f.boundary),len(result))
            result[index:index]=additions
    return result


def state_and_metrics(strategy, overlay=()):
    k = sum(r.active for r in strategy.rails)
    state = evolve(overlay_schedule(strategy,overlay) if overlay else schedule(strategy),3+k)
    p, retained = branches(state,3,k)['0'*k]
    # Exact pure-target overlap of the unnormalized accepted data block.
    block = state.data[:8,:8]
    target = ideal_target().data
    score = min(1.,max(0.,float(np.vdot(target,block@target).real)))
    fidelity = min(1.,score/p) if p>1e-12 else None
    return state, retained, {'fidelityExact':fidelity,'retentionExact':p,'scoreExact':score if p>1e-12 else 0.,'samplingOverhead':1/p if p>1e-12 else None}


@lru_cache(maxsize=2048)
def exact_metrics(raw):
    strategy = Strategy.model_validate_json(raw)
    verdict = construction(raw)
    _,_,metrics = state_and_metrics(strategy)
    return {**metrics,'valid':verdict['valid'],'activeCheckCount':verdict['activeCheckCount']}


def validate(request):
    strategy = request.strategy; k = sum(r.active for r in strategy.rails)
    items = schedule(strategy)
    resource = resources(items,3+k,3,request.shotsPerVariant,request.shotsPerVariant)
    resource['cxEquivalent'] = resource['twoQubitGates']
    resource['addedTwoQubitGates'] = resource['twoQubitGates']-3
    base_resource = resources(schedule(strategy,True,False),3,3,request.shotsPerVariant,0)
    resource['addedDepth'] = resource['depth']-base_resource['depth']
    code = native_export({'Ideal':schedule(strategy,False,False),'Baseline':schedule(strategy,True,False),'Checked':items},3+k,3,k,request.shotsPerVariant,request.sampleSeed,request.observable.basis,"\n# All active helper bits must be zero. Check taps include noisy pair channels.\n")
    code = code.replace('helpers are ideal.','each controlled check tap has two-qubit depolarizing noise (lambda=0.005).')
    return {**construction(strategy.model_dump_json()),'instructions':items,'wireLabels':['q0','q1','q2']+[f'a{r.ancilla}' for r in sorted(strategy.rails,key=lambda r:r.ancilla) if r.active],'resources':resource,'nativeCode':code,'fingerprint':fingerprint(canonical(strategy)),**{k:v for k,v in manifest().items() if k.endswith('Version')}}


def run(request, overlay=()):
    v = validate(request)
    if not v['structureComplete']: raise ValueError('Select a closing product before running.')
    strategy = request.strategy; k = v['activeCheckCount']; N = request.shotsPerVariant; seed = request.sampleSeed; obs = request.observable
    state, retained, metrics = state_and_metrics(strategy,overlay)
    ideal = DensityMatrix(ideal_target())
    bare = evolve(schedule(strategy,True,False),3)
    probabilities = branches(state,3,k)
    syn,counts,kept = sample_joint(state,3,k,obs.basis,N,seed)
    zero = '0'*k; r = metrics['retentionExact']; f = metrics['fidelityExact']
    eligible = v['valid'] and k>0
    quality = bool(eligible and f is not None and f>=.90-1e-10)
    qualifies = not overlay and eligible and metrics['scoreExact']>=.65-1e-10
    clean = evolve(schedule(strategy,False),3+k)
    clean_syn,_,_ = sample_joint(clean,3,k,obs.basis,N,seed)
    clean_p = branches(clean,3,k)
    return {**v,**metrics,'strategy':strategy.model_dump(),'canonicalStrategy':canonical(strategy),'runId':str(uuid4()),'settingsFingerprint':fingerprint(request.model_dump()),'observable':obs.model_dump(),'shots':N,'seed':seed,'qualityEligible':quality,'qualifies':bool(qualifies),'diagnosticOverlay':bool(overlay),'classification':'Diagnostic Overlay — not a qualifying run' if overlay else 'Unchecked baseline' if k==0 else 'Valid — noisy checks' if v['valid'] else 'Invalid check / false-alarm diagnostic','keptShots':syn[zero],'discardedShots':N-syn[zero],'retention':r,'scoreSampled':f*syn[zero]/N if f is not None else 0.,'flagProbability':max(0.,1-r),'noiselessFlagProbability':max(0.,1-clean_p[zero][0]),'syndrome':{'probabilities':{key:p for key,(p,_) in probabilities.items()},'counts':syn,'noiselessProbabilities':{key:p for key,(p,_) in clean_p.items()},'noiselessCounts':clean_syn,'ordering':'Active displayed rails, descending order; empty key means no active helper'},'frames':joint_frames(state,3,k,list(reversed(v['wireLabels']))),'states':{'ideal':stats(ideal,3,obs,0,seed,ideal),'unprotected':stats(bare,3,obs,N,seed,ideal),'unfiltered':stats(partial_trace(state,list(range(3,3+k))) if k else state,3,obs,0,seed,ideal,counts),'retained':stats(retained,3,obs,0,seed,ideal,kept)}}


def benchmark(fixture_version=FIXTURE):
    if fixture_version != FIXTURE: raise ValueError('Unknown capstone fixture version.')
    try:
        data = json.loads(ARTIFACT.read_text(encoding='utf-8'))
        if data['manifestHash'] != fingerprint(manifest()) or not data['enumerationComplete'] or data['evaluatedCandidateCount'] != data['validCandidateCount']:
            raise ValueError('Benchmark version mismatch.')
        if data.get('engineVersions')!={p:version(p) for p in ('qiskit','qiskit-aer')}:raise ValueError('Benchmark engine version mismatch.')
        from .benchmark import catalogue
        if data.get('metricVersion')!=METRIC or data.get('catalogueHash')!=fingerprint([r.model_dump() for r in catalogue()]) or data.get('payloadHash')!=fingerprint(manifest()['payload']) or data.get('noiseHash')!=fingerprint([manifest()['dataNoise'],manifest()['tapNoise']]):
            raise ValueError('Benchmark certificate hash mismatch.')
        winner=Strategy(**data['bestNonempty']['canonicalStrategy'])
        metrics=exact_metrics(winner.model_dump_json())
        if not metrics['valid'] or metrics['activeCheckCount']==0 or abs(metrics['scoreExact']-data['bestNonempty']['score'])>1e-8:
            raise ValueError('Benchmark winner failed exact revalidation.')
        return {'available':True,**data}
    except (OSError,ValueError,KeyError):
        return {'available':False,'message':'Matching benchmark unavailable. Qualification is safe; acknowledge this limitation to graduate.'}


def reveal(request):
    metrics=exact_metrics(request.strategy.model_dump_json())
    if not (metrics['valid'] and metrics['activeCheckCount']>0 and metrics['scoreExact']>=.65-1e-10):
        raise ValueError('Reveal requires a valid nonempty strategy with exact score at least 0.65.')
    try:
        from .paulice_adapter import suggest
        research=suggest()
    except ImportError:
        research={'available':False,'message':'qiskit-paulice is unavailable on this engine. Qualification remains saved; acknowledge the limitation or retry after restoring the dependency.'}
    return {**benchmark(request.fixtureVersion),'player':{**metrics,'canonicalStrategy':canonical(request.strategy)},'paulice':research}


def diagnostic(request):
    result=run(request,request.overlay)
    items=overlay_schedule(request.strategy,request.overlay)
    k=result['activeCheckCount']
    result['instructions']=items
    result['nativeCode']=native_export({'Diagnostic overlay':items},3+k,3,k,request.shotsPerVariant,request.sampleSeed,request.observable.basis)
    return result
