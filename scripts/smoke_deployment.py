"""Verify any local/deployed origin with the stored player requests.

Requires the development lock (httpx), not installed in the production bundle.
Does not trust a 200 page as proof of a passing level: executes actual API calls.
"""
import argparse
import json
from pathlib import Path
import time
import httpx

ROOT=Path(__file__).resolve().parents[1]


def check(base,timeout=60):
    rows=[]
    with httpx.Client(base_url=base.rstrip('/'),timeout=timeout,follow_redirects=True) as client:
        def call(path,body=None):
            started=time.perf_counter()
            response=client.get(path) if body is None else client.post(path,json=body)
            response.raise_for_status();elapsed=time.perf_counter()-started
            assert elapsed<timeout,(path,elapsed)
            rows.append(dict(path=path,seconds=elapsed,bytes=len(response.content),status=response.status_code))
            return response
        health=call('/api/health').json();assert health['status']=='ready'
        levels=call('/api/levels').json();assert len(levels)==10
        call('/')
        for kind,count in (('school',6),('mission',10)):
            for number in range(1,count+1):
                assert 'text/html' in call(f'/?{kind}={number}').headers['content-type']
        manifest=json.loads((ROOT/'public/tutorial-circuits/manifest.json').read_text())
        for name in manifest:
            image=call(f'/tutorial-circuits/{name}.png')
            assert image.content.startswith(b'\x89PNG\r\n\x1a\n')
        tutorials=json.loads((ROOT/'backend/reference_solutions/tutorials.json').read_text())['flightSchools']
        for ref in tutorials:
            number=ref['id']
            if number==1:
                result=call('/api/tutorial/noise-lab/run',ref['request']).json()
                assert result['states'] and result['sampleSeed']==2026
            elif number==2:
                for method in ref['methods']:
                    result=call('/api/tutorial/protection-lab/run',dict(experiment=ref['experiment'],technique=method)).json()
                    assert result['outputKind']
            else:
                result=call('/api/tutorial/timeline/run',dict(draft=ref['draft'],shots=1024,seed=2026)).json()
                assert result['validation']['valid'],(number,result['validation'])
                if number==6:
                    assert result['joint'].get('componentPayload'),'Deployment must return portable mixed-state components.'
                    assert result['score']>=result['qualificationThreshold']
                    reveal=call('/api/tutorial/timeline/reveal',dict(draft=ref['draft'],shots=1024,seed=2026)).json()
                    assert reveal['paulice']['available'] and reveal['paulice']['addedAncillas']<=1
                    capstone=json.loads((ROOT/'backend/reference_solutions/capstone.json').read_text())
                    assert abs(result['score']-capstone['reasonable'])<1e-9
                    assert result['minimumKept']==capstone['minimumKept']
                    for kind in ('baseline','everywhere','optimal','misplaced','tooSmall','overchecked'):
                        trial=call('/api/tutorial/timeline/run',dict(draft=capstone[kind+'Draft'],shots=1024,seed=2026)).json()
                        assert abs(trial['score']-capstone[kind])<1e-9,(kind,trial['score'])
                        assert trial['minimumKept']==capstone['minimumKept']
                        assert abs(trial['fidelity']-capstone['metrics'][kind]['fidelity'])<1e-9
                        assert abs(trial['retention']-capstone['metrics'][kind]['retention'])<1e-9
                        qualified=trial['validation']['valid'] and trial['score']>=trial['qualificationThreshold']
                        assert qualified==(kind!='baseline' and capstone[kind]>=capstone['target'])
        references=json.loads((ROOT/'backend/missions/references.json').read_text())
        for row in references['levels']:
            for kind in ('baseline','everywhere','reasonable','optimal','misplaced','tooSmall','overchecked'):
                body=dict(draft=row[kind+'Draft'])
                result=call('/api/missions/run',body).json()
                assert result['passed']==(kind!='baseline' and row[kind]>=row['target']),(row['id'],kind,result)
                assert abs(result['combinedScore']-row[kind])<1e-9,(row['id'],kind,result)
                assert result['protocol']==references['protocol']
                assert result['minimumKept']==row['minimumKept']
                assert abs(result['fidelity']-row['metrics'][kind]['fidelity'])<1e-9
                assert abs(result['retention']-row['metrics'][kind]['retention'])<1e-9
            print(f'Main {row["id"]}: passing references and failing controls match local scores',flush=True)
    return dict(origin=base,liveHost=base.startswith('https://'),requests=rows,
                maxSeconds=max(r['seconds'] for r in rows),scoreTolerance=1e-9,
                note='FS1–5 use experiment/knowledge evidence, not numeric pass scores. Browser tests certify their completion and ordered unlocks.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('url');parser.add_argument('--output',default='artifacts/deployment-smoke.json');parser.add_argument('--timeout',type=float,default=60)
    args=parser.parse_args();result=check(args.url,args.timeout)
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(result,indent=2)+'\n')
    print(f'PASS: {len(result["requests"])} requests; max {result["maxSeconds"]:.3f}s. Report: {path}')
