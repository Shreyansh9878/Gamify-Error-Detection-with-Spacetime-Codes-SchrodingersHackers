"""Regression tests for the integrated canvas contracts and real quantum frames."""
import copy
import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Statevector
from backend.app import app
from backend.learning.visualization import state_visualization, component_page, joint_frames
from backend.noise_lab.models import Circuit, LabRunRequest
from backend.noise_lab.simulator import run_lab
from backend.advanced_lab.models import Draft, NonCliffordDraft, RunRequest, NonCliffordRequest
from backend.advanced_lab.service import run, validate
from backend.graduation_lab.models import Strategy, RunRequest as CapstoneRequest
from backend.graduation_lab import service as capstone

client=TestClient(app)


def check(opening='X',closing=None):
    return dict(id='check',ancilla=0,startBoundary=1,endBoundary=3,openingHadamard=True,
                closingHadamard=True,measure=True,openingTaps=[dict(qubit=0,pauli=opening)],
                closingTaps=closing or [dict(qubit=0,pauli=opening)])


def test_bell_phases_global_gauge_and_order():
    plus=Statevector([1,0,0,1])/np.sqrt(2)
    minus=Statevector([1,0,0,-1])/np.sqrt(2)
    a=state_visualization(plus,2); b=state_visualization(minus,2)
    c=state_visualization(plus*np.exp(.37j),2)
    assert a['probabilities']==pytest.approx(b['probabilities'])
    assert not np.allclose(a['amplitudes'],b['amplitudes'])
    assert np.allclose(a['amplitudes'],c['amplitudes'])
    assert a['wireOrder']==['q1','q0'] and a['stateKind']=='pure'


def test_mixed_spectrum_reconstructs_full_state_and_pages_expire_honestly():
    diagonal=np.arange(1,9,dtype=float); diagonal/=diagonal.sum()
    qc=QuantumCircuit(3);qc.h(0);qc.cx(0,1)
    rho=DensityMatrix(np.diag(diagonal)).evolve(qc)
    frame=state_visualization(rho,3)
    assert frame['stateKind']=='mixed' and 'amplitudes' not in frame
    components=frame['components']+component_page(frame['visualizationToken'],4)['components']
    rebuilt=np.zeros((8,8),complex)
    for c in components:
        v=np.array(c['amplitudes'])@[1,1j]
        rebuilt+=c['weight']*np.outer(v,v.conj())
    assert np.allclose(rebuilt,rho.data)
    assert frame['spectral']['rank']==8
    response=client.post('/api/tutorial/state-visualization',json={'visualizationToken':'expired','cursor':0})
    assert response.status_code==422 and 'expired' in response.json()['error']['message']


def test_measurement_dephases_joint_state_but_acceptance_is_normalized():
    state=DensityMatrix(Statevector([1,0,0,1])/np.sqrt(2))
    frames=joint_frames(state,1,1,['a0','q0'])
    assert frames['joint-before-readout']['stateKind']=='pure'
    assert frames['joint-after-readout']['stateKind']=='mixed'
    assert frames['joint-accepted']['probabilities']==pytest.approx([1,0,0,0])


def test_all_five_wait_targets_match_independent_channels_and_source():
    from backend.noise_lab.code_parser import parse
    from backend.noise_lab.models import CompileRequest
    source='from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(5)\n'+'\n'.join(f'qc.x({q},at=0)' for q in range(5))+'\nqc.decoherence([0,1,2,3,4],at=1,time_us=50,t1_us=100,t2_us=80)'
    grouped=parse(CompileRequest(code=source))
    separate=grouped.model_dump();separate['combineErrors']=True
    wait=separate['operations'].pop()
    separate['operations'] += [{**wait,'id':f'w{q}','qubits':[q]} for q in range(5)]
    a=run_lab(LabRunRequest(circuit=grouped));b=run_lab(LabRunRequest(circuit=Circuit(**separate)))
    assert a['states'][1]['probabilities']==pytest.approx(b['states'][1]['probabilities'])
    assert a['states'][1]['visualization']['stateKind']=='mixed'


@pytest.mark.parametrize('closing,valid', [([dict(qubit=0,pauli='X')],False),([dict(qubit=0,pauli='X'),dict(qubit=1,pauli='X')],True)])
def test_multiwire_cx_closure_requires_product(closing,valid):
    d=Draft(mode='guided',dataQubits=2,payload=[dict(id='cx',name='cx',qubits=[0,1],column=2)],checks=[check(closing=closing)])
    r=run(RunRequest(draft=d,faultsEnabled=False))
    assert r['valid'] is valid and r['guidedSuccess'] is valid
    assert r['frames']['joint-before-readout']['wireOrder']==['a0','q1','q0']
    assert r['keptShots']+r['discardedShots']==r['shots']


@pytest.mark.parametrize('axis,valid', [('X',False),('Y',False),('Z',True)])
def test_actual_t_crossing(axis,valid):
    d=NonCliffordDraft(mode='guided',dataQubits=1,payload=[dict(id='t',name='t',qubits=[0],column=2)],checks=[check(axis)])
    r=run(NonCliffordRequest(draft=d,faultsEnabled=False))
    assert r['valid'] is valid and r['compatibleSuccess'] is valid
    assert r['checks'][0]['steps'][-1]['crossingFactor']==axis


def test_remote_t_and_empty_payload_do_not_certify_and_recombination_is_not_false_alarm():
    d=NonCliffordDraft(dataQubits=2,payload=[dict(id='t',name='t',qubits=[1],column=2)],checks=[check('Z')])
    assert not run(NonCliffordRequest(draft=d))['compatibleSuccess']
    d=NonCliffordDraft(dataQubits=1,payload=[dict(id=f't{i}',name='t',qubits=[0],column=i) for i in (1,2)],checks=[check('X',[dict(qubit=0,pauli='Y')])])
    r=run(NonCliffordRequest(draft=d,faultsEnabled=False))
    assert r['scheduleValid'] and not r['transportSupported']
    assert r['noiselessFlagProbability']==pytest.approx(0,abs=1e-9)


def test_helper_wait_and_invalid_targets():
    base=dict(dataQubits=2,payload=[dict(id='h',name='h',qubits=[1],column=2)],checks=[check('Z')])
    fault=dict(id='f',name='decoherence',qubit=0,boundary=2,targets=[dict(kind='ancilla',index=0)],timeUs=100,t1Us=100,t2Us=80)
    d=Draft(**base,faults=[fault]);r=run(RunRequest(draft=d))
    assert r['valid'] and r['noiselessFlagProbability']==pytest.approx(0,abs=1e-9)
    assert r['flagProbability']>0
    for targets in [[dict(kind='data',index=4)],[dict(kind='ancilla',index=1)],[dict(kind='data',index=0)]*2]:
        with pytest.raises(ValidationError):Draft(**base,faults=[{**fault,'targets':targets}])


def test_reserved_inactive_helper_does_not_inflate_school_three_frames():
    from backend.check_lab.models import Draft as OldDraft, CheckRequest
    from backend.check_lab.service import run as check_run
    c={**check('Z'),'ancilla':1}
    d=OldDraft(mode='sandbox',dataQubits=1,payload=[],checks=[c],faults=[dict(id='helper-fault',name='phase_flip',qubit=0,boundary=2,targets=[dict(kind='ancilla',index=1)])])
    r=check_run(CheckRequest(draft=d))
    assert r['wireLabels']==['q0','a1'] and r['resources']['peakQubits']==2
    assert r['valid'] and r['flagProbability']==pytest.approx(1)
    assert r['frames']['joint-before-readout']['wireOrder']==['a1','q0']
    with pytest.raises(ValidationError,match='already been measured'):
        OldDraft(**{**d.model_dump(),'faults':[{**d.faults[0].model_dump(),'boundary':4}]})


def test_capstone_nonempty_score_only_certificate_and_real_paulice_call(monkeypatch):
    from backend.graduation_lab import paulice_adapter as adapter
    data=capstone.benchmark();assert data['available'] and data['enumerationComplete']
    assert data['evaluatedCandidateCount']==data['validCandidateCount']==1201
    winner=data['bestNonempty'];req=CapstoneRequest(strategy=Strategy(**winner['canonicalStrategy']))
    r=capstone.run(req)
    assert r['qualifies'] and r['scoreExact']==pytest.approx(winner['score'])
    assert r['scoreExact']==pytest.approx(r['fidelityExact']*r['retentionExact'])
    # Prove no hidden floor: find a nonempty valid candidate with F<.9, score>=.65.
    from backend.graduation_lab.benchmark import catalogue
    found=False
    for rail in catalogue():
        strategy=Strategy(rails=[rail,dict(ancilla=1,active=False)])
        m=capstone.exact_metrics(strategy.model_dump_json())
        if m['valid'] and m['fidelityExact']<.9 and m['scoreExact']>=.65:
            assert capstone.run(CapstoneRequest(strategy=strategy))['qualifies'];found=True;break
    assert found
    calls=[];real=adapter.add_pauli_checks
    def spy(*args,**kwargs):calls.append(kwargs);return real(*args,**kwargs)
    monkeypatch.setattr(adapter,'add_pauli_checks',spy);adapter._search.cache_clear()
    reveal=capstone.reveal(req);again=capstone.reveal(req)
    assert len(calls)==1 and calls[0]['method']=='windowed'
    assert reveal['paulice']['available'] and again['paulice']['cached']
    assert reveal['paulice']['mapping']=='unsupported' and 'score' not in reveal['paulice']
    assert reveal['paulice']['instructions'] and reveal['paulice']['packageVersion']
    empty=Strategy(rails=[dict(ancilla=a,active=False) for a in range(2)])
    assert not capstone.run(CapstoneRequest(strategy=empty))['qualifies']
    with pytest.raises(ValueError):capstone.reveal(CapstoneRequest(strategy=empty))


def test_reveal_tool_failure_is_explicit_and_qualification_survives(monkeypatch):
    from backend.graduation_lab import paulice_adapter as adapter
    adapter._search.cache_clear()
    def fail(*args,**kwargs):raise RuntimeError('offline')
    monkeypatch.setattr(adapter,'add_pauli_checks',fail)
    winner=capstone.benchmark()['bestNonempty']
    r=client.post('/api/tutorial/graduation-lab/reveal',json={'strategy':winner['canonicalStrategy']})
    assert r.status_code==200
    assert not r.json()['paulice']['available'] and r.json()['player']['scoreExact']>=.65


def test_diagnostic_overlay_never_qualifies_or_changes_fixture():
    winner=capstone.benchmark()['bestNonempty']
    req={'strategy':winner['canonicalStrategy'],'overlay':[dict(id='overlay',name='decoherence',qubit=0,boundary=3,targets=[dict(kind='data',index=q) for q in range(3)],timeUs=50,t1Us=100,t2Us=80)]}
    r=client.post('/api/tutorial/graduation-lab/diagnostic',json=req)
    assert r.status_code==200,r.text
    result=r.json()
    assert result['diagnosticOverlay'] and not result['qualifies']
    assert 'not a qualifying run' in result['classification']
    assert sum('Diagnostic overlay' in i['stage'] for i in result['instructions'])==3
    assert capstone.benchmark()['bestNonempty']['score']==winner['score']
    req['overlay'][0]['targets']=[dict(kind='ancilla',index=1)]
    assert client.post('/api/tutorial/graduation-lab/diagnostic',json=req).status_code==422
