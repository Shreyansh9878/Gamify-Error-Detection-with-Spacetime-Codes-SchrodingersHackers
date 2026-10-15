import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.engine import evaluate, score_metrics
from backend.levels import LEVELS
from backend.models import RunRequest, TutorialRequest
from backend.tutorial import lesson

def solution(level):
    from backend.tutorial import manual_check
    i=level['id']
    c=manual_check(level,1 if i==8 else 0,'X' if i in (2,8) else 'Z',level['defaultStart'],level['slots'])
    return RunRequest(levelId=i,gates=level['target'],checks=[c])

@pytest.mark.parametrize('level',LEVELS,ids=[l['title'] for l in LEVELS])
def test_every_mission_has_a_passing_solution(level):
    result=evaluate(solution(level))
    assert result['passed'], result
    assert result['idealMatch']==pytest.approx(1)
    assert 0<=result['retention']<=1
    assert sum(result['noisy'])==pytest.approx(1)
    assert sum(result['counts'].values())==1024
    assert 0<=result['keptShots']<=1024
    assert 1<=result['stars']<=3

def test_noiseless_check_preserves_state():
    req=solution(LEVELS[3]).model_copy(update={'noiseScale':0})
    result=evaluate(req)
    assert result['fidelity']==pytest.approx(1)
    assert result['retention']==pytest.approx(1)
    assert not result['eligible'] and not result['passed']

def test_y_check_tracks_negative_conjugation_sign():
    req=RunRequest(levelId=1,gates=LEVELS[0]['target'],checks=[dict(qubit=0,pauli='Y',start=0,end=4,closingQubit=0,closingPauli='Y')],noiseScale=0)
    result=evaluate(req)
    assert result['retention']==pytest.approx(1)
    assert result['fidelity']==pytest.approx(1)

def test_interfering_checks_are_rejected():
    req=solution(LEVELS[5])
    from backend.models import Check
    req.checks.append(Check(qubit=0,pauli='X',start=0,end=LEVELS[5]['slots']))
    with pytest.raises(ValueError,match='interfere'):evaluate(req)

def test_invalid_t_crossing_rejected():
    req=solution(LEVELS[7])
    req.checks[0].start=0
    req.checks[0].qubit=0
    req.checks[0].pauli='Z'
    req.checks[0].closingOperators=None
    with pytest.raises(ValueError,match='Pauli'): evaluate(req)

def test_detection_improves_bitflip_fidelity_at_retention_cost():
    r=evaluate(solution(LEVELS[0]))
    assert r['fidelity']>r['baseline']+.1
    assert r['retention']<.95

def test_score_penalizes_resources_and_discarding():
    assert score_metrics(.95,.8,1,2,3)>score_metrics(.95,.8,1,5,6)
    assert score_metrics(.95,.8,1,2,3)>score_metrics(.95,.5,1,2,3)

def test_syndrome_distinguishes_anticommuting_error():
    assert lesson(4,TutorialRequest(action='inject',pauli='X',closingPauli='Y'))['syndrome']['1']==pytest.approx(1)
    assert lesson(4,TutorialRequest(action='inject',pauli='Z',closingPauli='Z'))['syndrome']['1']==pytest.approx(0)

@pytest.mark.parametrize('step,action',[(1,'z-noise'),(2,'correction'),(3,'localized'),(4,'match'),(5,'two'),(6,'t')])
def test_tutorial_experiments(step,action):
    r=lesson(step,TutorialRequest(action=action))
    assert sum(r['noisy'])==pytest.approx(1)

def test_api_contract_and_validation():
    client=TestClient(app)
    assert client.get('/api/health').status_code==200
    assert len(client.get('/api/levels').json())==10
    response=client.post('/api/run-circuit',json=solution(LEVELS[0]).model_dump())
    assert response.status_code==200,response.text
    assert response.json()['passed']
    assert client.post('/api/run-circuit',json={'levelId':999}).status_code==422
    assert client.post('/api/run-circuit',json={'levelId':1,'gates':[],'checks':[],'code':'print(1)'}).status_code==422
    assert client.post('/api/run-circuit',content='x'*17000).status_code==413

def test_gate_overlap_and_fixed_payload_rejected():
    req=solution(LEVELS[0]);req.gates.append(req.gates[0].model_copy(update={'id':'duplicate'}))
    with pytest.raises(ValueError):evaluate(req)
    req=solution(LEVELS[6]);req.gates=[]
    with pytest.raises(ValueError):evaluate(req)
