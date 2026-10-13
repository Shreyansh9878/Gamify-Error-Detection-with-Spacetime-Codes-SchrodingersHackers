# ⚛ Quantum Shield: The Spacetime Defender

**Qiskit Fall Fest 2026 — Advanced Track: Gamifying Error Detection with Spacetime Codes**  
*Team: Schrödinger's Hackers*

---

## Game Concept

**Quantum Shield** is a terminal strategy game where you are a quantum circuit engineer under attack by noise. Each level presents a noisy quantum payload circuit. Your job: deploy **spacetime Pauli checks** (ancilla qubits that entangle with the payload at two moments in time) to detect errors before they corrupt your results.

> **Score = F_post × f_kept × 1000**
>
> Computed live from Qiskit Aer simulation — never hand-set. This directly captures the fundamental trade-off the hackathon targets: post-selected fidelity vs. kept-shot fraction.

---

## The Physics (No Decoration — Real QEC)

### Spacetime Pauli Checks

A spacetime check adds one ancilla qubit that:
1. Is initialized to |+⟩ (H gate)
2. Entangles with the payload via controlled-Pauli at time slice `t₁`
3. Entangles again at time slice `t₂ > t₁`
4. Is measured in the X basis (H + measure)

If a Pauli error (X, Y, or Z) occurs on the target qubit between `t₁` and `t₂`, the ancilla clicks (syndrome bit = 1). Shots with any syndrome bit = 1 are **post-selected away**, leaving only the cleaner shots.

### T-Gate Constraint (Hand-Made Checks)

`qiskit-paulice.add_pauli_checks()` accepts **Clifford-only circuits** (H, CX, CZ, S, Sdg, X, Z, Rz(kπ/2)). A T gate (Rz(π/4)) is **not Clifford** and is rejected.

For T-doped circuits (Levels 4–6), we hand-design checks respecting the constraint:

> **A spacetime check spanning a T gate is valid ONLY if its Pauli is I or Z on that qubit at that time.**

Why? T = Rz(π/4) is diagonal: T|0⟩ = |0⟩, T|1⟩ = e^{iπ/4}|1⟩. It commutes with Z but NOT with X or Y. A Z-check propagates through T unchanged; an X-check would acquire a phase and become an undetectable Y-type error.

### Post-Selected Fidelity

- **F_no_checks**: state_fidelity(ideal_sv, noisy_DM) — baseline under noise
- **F_post**: fidelity improvement from post-selection (syndrome = 0 shots only)
- **f_kept**: fraction of shots that survive post-selection
- **Score**: F_post × f_kept × 1000 — penalises strategies that keep too few shots

---

## Game Structure

### Levels

| # | Title | Circuit | T-count | Budget | Method |
|---|-------|---------|---------|--------|--------|
| 1 | Bell State Guard | 3-qubit Bell+H | 0 | 1 anc | qiskit-paulice |
| 2 | GHZ Fortress | 4-qubit GHZ | 0 | 2 anc | qiskit-paulice |
| 3 | Clifford Labyrinth | 5-qubit Clifford | 0 | 3 anc | qiskit-paulice |
| 4 | T-Gate Minefield | 5-qubit T=1 | 1 | 2 anc | hand-made |
| 5 | Double T Catastrophe | 5-qubit T=2 | 2 | 2 anc | hand-made |
| 6 | Magic State Chaos | 5-qubit T=4 | 4 | 2 anc | hand-made |

### Core Decision Loop

1. Player sees the payload circuit diagram and noise model summary
2. Player selects **which qubits** to target (within ancilla budget)
3. Player selects **how many checks** to place
4. Qiskit Aer simulates the checked circuit under noise
5. Score is computed: **Score = F_post × f_kept × 1000**
6. Comparison table updates, leaderboard advances

---

## Installation

```bash
pip install -r requirements.txt
```

Requirements: `qiskit>=2.1.2`, `qiskit-aer>=0.17.1`, `qiskit-paulice>=0.2.0`, `numpy>=1.26`, `rich>=13.0`

---

## Running the Game

```bash
# Interactive terminal game
python main.py

# Fewer shots (faster, noisier)
python main.py --shots 512

# Non-interactive demo of all 6 levels
python main.py --demo

# Full benchmark: all levels, default settings
python main.py --benchmark

# Jump to a specific level
python main.py --level 3
```

---

## Project Structure

```
quantum_engine/
  circuits.py          # Payload circuit builders (Clifford + T-doped)
  noise_model.py       # Reproducible Aer noise model (depolarizing + thermal)
  spacetime_checks.py  # qiskit-paulice integration + hand-made T-gate checks
  simulator.py         # Aer simulation + fidelity + post-selection
  scoring.py           # Score formula, grades, leaderboard

game/
  levels.py            # Level definitions with physics hints + strategy tips
  game_engine.py       # Game state machine
  ui_terminal.py       # Rich terminal UI

notebook/
  quantum_shield_demo.ipynb  # Reproducible Jupyter notebook for judges

main.py                # Entry point
```

---

## Quantum Fidelity Pipeline

```
payload_circuit (Clifford or T-doped)
        │
        ├─── Clifford? ──► qiskit_paulice.add_pauli_checks(circuit, targets, paulice_nm)
        │                   → CheckedCircuit (gamma cost, uncovered Paulis)
        │
        └─── T-doped? ──► build_hand_checked_circuit(circuit, hand_checks)
                           → Z-checks only (commute with T)
                │
                ▼
        AerSimulator (density_matrix, noise_model) → noisy DM
                │
                ├── partial_trace(anc qubits) → payload DM
                │
        AerSimulator (qasm, noise_model, shots) → counts
                │
                ├── postselect(syndrome=0) → kept_counts, f_kept
                │
        state_fidelity(ideal_sv, dm_payload) → F_dm
                │
        F_post = F_dm / f_kept (clamped to [0,1])
                │
        Score = F_post × f_kept × 1000
```

---

## Key Non-Obvious Trade-offs (Effect Criterion)

| Observation | Why it matters |
|-------------|----------------|
| F_post rises with more checks | More errors are caught and discarded |
| f_kept falls with more checks | More shots fail the stricter syndrome filter |
| Score can DECREASE beyond optimal check count | Over-checking wastes shots |
| T-count raises the noise floor | Each T gate introduces non-Clifford magic but costs fidelity |
| Check qubit ordering matters | qiskit-paulice is greedy — first target qubit is committed first |
| Gamma cost ≠ Score | Gamma measures analytical coverage; Score is empirical quantum simulation |

---

## Noise Model

Synthetic depolarizing + thermal relaxation + readout errors. Fixed parameters for reproducibility:

| Parameter | Value |
|-----------|-------|
| 1-qubit depolarizing | 0.1% |
| 2-qubit depolarizing | 1.0% |
| T1 | 100 µs |
| T2 | 80 µs |
| 1-qubit gate time | 50 ns |
| 2-qubit gate time | 300 ns |
| Readout error | 2% |

---

## Where We Sit: Detection vs. Mitigation vs. Correction

- **Error detection (this game)**: Ancilla checks flag caught errors; those shots are discarded. The circuit is NOT repaired. This is the subject of this hackathon challenge.
- **Error mitigation**: ZNE/PEC correct estimated observables in post-processing.
- **Error correction**: Stabilizer codes + decoders repair errors in real time.

---

## References

- [qiskit-paulice documentation](https://qiskit-extensions.github.io/qiskit-paulice/)
- Martiel & Javadi-Abhari, *Low-overhead error detection with spacetime codes*, arXiv:2504.15725
- Litinski, *A Game of Surface Codes*, Quantum 3, 128 (2019)
- QGSS 2025 Lab 4, QGSS 2026 Lab 3

