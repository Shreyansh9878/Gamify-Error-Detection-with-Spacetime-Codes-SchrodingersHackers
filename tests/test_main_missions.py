"""Main-mission contracts, interval physics and reachable-solution certificate."""
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.missions.models import Draft, CompileRequest
from backend.missions.levels import get_level
from backend.missions.reference import shell, empty
from backend.missions.service import validate, run, generate, compile_source, _run, exact_density

REFERENCE=Path(__file__).resolve().parents[1]/'backend/missions/references.json'


@pytest.mark.parametrize('number',range(1,11))
def test_reachable_mission_references_and_stable_scores(number):
    row=json.loads(REFERENCE.read_text(encoding='utf-8'))['levels'][number-1]
    level=get_level(number)
    assert len(level['payload'])>(len(get_level(number-1)['payload']) if number>1 else 4)
    assert level['qubits']>=(2 if number==1 else 3)
    assert sum(g['name'] in ('t','tdg') for g in level['payload'])=={8:1,9:3,10:5}.get(number,0)
    for kind in ('baseline','everywhere','reasonable','optimal'):
        draft=Draft.model_validate(row[kind+'Draft'])
        if kind!='baseline':assert validate(draft)['valid']
        result=run(draft)
        assert result['combinedScore']==pytest.approx(row[kind],abs=1e-9)
        assert result['passed']==(kind in ('reasonable','optimal'))
        _run.cache_clear()
        assert run(draft)['combinedScore']==result['combinedScore']
        compiled=compile_source(CompileRequest(levelId=number,code=generate(draft)))
        assert not compiled['diagnostics']
        assert run(Draft.model_validate(compiled['draft']))['combinedScore']==pytest.approx(result['combinedScore'])
    assert max(row['baseline'],row['everywhere'])+.005<row['target']<row['reasonable']-.005<row['optimal']
    assert .6<=(row['target']-row['baseline'])/(row['optimal']-row['baseline'])<=.8
    if number>=8:
        d=Draft.model_validate(row['reasonableDraft'])
        opening=min(g.boundary for g in d.operations if g.name in ('cx','cy','cz'))
        ending=max(g.boundary for g in d.operations if g.name=='h')
        assert any(g['name'] in ('t','tdg') and opening<=g['column']<ending for g in level['payload'])


def test_exact_aer_matches_independent_density_channel_evolution():
    import numpy as np
    from backend.learning.common import evolve,instruction
    items=[instruction('h',[3],'opening'),instruction('cy',[3,1],'tap'),
           instruction('s',[0],'workload'),instruction('noise',[1],'relaxation',noise={
               'channel':'decoherence','timeUs':90.,'t1Us':100.,'t2Us':200.}),
           instruction('noise',[3,1],'overhead',noise={'channel':'depolarizing','strength':.025,'numQubits':2}),
           instruction('cy',[3,1],'closing'),instruction('h',[3],'readout')]
    np.testing.assert_allclose(exact_density(items,4),evolve(items,4).data,atol=1e-12)


def test_localized_auto_closure_spreads_only_through_enclosed_cx():
    d=shell(4,'IIX',2,3) # mission 4 prefix shifts locked CX to index 2
    assert get_level(4)['payload'][2]['name']=='cx'
    v=validate(d);assert v['valid']
    closing=[(g['name'],g['qubits'][-1]) for g in v['generated']]
    assert ('cx',0) in closing and ('cx',1) in closing
    assert all(g['owner']=='generated-method' for g in v['generated'])


def test_signed_tableau_closure_has_locked_phase_compensation():
    l=get_level(4);index=next(g['column'] for g in l['payload'] if g['name']=='sdg' and g['qubits']==[0])
    v=validate(shell(4,'IIX',index,index+1))
    assert v['valid']
    assert any(g['name']=='cy' and g['qubits'][1]==0 for g in v['generated'])
    assert any(g['name']=='z' and g['qubits']==[l['qubits']] for g in v['generated'])


@pytest.mark.parametrize('number',[8,9,10])
def test_non_pauli_t_paths_are_red_and_cannot_score(number):
    l=get_level(number); t=next(g['column'] for g in l['payload'] if g['name']=='t')
    label='I'*(l['qubits']-2)+'ZI'  # H before T changes Z to X
    d=shell(number,label,t-1,t+1);v=validate(d)
    assert not v['valid'] and v['checks'][0]['nonPauli']
    with pytest.raises(ValueError,match='Non-Pauli'):run(d)
    # Direct Z at the T itself is Pauli and produces a locked Z closure.
    assert validate(shell(number,label,t,t+1))['valid']


def test_manual_mismatch_and_removed_inserted_band_are_rejected():
    d=shell(1,'XI',1,2)
    closing=next(g for g in d.operations if g.name=='cx' and g.boundary==2)
    closing.name='cz'
    assert not validate(d)['valid']
    with pytest.raises(ValueError):run(d)
    data=d.model_dump();data['bands']['1']=0
    with pytest.raises(ValueError,match='Insert editable'):Draft.model_validate(data)


def test_tdg_rejects_x_and_accepts_z_at_the_actual_interval():
    l=get_level(9);g=next(g for g in l['payload'] if g['name']=='tdg');q=g['qubits'][0];index=g['column']
    label=['I']*l['qubits'];label[l['qubits']-1-q]='X'
    assert validate(shell(9,''.join(label),index,index+1))['checks'][0]['nonPauli']
    label[l['qubits']-1-q]='Z'
    assert validate(shell(9,''.join(label),index,index+1))['valid']


def test_mission_api_is_bounded_authoritative_and_returns_compact_outcome():
    client=TestClient(app);levels=client.get('/api/levels').json()
    assert len(levels)==10 and all(l['fixed'] for l in levels)
    assert [l['assisted'] for l in levels]==[False]*3+[True]*7
    d=shell(4,'IXI',1,3)
    response=client.post('/api/missions/run',json={'draft':d.model_dump()})
    assert response.status_code==200,response.text
    assert set(response.json())=={'levelId','combinedScore','passed','target','status','configHash','protocol','fidelity','retention','minimumKept'}
    body=d.model_dump();body['ancillas']=4
    assert client.post('/api/missions/run',json={'draft':body}).status_code==422
    assert client.post('/api/missions/run',json={'draft':d.model_dump(),'score':1}).status_code==422
    d.operations[0].qubits=[99]
    assert client.post('/api/missions/validate',json={'draft':d.model_dump()}).status_code==422
    compiled=client.post('/api/missions/compile',json={'levelId':1,'code':"import os\nos.system('echo unsafe')"}).json()
    assert compiled['draft'] is None and compiled['diagnostics']


def test_reference_script_verifies_all_fixtures():
    from scripts.validate_main_levels import verify
    assert len(verify()['levels'])==10
