"""Reproduce exact capstone scores; no sampling noise decides qualification."""
from pathlib import Path
import sys
import json
from importlib.metadata import version
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.timeline_lab.capstone_examples import example
from backend.timeline_lab.service import evaluate, validation, comparison, PROTOCOL

def main():
    results={}
    for name in ('unchecked','sensible','everywhere'):
        draft=example(name)
        results[name]={**evaluate(draft,visuals=False),'validCheck':validation(draft)['valid'],
                       'operations':[g.model_dump(exclude_none=True) for g in draft.operations]}
    threshold=results['sensible']['qualificationThreshold']
    assert results['unchecked']['score']<threshold<results['sensible']['score']
    assert results['everywhere']['validCheck'] and results['everywhere']['score']<threshold
    reference=comparison(json.dumps(example().hardware.model_dump(),sort_keys=True))
    output={'protocol':PROTOCOL,'qiskitVersion':version('qiskit'),'hardware':example().hardware.model_dump(),
            'threshold':threshold,'exactReferenceMaximum':reference['best']['score'],
            'referenceScope':reference['scope'],'results':results}
    path=ROOT/'docs'/'CAPSTONE_DIFFICULTY_VERIFICATION.json'
    path.write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v['score'] for k,v in results.items()}))
    print(f'Wrote {path}')

if __name__=='__main__':main()
