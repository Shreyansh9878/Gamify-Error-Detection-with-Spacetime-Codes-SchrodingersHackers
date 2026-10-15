"""Reproduce mission solutions and controlled QFF comparisons: python -m scripts.benchmark."""
import json
from pathlib import Path
from importlib.metadata import version
from backend.levels import LEVELS
from backend.engine import evaluate, VERSION
from backend.research import run_research
from backend.models import RunRequest, ResearchRequest
from backend.tutorial import manual_check

def main():
    missions=[]
    for level in LEVELS:
        i=level['id']
        checks=[manual_check(level,1 if i==8 else 0,'X' if i in (2,8) else 'Z',level['defaultStart'],level['slots'])]
        request=RunRequest(levelId=i,gates=level['target'],checks=checks)
        result=evaluate(request)
        if not result['passed']:raise RuntimeError(f'Mission {i} solution failed')
        missions.append(dict(request=request.model_dump(),result=result))
    comparisons=[]
    for repetitions in (1,2,3):
        for targets in ([],[0],[1],[0,1],[1,0]):
            request=ResearchRequest(levelId=7,targets=targets,repetitions=repetitions,tCount=0)
            comparisons.append(dict(request=request.model_dump(),result=run_research(request)))
        for t in (1,2,4):
            request=ResearchRequest(levelId=7,targets=[],repetitions=repetitions,tCount=t)
            comparisons.append(dict(request=request.model_dump(),result=run_research(request)))
    output=dict(engine=VERSION,seed=2026,noise='Synthetic development model; not organizer calibration',packages={p:version(p) for p in ['qiskit','qiskit-aer','qiskit-paulice']},missions=missions,comparisons=comparisons)
    destination=Path('docs/benchmark-results.json');destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(output,indent=2),encoding='utf-8')
    print(f'Wrote {len(missions)} mission solutions and {len(comparisons)} comparisons to {destination}')

if __name__=='__main__':main()
