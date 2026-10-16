import numpy as np
import pytest
from backend.quantum_core.scoring import trusted_fidelity, accepted_metrics, exact_density


@pytest.mark.parametrize('f,k,b,expected',[(.9,.8,.6,.9),(.9,.6,.6,.9),(.9,.3,.6,.45),(None,0,.6,0),(None,1e-13,.6,0),(0,1,1,0),(1,1,1,1)])
def test_budget_formula(f,k,b,expected):
    assert trusted_fidelity(f,k,b)==pytest.approx(expected)


@pytest.mark.parametrize('f,k,b',[(.8,.5,0),(.8,.5,1.1),(.8,-.1,.6),(float('nan'),.5,.6),(.8,float('inf'),.6)])
def test_invalid_metric_inputs(f,k,b):
    with pytest.raises(ValueError):trusted_fidelity(f,k,b)


def test_projected_block_retains_correct_shot_yield():
    result=accepted_metrics(np.diag([.6,.1,.2,.1]),np.diag([1,0]),1,.6)
    assert result['fidelity']==pytest.approx(6/7)
    assert result['retention']==pytest.approx(.7)
    assert result['score']==pytest.approx(6/7)
    assert result['correct_shot_yield']==pytest.approx(.6)


def test_detectable_pauli_error_improves_trusted_fidelity_with_ideal_check():
    # |0> with an X fault: a noiseless Z parity check rejects the harmful fault.
    def gate(name,*qubits):return dict(name=name,qubits=list(qubits))
    fault=dict(name='noise',qubits=[0],noise=dict(channel='bit_flip',probability=.2))
    ideal=np.diag([1.,0.])
    baseline=accepted_metrics(exact_density([fault],1),ideal,1,.6)
    checked=accepted_metrics(exact_density([gate('h',1),gate('cz',1,0),fault,gate('cz',1,0),gate('h',1)],2),ideal,1,.6)
    assert checked['score']>baseline['score']
    assert checked['score']==pytest.approx(1)


@pytest.mark.parametrize('probability',[0.,.05,.2,.4])
def test_ideal_targeted_check_does_not_hurt_for_detectable_pauli_channel(probability):
    ideal=np.diag([1.,0.])
    fault=dict(name='noise',qubits=[0],noise=dict(channel='bit_flip',probability=probability))
    def g(name,*qs):return dict(name=name,qubits=list(qs))
    base=accepted_metrics(exact_density([fault],1),ideal,1,.6)
    check=accepted_metrics(exact_density([g('h',1),g('cz',1,0),fault,g('cz',1,0),g('h',1)],2),ideal,1,.6)
    assert check['score']>=base['score']-1e-12
    if probability:assert check['score']>base['score']


def test_all_calibrated_margins_and_retention_penalties():
    from scripts.validate_main_levels import verify
    from scripts.validate_capstone import verify as capstone
    rows=verify()['levels']+[capstone()]
    for row in rows:
        blanket=row['metrics']['everywhere']
        assert blanket['retention']<row['minimumKept']
        assert row['everywhere']<blanket['fidelity']
        assert row['everywhere']<row['reasonable']
