"""Small readable checks for every public core physics function."""
import json
from math import pi
from types import SimpleNamespace
import numpy as np
import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import Pauli, Operator
from backend.quantum_core.pauli import single_term,gate_operator,opening_factor,propagate
from backend.quantum_core.checks import closing_factors
from backend.quantum_core.scoring import ideal_reference,exact_density,accepted_metrics,noise_instruction
from backend.quantum_core.noise import channel,hardware_items,instruction
from backend.quantum_core.paulice import optimize_clifford


def test_single_term_retains_sign_and_rejects_sum():
    assert single_term(-Pauli('Y').to_matrix())==('Y',-1+0j)
    assert single_term((Pauli('X').to_matrix()+Pauli('Y').to_matrix())/2**.5) is None


def test_gate_operator_has_signed_clifford_tableau():
    matrix,tableau=gate_operator('sdg',(0,),1)
    assert np.allclose(matrix,Operator(QuantumCircuit(1).compose(tableau.to_circuit())).data)
    assert Pauli('X').evolve(tableau,frame='s').to_label()=='-Y'


def test_opening_factor_uses_qiskit_little_endian_order():
    assert opening_factor(3,0,'x').to_label()=='IIX'


def test_propagation_sign_cnot_and_t_barrier():
    assert propagate(Pauli('X'),'sdg',[0],1).to_label()=='-Y'
    assert propagate(Pauli('IX'),'cx',[0,1],2).to_label()=='XX'
    for name in ('t','tdg'):
        assert propagate(Pauli('Z'),name,[0],1).to_label()=='Z'
        with pytest.raises(ValueError,match='Non-Pauli'):propagate(Pauli('Y'),name,[0],1)


def test_closing_factors_compensates_signed_and_complex_products():
    assert closing_factors(-Pauli('Y').to_matrix(),1)==[('cy',[1,0]),('z',[1])]
    assert closing_factors(1j*Pauli('X').to_matrix(),1)==[('cx',[1,0]),('sdg',[1])]
    with pytest.raises(ValueError):closing_factors((Pauli('X').to_matrix()+Pauli('Y').to_matrix())/2**.5,1)


def test_channel_and_noise_instruction_represent_real_bit_flip():
    spec={'channel':'bit_flip','probability':1.}
    assert channel(spec).num_qubits==1
    item=instruction('noise',[0],'Test',noise=spec)
    assert noise_instruction(json.dumps(spec)).num_qubits==1
    assert np.allclose(exact_density([item],1),np.diag([0,1]))


def test_hardware_channels_cover_every_wire_and_are_composed():
    noise=SimpleNamespace(enabled=True,bitFlip=1.,phaseFlip=1.,depolarizing=0.,relaxationTimeUs=0.)
    items=hardware_items(noise,[0,1]);assert len(items)==4
    assert {g['qubits'][0] for g in items}=={0,1}
    noise.enabled=False;assert hardware_items(noise,[0,1])==[]


def test_ideal_reference_matches_bell_state_and_handles_t():
    qc=QuantumCircuit(2);qc.h(0);qc.cx(0,1)
    expected=np.outer([1,0,0,1],[1,0,0,1])/2
    assert np.allclose(ideal_reference(qc),expected)
    assert np.allclose(ideal_reference(qc,'statevector'),expected)
    qc.t(0)
    with pytest.raises(ValueError):ideal_reference(qc,'stabilizer')
    assert abs(np.trace(ideal_reference(qc))-1)<1e-12


def test_accepted_metrics_normalizes_only_the_zero_syndrome_block():
    rho=np.diag([.6,.1,.2,.1]);ideal=np.diag([1,0])
    result=accepted_metrics(rho,ideal,1)
    assert result==pytest.approx({'fidelity':6/7,'retention':.7,'score':.6})
    empty=accepted_metrics(np.diag([0,0,1,0]),ideal,1)
    assert empty['fidelity'] is None and empty['score']==0


def test_paulice_rejects_t_and_excess_budget_before_library_call():
    qc=QuantumCircuit(1);qc.t(0);qc.measure_all()
    with pytest.raises(ValueError,match='Clifford'):optimize_clifford(qc,[0],1)
    qc=QuantumCircuit(1);qc.h(0);qc.measure_all()
    with pytest.raises(ValueError,match='budget'):optimize_clifford(qc,[0],0)
    qc=QuantumCircuit(2);qc.h(0);qc.cx(0,1);qc.measure_all()
    candidate=optimize_clifford(qc,[0],1)
    assert candidate.circuit.num_qubits<=3
