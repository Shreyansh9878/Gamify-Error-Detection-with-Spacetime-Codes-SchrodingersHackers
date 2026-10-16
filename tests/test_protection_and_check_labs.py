import ast
import math
import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from qiskit.quantum_info import state_fidelity
from backend.app import app
from backend.protection_lab.models import ProtectionRequest, Experiment, CompileRequest as PC
from backend.protection_lab.code_parser import parse as pparse, compile_source as pcompile
from backend.protection_lab.service import run as prun, preview as ppreview, generated, correct
from backend.check_lab.models import Draft, CheckRequest, TraceRequest, CompileRequest as CC
from backend.check_lab.code_parser import compile_source as ccompile, parse as cparse
from backend.check_lab.service import run as crun, validate, coverage, trace
from backend.learning.common import evolve


def experiment(body='',n=1,channel='bit_flip',probability=.15):
    param='strength' if channel=='depolarizing' else 'probability'
    return pparse(PC(code=f'from quantum_shield import ProtectionCircuit\nqc=ProtectionCircuit({n})\n'+body+f'\nqc.noise("{channel}",qubit=0,{param}={probability},boundary=2)'))


def check_draft(opening='X',closing='Y',sign=1,mode='guided',faults=None,**updates):
    base=dict(mode=mode,dataQubits=1,payload=[dict(id='s0',name='s',qubits=[0],column=2)],checks=[dict(id='c0',ancilla=0,startBoundary=1,endBoundary=3,openingTaps=[dict(qubit=0,pauli=opening)],closingTaps=[dict(qubit=0,pauli=closing)],closingSign=sign,openingHadamard=True,closingHadamard=True,measure=True)],faults=faults or [])
    base.update(updates)
    return Draft(**base)


@pytest.mark.parametrize('method',['detection','mitigation','correction'])
def test_real_methods_and_resource_accounting(method):
    r=prun(ProtectionRequest(experiment=experiment(),technique=method))
    assert r['baseline']['fidelity']==pytest.approx(.85)
    assert r['ideal']['sampleSize']==0
    assert r['resources']['totalComparisonShots']==(3072 if method=='mitigation' else 2048)
    if method=='detection':
        assert r['retention']==pytest.approx(.85)
        assert r['output']['fidelity']==pytest.approx(1)
        assert r['keptShots']+r['discardedShots']==1024
        assert sum(r['output']['counts'].values())==r['keptShots']
    elif method=='correction':
        assert r['output']['fidelity']==pytest.approx(1-(3*.15**2-2*.15**3))
        assert r['resources']['addedQubits']==4
        assert r['resources']['twoQubitGates']==8
        assert sum(r['syndrome']['counts'].values())==1024
    else:
        assert r['output'] is None
        assert [s['scale'] for s in r['scales']]==[1,3,5]
        assert [s['state']['expectation'] for s in r['scales']]==pytest.approx([.7,.7**3,.7**5])
        assert r['exactFitEstimate']==pytest.approx(13/12*.7+1/3*.7**3-5/12*.7**5)
        assert r['variance']>=0


@pytest.mark.parametrize('family,channel',[('bit_flip','bit_flip'),('phase_flip','phase_flip')])
def test_repetition_preserves_arbitrary_entangled_information(family,channel):
    c=experiment('qc.h(0,at=0)\nqc.cx(0,1,at=1)',2,channel,0.)
    request=ProtectionRequest(experiment=c,technique='correction',correctionFamily=family)
    variants,width,_,_=generated(request)
    items=variants['Correction'];noise_indices=[i for i,it in enumerate(items) if it['name']=='noise']
    ideal=evolve([it for it in items if it['stage'] in ('Base A','Base B')],2)
    for location in noise_indices:
        altered=[dict(it) for it in items];altered[location]=dict(altered[location],noise={**altered[location]['noise'],'probability':1.})
        state,_,_=correct(request,altered)
        assert state_fidelity(ideal,state)==pytest.approx(1,abs=1e-7)


def test_correction_limitations_and_post_noise_gates():
    r=prun(ProtectionRequest(experiment=experiment(probability=.6),technique='correction'))
    assert r['output']['fidelity'] < r['baseline']['fidelity']
    c=experiment('qc.h(0,at=0)\nqc.h(0,at=3)',channel='phase_flip')
    r=prun(ProtectionRequest(experiment=c,technique='detection',detectionPauli='X'))
    assert r['ideal']['probabilities']['0']==pytest.approx(1)
    assert r['baseline']['probabilities']['1']==pytest.approx(.15)
    assert r['output']['probabilities']['0']==pytest.approx(1)


def test_zero_retention_and_p_endpoints():
    r=prun(ProtectionRequest(experiment=experiment(probability=1.)))
    assert r['output'] is None and r['samplingOverhead'] is None
    assert r['keptShots']==0 and r['discardedShots']==1024
    r=prun(ProtectionRequest(experiment=experiment(probability=1.),technique='mitigation'))
    assert all(s['state']['expectation']==pytest.approx(-1) for s in r['scales'])


def test_thermal_composition_and_seed_independence():
    c=pparse(PC(code='from quantum_shield import ProtectionCircuit\nqc=ProtectionCircuit(1)\nqc.x(0)\nqc.noise("decoherence",qubit=0,boundary=1,time_us=200,t1_us=100,t2_us=80)'))
    a=prun(ProtectionRequest(experiment=c,technique='mitigation'))
    b=prun(ProtectionRequest(experiment=c,technique='mitigation',sampleSeed=3))
    for x,y in zip(a['scales'],b['scales']):
        assert x['state']['probabilities']['1']==pytest.approx(math.exp(-2*x['scale']))
        assert x['state']['expectation']==pytest.approx(y['state']['expectation'])


@pytest.mark.parametrize('opening,closing,sign',[('X','Y',1),('Y','X',-1),('Z','Z',1)])
def test_signed_checks_and_isometry(opening,closing,sign):
    r=crun(CheckRequest(draft=check_draft(opening,closing,sign),faultsEnabled=False))
    assert r['valid'] and r['residual']<1e-8
    assert r['flagProbability']==pytest.approx(0,abs=1e-8)
    assert r['states']['unfiltered']['fidelity']==pytest.approx(1)


def test_wrong_sign_and_wrong_closing_are_diagnostics():
    r=crun(CheckRequest(draft=check_draft('Y','X',1),faultsEnabled=False))
    assert not r['valid'] and r['flagProbability']==pytest.approx(1)
    assert not r['guidedSuccess'] and 'false-alarm' in r['classification']
    r=crun(CheckRequest(draft=check_draft('X','X'),faultsEnabled=False))
    assert not r['valid'] and r['flagProbability']==pytest.approx(.5)


@pytest.mark.parametrize('name,boundary,flag',[('phase_flip',2,1),('bit_flip',2,0),('phase_flip',3,1),('bit_flip',3,1),('phase_flip',4,0)])
def test_fault_timing_and_joint_sample_consistency(name,boundary,flag):
    fault=dict(id='f',name=name,qubit=0,boundary=boundary)
    d=check_draft(mode='sandbox',faults=[fault])
    r=crun(CheckRequest(draft=d))
    assert r['flagProbability']==pytest.approx(flag,abs=1e-8)
    assert r['keptShots']+r['discardedShots']==r['shots']
    assert r['sandboxSuccess']
    assert r['states']['retained'] is None if flag else r['states']['retained'] is not None
    swept=coverage(CheckRequest(draft=d))
    axis='X' if name=='bit_flip' else 'Z'
    point=next(p for p in swept['probes'] if p['boundary']==boundary and p['qubit']==0 and p['pauli']==axis)
    assert point['flagProbability']==flag


def test_incomplete_stages_cannot_run_or_earn_progress():
    d=check_draft();d.checks[0].closingHadamard=False
    r=validate(CheckRequest(draft=d))
    assert not r['structureComplete'] and not r['valid']
    with pytest.raises(ValueError):crun(CheckRequest(draft=d))


def test_multiqubit_closing_and_overlap_schedule_validation():
    d=Draft(mode='sandbox',dataQubits=3,preparation=[dict(id='h',name='h',qubits=[0],column=0)],payload=[dict(id='cx0',name='cx',qubits=[0,1],column=0),dict(id='cx1',name='cx',qubits=[1,2],column=1)],checks=[dict(id='c',ancilla=0,startBoundary=0,endBoundary=2,openingHadamard=True,openingTaps=[dict(qubit=0,pauli='X')],closingTaps=[dict(qubit=q,pauli='X') for q in range(3)],closingHadamard=True,measure=True)])
    r=crun(CheckRequest(draft=d,faultsEnabled=False));assert r['valid']
    assert r['checks'][0]['expected']=='XXX' and r['resources']['twoQubitGates']==6
    # Crossing X/Z windows can conflict despite each individually closing through identity.
    c=dict(openingHadamard=True,closingHadamard=True,measure=True,closingSign=1)
    conflict=Draft(mode='sandbox',dataQubits=1,payload=[],checks=[dict(c,id='a',ancilla=0,startBoundary=0,endBoundary=2,openingTaps=[dict(qubit=0,pauli='X')],closingTaps=[dict(qubit=0,pauli='X')]),dict(c,id='b',ancilla=1,startBoundary=1,endBoundary=3,openingTaps=[dict(qubit=0,pauli='Z')],closingTaps=[dict(qubit=0,pauli='Z')])])
    v=validate(CheckRequest(draft=conflict))
    assert v['localOperatorMatch'] and not v['scheduleValid']


def test_wait_cancellation_and_seeds():
    d=check_draft(mode='sandbox',faults=[dict(id='wait',name='decoherence',qubit=0,boundary=3,timeUs=0.)])
    r=crun(CheckRequest(draft=d));assert r['flagProbability']==pytest.approx(0,abs=1e-8) and not r['sandboxSuccess']
    d.faults[0].timeUs=100.
    a=crun(CheckRequest(draft=d));b=crun(CheckRequest(draft=d,sampleSeed=1))
    assert a['syndrome']['probabilities']==pytest.approx(b['syndrome']['probabilities'])
    assert 0<a['flagProbability']<1
    d=check_draft(mode='sandbox',combineFaults=True,faults=[dict(id='a',name='phase_flip',qubit=0,boundary=3,order=0),dict(id='b',name='phase_flip',qubit=0,boundary=3,order=1)])
    assert crun(CheckRequest(draft=d))['flagProbability']==pytest.approx(0,abs=1e-8)


@pytest.mark.parametrize('code',['import os','qc.h(open("secret"))','qc.__class__()','for i in range(3): qc.h(0)','qc.h(0,**{})','qc.h(0); qc=ProtectionCircuit(2)'])
def test_safe_parsers(code):
    for wrapper,cls,compile_ in [('ProtectionCircuit',PC,pcompile),('CheckCircuit',CC,ccompile)]:
        result=compile_(cls(code=f'from quantum_shield import {wrapper}\nqc={wrapper}(1)\n{code}'))
        assert result['diagnostics'] and result['diagnostics'][0]['line']>=1


def test_bounds_locked_guided_and_native_export_syntax():
    with pytest.raises(ValidationError):check_draft(payload=[dict(id='h',name='h',qubits=[0],column=2)])
    with pytest.raises(ValidationError):check_draft(mode='sandbox',payload=[dict(id='t',name='rx',angleRadians=.5,qubits=[0],column=0)])
    with pytest.raises(ValidationError):Experiment(qubits=4)
    for method in ('detection','mitigation','correction'):
        ast.parse(ppreview(ProtectionRequest(experiment=experiment(),technique=method))['nativeCode'])
    ast.parse(validate(CheckRequest(draft=check_draft()))['nativeCode'])


def test_new_api_contracts_and_trace_target_validation():
    with TestClient(app) as client:
        source='from quantum_shield import ProtectionCircuit\nqc=ProtectionCircuit(1)\nqc.noise("bit_flip",qubit=0,boundary=0,probability=0.15)'
        compiled=client.post('/api/tutorial/protection-lab/compile',json={'code':source});assert compiled.status_code==200
        payload={'experiment':compiled.json()['experiment'],'technique':'correction'}
        assert client.post('/api/tutorial/protection-lab/run',json=payload).status_code==200
        req={'draft':check_draft().model_dump(),'faultsEnabled':False}
        assert client.post('/api/tutorial/check-lab/validate',json=req).json()['valid']
        assert client.post('/api/tutorial/check-lab/run',json=req).json()['guidedSuccess']
        assert client.post('/api/tutorial/check-lab/trace-fault',json={**req,'fault':{'id':'f','name':'bit_flip','qubit':2,'boundary':3}}).status_code==422


@pytest.mark.parametrize('method',['detection','mitigation','correction'])
def test_native_qiskit_exports_execute_actual_physical_circuits(method):
    # This is trusted generated code, not the user-source parser execution path.
    request=ProtectionRequest(experiment=experiment(),technique=method)
    namespace={}
    exec(ppreview(request)['nativeCode'],namespace)
    outputs=namespace['results']
    if method=='detection':
        assert all(bits.split()[0]=='0' for bits in outputs['Detection'] if bits.split()[-1]=='0')
    if method=='correction':
        p1=sum(v for bits,v in outputs['Correction'].items() if bits.split()[0]=='1')/1024
        assert abs(p1-.06075)<.04
    if method=='mitigation':assert len(outputs)==3


def test_native_check_export_and_actual_fault_trace():
    fault=dict(id='f',name='phase_flip',qubit=0,boundary=3)
    d=check_draft(faults=[fault]);r=trace(TraceRequest(draft=d,fault=fault))
    namespace={};exec(r['nativeCode'],namespace)
    assert all(bits.split()[-1]=='0' for bits in namespace['results']['No faults'])
    assert all(bits.split()[-1]=='1' for bits in namespace['results']['Faulted'])
    assert r['traceSteps'][0]['operator']=='IZ'
    assert r['traceSteps'][-1]['operator'][0] in 'XY'


def test_authored_check_names_stay_comments_and_generated_ids_do_not_collide():
    from backend.check_lab.code_parser import parse
    from backend.check_lab.models import CompileRequest
    source = '''from quantum_shield import CheckCircuit
qc = CheckCircuit(1)
qc.s(0, at=2)
qc.check(id="code-0", ancilla=0, start=1, end=3, opening=[(0,"X")], closing=[(0,"Y")], opening_h=True, closing_h=True, measure=True)
'''
    draft = parse(CompileRequest(code=source))
    assert draft.payload[0].id != draft.checks[0].id
    draft.checks[0].id = 'check\nraise RuntimeError("injected")\n#'
    result = validate(CheckRequest(draft=draft))
    tree = ast.parse(result['nativeCode'])
    assert not any(isinstance(node, ast.Raise) for node in ast.walk(tree))
    assert result['valid']
