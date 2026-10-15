"""Offline exhaustive catalogue builder. Never invoked by a web request."""
import argparse
import json
from datetime import datetime, timezone
from importlib.metadata import version
from itertools import permutations
from ..learning.common import fingerprint, resources
from .fixture import manifest, WINDOWS
from .models import ActiveRail, Strategy
from .scheduler import expected, construction, schedule, canonical
from .service import exact_metrics, ARTIFACT, benchmark


def catalogue():
    candidates = []
    for start,end in WINDOWS:
        for q in range(3):
            for axis in 'XYZ':
                rail = ActiveRail(ancilla=0,active=True,startBoundary=start,endBoundary=end,openingTaps=[{'qubit':q,'pauli':axis}])
                p = expected(rail)
                candidates.append(ActiveRail(**{**rail.model_dump(),'closingTaps':p['expectedTaps'],'closingSign':p['sign']}))
    return candidates


def strategies():
    candidates = catalogue()
    yield Strategy(rails=[{'ancilla':a,'active':False} for a in range(2)])
    for rail in candidates:
        yield Strategy(rails=[rail,{'ancilla':1,'active':False}])
    for first,second in permutations(candidates,2):
        yield Strategy(rails=[first,second.model_copy(update={'ancilla':1})])


def make_record(strategy,metrics):
    r = resources(schedule(strategy),3+metrics['activeCheckCount'],3,1024,1024)
    return {'id':fingerprint(canonical(strategy)),'canonicalStrategy':canonical(strategy),'fidelity':metrics['fidelityExact'],'retention':metrics['retentionExact'],'score':metrics['scoreExact'],'resources':r}


def choose(records):
    maximum = max(r['score'] for r in records)
    ties = [r for r in records if abs(r['score']-maximum)<=1e-10]
    ties.sort(key=lambda r:(r['resources']['twoQubitGates'],r['resources']['addedQubits'],r['resources']['depth'],r['id']))
    return ties[0], [r['id'] for r in ties]


def build():
    records = []; total = 0
    for total,strategy in enumerate(strategies(),1):
        verdict = construction(strategy.model_dump_json())
        if verdict['valid']:
            metrics = exact_metrics(strategy.model_dump_json())
            records.append(make_record(strategy,metrics))
        if total%100==0: print(f'Enumerated {total}/1297; valid {len(records)}',flush=True)
    eligible = [r for r in records if r['resources']['addedQubits']>0 and r['fidelity'] is not None and r['fidelity']>=.90-1e-10]
    best,ties = choose(eligible); unconstrained,_ = choose(records)
    nonempty, nonempty_ties = choose([r for r in records if r['resources']['addedQubits']>0])
    pareto = [r for r in records if not any(o['fidelity']>=r['fidelity']-1e-10 and o['retention']>=r['retention']-1e-10 and (o['fidelity']>r['fidelity']+1e-10 or o['retention']>r['retention']+1e-10) for o in records)]
    data = {'artifactVersion':1,**{k:v for k,v in manifest().items() if k.endswith('Version')},'manifestHash':fingerprint(manifest()),'catalogueHash':fingerprint([r.model_dump() for r in catalogue()]),'payloadHash':fingerprint(manifest()['payload']),'noiseHash':fingerprint([manifest()['dataNoise'],manifest()['tapNoise']]),'engineVersions':{p:version(p) for p in ('qiskit','qiskit-aer')},'tolerance':1e-10,'structuralCandidateCount':total,'validCandidateCount':len(records),'evaluatedCandidateCount':len(records),'enumerationComplete':True,'qualityFloor':.90,'tieBreakPolicy':'score within 1e-10, fewer taps, helpers, logical depth, canonical hash','bestNonempty':nonempty,'nonemptyTiedBestIds':nonempty_ties,'bestQualityEligible':best,'bestUnconstrained':unconstrained,'tiedBestIds':ties,'paretoPoints':pareto,'generatedAt':datetime.now(timezone.utc).isoformat()}
    ARTIFACT.parent.mkdir(parents=True,exist_ok=True)
    ARTIFACT.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(f'Completed {total} candidates; {len(records)} valid; best quality-eligible score {best["score"]:.10f}',flush=True)


def verify():
    data = benchmark()
    assert data['available'] and data['structuralCandidateCount']==1297
    assert data['catalogueHash']==fingerprint([r.model_dump() for r in catalogue()])
    for record in [data['bestQualityEligible'],data['bestNonempty'],data['bestUnconstrained']]:
        strategy = Strategy(**record['canonicalStrategy'])
        metrics = exact_metrics(strategy.model_dump_json())
        assert metrics['valid'] and abs(metrics['scoreExact']-record['score'])<1e-8
    print('Benchmark hashes, enumeration certificate and winning strategies verified.')


if __name__=='__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--verify',action='store_true')
    if parser.parse_args().verify: verify()
    else: build()
