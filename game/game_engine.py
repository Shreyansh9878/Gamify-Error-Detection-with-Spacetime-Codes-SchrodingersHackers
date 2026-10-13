"""
game_engine.py -- Core game state machine for Quantum Shield.

Orchestrates:
  1. Level loading
  2. Player qubit-selection decisions
  3. Quantum simulation dispatch (automated checks or hand-made)
  4. Score computation
  5. Comparison table accumulation
  6. Leaderboard management
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import time

from quantum_engine.circuits import PayloadCircuit
from quantum_engine.noise_model import make_noise_model
from quantum_engine.spacetime_checks import (
    add_clifford_checks,
    make_paulice_noise_model,
    get_best_checked_circuit,
    make_t_doped_hand_checks,
    build_hand_checked_circuit,
    describe_uncovered_paulis,
)
from quantum_engine.simulator import (
    SimResult,
    simulate_checked_circuit,
    simulate_hand_checked_circuit,
    SHOTS,
)
from quantum_engine.scoring import (
    ScoreEntry,
    Leaderboard,
    compute_score,
    grade,
)
from game.levels import Level, get_level, LEVELS


# -----------------------------------------------------------------------------
# GameState
# -----------------------------------------------------------------------------

@dataclass
class GameState:
    current_level: int = 1
    leaderboard: Leaderboard = field(default_factory=Leaderboard)
    history: list[dict] = field(default_factory=list)
    n_shots: int = SHOTS
    comparison_table: list[SimResult] = field(default_factory=list)


# -----------------------------------------------------------------------------
# GameEngine
# -----------------------------------------------------------------------------

class GameEngine:
    """
    Drives the core game loop.

    Usage:
        engine = GameEngine()
        result = engine.run_level(
            level_number=1,
            target_qubits=[0, 1],
            n_checks=1,
        )
        print(result.score)
    """

    def __init__(self, n_shots: int = SHOTS):
        self.state = GameState(n_shots=n_shots)
        self._noise_model = make_noise_model(n_qubits=6)  # up to 5 payload + 1 extra

    # -- Public API -----------------------------------------------------------

    def run_level(
        self,
        level_number: int,
        target_qubits: list[int],
        n_checks: int,
        *,
        on_progress: Optional[callable] = None,
    ) -> SimResult:
        """
        Execute a full level run: build circuit -> add checks -> simulate -> score.

        Args:
            level_number:  Which level to run (1-6).
            target_qubits: Qubit indices selected by the player for check placement.
            n_checks:      How many checks to activate (<= min(len(target_qubits), budget)).
            on_progress:   Optional callback(str) for progress messages.

        Returns:
            SimResult with all quantum metrics and the computed game score.
        """
        level = get_level(level_number)
        pc = level.payload_factory()
        self.state.current_level = level_number

        def progress(msg: str):
            if on_progress:
                on_progress(msg)

        progress(f"[Quantum Engine] Building {pc.name}...")

        if level.use_auto_checks:
            result = self._run_clifford_level(
                level, pc, target_qubits, n_checks, progress
            )
        else:
            result = self._run_t_doped_level(
                level, pc, n_checks, progress
            )

        # Record score
        entry = ScoreEntry(
            level=level_number,
            label=result.label,
            score=result.score,
            f_post=result.fidelity_post_selected,
            f_kept=result.f_kept,
            f_no_checks=result.fidelity_no_checks,
            n_check_qubits=result.n_check_qubits,
            n_2q_added=result.n_2q_gates_added,
            t_count=pc.t_count,
        )
        self.state.leaderboard.add(entry)
        self.state.comparison_table.append(result)
        self.state.history.append({
            "level": level_number,
            "target_qubits": target_qubits,
            "n_checks": n_checks,
            "result": result.to_dict(),
            "timestamp": time.time(),
        })

        progress(f"[Quantum Engine] Done. Score = {result.score:.1f}")
        return result

    def run_comparison_sweep(
        self,
        level_number: int,
        *,
        on_progress: Optional[callable] = None,
    ) -> list[SimResult]:
        """
        Run all check configurations for a level and return all results.
        For Clifford levels: n_checks = 0, 1, 2, ... up to budget.
        For T-doped levels: no-check baseline + hand-check configurations.

        This populates the comparison table displayed in the game's analysis view.
        """
        level = get_level(level_number)
        results = []

        def progress(msg):
            if on_progress:
                on_progress(msg)

        if level.use_auto_checks:
            # Sweep over different check counts and qubit orderings
            for n in range(0, level.ancilla_budget + 1):
                progress(f"  Sweep: {n} check(s)...")
                r = self.run_level(
                    level_number,
                    target_qubits=level.default_target_qubits[:max(n, 1)],
                    n_checks=n,
                    on_progress=progress,
                )
                results.append(r)
        else:
            # T-doped: baseline (no checks) + hand checks
            progress("  Baseline (no checks)...")
            pc = level.payload_factory()
            from quantum_engine.simulator import (
                _get_ideal_statevector,
                _run_noisy_density_matrix,
                _run_noisy_shots,
            )
            from qiskit.quantum_info import state_fidelity
            try:
                ideal_sv = _get_ideal_statevector(pc.circuit)
                noisy_dm = _run_noisy_density_matrix(pc.circuit, self._noise_model)
                f_base = float(state_fidelity(ideal_sv, noisy_dm))
                baseline = SimResult(
                    fidelity_no_checks=f_base,
                    fidelity_post_selected=f_base,
                    f_kept=1.0,
                    n_shots_total=self.state.n_shots,
                    n_shots_kept=self.state.n_shots,
                    n_check_qubits=0,
                    n_2q_gates_added=0,
                    circuit_depth_original=pc.circuit.depth(),
                    circuit_depth_checked=pc.circuit.depth(),
                    cost_metric=None,
                    uncovered_pauli_count=-1,
                    label=f"T={pc.t_count} baseline",
                )
                results.append(baseline)
                self.state.comparison_table.append(baseline)
            except Exception as e:
                progress(f"  Baseline failed: {e}")

            progress("  Hand checks (1 and 2 ancillas)...")
            for n in [1, 2]:
                if n <= level.ancilla_budget:
                    r = self.run_level(
                        level_number,
                        target_qubits=level.default_target_qubits[:n],
                        n_checks=n,
                        on_progress=progress,
                    )
                    results.append(r)

        return results

    def get_leaderboard_lines(self) -> list[str]:
        return self.state.leaderboard.summary_lines()

    def get_level_description(self, level_number: int) -> str:
        return get_level(level_number).describe()

    def current_level(self) -> Level:
        return get_level(self.state.current_level)

    def advance_level(self):
        next_lvl = self.state.current_level + 1
        if next_lvl <= len(LEVELS):
            self.state.current_level = next_lvl
        return self.state.current_level

    # -- Private helpers ------------------------------------------------------

    def _run_clifford_level(
        self,
        level: Level,
        pc: PayloadCircuit,
        target_qubits: list[int],
        n_checks: int,
        progress,
    ) -> SimResult:
        """Run a Clifford level using qiskit-paulice."""
        # Validate qubit indices
        max_q = pc.n_qubits - 1
        valid_targets = [q for q in target_qubits if 0 <= q <= max_q]
        if not valid_targets:
            valid_targets = level.default_target_qubits[:1]

        # Clamp n_checks to ancilla budget and available targets
        n_checks_eff = min(n_checks, level.ancilla_budget, len(valid_targets))

        progress(f"[Quantum Engine] Adding {n_checks_eff} Pauli check(s) via qiskit-paulice...")
        progress(f"[Quantum Engine] Target qubits: {valid_targets[:n_checks_eff]}")

        # Note: add_clifford_checks uses qiskit_paulice.NoiseModel for check optimization
        # (not the Aer NoiseModel, which is used only for actual simulation below)
        paulice_nm = make_paulice_noise_model(p2_depol=0.01)
        checked_list = add_clifford_checks(
            circuit=pc.circuit,
            target_qubits=valid_targets[:max(n_checks_eff, 1)],
            paulice_noise_model=paulice_nm,
            seed=42,
        )

        # Pick the checked circuit with exactly n_checks_eff checks
        # (index 0 = no checks, index k = k checks)
        idx = min(n_checks_eff, len(checked_list) - 1)
        checked = checked_list[idx]

        progress(
            f"[Quantum Engine] Circuit with {len(checked.check_qubits)} check(s). "
            f"Gamma cost = {checked.cost}. "
            f"Uncovered Paulis: {len(checked.uncovered_paulis)}"
        )
        progress("[Quantum Engine] Running noisy Aer simulation...")

        label = (
            f"L{level.number} | {n_checks_eff} check(s) | "
            f"qubits={valid_targets[:n_checks_eff]}"
        )
        return simulate_checked_circuit(
            payload_circuit=pc.circuit,
            checked=checked,
            noise_model=self._noise_model,
            shots=self.state.n_shots,
            label=label,
        )

    def _run_t_doped_level(
        self,
        level: Level,
        pc: PayloadCircuit,
        n_checks: int,
        progress,
    ) -> SimResult:
        """Run a T-doped level using hand-made spacetime checks."""
        progress(
            f"[Quantum Engine] T-doped circuit (T={pc.t_count}). "
            f"add_pauli_checks() rejected -- using hand-made Z-checks."
        )
        all_checks = make_t_doped_hand_checks(pc.t_count)
        n_checks_eff = min(n_checks, level.ancilla_budget, len(all_checks))
        active_checks = all_checks[:n_checks_eff]

        if n_checks_eff > 0:
            progress(
                f"[Quantum Engine] Building hand-checked circuit "
                f"({n_checks_eff} Z-check ancilla(s))..."
            )
            for chk in active_checks:
                progress(f"  Check on q{chk.target_qubit}: {chk.pauli}-Pauli, "
                         f"instructions [{chk.attach_before}..{chk.attach_after}]")
                progress(f"  -> {chk.description}")

            hand_qc = build_hand_checked_circuit(pc.circuit, active_checks)
        else:
            progress("[Quantum Engine] No checks -- running bare circuit.")
            hand_qc = pc.circuit.copy()

        progress("[Quantum Engine] Running noisy Aer simulation...")
        label = (
            f"L{level.number} | T={pc.t_count} | {n_checks_eff} hand-check(s)"
        )
        return simulate_hand_checked_circuit(
            payload_circuit=pc.circuit,
            hand_checked_qc=hand_qc,
            n_check_bits=n_checks_eff,
            noise_model=self._noise_model,
            shots=self.state.n_shots,
            label=label,
        )
