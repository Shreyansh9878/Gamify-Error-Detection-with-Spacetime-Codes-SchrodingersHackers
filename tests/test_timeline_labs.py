"""Ordinary-gate timelines: transport, real readout, noise and bounded reveals."""
import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from backend.app import app
from backend.timeline_lab.models import Draft, Operation, Request, CompileRequest, HardwareNoise
from backend.timeline_lab import service
from backend.protection_lab.models import ProtectionRequest
from backend.protection_lab.service import run as protection_run

client=TestClient(app)


def op(name,qs,c):return Operation(id=f'{name}-{qs}-{c}',name=name,qubits=qs,column=c)


def shell(lesson=3,opening='cx',closing='cy',fault=None):
    n={3:1,4:2,5:1}[lesson]
    rows=[op('h',[n],0),op(opening,[n,0],1)]
    if lesson==4:
        rows += [op(closing,[n,0],6),op('cx',[n,1],7),op('h',[n],8),op('m',[n],9)]
        if fault:rows.append(op(fault,[0],5))
    else:
        rows += [op(closing,[n,0],4),op('h',[n],5),op('m',[n],6)]
        if fault:rows.append(op(fault,[0],3))
    return Draft(lesson=lesson,columns=10 if lesson==4 else 7,dataQubits=n,operations=rows)


def test_s_ordinary_controlled_y_closes_and_x_fault_flags():
    d=shell();r=service.run(Request(draft=d))
    assert r['validation']['valid'] and r['retention']==pytest.approx(1)
    assert r['validation']['checks'][0]['expected']=='+1 Y'
    faulty=service.run(Request(draft=shell(fault='bit_flip')))
    assert faulty['validation']['valid'] and faulty['keptShots']==0
    assert faulty['output'] is None and faulty['fidelity'] is None and faulty['score']==0
    assert faulty['discardedShots']==faulty['totalShots']


def test_wrong_check_is_state_independent_even_if_this_input_hides_mismatch():
    d=shell(opening='cz',closing='cx');v=service.validation(d)
    assert not v['valid'] and not v['wholeCircuitIdentity']


def test_guided_h_then_cx_uses_opening_z_and_both_closing_x_factors():
    d=shell(4,'cz','cx');v=service.validation(d)
    assert v['valid'] and v['checks'][0]['expected']=='+1 XX'
    assert (v['checks'][0]['openingColumn'],v['checks'][0]['closingColumn'])==(1,6)
    single=d.model_copy(update={'operations':[g for g in d.operations if not(g.name=='cx' and g.qubits==[2,1])]})
    assert not service.validation(single)['valid']
    assert not service.validation(shell(4,'cx','cx'))['valid']


@pytest.mark.parametrize('pauli,valid,nonpauli',[('cz',True,False),('cx',False,True),('cy',False,True)])
def test_t_operator_expansion(pauli,valid,nonpauli):
    v=service.validation(shell(5,pauli,pauli))
    assert v['valid']==valid and v['checks'][0]['nonPauli']==nonpauli


def test_dynamic_endpoints_move_with_real_gates_and_products():
    d=Draft(lesson=4,mode='sandbox',dataQubits=2,columns=14,operations=[
        op('h',[2],0),op('cx',[2,0],2),op('cx',[0,1],6),
        op('cx',[2,0],9),op('cx',[2,1],10),op('h',[2],11),op('m',[2],12)])
    v=service.validation(d);assert v['valid']
    assert (v['checks'][0]['openingColumn'],v['checks'][0]['closingColumn'])==(2,9)
    moved=d.model_copy(update={'operations':[g.model_copy(update={'column':3}) if g.column==2 else g for g in d.operations]})
    assert service.validation(moved)['checks'][0]['openingColumn']==3


def test_multiple_opening_factors_are_included_not_just_last_gate():
    d=Draft(lesson=4,mode='sandbox',dataQubits=2,columns=12,operations=[op('h',[2],0),op('cx',[2,0],1),op('cx',[2,1],2),op('cx',[0,1],4),op('cx',[2,0],7),op('h',[2],8),op('m',[2],9)])
    v=service.validation(d)
    assert v['valid'] and v['checks'][0]['opening']=='+1 XX' and v['checks'][0]['expected']=='+1 IX'
    assert (v['checks'][0]['openingColumn'],v['checks'][0]['closingColumn'])==(2,7)


def test_measurement_is_terminal_and_locks_cannot_be_overwritten():
    with pytest.raises(ValidationError):Draft(lesson=3,operations=[op('x',[0],2)])
    with pytest.raises(ValidationError):Draft(lesson=3,mode='sandbox',operations=[op('m',[1],0),op('h',[1],1)])
    r=client.post('/api/tutorial/timeline/run',json={'draft':{'lesson':3,'operations':[op('x',[0],2).model_dump()]}})
    assert r.status_code==422


def test_decoherence_all_seven_wires_is_a_mixed_qsphere():
    d=Draft(lesson=5,mode='sandbox',dataQubits=5,ancillas=2,operations=[op('h',[q],0) for q in range(7)]+[Operation(id='wait',name='decoherence',qubits=list(range(7)),column=1,timeUs=50)])
    r=service.run(Request(draft=d,shots=256))
    assert r['joint']['experimentWireCount']==7 and len(r['joint']['wireOrder'])==7
    assert r['joint']['stateKind']=='mixed' and r['joint']['spectral']['rank']>1


def test_source_is_allowlisted_and_roundtrips_controlled_y_measurement():
    source='from quantum_shield import FlightCircuit\nqc = FlightCircuit(1)\nqc.context(lesson=3,mode="guided",ancillas=1,columns=7)\nqc.h(1,at=0)\nqc.cx(1,0,at=1)\nqc.cy(1,0,at=4)\nqc.h(1,at=5)\nqc.m(1,at=6)\n'
    result=service.compile_source(CompileRequest(code=source))
    assert result['diagnostics']==[] and service.validation(Draft.model_validate(result['draft']))['valid']
    for code in ['import os\nos.system("whoami")','from quantum_shield import FlightCircuit\nqc = FlightCircuit(1)\nqc.context(**{})']:
        assert service.compile_source(CompileRequest(code=code))['draft'] is None


def test_hardware_noise_reaches_all_data_and_helper_wires_and_stops_at_measurement():
    d=Draft(lesson=6,dataQubits=3,ancillas=2,columns=15,hardware=HardwareNoise(),operations=[op('h',[3],0),op('cz',[3,1],1),op('cz',[3,0],9),op('cz',[3,1],10),op('h',[3],11),op('m',[3],12),op('h',[4],13)])
    items=service.schedule(d);read=next(i for i,g in enumerate(items) if g['name']=='measure')
    assert set(g['qubits'][0] for g in items[:read] if g['name']=='noise')==set(range(5))
    assert not any(g['name']=='noise' and g['qubits']==[3] for g in items[read:])


@pytest.mark.parametrize('technique',['detection','mitigation','correction'])
def test_hardware_protection_uses_noisy_helpers_and_true_output_types(technique):
    request=ProtectionRequest.model_validate({'experiment':{'qubits':1,'operations':[{'id':'h','name':'h','qubits':[0],'column':0}], 'hardware':HardwareNoise().model_dump()},'technique':technique})
    r=protection_run(request)
    for items in r['variants'].values():
        targets=set(g['qubits'][0] for g in items if g['name']=='noise')
        assert targets==set(range(r['resources']['peakQubits']))
    if technique=='correction':assert r['keptShots']==1024 and r['discardedShots']==0
    if technique=='mitigation':assert r['output'] is None and r['outputKind']=='observable_estimate'
    if technique=='detection':assert r['keptShots']+r['discardedShots']==1024


def test_qualification_rechecks_and_certificate_is_keyed_by_hardware(monkeypatch):
    noise=HardwareNoise(bitFlip=.006,phaseFlip=.002)
    reference=service.comparison(json.dumps(noise.model_dump(),sort_keys=True))
    assert reference['candidates']==63 and reference['best']['score']>=.65
    d=Draft.model_validate(reference['best']['draft']);assert service.validation(d)['valid']
    calls=[]
    monkeypatch.setattr(service,'paulice_search',lambda key:calls.append(key) or {'available':True,'message':'test research adapter'})
    r=service.reveal(Request(draft=d));assert calls and r['player']['score']==pytest.approx(r['reference']['best']['score'])
    assert '63' in r['reference']['scope'] and r['reference']['globalUpperBound']==1
    with pytest.raises(ValueError):service.reveal(Request(draft=Draft(lesson=6,dataQubits=3,ancillas=2,columns=15)))


def test_native_export_executes_the_same_terminal_measurement_schedule():
    from qiskit.quantum_info import DensityMatrix
    from qiskit_aer import AerSimulator
    d=shell();source=service.native_code(d)
    # Execute circuit construction only; compare its nonselective output to the exact engine.
    namespace={};exec(source[:source.index('sim =')],namespace)
    qc=namespace['qc'];qc.save_density_matrix()
    from qiskit import transpile
    sim=AerSimulator(method='density_matrix');rho=sim.run(transpile(qc,sim),shots=1,seed_simulator=2026).result().data(0)['density_matrix']
    assert np.allclose(DensityMatrix(rho).data,service.measured_state(service.schedule(d),2).data)


def test_native_export_honors_requested_shots_and_seed_and_labels_helpers():
    r=service.run(Request(draft=shell(),shots=256,seed=89))
    assert 'shots=256, seed_simulator=89' in r['nativeCode']
    assert r['joint']['wireOrder']==['a0','q0']


def test_data_measurement_in_fundamentals_is_nonselective_not_coherent():
    from backend.noise_lab.models import Circuit, LabRunRequest
    from backend.noise_lab.simulator import run_lab
    c=Circuit(qubits=1,operations=[dict(id='h',name='h',role='prepare',qubits=[0],column=0),dict(id='m',name='m',role='prepare',qubits=[0],column=1)])
    r=run_lab(LabRunRequest(circuit=c,basis='X'))
    assert r['states'][1]['globalPurity']==pytest.approx(.5)
    assert r['states'][1]['marginals'][0]['probabilities']==pytest.approx([.5,.5])
