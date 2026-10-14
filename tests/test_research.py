import pytest
from backend.research import run_research
from backend.models import ResearchRequest

def test_paulice_really_inserts_checks():
    result=run_research(ResearchRequest(levelId=7,targets=[0,1],repetitions=3))
    assert result['checks']==2
    assert result['shots']==7168
    assert 0<result['retention']<1
    assert result['addedTwoQubit']>0
    assert result['metricId']=='paulice-observable-v1'

def test_t_reference_keeps_protocol_distinct():
    result=run_research(ResearchRequest(levelId=7,tCount=4))
    assert result['metricId']=='unchecked-state-v1'
    assert result['fidelity']==result['exactReference']
    assert result['checks']==0
    with pytest.raises(ValueError,match='Clifford'):
        run_research(ResearchRequest(levelId=7,tCount=1,targets=[0]))
