"""Section-2 measurements only: does not configure or deploy any service.

Run with the development venv. Each sample launches a fresh interpreter, pins
it to one available CPU, and calls the real ASGI app without network latency.
Cloud image boot/download latency is deliberately not called a local cold start.
"""
import argparse
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
CASES=('health','main10-reasonable','main10-seven-wires','sandbox-seven-wires-1024','fs6-reveal','fs2-correction-1024')


def request_for(case):
    if case=='health':return '/api/health',None
    if case.startswith('main10'):
        rows=json.loads((ROOT/'backend/missions/references.json').read_text())['levels']
        key='reasonableDraft' if case.endswith('reasonable') else 'everywhereDraft'
        return '/api/missions/run',{'draft':rows[9][key]}
    refs=json.loads((ROOT/'backend/reference_solutions/tutorials.json').read_text())['flightSchools']
    if case=='fs6-reveal':return '/api/tutorial/timeline/reveal',{'draft':refs[5]['draft'],'shots':1024,'seed':2026}
    if case=='fs2-correction-1024':
        experiment=refs[1]['experiment'].copy();experiment['qubits']=3
        return '/api/tutorial/protection-lab/run',dict(experiment=experiment,technique='correction',shotsPerVariant=1024)
    gates=[]
    def add(name,qubits,column,**extra):
        gates.append(dict(id=f'g{len(gates)}',name=name,qubits=qubits,column=column,**extra))
    add('h',[5],0);add('h',[6],0)
    add('cz',[5,4],1);add('cz',[6,4],2)
    for name,qs,column in [('h',[0],2),('h',[2],2),('cx',[0,1],3),('t',[0],4),('tdg',[1],5),
                           ('cx',[1,2],6),('tdg',[2],7),('cz',[2,3],8),('t',[3],9),('h',[3],10),('t',[4],11)]:
        add(name,qs,column+1)
    add('decoherence',list(range(5)),13,timeUs=40.,t1Us=100.,t2Us=80.)
    add('cz',[5,4],14);add('h',[5],15);add('m',[5],16)
    add('cz',[6,4],17);add('h',[6],18);add('m',[6],19)
    draft=dict(version=2,lesson=5,mode='sandbox',dataQubits=5,ancillas=2,columns=21,operations=gates)
    return '/api/tutorial/timeline/run',dict(draft=draft,shots=1024,seed=2026)


def child(case,entrypoint):
    import psutil
    process=psutil.Process()
    if hasattr(process,'cpu_affinity'):
        allowed=process.cpu_affinity();process.cpu_affinity([allowed[0]])
    started=time.perf_counter()
    from importlib import import_module
    app=import_module(entrypoint).app
    imported=time.perf_counter()
    from fastapi.testclient import TestClient
    client=TestClient(app)
    path,body=request_for(case);samples=[];bytes_returned=[];result=None
    for _ in range(3):
        before=time.perf_counter()
        response=client.get(path) if body is None else client.post(path,json=body)
        elapsed=time.perf_counter()-before
        if response.status_code!=200:raise RuntimeError(f'{case}: {response.status_code} {response.text[:500]}')
        result=response.json();samples.append(elapsed);bytes_returned.append(len(response.content))
    output=dict(case=case,path=path,importSeconds=imported-started,requestSeconds=samples,
                coldImportPlusFirstRequestSeconds=imported-started+samples[0],responseBytes=bytes_returned)
    memory=process.memory_info()
    output['selfPeakRssBytes']=getattr(memory,'peak_wset',memory.rss)
    if case.startswith('main10'):output['combinedScore']=result['combinedScore']
    if case=='sandbox-seven-wires-1024':
        assert result['validation']['valid']
        assert result['resources']['peakQubits']==7 and result['totalShots']==1024
    if case=='fs6-reveal':
        assert result['paulice']['available'] and result['paulice']['ancillaLimit']==1
        output['nativePauliceCost']=result['paulice']['nativeCost']
        output['referenceCandidates']=result['reference']['candidates']
    print(json.dumps(output))


def main(repeats,entrypoint):
    import psutil
    results=[]
    env={**os.environ,'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1','MKL_NUM_THREADS':'1','PYTHONUTF8':'1'}
    for case in CASES:
        runs=[]
        for _ in range(repeats):
            started=time.perf_counter()
            process=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--child',case,'--entrypoint',entrypoint],cwd=ROOT,env=env,
                                     stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            monitor=psutil.Process(process.pid);peak=0
            while process.poll() is None:
                try:
                    processes=[monitor]+monitor.children(recursive=True)
                    peak=max(peak,sum(p.memory_info().rss for p in processes if p.is_running()))
                except psutil.NoSuchProcess:pass
                if time.perf_counter()-started>180:
                    process.kill();raise RuntimeError(f'{case} exceeded 180s local measurement budget')
                time.sleep(.01)
            stdout,stderr=process.communicate()
            if process.returncode:raise RuntimeError(stderr[-3000:])
            row=json.loads(stdout.strip().splitlines()[-1]);row['processWallSeconds']=time.perf_counter()-started
            row['sampledPeakRssBytes']=peak;runs.append(row)
        results.append(dict(case=case,runs=runs))
        print(case,'max request',round(max(max(r['requestSeconds']) for r in runs),3),
              'max import+request',round(max(r['coldImportPlusFirstRequestSeconds'] for r in runs),3),
              'peak MiB',round(max(r['sampledPeakRssBytes'] for r in runs)/2**20,1),flush=True)
    output=dict(entrypoint=entrypoint,platform=platform.platform(),python=sys.version,singleCpuAffinity=True,threadEnvironment={k:env[k] for k in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS')},
                caveat='Local fresh-process imports and ASGI timings, warm disk cache. Not Vercel cold boot, Linux execution, network RTT or a guarantee about hosted CPU speed.',cases=results)
    folder=ROOT/'artifacts/deployment-feasibility';folder.mkdir(parents=True,exist_ok=True)
    filename='timings-deployment.json' if entrypoint=='api.index' else 'timings.json'
    (folder/filename).write_text(json.dumps(output,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--child',choices=CASES);parser.add_argument('--repeats',type=int,default=3)
    parser.add_argument('--entrypoint',choices=('backend.app','api.index'),default='backend.app')
    args=parser.parse_args()
    if args.child:child(args.child,args.entrypoint)
    else:main(args.repeats,args.entrypoint)
