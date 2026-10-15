"""Bounded Qiskit state frames. Mixed populations never acquire invented phases."""
from collections import OrderedDict
from threading import Lock
from uuid import uuid4
import numpy as np
from qiskit.quantum_info import DensityMatrix

_frames = OrderedDict()
_lock = Lock()
MAX_FRAMES = 64


def _vector(vector):
    vector = np.asarray(vector, dtype=complex).copy()
    reference = int(np.argmax(np.round(np.abs(vector),13)))
    if abs(vector[reference])>1e-12:
        vector *= np.exp(-1j*np.angle(vector[reference]))
    return [[float(v.real),float(v.imag)] for v in vector]


def state_visualization(state, n, experiment_wires=None, labels=None, stage='before-measurement', scope='data'):
    if n>7: raise ValueError('State visualization is limited to seven active wires.')
    rho = DensityMatrix(state).data
    if not np.allclose(rho,rho.conj().T,atol=1e-10) or abs(np.trace(rho)-1)>1e-8:
        raise ValueError('Cannot visualize an invalid density matrix.')
    values,vectors = np.linalg.eigh(rho)
    if values.min() < -1e-10: raise ValueError('State has negative eigenvalues.')
    order = np.argsort(-values,kind='stable')
    components = [{'index':i,'weight':float(max(0.,values[j])),'amplitudes':_vector(vectors[:,j])} for i,j in enumerate(order) if values[j]>1e-10]
    purity = float(np.trace(rho@rho).real)
    pure = purity>=1-1e-10
    token = str(uuid4())
    with _lock:
        _frames[token] = components
        while len(_frames)>MAX_FRAMES: _frames.popitem(last=False)
    pairs = [(float(abs(rho[a,b])),a,b) for a in range(2**n) for b in range(a+1,2**n) if abs(rho[a,b])>1e-10]
    pairs.sort(reverse=True)
    return {'schemaVersion':2,'experimentWireCount':experiment_wires or n,'frameId':token,'visualizationToken':token,'scope':scope,'stage':stage,'wireOrder':labels or [f'q{q}' for q in reversed(range(n))],'stateKind':'pure' if pure else 'mixed','purity':purity,'probabilities':[float(v) for v in np.real(np.diag(rho))],
        **({'amplitudes':components[0]['amplitudes']} if pure else {'spectral':{'rank':len(components),'componentCount':len(components),'omittedWeight':max(0.,1-sum(c['weight'] for c in components))},'components':components[:4]}),
        'coherences':[{'row':format(a,f'0{n}b'),'column':format(b,f'0{n}b'),'value':[float(rho[a,b].real),float(rho[a,b].imag)]} for _,a,b in pairs[:16]],'coherenceCount':len(pairs)}


def component_page(token, cursor=0):
    with _lock:
        data = _frames.get(token)
        if data is None: raise ValueError('State frame expired on this engine instance. Rerun the experiment; another frame will not be substituted.')
        _frames.move_to_end(token)
        return {'visualizationToken':token,'components':data[cursor:cursor+4],'nextCursor':cursor+4 if cursor+4<len(data) else None,'total':len(data)}


def experiment_context(result):
    """Tag reduced comparisons with the actual physical experiment size."""
    if not isinstance(result,dict): return result
    width = result.get('resources',{}).get('peakQubits')
    if width:
        def visit(value):
            if isinstance(value,dict):
                if 'visualization' in value: value['visualization']['experimentWireCount']=width
                for child in value.values(): visit(child)
            elif isinstance(value,list):
                for child in value: visit(child)
        visit(result)
    return result


def joint_frames(state, data_wires, helper_count, labels=None):
    n=data_wires+helper_count
    before=state_visualization(state,n,n,labels,stage='before-deferred-helper-readout',scope='joint')
    matrix=DensityMatrix(state).data.copy();block=2**data_wires
    for a in range(2**helper_count):
        for b in range(2**helper_count):
            if a!=b: matrix[a*block:(a+1)*block,b*block:(b+1)*block]=0
    after=state_visualization(DensityMatrix(matrix),n,n,labels,stage='after-measurement',scope='joint')
    p=float(np.trace(matrix[:block,:block]).real)
    frames={'joint-before-readout':before,'joint-after-readout':after}
    if p>1e-12:
        accepted=np.zeros_like(matrix);accepted[:block,:block]=matrix[:block,:block]/p
        frames['joint-accepted']=state_visualization(DensityMatrix(accepted),n,n,labels,stage='postselected',scope='conditional-joint')
    return frames
