"""
levels.py -- Level definitions for Quantum Shield: The Spacetime Defender.

Each Level defines:
  - The payload circuit (Clifford-only or T-doped)
  - The ancilla qubit budget (how many checks the player can place)
  - Available target qubit choices
  - Hint text explaining the physics
  - Whether to use automated (qiskit-paulice) or hand-made checks
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

from quantum_engine.circuits import (
    make_bell_clifford,
    make_ghz_clifford,
    make_random_clifford_5q,
    make_t_doped_1,
    make_t_doped_2,
    make_t_doped_4,
    PayloadCircuit,
)


@dataclass
class Level:
    """Definition of a single game level."""
    number: int
    title: str
    payload_factory: callable      # no-arg callable returning PayloadCircuit
    ancilla_budget: int            # max number of check ancilla qubits allowed
    default_target_qubits: list[int]  # suggested starting qubit selection
    use_auto_checks: bool          # True = qiskit-paulice; False = hand-made
    physics_hint: str
    strategy_tip: str
    difficulty: str                # "Tutorial", "Easy", "Medium", "Hard", "Expert", "Master"
    t_gate_positions: dict[int, int] = field(default_factory=dict)  # qubit -> instr_idx

    def describe(self) -> str:
        """Multi-line level description for the game UI."""
        pc = self.payload_factory()
        lines = [
            f"  Level {self.number}: {self.title}  [{self.difficulty}]",
            f"  Circuit: {pc.name}  ({pc.n_qubits} qubits, T={pc.t_count})",
            f"  Ancilla budget: {self.ancilla_budget} qubit(s)",
            f"  Check method: {'qiskit-paulice (automated)' if self.use_auto_checks else 'hand-made (T-doped)'}",
            "",
            f"  PHYSICS: {self.physics_hint}",
            "",
            f"  TIP: {self.strategy_tip}",
        ]
        return "\n".join(lines)


# -----------------------------------------------------------------------------
# Level definitions
# -----------------------------------------------------------------------------

LEVELS: list[Level] = [
    Level(
        number=1,
        title="Bell State Guard",
        payload_factory=make_bell_clifford,
        ancilla_budget=1,
        default_target_qubits=[0],
        use_auto_checks=True,
        difficulty="Tutorial",
        physics_hint=(
            "A spacetime Pauli check adds one ancilla qubit that entangles with "
            "your payload at two time slices.  If a Pauli error occurs between "
            "those two moments, the ancilla will click (syndrome bit = 1).  "
            "Shots with syndrome = 1 are discarded (post-selection), leaving "
            "only the cleaner shots for your final score."
        ),
        strategy_tip=(
            "Place your single check on qubit 0 -- it carries the Bell pair's "
            "entanglement and is the highest-priority qubit to protect.  "
            "Watch how F_post rises while f_kept drops: that's the fundamental trade-off."
        ),
    ),
    Level(
        number=2,
        title="GHZ Fortress",
        payload_factory=make_ghz_clifford,
        ancilla_budget=2,
        default_target_qubits=[0, 2],
        use_auto_checks=True,
        difficulty="Easy",
        physics_hint=(
            "The GHZ state is maximally entangled.  A single qubit error propagates "
            "through the CX chain and corrupts the entire state.  More checks = better "
            "coverage, but more ancilla qubits = more noise injected into the circuit. "
            "qiskit-paulice's gamma cost function picks checks that minimize the "
            "undetectable (uncovered) Pauli error space."
        ),
        strategy_tip=(
            "Try 1 check first, then 2.  Compare their scores.  Does adding a second "
            "check always help?  Notice the uncovered Pauli count shrinks with more checks."
        ),
    ),
    Level(
        number=3,
        title="Clifford Labyrinth",
        payload_factory=make_random_clifford_5q,
        ancilla_budget=3,
        default_target_qubits=[0, 2, 4],
        use_auto_checks=True,
        difficulty="Medium",
        physics_hint=(
            "5 qubits, deeper Clifford circuit.  The check picking algorithm "
            "(windowed method) searches for low-weight checks that propagate across "
            "the spacetime diagram and cover the most error locations.  Check placement "
            "ORDER matters: qiskit-paulice is greedy -- it commits to the best check for "
            "target_qubits[0] first, then searches for the next."
        ),
        strategy_tip=(
            "Reorder your target qubit list and compare scores.  Sometimes protecting "
            "qubit 4 first yields better coverage than starting with qubit 0.  The "
            "optimal ordering is not obvious -- explore it!"
        ),
    ),
    Level(
        number=4,
        title="T-Gate Minefield (T=1)",
        payload_factory=make_t_doped_1,
        ancilla_budget=2,
        default_target_qubits=[1, 3],
        use_auto_checks=False,
        difficulty="Hard",
        t_gate_positions={0: 4},   # qubit 0 has T at instruction index 4
        physics_hint=(
            "T = Rz(pi/4) is NOT a Clifford gate.  qiskit-paulice.add_pauli_checks "
            "will REJECT this circuit.  Instead, you must design checks by hand. "
            "The key constraint: a check spanning a T gate is valid ONLY if the Pauli "
            "acts as I or Z on that qubit at that time.  Why?  T is diagonal "
            "(T|0>=|0>, T|1>=e^{ipi/4}|1>), so it commutes with Z but NOT with X or Y. "
            "A Z-check propagates through T unchanged; an X-check would pick up a phase "
            "and become an undetectable Y error."
        ),
        strategy_tip=(
            "The pre-designed hand checks for this level use Z-Paulis on qubits 1 and 3 "
            "(which have no T gate).  This is the safest option.  Can you explain why "
            "a Z-check on qubit 0 (which HAS a T gate) would still be valid?  Hint: "
            "T|0> and T|1> are eigenstates of Z ."
        ),
    ),
    Level(
        number=5,
        title="Double T Catastrophe (T=2)",
        payload_factory=make_t_doped_2,
        ancilla_budget=2,
        default_target_qubits=[1, 3],
        use_auto_checks=False,
        difficulty="Expert",
        t_gate_positions={0: 4, 2: 5},
        physics_hint=(
            "Two T gates on two different qubits.  The Clifford backbone is the same "
            "as previous levels.  With two non-Clifford gates, the fidelity penalty "
            "compounds: T-doped circuits have higher error rates AND smaller check "
            "budgets (add_pauli_checks is off-limits).  This level teaches that "
            "T-count directly trades off against error detection quality."
        ),
        strategy_tip=(
            "Compare your scores for T=0, T=1, and T=2 on otherwise similar circuits. "
            "The decline in achievable F_post as T-count rises is a real phenomenon "
            "from quantum computation: T gates are the 'magic' resource but they break "
            "the cheap error-detection free lunch of Clifford circuits."
        ),
    ),
    Level(
        number=6,
        title="Magic State Chaos (T=4)",
        payload_factory=make_t_doped_4,
        ancilla_budget=2,
        default_target_qubits=[1, 3],
        use_auto_checks=False,
        difficulty="Master",
        t_gate_positions={0: 4, 2: 5, 1: 6, 3: 7},
        physics_hint=(
            "Four T gates across four different qubits.  This is the hardest level. "
            "Every qubit except q4 carries a T gate, severely restricting where valid "
            "hand checks can be placed.  Z-checks on ALL qubits are technically valid "
            "(Z commutes with T), but the check budget is still only 2 ancillas.  "
            "The question becomes: which 2 qubits give the best error coverage?"
        ),
        strategy_tip=(
            "Try checking qubit 4 (no T gate) and qubit 3 (T gate but late in circuit). "
            "Compare with checking qubits 1 and 3.  The trade-off between T-gate position "
            "and check placement is the deepest insight this game teaches."
        ),
    ),
]

LEVEL_MAP: dict[int, Level] = {lvl.number: lvl for lvl in LEVELS}


def get_level(number: int) -> Level:
    """Retrieve a level by number."""
    if number not in LEVEL_MAP:
        raise KeyError(f"Level {number} not found. Available: {list(LEVEL_MAP.keys())}")
    return LEVEL_MAP[number]

