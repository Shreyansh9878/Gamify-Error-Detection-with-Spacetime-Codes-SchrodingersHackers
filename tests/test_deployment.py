import base64
import json
from pathlib import Path
import struct
import numpy as np
from qiskit.quantum_info import DensityMatrix
from backend.deployment_security import RequestBudget
from backend.learning.portable_frames import pack_components
from backend.learning import visualization


def test_portable_components_are_lossless_and_independent_of_instance_cache(monkeypatch):
    monkeypatch.setenv('PORTABLE_STATE_FRAMES','true')
    state=DensityMatrix(np.eye(8)/8)
    frame=visualization.state_visualization(state,3)
    packet=frame['componentPayload'];assert packet['count']==8
    data=base64.b64decode(packet['data']);stride=17
    numbers=struct.unpack(f'<{len(data)//8}d',data)
    assert len(numbers)==8*stride
    for component in visualization._frames[frame['visualizationToken']]:
        start=component['index']*stride
        expected=[component['weight']]+[x for pair in component['amplitudes'] for x in pair]
        assert list(numbers[start:start+stride])==expected
    visualization._frames.clear()
    assert packet['data']==frame['componentPayload']['data']
    assert len(pack_components([{'weight':1.,'amplitudes':[[1.,0.],[0.,0.]]}],1)['data'])>0


def test_admission_budget_is_bounded_and_recovers():
    limiter=RequestBudget(limit=2,period=60,capacity=2)
    assert limiter.allow('a',0) and limiter.allow('a',1)
    assert not limiter.allow('a',2)
    assert limiter.allow('a',60)
    limiter.allow('b',60);limiter.allow('c',60)
    assert len(limiter.entries)==2


def test_deployment_config_preserves_runtime_references_and_uses_no_paid_settings():
    root=Path(__file__).resolve().parents[1]
    config=json.loads((root/'vercel.json').read_text())
    function=config['functions']['api/index.py']
    assert function['maxDuration']<=300 and 'memory' not in function
    assert 'backend/missions/references.json' not in (root/'.vercelignore').read_text()
    assert 'backend/missions/references.json' not in function['excludeFiles']
    requirements=(root/'requirements-deploy.txt').read_text()
    packages={line.split('==')[0] for line in requirements.splitlines() if line and not line.startswith('#')}
    assert packages.isdisjoint({'matplotlib','pytest','jupyter','notebook','httpx'})
    assert all(name in requirements for name in ('qiskit==','qiskit-aer==','qiskit-paulice=='))
