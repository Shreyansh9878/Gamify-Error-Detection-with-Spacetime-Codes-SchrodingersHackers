import numpy as np
import pytest
from qiskit import QuantumCircuit
from backend.missions.simulation import ideal_reference,accepted_metrics,execution_schedule
from backend.missions.levels import get_level
from backend.missions.reference import shell
from backend.missions.service import validate


def test_stabilizer_and_statevector_references_agree():
    qc=QuantumCircuit(2);qc.h(0);qc.cx(0,1);qc.sdg(1)
    np.testing.assert_allclose(ideal_reference(qc,'stabilizer'),ideal_reference(qc,'statevector'),atol=1e-12)


def test_t_reference_cannot_silently_use_stabilizer():
    qc=QuantumCircuit(1);qc.h(0);qc.t(0)
    with pytest.raises(ValueError,match='Clifford'):ideal_reference(qc,'stabilizer')
    assert abs(ideal_reference(qc)[0,1].imag)>.3


def test_postselection_uses_unnormalized_zero_syndrome_mass():
    joint=np.diag([.6,.1,.2,.1]);ideal=np.diag([1,0])
    result=accepted_metrics(joint,ideal,1)
    assert result['retention']==pytest.approx(.7)
    assert result['fidelity']==pytest.approx(6/7)
    assert result['score']==pytest.approx(.6)
    assert accepted_metrics(np.diag([0,0,1,0]),ideal,1)['fidelity'] is None


def test_t_and_controlled_checks_receive_all_live_wire_channels():
    l=get_level(8);t=next(g['column'] for g in l['payload'] if g['name']=='t')
    d=shell(8,'IIZI',t,t+1);ops=validate(d)['operations'];items,width=execution_schedule(l,ops)
    for index,item in enumerate(items):
        if item['name'] in ('t','tdg','h','cx','cy','cz'):
            following=[]
            for candidate in items[index+1:]:
                if candidate['name']!='noise':break
                following.append(candidate)
            # Readout may precede measurement, but its live helper still receives noise.
            targets={q for g in following if g['stage']!='Check interaction overhead' for q in g['qubits']}
            assert set(range(l['qubits']))<=targets
    assert width==l['qubits']+1


def test_complete_t_scoring_certificate():
    from scripts.validate_t_scoring import verify_t_scoring
    report=verify_t_scoring()
    assert len(report['tLevels'])==3
    assert all(r['scoreSpread']==0 and r['invalidXYRejected'] for r in report['tLevels'])
