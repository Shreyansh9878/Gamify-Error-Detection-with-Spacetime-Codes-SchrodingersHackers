"""
noise_model.py -- Reproducible noise model factory for Quantum Shield.

Uses a synthetic depolarizing + thermal relaxation model that approximates
realistic NISQ device noise without requiring an IBM Quantum account.

All teams use the same noise parameters so results are comparable.
"""

from __future__ import annotations

from qiskit_aer.noise import (
    NoiseModel,
    depolarizing_error,
    thermal_relaxation_error,
    ReadoutError,
)
import numpy as np


# -----------------------------------------------------------------------------
# Shared noise parameters (fixed for reproducibility across teams)
# -----------------------------------------------------------------------------

# Single-qubit depolarizing rate (probability of a random Pauli error)
P1_DEPOL: float = 0.001

# Two-qubit depolarizing rate
P2_DEPOL: float = 0.01

# Thermal relaxation parameters
T1_US: float = 100.0   # T1 relaxation time in microseconds
T2_US: float = 80.0    # T2 dephasing time in microseconds
GATE_TIME_1Q_NS: float = 50.0   # Single-qubit gate time in nanoseconds
GATE_TIME_2Q_NS: float = 300.0  # Two-qubit gate time in nanoseconds

# Readout (measurement) error rate
P_READOUT: float = 0.02

# Measurement time for thermal relaxation during measurement
MEAS_TIME_NS: float = 1000.0


def make_noise_model(n_qubits: int = 5) -> NoiseModel:
    """
    Build a synthetic but physically motivated noise model.

    Noise sources (in order of typical magnitude on real hardware):
    1. Depolarizing errors on all single-qubit gates
    2. Depolarizing errors on all two-qubit gates (CX, CZ)
    3. Thermal relaxation (T1, T2) during gate execution
    4. Readout (measurement) errors

    Args:
        n_qubits: Number of qubits the model needs to cover.

    Returns:
        A qiskit_aer.noise.NoiseModel instance.
    """
    noise = NoiseModel()

    # -- 1-qubit depolarizing + thermal relaxation --------------------------
    t1_us = T1_US
    t2_us = T2_US
    gate_t_ns = GATE_TIME_1Q_NS

    depol_1q = depolarizing_error(P1_DEPOL, 1)

    thermal_1q = thermal_relaxation_error(
        t1=t1_us * 1e3,    # convert us -> ns for Aer
        t2=t2_us * 1e3,
        time=gate_t_ns,
    )
    error_1q = depol_1q.compose(thermal_1q)

    single_qubit_gates = ["h", "s", "sdg", "sx", "sxdg", "x", "z", "id", "t", "tdg"]
    for gate in single_qubit_gates:
        noise.add_all_qubit_quantum_error(error_1q, gate)

    # -- 2-qubit depolarizing + thermal relaxation --------------------------
    depol_2q = depolarizing_error(P2_DEPOL, 2)

    # Thermal relaxation on each qubit during 2-qubit gate
    thermal_2q_per_qubit = thermal_relaxation_error(
        t1=t1_us * 1e3,
        t2=t2_us * 1e3,
        time=GATE_TIME_2Q_NS,
    )
    thermal_2q = thermal_2q_per_qubit.expand(thermal_2q_per_qubit)
    error_2q = depol_2q.compose(thermal_2q)

    two_qubit_gates = ["cx", "cz", "ecr", "rzz"]
    for gate in two_qubit_gates:
        noise.add_all_qubit_quantum_error(error_2q, gate)

    # -- Readout errors -----------------------------------------------------
    # P(0|1): probability of measuring 0 when state is |1>
    # P(1|0): probability of measuring 1 when state is |0>
    p0_given_1 = P_READOUT
    p1_given_0 = P_READOUT / 2  # asymmetric: slightly easier to flip down
    readout_err = ReadoutError([[1 - p1_given_0, p1_given_0],
                                 [p0_given_1, 1 - p0_given_1]])
    for q in range(n_qubits):
        noise.add_readout_error(readout_err, [q])

    return noise


def noise_summary() -> dict:
    """Return a human-readable summary of the noise parameters."""
    return {
        "p1_depol": P1_DEPOL,
        "p2_depol": P2_DEPOL,
        "T1_us": T1_US,
        "T2_us": T2_US,
        "gate_time_1q_ns": GATE_TIME_1Q_NS,
        "gate_time_2q_ns": GATE_TIME_2Q_NS,
        "p_readout": P_READOUT,
        "description": (
            "Synthetic depolarizing + thermal relaxation model. "
            "Fixed parameters so all teams get comparable results."
        ),
    }

