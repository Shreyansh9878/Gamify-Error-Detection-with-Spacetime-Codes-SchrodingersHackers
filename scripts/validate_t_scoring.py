"""Non-Clifford scorer crosschecks and cold, full-register UI timings."""
import json
import sys
import time
from pathlib import Path
from copy import deepcopy
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.missions.levels import get_level
from backend.missions.models import Draft
from backend.missions.reference import shell
from backend.missions.service import validate,_run,_validate,qc_for,payload
from backend.missions.simulation import ideal_reference,simulate,execution_schedule,exact_density
from backend.learning.common import evolve


def verify_t_scoring():
    refs=json.loads((ROOT/'backend/missions/references.json').read_text())['levels']
    agreements=[]
    for number in range(1,8):
        level=get_level(number);d=Draft.model_validate(refs[number-1]['reasonableDraft']);ops=validate(d)['operations']
        clifford=simulate(level,ops,reference_method='stabilizer')
        general=simulate(level,ops,reference_method='statevector')
        error=max(abs(clifford[k]-general[k]) for k in ('fidelity','retention','score'))
        assert error<1e-10,(number,error)
        agreements.append(dict(level=number,maxMetricDifference=error))
    small=get_level(1);ops=validate(Draft.model_validate(refs[0]['reasonableDraft']))['operations']
    items,width=execution_schedule(small,ops)
    density_error=float(np.max(np.abs(exact_density(items,width)-evolve(items,width).data)))
    assert density_error<1e-10
    t_rows=[]
    for number in (8,9,10):
        level=get_level(number);t=next(g['column'] for g in level['payload'] if g['name']=='t')
        q=level['payload'][t]['qubits'][0];label=['I']*level['qubits'];label[-1-q]='Z'
        good=shell(number,''.join(label),t,t+1)
        assert validate(good)['valid']
        noiseless=simulate(level,validate(good)['operations'],noisy=False)
        assert abs(noiseless['retention']-1)<1e-10 and abs(noiseless['fidelity']-1)<1e-10
        for axis in ('X','Y'):
            label[-1-q]=axis;bad=shell(number,''.join(label),t,t+1)
            assert validate(bad)['checks'][0]['nonPauli']
            try:_run(bad.model_dump_json())
            except ValueError:pass
            else:raise AssertionError('Non-Pauli circuit reached scoring.')
        # An independent dense-channel calculation on a small T circuit.
        mini=deepcopy(get_level(1));mini['payload']=[dict(id='u0',name='h',qubits=[0],column=0),dict(id='u1',name='t',qubits=[0],column=1)]
        mini['noise']['hotspotColumn']=-1
        mini_ops=[dict(g,rank=g['column']*32+31,column=g['id'],owner='fixed-fixture') for g in mini['payload']]
        schedule,mini_width=execution_schedule(mini,mini_ops)
        t_error=float(np.max(np.abs(exact_density(schedule,mini_width)-evolve(schedule,mini_width).data)))
        assert t_error<1e-10
        d=Draft.model_validate(refs[number-1]['everywhereDraft']);v=validate(d)
        samples=[];scores=[]
        for _ in range(3):
            _run.cache_clear();_validate.cache_clear();started=time.perf_counter()
            result=_run(d.model_dump_json());samples.append(time.perf_counter()-started);scores.append(result['combinedScore'])
        _,physical_width=execution_schedule(level,v['operations'])
        assert physical_width==level['qubits']+level['ancillas']
        assert max(scores)-min(scores)<1e-12
        assert max(samples)<10,'A bounded mission must complete within the API UI budget.'
        t_rows.append(dict(level=number,engine='Aer density_matrix; statevector ideal; custom I/Z-at-T placement search',
                           physicalQubits=physical_width,noiselessZ=noiseless,invalidXYRejected=True,
                           smallTDensityDifference=t_error,coldRunSeconds=samples,maxRunSeconds=max(samples),
                           interactiveTwoSecondGoalMet=max(samples)<2,scoreSpread=max(scores)-min(scores)))
    return dict(schemaVersion=1,cliffordAgreement=agreements,smallCliffordDensityDifference=density_error,tLevels=t_rows,
                tradeoff='Exact density matrices avoid shot noise; physical width is capped at seven. Idle unmeasured independent ancillas may be eliminated, but timing uses all three active helpers.')


if __name__=='__main__':
    result=verify_t_scoring()
    path=ROOT/'docs/T_SCORING_VERIFICATION.json';path.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
