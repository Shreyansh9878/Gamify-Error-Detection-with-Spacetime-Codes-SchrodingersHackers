"""Exact local Aer evolution and pure-reference postselection metrics."""
import json
from functools import lru_cache
import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Pauli, StabilizerState, Statevector
from .noise import channel


@lru_cache(maxsize=64)
def noise_instruction(spec):
    return channel(json.loads(spec)).to_instruction()


def exact_density(items, width):
    circuit = QuantumCircuit(width)
    for item in items:
        if item['name'] == 'noise':
            noise = noise_instruction(json.dumps(item['noise'], sort_keys=True))
            circuit.append(noise, item['qubits'])
        elif item['name'] != 'measure':
            getattr(circuit,item['name'])(*item['qubits'])
    circuit.save_density_matrix()
    simulator = AerSimulator(method='density_matrix', max_parallel_threads=1)
    # No projective measurement is sampled: shots=1 saves the exact density.
    result = simulator.run(circuit, shots=1, seed_simulator=2026).result()
    return np.asarray(result.data(0)['density_matrix'])


def ideal_reference(circuit, method='auto'):
    has_t = any(g.operation.name in ('t','tdg') for g in circuit.data)
    if method == 'auto':
        method = 'statevector' if has_t else 'stabilizer'
    if method == 'statevector':
        state = Statevector.from_instruction(circuit).data
        return np.outer(state, state.conj())
    if method != 'stabilizer' or has_t:
        raise ValueError('Stabilizer reference accepts Clifford circuits only.')
    # The stabilizer state projector is the product of (I + generator)/2.
    stabilizers = StabilizerState(circuit).clifford.to_labels(mode='S')
    identity = np.eye(2**circuit.num_qubits, dtype=complex)
    projector = identity.copy()
    for label in stabilizers:
        projector = projector @ (identity + Pauli(label).to_matrix()) / 2
    return projector


def accepted_metrics(joint, ideal, data_qubits):
    # Ancillas are higher-order bits. Their all-zero outcome is this block.
    block = joint[:2**data_qubits, :2**data_qubits]
    kept = float(np.trace(block).real)
    score = float(np.trace(ideal @ block).real)
    kept = max(0., min(1., kept))
    score = max(0., min(kept, score))
    fidelity = score / kept if kept > 1e-12 else None
    return dict(fidelity=fidelity, retention=kept, score=score)
