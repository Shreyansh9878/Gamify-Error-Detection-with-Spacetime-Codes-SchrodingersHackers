"""Composed physical channels shared by the teaching and mission engines."""
from qiskit_aer.noise import pauli_error, depolarizing_error, thermal_relaxation_error


def instruction(name,qubits,stage,**extra):
    return dict(name=name,qubits=qubits,stage=stage,**extra)


def channel(noise):
    name = noise['channel']
    if name in ('bit_flip','phase_flip'):
        p = noise['probability']
        return pauli_error([('X' if name=='bit_flip' else 'Z',p),('I',1-p)])
    if name == 'depolarizing':
        return depolarizing_error(noise['strength'],noise.get('numQubits',1))
    return thermal_relaxation_error(noise['t1Us'],noise['t2Us'],noise['timeUs'],excited_state_population=0)


def hardware_items(noise,wires,scale=1):
    if not noise.enabled:
        return []
    specs=[]
    for kind,p in (('bit_flip',noise.bitFlip),('phase_flip',noise.phaseFlip)):
        if p:
            specs.append({'channel':kind,'probability':p})
    if noise.depolarizing:
        specs.append({'channel':'depolarizing','strength':noise.depolarizing})
    if noise.relaxationTimeUs:
        specs.append({'channel':'decoherence','timeUs':noise.relaxationTimeUs,'t1Us':noise.t1Us,'t2Us':noise.t2Us})
    return [instruction('noise',[q],'Hardware channel after occupied layer',noise=spec) for _ in range(scale) for q in wires for spec in specs]
