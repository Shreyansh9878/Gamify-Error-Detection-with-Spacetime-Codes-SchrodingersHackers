from types import SimpleNamespace
from functools import lru_cache
import numpy as np
from qiskit.quantum_info import Operator
from ..learning.common import instruction, gate_instruction, circuit_from
from ..advanced_lab.models import Check
from ..advanced_lab.service import propagation
from .fixture import PAYLOAD, DATA_NOISE, TAP_NOISE
from .models import Strategy


def expected(rail):
    check = Check(id='rail',ancilla=rail.ancilla,startBoundary=rail.startBoundary,endBoundary=rail.endBoundary,openingTaps=rail.openingTaps)
    return propagation(SimpleNamespace(dataQubits=3,payload=PAYLOAD),check)


def schedule(strategy, noisy=True, checks=True):
    active = sorted((r for r in strategy.rails if r.active),key=lambda r:r.ancilla) if checks else []
    mapping = {rail.ancilla:3+i for i,rail in enumerate(active)}
    items = [instruction('h',[mapping[r.ancilla]],'Fixed opening H',boundary=0) for r in active]
    def tap(rail,factor,stage,boundary):
        qubits = [mapping[rail.ancilla],factor.qubit]
        items.append(instruction('c'+factor.pauli.lower(),qubits,stage,boundary=boundary))
        if noisy: items.append(instruction('noise',qubits,'Noisy check tap',noise=TAP_NOISE,boundary=boundary))
    for boundary in range(1,8):
        if noisy:
            items.extend(instruction('noise',[e['qubit']],'Fixed data noise',noise={k:v for k,v in e.items() if k not in ('boundary','qubit')},boundary=boundary) for e in DATA_NOISE if e['boundary']==boundary)
        for rail in reversed(active):
            if rail.endBoundary==boundary:
                for factor in sorted(rail.closingTaps,key=lambda t:t.qubit): tap(rail,factor,'Closing tap',boundary)
        for rail in active:
            if rail.startBoundary==boundary:
                for factor in rail.openingTaps: tap(rail,factor,'Opening tap',boundary)
        items.extend(gate_instruction(g,'Locked payload') for g in PAYLOAD if g.column==boundary)
    for rail in active:
        anc = mapping[rail.ancilla]
        if rail.closingSign==-1: items.append(instruction('z',[anc],'Sign compensation',boundary=8))
        items += [instruction('h',[anc],'Fixed final H',boundary=8),instruction('measure',[anc],'Syndrome',boundary=8,bit=anc-3)]
    return items


def canonical(strategy):
    data = strategy.model_dump()
    active = sorted((r for r in data['rails'] if r['active']),key=lambda r:r['ancilla'])
    for rail in active:
        rail['closingTaps'].sort(key=lambda t:t['qubit'])
    if len(active)==1:
        active[0]['ancilla']=0
    data['rails'] = active + [{'ancilla':a,'active':False} for a in range(2) if a not in {r['ancilla'] for r in active}]
    data['rails'].sort(key=lambda r:r['ancilla'])
    return data


@lru_cache(maxsize=2048)
def construction(raw):
    strategy = Strategy.model_validate_json(raw)
    active = [r for r in strategy.rails if r.active]
    checks = []
    for rail in active:
        p = expected(rail)
        selected = [(t.qubit,t.pauli) for t in sorted(rail.closingTaps,key=lambda t:t.qubit)]
        exp = [(t['qubit'],t['pauli']) for t in p['expectedTaps']]
        checks.append({'ancilla':rail.ancilla,'expected':p['expected'],'expectedTaps':p['expectedTaps'],'sign':p['sign'],'steps':p['steps'],'match':selected==exp and rail.closingSign==p['sign']})
    complete = all(r.openingTaps and r.closingTaps for r in active)
    residual = None; schedule_valid = not active
    if complete:
        n = 3+len(active)
        actual = Operator(circuit_from(schedule(strategy,False),n)).data[:,:8]
        target = np.zeros_like(actual)
        target[:8,:] = Operator(circuit_from(schedule(strategy,False,False),3)).data
        overlap = np.vdot(target,actual); phase = overlap/abs(overlap) if abs(overlap)>1e-12 else 1
        residual = float(np.linalg.norm(actual-phase*target))
        schedule_valid = residual<1e-8
    valid = bool(complete and all(c['match'] for c in checks) and schedule_valid)
    return {'structureComplete':bool(complete),'valid':valid,'localOperatorMatch':all(c['match'] for c in checks),'scheduleValid':bool(schedule_valid),'residual':residual,'checks':checks,'activeCheckCount':len(active),'message':'Unchecked baseline' if not active else 'Invariant closed — noisy performance evaluated separately.' if valid else 'Incomplete/mismatched product or combined schedule conflict.'}
