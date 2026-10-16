import json
import math
import pytest
from pydantic import ValidationError
from backend.timeline_lab.models import Draft, Operation, Request, HardwareNoise, CompileRequest
from backend.timeline_lab import service
from backend.timeline_lab.capstone_examples import example


def rotation_draft(name,opening,closing,angle=None,negative=False):
    ops=[Operation(id='h',name='h',qubits=[1],column=0),Operation(id='o',name='c'+opening.lower(),qubits=[1,0],column=1),
         Operation(id='u',name=name,qubits=[0],column=3,**({'angleRadians':angle} if angle is not None else {})),
         Operation(id='c',name='c'+closing.lower(),qubits=[1,0],column=5),
         Operation(id='f',name='h',qubits=[1],column=7),Operation(id='m',name='m',qubits=[1],column=8)]
    if negative:ops.append(Operation(id='sign',name='z',qubits=[1],column=6))
    return Draft(lesson=5,mode='sandbox',dataQubits=1,ancillas=1,columns=12,operations=ops)


@pytest.mark.parametrize('opening,closing,negative',[('X','Y',True),('Y','X',False),('Z','Z',False)])
def test_sdg_signed_clifford_transport(opening,closing,negative):
    d=rotation_draft('sdg',opening,closing,negative=negative)
    assert service.validation(d)['valid']
    assert service.run(Request(draft=d))['retention']==pytest.approx(1)


@pytest.mark.parametrize('axis',['X','Y','Z'])
def test_tdg_only_z_crosses_as_a_pauli(axis):
    v=service.validation(rotation_draft('tdg',axis,axis))
    assert v['valid']==(axis=='Z')
    assert v['checks'][0]['nonPauli']==(axis!='Z')


@pytest.mark.parametrize('name,axis',[('rx','X'),('ry','Y'),('rz','Z')])
def test_same_axis_commutes_for_arbitrary_rotation(name,axis):
    d=rotation_draft(name,axis,axis,.371)
    assert service.validation(d)['valid']
    assert service.run(Request(draft=d))['score']==pytest.approx(1)


@pytest.mark.parametrize('name,opening,closing,negative',[('rz','X','Y',False),('rx','Z','Y',True),('ry','Z','X',False)])
def test_quarter_turn_rotation_is_signed_pauli(name,opening,closing,negative):
    assert service.validation(rotation_draft(name,opening,closing,math.pi/2,negative))['valid']
    v=service.validation(rotation_draft(name,opening,closing,math.pi/4))
    assert not v['valid'] and v['checks'][0]['nonPauli'] and 'Non-Pauli' in v['checks'][0]['message']


def test_rotation_source_and_native_export_preserve_theta():
    source='from quantum_shield import FlightCircuit\nfrom math import pi\nqc=FlightCircuit(1)\nqc.context(lesson=5,mode="sandbox",ancillas=1,columns=12)\nqc.sdg(0,at=0)\nqc.tdg(0,at=1)\nqc.rz(pi/4,0,at=2)'
    parsed=service.compile_source(CompileRequest(code=source))
    assert parsed['diagnostics']==[]
    d=Draft.model_validate(parsed['draft'])
    assert d.operations[-1].angleRadians==pytest.approx(math.pi/4)
    export=service.native_code(d)
    assert 'qc.sdg(0)' in export and 'qc.tdg(0)' in export and f'qc.rz({math.pi/4}, 0)' in export


def test_full_hardware_ranges_are_physical_independent_compositions():
    noise=HardwareNoise(bitFlip=1.,phaseFlip=1.,depolarizing=1.,relaxationTimeUs=120.)
    from backend.protection_lab.models import ProtectionRequest
    from backend.protection_lab.service import run
    for technique in ('detection','mitigation','correction'):
        r=run(ProtectionRequest.model_validate({'experiment':{'qubits':1,'operations':[],'hardware':noise.model_dump()},'technique':technique,'shotsPerVariant':256}))
        assert 0<=r['baseline']['fidelity']<=1 and r['baseline']['sampleSize']==256
    for value in (-.01,1.01,float('nan')):
        with pytest.raises(ValidationError):HardwareNoise(bitFlip=value)
    with pytest.raises(ValidationError):HardwareNoise(relaxationTimeUs=121.)
    with pytest.raises(ValidationError):HardwareNoise(t1Us=20.,t2Us=41.)


def test_capstone_difficulty_exact_scores_and_same_noise_protocol():
    baseline=service.evaluate(example('unchecked'),visuals=False)
    sensible=service.evaluate(example('sensible'),visuals=False)
    everywhere=service.evaluate(example('everywhere'),visuals=False)
    assert service.validation(example('sensible'))['valid']
    assert service.validation(example('everywhere'))['valid']
    threshold=sensible['qualificationThreshold']
    assert baseline['score']<threshold<sensible['score']
    assert everywhere['score']<threshold
    assert baseline['score']==pytest.approx(.4941321617,abs=1e-8)
    # Physical yield is unchanged; the game objective now applies its budget.
    assert sensible['correct_shot_yield']==pytest.approx(.6681363656,abs=1e-8)
    assert everywhere['correct_shot_yield']==pytest.approx(.4569802140,abs=1e-8)
    assert sensible['score']==pytest.approx(.6681363656/service.CAPSTONE_MINIMUM_KEPT,abs=1e-8)
    # Finite sampling never changes exact qualification.
    a=service.run(Request(draft=example(),shots=256,seed=3))
    b=service.run(Request(draft=example(),shots=4096,seed=97))
    assert a['score']==pytest.approx(b['score'])
    reference=service.comparison(json.dumps(example().hardware.model_dump(),sort_keys=True))
    assert reference['best']['score']>=sensible['score']-1e-10


def test_turning_noise_off_cannot_pass_by_hiding_the_baseline():
    d=example().model_copy(update={'hardware':HardwareNoise(enabled=False)})
    result=service.evaluate(d,visuals=False)
    assert result['qualificationThreshold']>result['score']
    with pytest.raises(ValueError):service.reveal(Request(draft=d))
