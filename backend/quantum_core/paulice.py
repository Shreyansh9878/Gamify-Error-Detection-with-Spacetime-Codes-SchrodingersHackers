"""Actual Paulice integration; native gamma is not coherent-state fidelity."""
from qiskit import transpile
from qiskit.quantum_info import Clifford
from qiskit_paulice import add_pauli_checks
from qiskit_paulice.noise_models import NoiseModel


def optimize_clifford(circuit,targets,ancilla_limit,gate_noise=.01,readout_noise=0,seed=2026):
    clean=circuit.remove_final_measurements(inplace=False)
    # Validate before invoking the Clifford-only library, including arbitrary RZ.
    try:
        Clifford(clean)
    except Exception as error:
        raise ValueError('Paulice accepts Clifford inputs only.') from error
    if len(targets)>ancilla_limit:
        raise ValueError('Target budget exceeds the fixed ancilla limit.')
    native=transpile(circuit,basis_gates=['h','s','sdg','x','z','cx','cz'],optimization_level=0,seed_transpiler=seed)
    noise=NoiseModel(gate_noise=gate_noise,readout_noise=readout_noise)
    candidate=add_pauli_checks(native,targets,noise,cost='gamma',method='windowed',seed=seed)[-1]
    if candidate.circuit.num_qubits-circuit.num_qubits>ancilla_limit:
        raise ValueError('Paulice exceeded the fixed ancilla budget.')
    return candidate
