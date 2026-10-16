"""Calibrate or verify every reachable main mission reference solution.

Run: python scripts/validate_main_levels.py --calibrate (explicit fixture update)
     python scripts/validate_main_levels.py             (regression validation)
     python scripts/validate_main_levels.py --optimize  (recompute finite search)
"""
import argparse
import json
import math
from pathlib import Path
import sys
from importlib.metadata import version
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.missions.levels import get_level
from backend.missions.models import Draft
from backend.missions.reference import empty,shell,optimize,overcheck
from backend.missions.service import _run,_validate,validate,PROTOCOL
from backend.learning.common import fingerprint

PATH=Path(__file__).resolve().parents[1]/'backend/missions/references.json'


def calibrate():
    rows=[]
    for number in range(1,11):
        l=get_level(number)
        cache=PATH.parent/f'.optimizer-{number}.json'
        physics=fingerprint({k:v for k,v in l.items() if k not in ('targetScore','overview')})
        if cache.exists() and json.loads(cache.read_text())['physics']==physics:
            best=json.loads(cache.read_text())['result']
        else:
            best=optimize(number)
            cache.write_text(json.dumps(dict(physics=physics,result=best)),encoding='utf-8')
        unchecked=empty(number); baseline=_run(unchecked.model_dump_json())['combinedScore']
        everywhere=overcheck(number)
        # A longer, easy-to-find window with a single X on the hot q1.
        h=l['noise']['hotspotColumn']
        reasonable=shell(number,'I'*(l['qubits']-2)+'XI',max(0,h-1),h+(4 if number>=8 else 1))
        r=_run(reasonable.model_dump_json())['combinedScore']; e=_run(everywhere.model_dump_json())['combinedScore']
        o=best['best']['score']
        target=math.floor((baseline+(.65+.013*number)*(o-baseline))*100)/100
        assert max(baseline,e)+.005<target<r-.005<o, (number,baseline,e,r,o,target)
        row=dict(id=number,qubits=l['qubits'],ancillas=l['ancillas'],tCount=sum(g['name'] in ('t','tdg') for g in l['payload']),
                 baseline=baseline,everywhere=e,reasonable=r,optimal=o,target=target,spread=0.,
                 baselineDraft=unchecked.model_dump(),everywhereDraft=everywhere.model_dump(),reasonableDraft=reasonable.model_dump(),
                 optimalDraft=best['best']['draft'],optimizer={k:v for k,v in best.items() if k!='best'})
        rows.append(row);print(f'{number}: baseline={baseline:.6f} everywhere={e:.6f} reasonable={r:.6f} optimum={o:.6f} target={target:.2f}',flush=True)
    PATH.write_text(json.dumps(dict(protocol=PROTOCOL,score='F_ps * S_keep; exact density-matrix expectation',
        packages={name:version(name) for name in ('qiskit','qiskit-aer','qiskit-paulice','numpy')},levels=rows),indent=2)+'\n',encoding='utf-8')


def verify(reoptimize=False):
    data=json.loads(PATH.read_text(encoding='utf-8'));last_size=4;last_depth=3
    assert data['protocol']==PROTOCOL
    for row in data['levels']:
        number=row['id'];l=get_level(number);size=len(l['payload'])
        assert size>last_size;last_size=size
        from backend.missions.service import qc_for,payload
        depth=qc_for(payload(l),l['qubits']).depth()
        assert depth>last_depth;last_depth=depth
        assert l['qubits']>=(2 if number==1 else 3) and l['ancillas']==row['ancillas']
        assert row['tCount']==({8:1,9:3,10:5}.get(number,0))
        scores={}
        for kind in ('baseline','everywhere','reasonable','optimal'):
            d=Draft.model_validate(row[kind+'Draft']);assert d.levelId==number
            if kind!='baseline':assert validate(d)['valid'],(number,kind,validate(d))
            samples=[]
            for _ in range(3):
                _run.cache_clear(); result=_run(d.model_dump_json());samples.append(result['combinedScore'])
            spread=max(samples)-min(samples);assert spread<1e-12
            assert abs(samples[0]-row[kind])<1e-9,(number,kind,samples[0],row[kind])
            assert result['passed']==(kind in ('reasonable','optimal'))
            scores[kind]=samples[0]
        assert max(scores['baseline'],scores['everywhere'])+.005<row['target']<scores['reasonable']-.005
        assert scores['reasonable']<scores['optimal']
        assert .60<=(row['target']-scores['baseline'])/(scores['optimal']-scores['baseline'])<=.80
        if reoptimize:assert abs(optimize(number)['best']['score']-row['optimal'])<1e-9
        print(f'Mission {number}: all references valid, exact spread 0',flush=True)
    return data


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--calibrate',action='store_true');parser.add_argument('--optimize',action='store_true');args=parser.parse_args()
    if args.calibrate:calibrate();_run.cache_clear();_validate.cache_clear()
    verify(args.optimize)
