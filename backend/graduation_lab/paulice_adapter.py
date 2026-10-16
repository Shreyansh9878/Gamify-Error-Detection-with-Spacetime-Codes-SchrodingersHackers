"""Actual, bounded Paulice research search; native cost is not game fidelity."""
from functools import lru_cache
from importlib.metadata import version
import math
from qiskit_paulice import add_pauli_checks
from qiskit_paulice.noise_models import NoiseModel
from ..learning.common import fingerprint, circuit_from
from .fixture import manifest
from .models import Strategy
from .scheduler import schedule


@lru_cache(maxsize=4)
def _search(key, package_version):
    empty = Strategy(rails=[{'ancilla':a,'active':False} for a in range(2)])
    circuit = circuit_from(schedule(empty,False,False),3)
    circuit.measure_all()
    # This protocol deliberately remains distinct from fixed boundary-local noise.
    candidates = add_pauli_checks(circuit,[0,1],NoiseModel(gate_noise=.005,readout_noise=0),
                                  cost='gamma',method='windowed',seed=2026)
    candidate = candidates[-1]
    instructions = [{'name':item.operation.name,
                     'qubits':[candidate.circuit.find_bit(q).index for q in item.qubits],
                     'stage':'Paulice research circuit', 'column':i}
                    for i,item in enumerate(candidate.circuit.data)]
    if len(instructions)>256: raise ValueError('Paulice circuit exceeds the reveal size bound.')
    cost = float(candidate.cost) if candidate.cost is not None else None
    if cost is not None and not math.isfinite(cost): cost=None
    return {'available':True,'packageVersion':package_version,'protocol':'gamma/windowed; measured computational-basis workload; targets [0,1]',
            'physicsKey':key,'seed':2026,'nativeCost':cost,'costMetric':candidate.cost_metric,
            'checkSupport':[list(s) for s in candidate.check_support], 'instructions':instructions,
            'mapping':'unsupported','message':'Research candidate — not directly comparable. Paulice resynthesizes the workload and searches an observable-specific circuit outside the four allowed game windows. No exact game score is assigned to this different gate/noise schedule.'}


def suggest():
    try:
        package_version=version('qiskit-paulice')
        key=fingerprint({'manifest':manifest(),'protocol':'gamma-windowed-targets01-seed2026-v1','paulice':package_version})
        before=_search.cache_info().hits
        result=_search(key,package_version)
        return {**result,'cached':_search.cache_info().hits>before}
    except Exception as error:
        return {'available':False,'message':f'Paulice reveal failed ({type(error).__name__}). Retry is available; qualification remains saved. No tool-computed optimum is claimed.'}
