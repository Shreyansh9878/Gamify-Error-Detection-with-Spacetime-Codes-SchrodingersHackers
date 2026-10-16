"""Validate stored tutorial experiments and all quantitative level references."""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.noise_lab.models import LabRunRequest
from backend.noise_lab.simulator import run_lab
from backend.protection_lab.models import ProtectionRequest
from backend.protection_lab.service import run as protection_run
from backend.timeline_lab.models import Draft
from backend.timeline_lab.service import evaluate,validation
from backend.timeline_lab.capstone_examples import example
from scripts.validate_main_levels import verify


def verify_tutorials():
    refs=json.loads((ROOT/'backend/reference_solutions/tutorials.json').read_text())['flightSchools']
    results=[]
    for ref in refs:
        number=ref['id']
        if number==1:
            result=run_lab(LabRunRequest.model_validate(ref['request']))
            assert result['states'] and ref['answers']==['B','C','A']
        elif number==2:
            for method in ref['methods']:
                result=protection_run(ProtectionRequest(experiment=ref['experiment'],technique=method))
                assert result['outputKind']
        else:
            d=Draft.model_validate(ref['draft'])
            assert validation(d)['valid'],(number,validation(d))
            result=evaluate(d)
            if number==6:
                target=result['qualificationThreshold']
                assert result['score']>target
                assert evaluate(example('unchecked'))['score']<target
                assert evaluate(example('everywhere'))['score']<target
                repeats=[evaluate(d)['score'] for _ in range(3)]
                assert max(repeats)-min(repeats)<1e-12
        results.append(dict(id=number,criteria=ref['criteria'],experimentValid=True,
                            scoreMetric='F_ps * S_keep' if number==6 else 'No numeric score; completion requires experiment and learning evidence'))
        print(f'Flight School {number}: stored experiment valid; completion exercised by full-progression browser test',flush=True)
    return results


if __name__=='__main__':
    verify_tutorials()
    verify()
    from scripts.validate_t_scoring import verify_t_scoring
    verify_t_scoring()
    print('T scorer agreement, density crosschecks, forbidden checks and timing passed.')
