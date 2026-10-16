"""Calibrate/verify player-reachable Trusted Fidelity references.

python scripts/validate_main_levels.py --calibrate
python scripts/validate_main_levels.py --optimize
"""
import argparse
import json
from pathlib import Path
import sys
from importlib.metadata import version
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.missions.levels import get_level
from backend.missions.models import Draft
from backend.missions.reference import empty,shell,optimize,overcheck,scored_candidates
from backend.missions.service import _run,_validate,validate,PROTOCOL
from backend.quantum_core.scoring import trusted_fidelity

PATH=Path(__file__).resolve().parents[1]/'backend/missions/references.json'
KINDS=('baseline','everywhere','reasonable','optimal','misplaced','tooSmall','overchecked')
# Rounded targets gently plateau to retain the T-level headroom. Calibration
# changes no circuit, noise parameter or helper resource.
TARGETS=(.63,.64,.65,.66,.66,.67,.67,.67,.67,.67)
SCOPE='Exact maximum over all nonidentity single-helper Pauli products in the five declared windows. Not a global optimum over arbitrary multi-helper circuits.'


def value(result,budget):
    return trusted_fidelity(result['fidelity'],result['retention'],budget)


def calibrate():
    rows=[]
    for number,target in enumerate(TARGETS,1):
        level=get_level(number)
        candidates=list(scored_candidates(number))
        unchecked=empty(number);blanket=overcheck(number)
        baseline=_run(unchecked.model_dump_json());everywhere=_run(blanket.model_dump_json())
        selected=None
        for cents in range(99,0,-1):
            budget=cents/100
            if budget<=everywhere['retention']:continue
            ordered=sorted(candidates,key=lambda c:value(c,budget),reverse=True)
            best=ordered[0];maximum=value(best,budget)
            position=(target-baseline['fidelity'])/(maximum-baseline['fidelity'])
            plausible=[c for c in ordered if target+.030001<=value(c,budget)<maximum-1e-8]
            if .60<=position<=.80 and plausible:
                reasonable=min(plausible,key=lambda c:(sum(g['name'] in ('cx','cy','cz') for g in c['draft']['operations']),abs(value(c,budget)-target-.05)))
                selected=budget,best,reasonable
                break
        if selected is None:raise AssertionError(f'No noise-preserving calibration satisfies level {number}.')
        budget,best,reasonable=selected
        misplaced=shell(number,'I'*(level['qubits']-1)+'X',0,1)
        h=level['noise']['hotspotColumn']
        too_small=shell(number,'I'*(level['qubits']-2)+'ZI',h,h+1)
        rc=sum(g['name'] in ('cx','cy','cz') for g in validate(Draft.model_validate(reasonable['draft']))['operations'])
        bigger=[c for c in candidates if sum(g['name'] in ('cx','cy','cz') for g in validate(Draft.model_validate(c['draft']))['operations'])>rc]
        overchecked=min(bigger,key=lambda c:(sum(g['name'] in ('cx','cy','cz') for g in validate(Draft.model_validate(c['draft']))['operations']),abs(value(c,budget)-target)))
        drafts=dict(baseline=unchecked.model_dump(),everywhere=blanket.model_dump(),reasonable=reasonable['draft'],optimal=best['draft'],
                    misplaced=misplaced.model_dump(),tooSmall=too_small.model_dump(),overchecked=overchecked['draft'])
        metrics={k:_run(Draft.model_validate(d).model_dump_json()) for k,d in drafts.items()}
        row=dict(id=number,qubits=level['qubits'],ancillas=level['ancillas'],tCount=sum(g['name'] in ('t','tdg') for g in level['payload']),
                 minimumKept=budget,target=target,spread=0.,initialMinimumKept=.60 if number<=3 else .50,
                 optimizer=dict(kind='custom-t-pauli-search' if number>=8 else 'clifford-pauli-reference-search',pauliceUsed=False,candidateCount=len(candidates),scope=SCOPE),
                 metrics={k:dict(fidelity=v['fidelity'],retention=v['retention'],correct_shot_yield=v['correct_shot_yield'],score=value(v,budget)) for k,v in metrics.items()})
        row.update({k:value(v,budget) for k,v in metrics.items()})
        row.update({k+'Draft':v for k,v in drafts.items()})
        rows.append(row)
        print(f'{number}: budget={budget:.2f} target={target:.2f} reasonable={row["reasonable"]:.6f} best={row["optimal"]:.6f}',flush=True)
    PATH.write_text(json.dumps(dict(protocol=PROTOCOL,score='Trusted Fidelity; backend.quantum_core.scoring.trusted_fidelity',
        calibration='Noise unchanged. Highest two-decimal budget below 1 satisfying retention penalty and 60–80% target position; targets gently plateau.',
        packages={name:version(name) for name in ('qiskit','qiskit-aer','qiskit-paulice','numpy')},levels=rows),indent=2)+'\n',encoding='utf-8')


def assert_target_validity(row,metrics):
    t=row['target'];b=row['minimumKept']
    assert metrics['baseline']['fidelity']<t, 'Baseline must fail on fidelity itself.'
    assert row['baseline']<=t-.05 and row['everywhere']<=t-.05
    assert row['reasonable']>=t+.03 and row['optimal']>row['reasonable']
    assert row['misplaced']<t
    assert .60<=(t-row['baseline'])/(row['optimal']-row['baseline'])<=.80
    # Retention contributes a real penalty; fidelity can also contribute.
    assert metrics['everywhere']['retention']<b
    assert row['everywhere']<metrics['everywhere']['fidelity']
    assert row['everywhere']<row['reasonable']


def verify(reoptimize=False):
    data=json.loads(PATH.read_text(encoding='utf-8'));last_size=4;last_depth=3;last_target=.62
    assert data['protocol']==PROTOCOL
    for row in data['levels']:
        number=row['id'];level=get_level(number);size=len(level['payload'])
        assert size>last_size;last_size=size
        from backend.missions.service import qc_for,payload
        depth=qc_for(payload(level),level['qubits']).depth();assert depth>last_depth;last_depth=depth
        assert level['qubits']>=(2 if number==1 else 3) and level['ancillas']==row['ancillas']
        assert row['tCount']==({8:1,9:3,10:5}.get(number,0))
        assert row['target']>=last_target;last_target=row['target']
        metrics={}
        for kind in KINDS:
            draft=Draft.model_validate(row[kind+'Draft']);assert draft.levelId==number
            if kind!='baseline':assert validate(draft)['valid'],(number,kind,validate(draft))
            samples=[]
            for _ in range(3):
                _run.cache_clear();result=_run(draft.model_dump_json());samples.append(result['combinedScore'])
            assert max(samples)-min(samples)<1e-12
            assert abs(samples[0]-row[kind])<1e-9,(number,kind,samples[0],row[kind])
            assert result['passed']==(kind!='baseline' and row[kind]>=row['target'])
            for metric in ('fidelity','retention','correct_shot_yield'):
                assert abs(result[metric]-row['metrics'][kind][metric])<1e-9
            metrics[kind]=result
        assert_target_validity(row,metrics)
        if reoptimize:assert abs(optimize(number)['best']['score']-row['optimal'])<1e-9
        print(f'Mission {number}: seven references valid, required margins and exact spread 0',flush=True)
    return data


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--calibrate',action='store_true');parser.add_argument('--optimize',action='store_true');args=parser.parse_args()
    if args.calibrate:calibrate();_run.cache_clear();_validate.cache_clear()
    verify(args.optimize)
