"""
spacetime_checks.py -- Spacetime Pauli check insertion for Quantum Shield.

Two strategies:

1. AUTOMATED (Clifford circuits only):
   Call `qiskit_paulice.add_pauli_checks(circuit, target_qubits, paulice_noise_model)`.
   NOTE: add_pauli_checks expects a `qiskit_paulice.NoiseModel` (used for check
   optimization only), NOT a `qiskit_aer.noise.NoiseModel` (used for simulation).
   Returns a list of CheckedCircuit objects (one per number of checks added).

2. HAND-MADE (T-doped circuits):
   T = Rz(pi/4) is diagonal and commutes with Z.
   A spacetime check is valid across a T gate ONLY IF the Pauli on that qubit
   at that time step is I or Z.  We hand-craft ancilla-based checks that respect
   this constraint.

Physical interpretation:
   A spacetime Pauli check entangles an ancilla qubit with the payload at two
   points in time.  If the payload suffers a Pauli error between those points,
   the ancilla's measurement reveals a non-trivial syndrome (?1).  Shots with
   non-trivial syndromes are post-selected away, improving fidelity at the cost
   of a smaller kept-shot fraction.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

import numpy as np
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister

import qiskit_paulice
from qiskit_paulice import CheckedCircuit, add_pauli_checks
# qiskit_paulice has its own NoiseModel for check optimization
from qiskit_paulice import NoiseModel as PauliceNoiseModel


# -----------------------------------------------------------------------------
# Automated checks (Clifford circuits)
# -----------------------------------------------------------------------------

def make_paulice_noise_model(p2_depol: float = 0.01) -> PauliceNoiseModel:
    """
    Build a qiskit_paulice.NoiseModel for use with add_pauli_checks.

    This is used ONLY for check optimization (choosing which Pauli checks
    to insert and where).  It is a separate object from the Aer NoiseModel
    used for actual circuit simulation.

    Args:
        p2_depol: Two-qubit depolarizing error rate.

    Returns:
        A qiskit_paulice.NoiseModel with uniform gate noise.
    """
    return PauliceNoiseModel(gate_noise=p2_depol, readout_noise=0.02, idling_noise=0.001)


def add_clifford_checks(
    circuit: QuantumCircuit,
    target_qubits: list[int],
    paulice_noise_model: Optional[PauliceNoiseModel] = None,
    *,
    cost: str = "gamma",
    method: str = "windowed",
    seed: int = 42,
) -> list[CheckedCircuit]:
    """
    Wrap `qiskit_paulice.add_pauli_checks` with game-friendly defaults.

    Args:
        circuit:              Clifford-only QuantumCircuit (measurements already added).
        target_qubits:        Qubit indices to attach check ancillas to.
        paulice_noise_model:  qiskit_paulice.NoiseModel for check quality scoring.
                              If None, a default uniform depolarizing model is used.
        cost:                 "gamma" (fast) or "LER" (accurate but slow).
        method:               "windowed", "genetic", or "windowed_genetic".
        seed:                 Random seed for reproducibility.

    Returns:
        List of CheckedCircuit objects; index 0 = no checks, index k = k checks.
        The final element has the maximum useful number of checks.

    Raises:
        ValueError: If circuit contains non-Clifford gates (T, Rz(pi/4), etc.).
    """
    if paulice_noise_model is None:
        paulice_noise_model = make_paulice_noise_model()

    checked_circuits = add_pauli_checks(
        circuit=circuit,
        target_qubits=target_qubits,
        noise_model=paulice_noise_model,
        cost=cost,
        method=method,
        seed=seed,
    )
    return checked_circuits


def get_best_checked_circuit(
    checked_circuits: list[CheckedCircuit],
) -> CheckedCircuit:
    """
    Return the CheckedCircuit with the lowest cost (best error coverage).
    Ties broken by fewest check qubits (lower ancilla budget).
    """
    valid = [c for c in checked_circuits if c.cost is not None]
    if not valid:
        return checked_circuits[-1]
    return min(valid, key=lambda c: (c.cost, len(c.check_qubits)))


# -----------------------------------------------------------------------------
# Hand-made checks for T-doped circuits
# -----------------------------------------------------------------------------

@dataclass
class HandCheck:
    """
    A manually designed spacetime Pauli check.

    A check is implemented as:
      1. Prepare ancilla in |+> (H gate).
      2. Apply controlled-Pauli (CX for X-check, CZ for Z-check) at `attach_before`
         instruction index on `target_qubit`.
      3. Apply controlled-Pauli again at `attach_after` instruction index.
      4. Measure ancilla in X basis (H then measure).

    The syndrome is the ancilla measurement outcome: 0 = no error, 1 = error caught.

    Constraint for T-doped circuits:
      If `target_qubit` has a T gate at position p, and `attach_before < p < attach_after`,
      then `pauli` MUST be 'I' or 'Z' (since T is diagonal, commuting with Z, not with X/Y).
    """
    target_qubit: int
    pauli: str         # 'X', 'Y', 'Z', or 'I'
    attach_before: int  # instruction index in the original circuit
    attach_after: int   # instruction index in the original circuit
    description: str = ""


def make_t_doped_hand_checks(t_count: int) -> list[HandCheck]:
    """
    Return a list of hand-crafted spacetime checks for the T-doped 5-qubit circuit
    defined in circuits.py.

    Circuit structure (schematic instruction indices):
      idx 0: H(0)        idx 1: CX(0,1)   idx 2: CX(2,3)
      idx 3: H(4)        [T gates on qubits: q0 @idx4, q2 @idx5, q1 @idx6, q3 @idx7]
      idx 8: CZ(1,4)     idx 9: H(0)      idx 10: S(3)
      idx 11: CX(3,4)    idx 12-16: measurements

    T-gate qubits for T=1: [0]
    T-gate qubits for T=2: [0, 2]
    T-gate qubits for T=4: [0, 2, 1, 3]

    Check validity rule:
      If the check interval [attach_before, attach_after] SPANS a T gate on
      target_qubit, then pauli must be 'Z' (or 'I').

    Returns:
        List of HandCheck objects describing up to 2 checks (one per ancilla budget unit).
    """
    t_targets = [0, 2, 1, 3][:t_count]  # qubits with T gates
    checks = []

    # Check 1: Z-check on qubit 1 (safe -- qubit 1 has no T gate for T=1 or T=2)
    # Spans CX(0,1) to CZ(1,4): catches X-type errors on qubit 1 in this window.
    # For T=4, qubit 1 has a T gate at ~idx 6; we use Z-check so it commutes.
    pauli_q1 = "Z"  # Z commutes with T, valid for all T counts
    checks.append(HandCheck(
        target_qubit=1,
        pauli=pauli_q1,
        attach_before=1,    # after CX(0,1)
        attach_after=8,     # before CZ(1,4)
        description=(
            f"Z-check on q1 spanning T-gate window. "
            f"Z commutes with T (diagonal), so valid even when T in {{0,2,1,3}} "
            f"falls on q1 (T=4 case). Catches phase-flip errors on q1."
        ),
    ))

    # Check 2: Z-check on qubit 3 (spans S(3) and possible T gate)
    # For T=4, qubit 3 has T at ~idx 7. Z-check is valid since T is diagonal.
    checks.append(HandCheck(
        target_qubit=3,
        pauli="Z",
        attach_before=2,    # after CX(2,3)
        attach_after=10,    # after S(3)
        description=(
            f"Z-check on q3 spanning CX(2,3)->S(3). "
            f"Z commutes with both S (Clifford) and T (diagonal). "
            f"Valid for all T counts. Catches Z-type errors on q3."
        ),
    ))

    return checks[:2]  # budget: at most 2 ancilla qubits for T-doped levels


def build_hand_checked_circuit(
    payload: QuantumCircuit,
    checks: list[HandCheck],
) -> QuantumCircuit:
    """
    Weave hand-designed checks into a T-doped payload circuit.

    Strategy:
      Rather than inserting at arbitrary instruction indices (which would require
      circuit surgery), we rebuild the circuit layer-by-layer and insert ancilla
      entangling gates at the appropriate moments.

    This function implements a simplified version suitable for the 5-qubit
    T-doped circuits defined in circuits.py.  For general circuits, a full
    DAGCircuit transformation would be needed.

    Returns:
        A new QuantumCircuit with ancilla qubits and check classical registers appended.
        Ancilla qubits are initialized to |0>, put into |+> via H, entangled twice
        with the target qubit, then measured in the X basis (H + measure).
    """
    n_payload = payload.num_qubits
    n_checks = len(checks)
    if n_checks == 0:
        return payload.copy()

    # New registers
    anc_qr = QuantumRegister(n_checks, "anc")
    chk_cr = ClassicalRegister(n_checks, "chk")

    # Copy payload registers
    qc = QuantumCircuit()
    for reg in payload.qregs:
        qc.add_register(reg)
    qc.add_register(anc_qr)
    for reg in payload.cregs:
        qc.add_register(reg)
    qc.add_register(chk_cr)

    # Map payload qubit objects
    payload_qubits = [qc.qubits[i] for i in range(n_payload)]
    anc_qubits = [qc.qubits[n_payload + i] for i in range(n_checks)]

    # Prepare all ancillas in |+>
    for anc in anc_qubits:
        qc.h(anc)

    # We replay payload instructions, inserting check entangling gates at the
    # correct instruction positions (attach_before / attach_after).
    # Instruction indices in the original circuit (measurements excluded).
    non_meas_instrs = [
        (i, instr) for i, instr in enumerate(payload.data)
        if instr.operation.name != "measure"
    ]

    def entangle(check_idx: int, target_q_in_payload: int, pauli: str):
        """Apply CX or CZ between ancilla and target qubit."""
        anc = anc_qubits[check_idx]
        tgt = payload_qubits[target_q_in_payload]
        if pauli == "X":
            qc.cx(anc, tgt)
        elif pauli == "Z":
            qc.cz(anc, tgt)
        elif pauli == "Y":
            # CY = S|CX|Sdg on target
            qc.sdg(tgt)
            qc.cx(anc, tgt)
            qc.s(tgt)
        # pauli == 'I' -> do nothing

    # Determine at which instruction positions to insert entangling gates
    # attach_before[k] = instruction index after which we insert 1st entangle
    # attach_after[k]  = instruction index after which we insert 2nd entangle
    before_map: dict[int, list[int]] = {}  # instr_idx -> list of check indices
    after_map: dict[int, list[int]] = {}

    for k, chk in enumerate(checks):
        before_map.setdefault(chk.attach_before, []).append(k)
        after_map.setdefault(chk.attach_after, []).append(k)

    # Replay instructions
    for i, instr in non_meas_instrs:
        # Map payload qubit objects to the new circuit
        new_qargs = [payload_qubits[payload.find_bit(q).index] for q in instr.qubits]
        new_cargs = list(instr.clbits)
        qc.append(instr.operation, new_qargs, new_cargs)

        # Insert first entangling gate after attach_before
        if i in before_map:
            for k in before_map[i]:
                chk = checks[k]
                entangle(k, chk.target_qubit, chk.pauli)

        # Insert second entangling gate after attach_after
        if i in after_map:
            for k in after_map[i]:
                chk = checks[k]
                entangle(k, chk.target_qubit, chk.pauli)

    # Measure ancillas in X basis
    for k, anc in enumerate(anc_qubits):
        qc.h(anc)
        qc.measure(anc, chk_cr[k])

    # Replay payload measurements
    payload_cr_qubits = {reg: i for i, reg in enumerate(payload.cregs)}
    for instr in payload.data:
        if instr.operation.name == "measure":
            new_qargs = [payload_qubits[payload.find_bit(q).index] for q in instr.qubits]
            new_cargs = list(instr.clbits)
            qc.append(instr.operation, new_qargs, new_cargs)

    return qc


def describe_uncovered_paulis(checked: CheckedCircuit) -> list[str]:
    """
    Return human-readable descriptions of uncovered Pauli error locations.
    These are positions where a single-qubit error goes undetected by any check.
    """
    lines = []
    for up in checked.uncovered_paulis:
        lines.append(
            f"  qubit {up.qubit}, after instruction {up.after_instruction}: "
            f"{up.pauli}-error UNDETECTED"
        )
    return lines if lines else ["  (all single-qubit error locations are covered)"]
