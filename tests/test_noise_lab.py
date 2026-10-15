import math
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from backend.app import app
from backend.noise_lab.models import Circuit, CompileRequest, LabRunRequest
from backend.noise_lab.code_parser import compile_source, parse
from backend.noise_lab.simulator import run_lab


def draft(body, n=1, combined=False):
    return parse(CompileRequest(code=f'from quantum_shield import TutorialCircuit\nfrom math import pi\nqc = TutorialCircuit({n})\n'+body, combineErrors=combined))


def run(body, n=1, combined=False, **kwargs):
    return run_lab(LabRunRequest(circuit=draft(body,n,combined),**kwargs))


@pytest.mark.parametrize('prep,before,after', [('',1,-1),('qc.x(0)\n',-1,1)])
def test_bit_flip_poles(prep,before,after):
    r=run(prep+'qc.bit_flip(0)')
    assert r['states'][0]['qubits'][0]['bloch'][2] == pytest.approx(before)
    assert r['states'][1]['qubits'][0]['bloch'][2] == pytest.approx(after)


def test_x_plus_and_phase_blind_spot():
    assert run('qc.h(0)\nqc.bit_flip(0)')['fidelity'] == pytest.approx(1)
    for prep,sign in [('qc.h(0)\n',1),('qc.h(0)\nqc.z(0)\n',-1)]:
        r=run(prep+'qc.phase_flip(0)')
        assert r['states'][0]['qubits'][0]['bloch'][0] == pytest.approx(sign)
        assert r['states'][1]['qubits'][0]['bloch'][0] == pytest.approx(-sign)
        assert r['states'][0]['probabilities'] == pytest.approx(r['states'][1]['probabilities'])
        x=run(prep+'qc.phase_flip(0)',basis='X')
        assert x['states'][0]['probabilities']['0'] != pytest.approx(x['states'][1]['probabilities']['0'])


def test_phase_propagation_and_selected_boundary():
    c=draft('qc.h(0)\nqc.phase_flip(0)\nqc.h(0)')
    final=run_lab(LabRunRequest(circuit=c))
    assert final['states'][0]['probabilities']['0'] == pytest.approx(1)
    assert final['states'][1]['probabilities']['1'] == pytest.approx(1)
    local=run_lab(LabRunRequest(circuit=c,comparisonMode='selected_error',selectedErrorId='code-1'))
    assert local['states'][0]['probabilities']['0'] == pytest.approx(.5)
    assert local['states'][1]['qubits'][0]['bloch'][0] == pytest.approx(-1)
    assert any('later H' in s for s in final['explanations'])


def test_zero_time_arbitrary_state():
    r=run('qc.ry(pi/3,0)\nqc.rz(pi/5,0)\nqc.decoherence(0,time_us=0)')
    assert r['fidelity'] == pytest.approx(1)
    assert r['states'][0]['qubits'][0]['bloch'] == pytest.approx(r['states'][1]['qubits'][0]['bloch'])


def test_computed_explanation_does_not_call_a_unitary_flip_waiting():
    r=run('qc.ry(2*pi/3,0)\nqc.bit_flip(0)')
    assert not any('during this experiment' in s or 'Waiting changes' in s for s in r['explanations'])


@pytest.mark.parametrize('t',[0,20,80,100,200])
def test_relaxation_equations(t):
    r=run(f'qc.x(0)\nqc.decoherence(0,time_us={t})')
    assert r['states'][1]['probabilities']['1'] == pytest.approx(math.exp(-t/100))
    r=run(f'qc.h(0)\nqc.decoherence(0,time_us={t})')
    assert r['states'][1]['qubits'][0]['bloch'] == pytest.approx([math.exp(-t/80),0,1-math.exp(-t/100)])


@pytest.mark.parametrize('body',[
    'qc.decoherence(0,t1_us=20,t2_us=80)', 'qc.h(1)', 'qc.cx(0,0)',
    'qc.h(0,at=0)\nqc.x(0,at=0)', 'qc.rx(100,0)', 'qc.h(0,at=16)',
    'qc.bit_flip(0)\nqc.phase_flip(0)', 'qc.decoherence(0,time_us=-1)',
    'qc.decoherence(0,t2_us=0)', 'qc.h(True)',
])
def test_invalid_source_contracts(body):
    result=compile_source(CompileRequest(code='from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(1)\n'+body))
    assert result['circuit'] is None
    assert result['diagnostics'][0]['line'] >= 1


@pytest.mark.parametrize('body',[
    'import os', '__import__("os").system("echo nope")', 'qc.__class__()',
    'for i in range(3): qc.x(0)', 'qc.h(open("secret"))', 'qc.h([x for x in []])',
    'qc.h(0,**{})', 'qc.h(0); qc = TutorialCircuit(2)', 'qc.rx(2**999999,0)',
])
def test_no_general_python_execution(body):
    result=compile_source(CompileRequest(code='from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(1)\n'+body))
    assert result['circuit'] is None


def test_code_budgets():
    assert compile_source(CompileRequest(code='\n'*129))['circuit'] is None
    code='from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(1)\n'+'qc.bit_flip(0)\n'*9
    assert compile_source(CompileRequest(code=code,combineErrors=True))['circuit'] is None
    with pytest.raises(ValidationError): Circuit(qubits=6, operations=[])
    with pytest.raises(ValidationError): Circuit(qubits=1, operations=[dict(id='e',name='bit_flip',role='prepare',qubits=[0],column=0)])


@pytest.mark.parametrize('error',['bit_flip','phase_flip'])
def test_ordered_cancellation(error):
    r=run(f'qc.h(0)\nqc.{error}(0)\nqc.{error}(0)',combined=True)
    assert r['fidelity'] == pytest.approx(1)
    assert len(r['parameters'])==2


def test_wait_and_x_do_not_commute():
    a=run('qc.bit_flip(0)\nqc.decoherence(0,time_us=100)',combined=True)
    b=run('qc.decoherence(0,time_us=100)\nqc.bit_flip(0)',combined=True)
    assert a['states'][1]['probabilities']['1'] == pytest.approx(math.exp(-1))
    assert b['states'][1]['probabilities']['1'] == pytest.approx(1)


def test_entangled_reductions_and_joint_samples():
    r=run('qc.h(0)\nqc.cx(0,1)',n=2)
    for state in r['states']:
        assert state['globalPurity']==pytest.approx(1)
        for local in state['qubits']:
            assert local['bloch']==pytest.approx([0,0,0],abs=1e-8)
            assert local['purity']==pytest.approx(.5)
        assert state['counts']['01']==state['counts']['10']==0
    assert any('entanglement' in s for s in r['explanations'])


def test_five_qubit_order_counts_and_seed_invariance():
    a=run('qc.x(0)\nqc.h(4)',n=5,sampleSeed=20)
    b=run('qc.x(0)\nqc.h(4)',n=5,sampleSeed=21)
    for s,t in zip(a['states'],b['states']):
        assert sum(s['probabilities'].values()) == pytest.approx(1)
        assert s['probabilities']['00001'] == pytest.approx(.5)
        assert s['probabilities']['10001'] == pytest.approx(.5)
        assert s['probabilities']==t['probabilities']
        assert s['qubits']==t['qubits']
        assert sum(s['counts'].values())==1024
        for q,m in enumerate(s['marginals']):
            assert m['counts'][1]==sum(v for k,v in s['counts'].items() if k[-1-q]=='1')


def test_parallel_snapshot_includes_earlier_errors():
    c=draft('qc.h(1,at=0)\nqc.bit_flip(0,at=0)\nqc.phase_flip(1,at=1)',n=2,combined=True)
    r=run_lab(LabRunRequest(circuit=c,comparisonMode='selected_error',selectedErrorId='code-2'))
    assert r['states'][0]['qubits'][0]['bloch'][2]==pytest.approx(-1)
    assert r['states'][1]['qubits'][1]['bloch'][0]==pytest.approx(-1)


def test_api_contract_and_mission_separation():
    with TestClient(app) as client:
        compiled=client.post('/api/tutorial/noise-lab/compile',json={'code':'from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(5)\nqc.bit_flip(4)'})
        assert compiled.status_code==200
        circuit=compiled.json()['circuit']
        response=client.post('/api/tutorial/noise-lab/run',json={'circuit':circuit})
        assert response.status_code==200
        assert response.json()['states'][1]['probabilities']['10000']==pytest.approx(1)
        assert client.post('/api/tutorial/noise-lab/run',json={'circuit':circuit,'comparisonMode':'selected_error','selectedErrorId':'missing'}).status_code==422
        circuit['operations'][0]['qubits']=[5]
        assert client.post('/api/tutorial/noise-lab/run',json={'circuit':circuit}).status_code==422
        assert client.post('/api/run-circuit',json={'levelId':1,'gates':[{'id':'edit','name':'h','qubits':[0],'column':0}],'checks':[]}).status_code==422
