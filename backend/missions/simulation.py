"""Exact, T-capable Qiskit scoring. Paulice is never a simulator here."""
import itertools
from qiskit import QuantumCircuit
from ..learning.common import instruction
from ..timeline_lab.models import HardwareNoise
from ..quantum_core.noise import hardware_items
from ..quantum_core.scoring import noise_instruction, exact_density, ideal_reference, accepted_metrics


def execution_schedule(level,operations,noisy=True):
    n=level['qubits'];noise=level['noise']
    active=sorted({q for g in operations for q in g['qubits'] if q>=n})
    mapping={q:n+i for i,q in enumerate(active)}
    width=n+len(active);items=[];measured=set()
    hardware=HardwareNoise.model_validate(noise['hardware'])
    ordered=sorted(operations,key=lambda g:(g['rank'],g['id']))
    for _,group in itertools.groupby(ordered,key=lambda g:g['rank']):
        layer=list(group);quantum=False
        for gate in layer:
            qs=[mapping.get(q,q) for q in gate['qubits']]
            if gate['name']=='m':
                measured.add(qs[0]);continue
            items.append(instruction(gate['name'],qs,'Mission gate'));quantum=True
            if noisy and hardware.enabled:
                if gate['owner']=='fixed-fixture' and gate['id']==f'u{noise["hotspotColumn"]}':
                    items.append(instruction('noise',[noise['qubit']],'Relaxation hotspot',noise={
                        'channel':'decoherence','timeUs':noise['timeUs'],'t1Us':noise['t1Us'],'t2Us':noise['t2Us']}))
                elif gate['name'] in ('cx','cy','cz') and any(q>=n for q in qs):
                    items.append(instruction('noise',qs,'Check interaction overhead',noise={
                        'channel':'depolarizing','strength':noise['checkStrength'],'numQubits':2}))
        if noisy and quantum:
            # Identical independent channel definitions to FS2 and FS6. This
            # includes T/Tdg, H/readout rotations, check gates and helper wires.
            items.extend(hardware_items(hardware,[q for q in range(width) if q not in measured]))
    return items,width


def simulate(level,operations,noisy=True,reference_method='auto'):
    payload=QuantumCircuit(level['qubits'])
    for gate in level['payload']:getattr(payload,gate['name'])(*gate['qubits'])
    ideal=ideal_reference(payload,reference_method)
    items,width=execution_schedule(level,operations,noisy)
    return accepted_metrics(exact_density(items,width),ideal,level['qubits'])
