"""
circuits.py -- Payload circuit builders for Quantum Shield.

All circuits are terminated with measurements on every qubit.
Clifford-only circuits are suitable for qiskit-paulice.add_pauli_checks.
T-doped circuits demonstrate the fidelity penalty of non-Clifford gates and
require hand-made spacetime checks (see spacetime_checks.py).

Clifford gate set: CX, CZ, H, S, Sdg, SX, SXdg, X, Z, Rz(k*pi/2).
T gates (Rz(pi/4)) break the Clifford gate set -- add_pauli_checks rejects them.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister


@dataclass(frozen=True)
class PayloadCircuit:
    """Container bundling a QuantumCircuit with metadata for the game engine."""
    circuit: QuantumCircuit
    name: str
    description: str
    n_qubits: int
    t_count: int               # number of T (Rz pi/4) gates
    is_clifford: bool          # True iff safe to pass to add_pauli_checks
    ideal_state: Optional[str] = None  # "zero", "ghz", "w", etc. for fidelity ref


# -----------------------------------------------------------------------------
# CLIFFORD-ONLY CIRCUITS
# -----------------------------------------------------------------------------

def make_bell_clifford() -> PayloadCircuit:
    """
    3-qubit circuit: Bell pair on q0-q1, then H on q2.
    Clifford-only (gate set: H, CX, S).
    Width=3, depth=3 (before checks).
    """
    qr = QuantumRegister(3, "q")
    cr = ClassicalRegister(3, "c")
    qc = QuantumCircuit(qr, cr)

    # Bell pair
    qc.h(0)
    qc.cx(0, 1)
    # Clifford decoration on q2
    qc.h(2)
    qc.s(2)
    qc.h(2)

    qc.measure(qr, cr)
    return PayloadCircuit(
        circuit=qc,
        name="Bell + Clifford",
        description="3-qubit Bell pair on q0-q1, Clifford rotation on q2. "
                    "Tutorial level -- small and fast.",
        n_qubits=3,
        t_count=0,
        is_clifford=True,
        ideal_state="bell",
    )


def make_ghz_clifford() -> PayloadCircuit:
    """
    4-qubit GHZ state circuit.
    Clifford-only (gate set: H, CX).
    Width=4, depth=4.
    """
    qr = QuantumRegister(4, "q")
    cr = ClassicalRegister(4, "c")
    qc = QuantumCircuit(qr, cr)

    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.cx(2, 3)

    qc.measure(qr, cr)
    return PayloadCircuit(
        circuit=qc,
        name="4-qubit GHZ",
        description="GHZ entangled state across 4 qubits. "
                    "Good mid-range target for check placement.",
        n_qubits=4,
        t_count=0,
        is_clifford=True,
        ideal_state="ghz",
    )


def make_random_clifford_5q() -> PayloadCircuit:
    """
    5-qubit Clifford circuit with moderate depth.
    Clifford-only (gate set: H, CX, CZ, S, Sdg).
    Width=5, depth~=8.
    """
    qr = QuantumRegister(5, "q")
    cr = ClassicalRegister(5, "c")
    qc = QuantumCircuit(qr, cr)

    # Layer 1 -- Hadamards
    for i in range(5):
        qc.h(i)
    # Layer 2 -- entangling
    qc.cx(0, 1)
    qc.cx(2, 3)
    qc.cz(1, 4)
    # Layer 3 -- single-qubit Clifford
    qc.s(0)
    qc.sdg(2)
    qc.h(3)
    # Layer 4 -- more entangling
    qc.cx(3, 4)
    qc.cx(1, 2)
    # Layer 5 -- close with H
    for i in range(5):
        qc.h(i)

    qc.measure(qr, cr)
    return PayloadCircuit(
        circuit=qc,
        name="5-qubit Clifford",
        description="5-qubit randomized Clifford circuit. "
                    "Check placement strategy matters significantly here.",
        n_qubits=5,
        t_count=0,
        is_clifford=True,
        ideal_state="clifford5",
    )


# -----------------------------------------------------------------------------
# T-DOPED CIRCUITS  (rejected by add_pauli_checks -- need hand-made checks)
# -----------------------------------------------------------------------------

def _make_t_doped_base(t_count: int) -> PayloadCircuit:
    """
    5-qubit circuit: Clifford backbone with `t_count` T gates injected.
    T = Rz(pi/4).  T gates break the Clifford gate set.

    Hand-made spacetime checks are valid across T gates only when the
    Pauli acts as I or Z on the T-gate qubit at that point (T diagonal ? T
    commutes with Z).  See spacetime_checks.make_t_doped_hand_checks().

    T positions are chosen to spread across different qubits so that
    hand-check design is non-trivial.
    """
    import math
    qr = QuantumRegister(5, "q")
    cr = ClassicalRegister(5, "c")
    qc = QuantumCircuit(qr, cr)

    # Clifford backbone -- identical for all T counts
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(2, 3)
    qc.h(4)

    # Inject T gates on distinct qubits, up to t_count
    t_targets = [0, 2, 1, 3]  # qubit indices for 1st, 2nd, 3rd, 4th T gate
    for i in range(min(t_count, len(t_targets))):
        qc.t(t_targets[i])  # T = Rz(pi/4)

    # More Clifford gates
    qc.cz(1, 4)
    qc.h(0)
    qc.s(3)
    qc.cx(3, 4)

    qc.measure(qr, cr)

    return PayloadCircuit(
        circuit=qc,
        name=f"5-qubit T-doped (T={t_count})",
        description=(
            f"5-qubit circuit with {t_count} T gate(s). "
            f"add_pauli_checks() CANNOT be used here -- hand-made checks only. "
            f"T gates live on qubits {t_targets[:t_count]}. "
            f"Only I or Z Pauli actions on T-gate qubits are valid in hand checks."
        ),
        n_qubits=5,
        t_count=t_count,
        is_clifford=False,
        ideal_state=f"t_doped_{t_count}",
    )


def make_t_doped_1() -> PayloadCircuit:
    """5-qubit circuit with T=1."""
    return _make_t_doped_base(1)


def make_t_doped_2() -> PayloadCircuit:
    """5-qubit circuit with T=2."""
    return _make_t_doped_base(2)


def make_t_doped_4() -> PayloadCircuit:
    """5-qubit circuit with T=4."""
    return _make_t_doped_base(4)


# -----------------------------------------------------------------------------
# REGISTRY
# -----------------------------------------------------------------------------

CIRCUIT_REGISTRY: dict[str, callable] = {
    "bell":         make_bell_clifford,
    "ghz":          make_ghz_clifford,
    "clifford5":    make_random_clifford_5q,
    "t_doped_1":    make_t_doped_1,
    "t_doped_2":    make_t_doped_2,
    "t_doped_4":    make_t_doped_4,
}


def get_circuit(name: str) -> PayloadCircuit:
    """Return a freshly built PayloadCircuit by registry name."""
    if name not in CIRCUIT_REGISTRY:
        raise KeyError(f"Unknown circuit '{name}'. Available: {list(CIRCUIT_REGISTRY)}")
    return CIRCUIT_REGISTRY[name]()


def get_clifford_only() -> QuantumCircuit:
    """
    Return the pure Clifford backbone of the 5-qubit circuit (no T gates).
    Used as the reference payload for add_pauli_checks throughout the game.
    """
    return make_random_clifford_5q().circuit

