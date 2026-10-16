"""Physics and contract regressions for the fixed-payload QED redesign."""
import numpy as np
import pytest
from fastapi.testclient import TestClient
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator, Pauli
from backend.app import app
from backend.engine import check_paths, evaluate, trace_fault, validate_checks
from backend.levels import LEVELS
from backend.models import Check, FaultRequest, Gate, RunRequest, TutorialRequest
from backend.tutorial import lesson, manual_check


def request(level_id=1, **changes):
    level=LEVELS[level_id-1]
    check=manual_check(level, 0, 'X' if level_id==2 else 'Z', level['defaultStart'], level['slots'])
    return RunRequest(levelId=level_id,gates=level['target'],checks=[check],**changes)


@pytest.mark.parametrize('level',LEVELS)
def test_all_payloads_authoritative(level):
    assert level['fixed'] is True
    assert level['checkMode']==('manual' if level['id']<=5 else 'assisted')
    with pytest.raises(ValueError,match='fixed'):
        evaluate(RunRequest(levelId=level['id'],gates=[]))


def test_manual_closure_is_required_and_wrong_closure_is_rejected():
    r=request(1)
    r.checks[0].closingOperators=None
    with pytest.raises(ValueError,match='manual closing'):evaluate(r)
    r.checks[0].closingQubit=0;r.checks[0].closingPauli='X'
    preview=validate_checks(r)
    assert not preview['valid']
    assert 'Open loop' in preview['checks'][0]['error']
    with pytest.raises(ValueError,match='Open loop'):evaluate(r)


def test_entangling_spread_needs_a_multiwire_closing_product():
    r=request(3)
    r.checks=[Check(qubit=0,pauli='X',start=1,end=4,closingQubit=0,closingPauli='X')]
    assert not validate_checks(r)['valid']
    r.checks=[manual_check(LEVELS[2],0,'X',1,4)]
    assert validate_checks(r)['checks'][0]['closing']=='XX'
    assert validate_checks(r)['valid']


@pytest.mark.parametrize('opening',['X','Y','Z'])
def test_tableau_conjugation_matches_independent_operator_calculation(opening):
    qc=QuantumCircuit(3)
    qc.h(0);qc.s(1);qc.cx(0,1);qc.cz(1,2);qc.h(2);qc.sdg(0)
    gates=[Gate(id=str(i),name=ins.operation.name,
                qubits=[qc.find_bit(q).index for q in ins.qubits],column=i)
           for i,ins in enumerate(qc.data)]
    level=dict(qubits=3,slots=len(gates),checkMode='assisted')
    path=check_paths(level,gates,[Check(qubit=0,pauli=opening,start=0,end=len(gates))])[0]
    u=Operator(qc).data
    expected=u@Pauli('II'+opening).to_matrix()@u.conj().T
    np.testing.assert_allclose(path['sign']*Pauli(path['closing']).to_matrix(),expected,atol=1e-10)


def test_t_barrier_reports_actual_crossing_component():
    r=request(8)
    r.checks=[Check(qubit=0,pauli='X',start=4,end=8)]
    preview=validate_checks(r)
    assert not preview['valid']
    crossing=preview['checks'][0]['tCrossings'][0]
    assert crossing==dict(column=4,qubit=0,component='X',valid=False)
    r.checks[0].pauli='Z'
    assert validate_checks(r)['valid']
    # Opening Z before H rotates into X at T: opening labels alone are insufficient.
    r.checks[0].start=0
    assert not validate_checks(r)['valid']


def test_fault_flags_anticommuting_x_and_misses_commuting_z():
    r=request(1).model_dump()
    caught=trace_fault(FaultRequest(**r,faultQubit=0,faultColumn=2,faultPauli='X'))
    assert caught['flagProbability']==pytest.approx(1)
    assert caught['outputChanged']
    missed=trace_fault(FaultRequest(**r,faultQubit=0,faultColumn=2,faultPauli='Z'))
    assert missed['flagProbability']==pytest.approx(0)
    assert not missed['outputChanged']


def test_fault_outside_check_is_not_reported_as_caught():
    r=request(1);r.checks[0].end=2
    result=trace_fault(FaultRequest(**r.model_dump(),faultQubit=0,faultColumn=3,faultPauli='X'))
    assert result['flagProbability']==pytest.approx(0)
    assert result['outputChanged']


def test_fault_propagation_can_be_non_pauli_after_t():
    r=request(8);r.checks=[]
    result=trace_fault(FaultRequest(**r.model_dump(),faultQubit=0,faultColumn=3,faultPauli='X'))
    after_t=next(t for t in result['trajectory'] if t['boundary']==5)
    assert len(after_t['terms'])==2
    assert sum(t['re']**2+t['im']**2 for t in after_t['terms'])==pytest.approx(1)


@pytest.mark.parametrize('shots',[256,1024,4096])
def test_shot_conservation_and_exact_overhead(shots):
    result=evaluate(request(1,shots=shots))
    assert result['shots']==shots
    assert result['keptShots']+result['discardedShots']==shots
    assert result['samplingOverhead']==pytest.approx(1/result['retention'])
    assert sum(result['counts'].values())==shots


def test_phase_noise_hidden_from_probabilities_but_visible_on_bloch_vector():
    result=lesson(1,TutorialRequest(action='z-noise',noise=.3))
    assert result['noisy']==pytest.approx([.5,.5])
    assert result['bloch'][0][0]==pytest.approx(.4)
    assert result['fidelity']==pytest.approx(.7)


def test_tutorial_invalid_loop_has_false_alarms():
    broken=lesson(4,TutorialRequest(action='match',pauli='X',closingPauli='X'))
    assert not broken['loopValid']
    assert broken['syndrome']['1']==pytest.approx(.5)
    valid=lesson(4,TutorialRequest(action='match',pauli='X',closingPauli='Y'))
    assert valid['loopValid'] and valid['syndrome']['0']==pytest.approx(1)


def test_validation_and_fault_api_contracts():
    c=TestClient(app)
    r=request(1).model_dump()
    preview=c.post('/api/validate-checks',json=r)
    assert preview.status_code==200 and preview.json()['valid']
    traced=c.post('/api/trace-fault',json={**r,'faultQubit':0,'faultColumn':2,'faultPauli':'X'})
    assert traced.status_code==200 and traced.json()['caught']
    assert c.post('/api/trace-fault',json={**r,'faultQubit':2,'faultColumn':2,'faultPauli':'X'}).status_code==422
    assert c.post('/api/trace-fault',json={**r,'faultQubit':0,'faultColumn':4,'faultPauli':'Z'}).status_code==422
    assert c.post('/api/trace-fault',json={**r,'faultQubit':0,'faultColumn':2,'faultPauli':'H'}).status_code==422
