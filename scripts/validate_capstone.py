"""Regenerate or verify FS6's seven reachable strategies and metric margins."""
import argparse
import json
from pathlib import Path
import sys
from importlib.metadata import version
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.timeline_lab import service
from backend.timeline_lab.capstone_examples import example
from backend.timeline_lab.models import Draft
from scripts.validate_main_levels import assert_target_validity,KINDS

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'docs/CAPSTONE_DIFFICULTY_VERIFICATION.json'
REFERENCES=ROOT/'backend/reference_solutions/capstone.json'


def calibrate():
    noise=example().hardware.model_dump()
    choices=list(service.reference_candidates(noise))
    by_label={c['openingPauli']:Draft.model_validate(c['draft']) for c in choices}
    comparison=service.comparison(json.dumps(noise,sort_keys=True))
    drafts=dict(baseline=example('unchecked'),everywhere=example('everywhere'),reasonable=example('sensible'),
                optimal=Draft.model_validate(comparison['best']['draft']),misplaced=by_label['IZ'],
                tooSmall=by_label['ZI'],overchecked=by_label['YX'])
    metrics={k:service.evaluate(d,visuals=False) for k,d in drafts.items()}
    payload=service.circuit(service.fixed_payload(6),2)
    two=lambda qc:sum(len(g.qubits)==2 for g in qc.data)
    for kind,draft in drafts.items():
        qc=service.circuit(service.operations(draft),3)
        metrics[kind].update(addedAncillas=int(bool(draft.operations)),
                             addedTwoQubit=two(qc)-two(payload),addedDepth=qc.depth()-payload.depth())
    row=dict(id='FS6',qubits=2,ancillas=1,tCount=0,minimumKept=service.CAPSTONE_MINIMUM_KEPT,initialMinimumKept=.60,
             target=service.CAPSTONE_GOAL,spread=0.,metrics=metrics)
    row.update({k:v['score'] for k,v in metrics.items()})
    row.update({k+'Draft':v.model_dump() for k,v in drafts.items()})
    REFERENCES.write_text(json.dumps(row,indent=2)+'\n')
    # Keep the existing notebook/certificate keys; all values are recomputed.
    results={old:dict(metrics[new],validCheck=service.validation(drafts[new])['valid'],operations=[g.model_dump() for g in drafts[new].operations])
             for old,new in (('unchecked','baseline'),('sensible','reasonable'),('everywhere','everywhere'))}
    PATH.write_text(json.dumps(dict(protocol=service.PROTOCOL,scoreVersion='trusted-fidelity-v1',qiskitVersion=version('qiskit'),hardware=noise,
        minimumKept=service.CAPSTONE_MINIMUM_KEPT,threshold=service.CAPSTONE_GOAL,exactReferenceMaximum=comparison['best']['score'],
        referenceScope=comparison['scope'],results=results),indent=2)+'\n')


def verify():
    row=json.loads(REFERENCES.read_text());metrics={}
    for kind in KINDS:
        draft=Draft.model_validate(row[kind+'Draft'])
        if kind!='baseline':assert service.validation(draft)['valid'],kind
        samples=[service.evaluate(draft,visuals=False) for _ in range(3)]
        result=samples[0]
        assert max(s['score'] for s in samples)-min(s['score'] for s in samples)<1e-12
        assert abs(result['score']-row[kind])<1e-9,(kind,result['score'],row[kind])
        for metric in ('fidelity','retention','correct_shot_yield'):
            assert abs(result[metric]-row['metrics'][kind][metric])<1e-9
        metrics[kind]=result
    assert_target_validity(row,metrics)
    assert metrics['everywhere']['retention']<row['minimumKept']
    print('FS6: seven valid references, all target margins, exact spread 0')
    return row


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--calibrate',action='store_true');args=parser.parse_args()
    if args.calibrate:calibrate()
    verify()
