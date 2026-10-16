# Complete solutions: Flight Schools 1–6 and Main Missions 1–10

**Spoilers: this guide contains quiz answers and exact winning circuit placements.** It describes the current Trusted Fidelity game. All scored solutions below were re-run through the actual backend while this file was generated, and every editor snippet was parsed by the application's real compiler. Existing validated drafts supply the placements; no gameplay or reference files are changed.

## Contents

- [How to use the solutions](#how-to-use-the-solutions)
- Flight Schools [1](#flight-school-1-quantum-errors), [2](#flight-school-2-detection-mitigation-and-correction), [3](#flight-school-3-the-s-gate-check), [4](#flight-school-4-multi-qubit-propagation), [5](#flight-school-5-the-t-gate-barrier), [6](#flight-school-6-trusted-fidelity)
- [Main mission score summary](#main-mission-score-summary)
- Main Missions [1](#main-mission-1), [2](#main-mission-2), [3](#main-mission-3), [4](#main-mission-4), [5](#main-mission-5), [6](#main-mission-6), [7](#main-mission-7), [8](#main-mission-8), [9](#main-mission-9), [10](#main-mission-10)
- [Troubleshooting and reproduction](#troubleshooting-and-reproduction)

## How to use the solutions

1. Open the relevant Flight School or mission. Start from a clean circuit: reset guided tutorials; remove any previous authored mission gates with the Dustbin before rebuilding visually. Do not edit locked payload gates.
2. Either drag gates to the positions in the tables, or open **Code**, replace the entire editable source with the corresponding block, and select **Apply code**. Then run the experiment/circuit/mission. Applying code alone does not complete a lesson.
3. In Visual mode, place a controlled gate's control on the ancilla first, then drag its target endpoint to the data wire in the same column. `CX(a0 → q1)` means ancilla control, q1 target. `M(a0)` is the ancilla's terminal measurement.
4. On narrow screens, use **Theory**, **Experiment**, and **Results** to access the same three workbench panes. Finish each tutorial's knowledge/review requirement before continuing.

The code blocks are the game's safely parsed editor APIs, **not standalone Qiskit Python programs**. `TutorialCircuit`, `ProtectionCircuit`, `FlightCircuit`, `MissionCircuit`, `at`, `band`, `boundary`, and `slot` are application helpers. The game executes the resulting circuits using Qiskit; native exports appear separately in its read-only code output.

All column, boundary, slot and wire numbers in this guide are **zero-based**. If a visual label counts columns from 1, add 1 to the documented column/slot number when matching that label. Table coordinates and code arguments are authoritative.

Tutorials use one continuous column index (`at=c`). Main missions use an inserted **band** at a payload boundary `b`, then a local slot `s`: `b2s1` means boundary 2, slot 1. Boundary 0 is **Before payload**; an interior boundary b is **After gate b** in the insertion menu; the final boundary is **After payload**. Thus boundary 2 is after the first two payload instructions and before instruction index 2.

Main missions start with four slots before the payload and eight after it. An interior boundary starts with none. **Insert columns** adds four slots per press, up to eight. A declaration `qc.band(b, 8)` sets the total band size, not eight additional slots. When placing visually, grow each band's size to the stated total before placing its gates; do not count columns across the entire canvas.

Numeric editor wire IDs are data wires first, then ancillas. With n data wires, ID n is a0, n+1 is a1, and so on. The tables use the visible q/a names instead. Main 1–3 require manually placed closing checks; Main 4–10 generate locked closing gates immediately before the final ancilla H. Leave those generated gates alone.

Trusted Fidelity is `F_ps * min(1, S_keep / S_min)`. The percentages below are exact retained fractions, not guaranteed finite-shot counts. Scores are exact and stable under the stated default hardware settings. A budget is a soft penalty boundary; keeping fewer shots than S_min does not automatically prevent passing. FS1–5 have no numeric pass-score requirement.

## Flight School 1: Quantum errors

Use one data qubit, Final comparison, Z-basis readout, and 1024 shots. Drag **Bit flip · X error** onto q0 at column 0, or apply:

```python
from quantum_shield import TutorialCircuit
qc = TutorialCircuit(1)
qc.bit_flip(0, at=0)
```

Select **Run experiment**. The ideal reference is |0>; the affected state is |1>, so a Z measurement returns 1. Open **Theory → Knowledge Check**, select these answers and press **Check answers**:

| Question | Answer |
|---|---|
| Bit flip on a qubit initially in the zero state | **B. Always 1.** |
| How to distinguish plus from its phase-flipped minus state | **C. Their immediate Z probabilities match, but X measurement distinguishes them.** |
| Relaxation of an initially excited qubit | **A. P(1) decreases and P(0) increases.** |

Then select **Continue to Flight School 2 →**. One completed experiment plus all three correct answers is enough; the following extra experiments are useful for understanding but not extra unlock requirements.

**Phase experiment:** replace the source with the following, use X-basis readout, and run. The ideal result is + (bit 0 in X basis); the phase-flipped result is − (bit 1 in X basis). Switching to Z gives equal 0/1 probabilities in both cases.

```python
from quantum_shield import TutorialCircuit
qc = TutorialCircuit(1)
qc.h(0, at=0)
qc.phase_flip(0, at=1)
```

**Decoherence experiment:** prepare |1>, let it relax, and use Z readout. At t = T1 = 100 μs, P(1) = exp(−1), about 0.368, rather than a deterministic flip. Change the waiting time and rerun.

```python
from quantum_shield import TutorialCircuit
qc = TutorialCircuit(1)
qc.x(0, at=0)
qc.decoherence(0, time_us=100, t1_us=100, t2_us=80, at=1)
```

## Flight School 2: Detection, mitigation and correction

Use one data qubit and the empty |0> base payload. Set hardware noise enabled, bit flip 0.025, phase flip 0.01, depolarization 0, and relaxation time 0 μs. T1 = 100 μs and T2 = 80 μs. Protect q0. This code supplies the same hardware-style experiment:

```python
from quantum_shield import ProtectionCircuit
qc = ProtectionCircuit(1)
qc.protect_wire(0)
qc.hardware(enabled=True, bitFlip=0.025, phaseFlip=0.01, depolarizing=0, relaxationTimeUs=0, t1Us=100, t2Us=80)
```

For each of **Detection**, **Mitigation**, and **Correction**, select the method and press **Run selected method**. Wait for **✓ Qiskit result** before switching. You may use any order and repeat methods. Inspect the read-only transformed circuit and Results each time.

- Detection filters flagged shots; compare kept and discarded shots.
- Mitigation extrapolates an observable using several noise scales. It does not output a repaired density matrix.
- Correction uses encoding, syndrome extraction and recovery; the larger circuit can introduce extra noise.

After all three method runs have succeeded, select **Continue to Flight School 3 →** in Theory. There is no MCQ or fidelity threshold for completing FS2. A single successful method run does not finish it.

## Flight School 3: The S-gate check

Stay in **Guided assembly**, with one data wire and one ancilla. S(q0) at column 2 is already locked in place. The complete reference includes an X test fault at column 3. Build these authored gates:

| Zero-based column | Drag this gate |
|---:|---|
| 0 | H(a0) |
| 1 | CX(a0 → q0) |
| 3 | BIT_FLIP(q0) |
| 4 | CY(a0 → q0) |
| 5 | H(a0) |
| 6 | M(a0) |

```python
from quantum_shield import FlightCircuit
qc = FlightCircuit(1)
qc.context(lesson=3, mode="guided", ancillas=1, columns=7)
qc.hardware(enabled=False, bitFlip=0.025, phaseFlip=0.01, depolarizing=0.0, relaxationTimeUs=0.0, t1Us=100.0, t2Us=80.0)
qc.h(1, at=0)
qc.cx(1, 0, at=1)
qc.bit_flip(0, at=3)
qc.cy(1, 0, at=4)
qc.h(1, at=5)
qc.m(1, at=6)
```

Run with **Run circuit**. The connector must be green: the opening X propagates through S to Y, so the closing gate is CY. The X fault anticommutes with that Y check and gives syndrome 1. Remove only the Bit flip block via the Dustbin and rerun to compare the ideal syndrome-0 case; noisy output with an empty kept-shot set is not a failed check-design identity.

In **Knowledge Check**, choose **Y** (option B in the four-choice question). Then select **Continue to next Flight School →**. A green circuit alone does not complete the quiz requirement.

## Flight School 4: Multi-qubit propagation

Stay in **Guided assembly**, with two data wires and one ancilla. The fixed payload is H(q0) at column 3, then CX(q0 → q1) at column 4. Do not add either locked gate again. Leave the optional fault slot empty. Build:

| Zero-based column | Drag this gate |
|---:|---|
| 0 | H(a0) |
| 1 | CZ(a0 → q0) |
| 6 | CX(a0 → q0) |
| 7 | CX(a0 → q1) |
| 8 | H(a0) |
| 9 | M(a0) |

```python
from quantum_shield import FlightCircuit
qc = FlightCircuit(2)
qc.context(lesson=4, mode="guided", ancillas=1, columns=10)
qc.hardware(enabled=False, bitFlip=0.025, phaseFlip=0.01, depolarizing=0.0, relaxationTimeUs=0.0, t1Us=100.0, t2Us=80.0)
qc.h(2, at=0)
qc.cz(2, 0, at=1)
qc.cx(2, 0, at=6)
qc.cx(2, 1, at=7)
qc.h(2, at=8)
qc.m(2, at=9)
```

The opening here is Z0 **before H and CX**, rather than X0 before CX alone. H maps Z0 to X0; CX then spreads it to X0 X1. Therefore both closing CX taps are required. Run the circuit and confirm a green invariant and an error-free syndrome-0 output.

Answer both questions:

| Question | Answer |
|---|---|
| Across CNOT alone, X on its control becomes… | **X on both wires** |
| Across H(q0) then CX, Z0 becomes… | **X0 X1** |

Select **Continue to next Flight School →**. Removing either closing factor makes the product incomplete.

## Flight School 5: The T-gate barrier

Stay in **Guided assembly**, with one data wire and one ancilla. T(q0) at column 2 is fixed. Leave the optional fault column empty. Build:

| Zero-based column | Drag this gate |
|---:|---|
| 0 | H(a0) |
| 1 | CZ(a0 → q0) |
| 4 | CZ(a0 → q0) |
| 5 | H(a0) |
| 6 | M(a0) |

```python
from quantum_shield import FlightCircuit
qc = FlightCircuit(1)
qc.context(lesson=5, mode="guided", ancillas=1, columns=7)
qc.hardware(enabled=False, bitFlip=0.025, phaseFlip=0.01, depolarizing=0.0, relaxationTimeUs=0.0, t1Us=100.0, t2Us=80.0)
qc.h(1, at=0)
qc.cz(1, 0, at=1)
qc.cz(1, 0, at=4)
qc.h(1, at=5)
qc.m(1, at=6)
```

Run the circuit. Z commutes with T, so the CZ/CZ shell is green and the noiseless syndrome is 0. In **Knowledge Check**, answer **Z**, then continue to FS6.

For comparison only, replacing the checks by CX or CY across T is rejected as non-Pauli transport. Restore CZ/CZ and run again before continuing. You do not need to complete the blank sandbox to unlock FS6.

## Flight School 6: Trusted Fidelity

Use **Guided assembly**, exactly two data wires and one ancilla. Keep default hardware settings: enabled; bit flip 0.001; phase flip 0.001; depolarization 0; relaxation slider 0 μs; T1 = 100 μs; T2 = 80 μs. The separate fixed relaxation hotspot and check-interaction noise remain part of the lesson; a zero relaxation slider does not disable the hotspot.

The locked payload is X(q0) at column 4, CX(q0 → q1) at 5, H(q0) at 6, and S(q1) at 7. Do not place data gates or controls inside locked columns 4–8. S_min = 0.99; target = 0.62.

### Straightforward passing solution

Protect q0 with an opening X. Its full-payload closing is Z0 Y1, implemented by CZ and CY from a0:

| Zero-based column | Drag this gate |
|---:|---|
| 0 | H(a0) |
| 1 | CX(a0 → q0) |
| 9 | CZ(a0 → q0) |
| 10 | CY(a0 → q1) |
| 13 | H(a0) |
| 14 | M(a0) |

```python
from quantum_shield import FlightCircuit
qc = FlightCircuit(2)
qc.context(lesson=6, mode="guided", ancillas=1, columns=15)
qc.hardware(enabled=True, bitFlip=0.001, phaseFlip=0.001, depolarizing=0.0, relaxationTimeUs=0.0, t1Us=100.0, t2Us=80.0)
qc.h(2, at=0)
qc.cx(2, 0, at=1)
qc.cz(2, 0, at=9)
qc.cy(2, 1, at=10)
qc.h(2, at=13)
qc.m(2, at=14)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.674885 | 0.816186 | 0.818607 | 0.62 |

### Higher-scoring reference

Use this **instead of**, not in addition to, the previous shell. It opens X on q1 and closes Y on q1. It uses fewer controlled interactions:

| Zero-based column | Drag this gate |
|---:|---|
| 0 | H(a0) |
| 2 | CX(a0 → q1) |
| 10 | CY(a0 → q1) |
| 13 | H(a0) |
| 14 | M(a0) |

```python
from quantum_shield import FlightCircuit
qc = FlightCircuit(2)
qc.context(lesson=6, mode="guided", ancillas=1, columns=15)
qc.hardware(enabled=True, bitFlip=0.001, phaseFlip=0.001, depolarizing=0.0, relaxationTimeUs=0.0, t1Us=100.0, t2Us=80.0)
qc.h(2, at=0)
qc.cx(2, 1, at=2)
qc.cy(2, 1, at=10)
qc.h(2, at=13)
qc.m(2, at=14)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.693050 | 0.827609 | 0.829038 | 0.62 |

For either solution, select **Run circuit** and wait for the **Qualification comparison**. The game requests its real Clifford-only Paulice suggestion and independently enumerates its finite-family game-score reference. Those are different objectives; the higher-scoring solution above is not a Paulice-certified global optimum.

Press **I reviewed the comparison**, then **Start Main Mission 1**. Merely exceeding 0.62 does not finish FS6 until the comparison has been reviewed. If the reveal request fails, retry the reveal without changing the passing circuit.

## Main mission score summary

Every mission below has a straightforward passing solution and a stronger best-found reference. All use only a0; additional fixed ancillas can stay unused. Each best-found reference reaches the current three-star threshold (target + 0.05). “Best found” means best in the existing finite search family, not a global guarantee over arbitrary circuits. All numbers here were checked by executing the documented editor source against the player backend.

| Mission | Data | Fixed ancillas | T/Tdg | S_min | Target | Passing solution | Best-found solution |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 1 | 0 | 0.99 | 0.63 | 0.682206 | 0.688500 |
| 2 | 3 | 1 | 0 | 0.97 | 0.64 | 0.692925 | 0.693160 |
| 3 | 3 | 2 | 0 | 0.94 | 0.65 | 0.707868 | 0.708107 |
| 4 | 3 | 2 | 0 | 0.92 | 0.66 | 0.716577 | 0.716818 |
| 5 | 3 | 2 | 0 | 0.90 | 0.66 | 0.705837 | 0.721441 |
| 6 | 3 | 2 | 0 | 0.87 | 0.67 | 0.720186 | 0.738621 |
| 7 | 3 | 3 | 0 | 0.86 | 0.67 | 0.720304 | 0.738750 |
| 8 | 4 | 3 | 1 | 0.83 | 0.67 | 0.723805 | 0.744017 |
| 9 | 4 | 3 | 3 | 0.82 | 0.67 | 0.723079 | 0.743161 |
| 10 | 4 | 3 | 5 | 0.80 | 0.67 | 0.731521 | 0.751848 |

## Main Mission 1

**First contact.** 2 data qubits; 1 fixed ancilla; a0 has numeric wire ID **2**. Target **0.63**, shot budget **99%**. Leave the hardware model unchanged.

This mission is manual: place every opening **and closing** CP listed below, including any Z phase-compensation gate on a0.

### Straightforward passing solution

**Band sizes:** boundary 0: 8 total slots, boundary 6: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 0 | 0 | `b0s0` | H(a0) |
| 0 | 1 | `b0s1` | CX(a0 → q0) |
| 6 | 1 | `b6s1` | CY(a0 → q1) |
| 6 | 5 | `b6s5` | Z(a0) |
| 6 | 6 | `b6s6` | H(a0) |
| 6 | 7 | `b6s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(1)
qc.band(0, 8)
qc.band(6, 8)
qc.h(2, boundary=0, slot=0)
qc.cx(2, 0, boundary=0, slot=1)
qc.cy(2, 1, boundary=6, slot=1)
qc.z(2, boundary=6, slot=5)
qc.h(2, boundary=6, slot=6)
qc.m(2, boundary=6, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.682206 | 0.822369 | 0.821266 | 0.63 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 1: 8 total slots, boundary 2: 8 total slots, boundary 6: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 1 | 0 | `b1s0` | H(a0) |
| 1 | 2 | `b1s2` | CX(a0 → q1) |
| 2 | 1 | `b2s1` | CX(a0 → q1) |
| 2 | 6 | `b2s6` | H(a0) |
| 2 | 7 | `b2s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(1)
qc.band(0, 4)
qc.band(1, 8)
qc.band(2, 8)
qc.band(6, 8)
qc.h(2, boundary=1, slot=0)
qc.cx(2, 1, boundary=1, slot=2)
qc.cx(2, 1, boundary=2, slot=1)
qc.h(2, boundary=2, slot=6)
qc.m(2, boundary=2, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.688500 | 0.827453 | 0.823750 | 0.63 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 2

**Crossed signals.** 3 data qubits; 1 fixed ancilla; a0 has numeric wire ID **3**. Target **0.64**, shot budget **97%**. Leave the hardware model unchanged.

This mission is manual: place every opening **and closing** CP listed below, including any Z phase-compensation gate on a0.

### Straightforward passing solution

**Band sizes:** boundary 0: 8 total slots, boundary 2: 8 total slots, boundary 10: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 0 | 0 | `b0s0` | H(a0) |
| 0 | 2 | `b0s2` | CX(a0 → q1) |
| 2 | 1 | `b2s1` | CX(a0 → q1) |
| 2 | 6 | `b2s6` | H(a0) |
| 2 | 7 | `b2s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(2)
qc.band(0, 8)
qc.band(2, 8)
qc.band(10, 8)
qc.h(3, boundary=0, slot=0)
qc.cx(3, 1, boundary=0, slot=2)
qc.cx(3, 1, boundary=2, slot=1)
qc.h(3, boundary=2, slot=6)
qc.m(3, boundary=2, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.692925 | 0.819311 | 0.820369 | 0.64 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 1: 8 total slots, boundary 2: 8 total slots, boundary 10: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 1 | 0 | `b1s0` | H(a0) |
| 1 | 2 | `b1s2` | CX(a0 → q1) |
| 2 | 1 | `b2s1` | CX(a0 → q1) |
| 2 | 6 | `b2s6` | H(a0) |
| 2 | 7 | `b2s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(2)
qc.band(0, 4)
qc.band(1, 8)
qc.band(2, 8)
qc.band(10, 8)
qc.h(3, boundary=1, slot=0)
qc.cx(3, 1, boundary=1, slot=2)
qc.cx(3, 1, boundary=2, slot=1)
qc.h(3, boundary=2, slot=6)
qc.m(3, boundary=2, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.693160 | 0.819429 | 0.820529 | 0.64 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 3

**Echo chamber.** 3 data qubits; 2 fixed ancillas; a0 has numeric wire ID **3**. Target **0.65**, shot budget **94%**. Leave the hardware model unchanged.

This mission is manual: place every opening **and closing** CP listed below, including any Z phase-compensation gate on a0.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 1: 8 total slots, boundary 3: 8 total slots, boundary 13: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 1 | 0 | `b1s0` | H(a0) |
| 1 | 2 | `b1s2` | CX(a0 → q1) |
| 3 | 1 | `b3s1` | CX(a0 → q1) |
| 3 | 6 | `b3s6` | H(a0) |
| 3 | 7 | `b3s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(3)
qc.band(0, 4)
qc.band(1, 8)
qc.band(3, 8)
qc.band(13, 8)
qc.h(3, boundary=1, slot=0)
qc.cx(3, 1, boundary=1, slot=2)
qc.cx(3, 1, boundary=3, slot=1)
qc.h(3, boundary=3, slot=6)
qc.m(3, boundary=3, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.707868 | 0.814416 | 0.817022 | 0.65 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 2: 8 total slots, boundary 3: 8 total slots, boundary 13: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 2 | 0 | `b2s0` | H(a0) |
| 2 | 2 | `b2s2` | CX(a0 → q1) |
| 3 | 1 | `b3s1` | CX(a0 → q1) |
| 3 | 6 | `b3s6` | H(a0) |
| 3 | 7 | `b3s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(3)
qc.band(0, 4)
qc.band(2, 8)
qc.band(3, 8)
qc.band(13, 8)
qc.h(3, boundary=2, slot=0)
qc.cx(3, 1, boundary=2, slot=2)
qc.cx(3, 1, boundary=3, slot=1)
qc.h(3, boundary=3, slot=6)
qc.m(3, boundary=3, slot=7)
```

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.708107 | 0.814533 | 0.817181 | 0.65 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 4

**Interior access.** 3 data qubits; 2 fixed ancillas; a0 has numeric wire ID **3**. Target **0.66**, shot budget **92%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 1: 8 total slots, boundary 3: 8 total slots, boundary 15: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 1 | 0 | `b1s0` | H(a0) |
| 1 | 2 | `b1s2` | CX(a0 → q1) |
| 3 | 6 | `b3s6` | H(a0) |
| 3 | 7 | `b3s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(4)
qc.band(0, 4)
qc.band(1, 8)
qc.band(3, 8)
qc.band(15, 8)
qc.h(3, boundary=1, slot=0)
qc.cx(3, 1, boundary=1, slot=2)
qc.h(3, boundary=3, slot=6)
qc.m(3, boundary=3, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.716577 | 0.810022 | 0.813868 | 0.66 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 2: 8 total slots, boundary 3: 8 total slots, boundary 15: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 2 | 0 | `b2s0` | H(a0) |
| 2 | 2 | `b2s2` | CX(a0 → q1) |
| 3 | 6 | `b3s6` | H(a0) |
| 3 | 7 | `b3s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(4)
qc.band(0, 4)
qc.band(2, 8)
qc.band(3, 8)
qc.band(15, 8)
qc.h(3, boundary=2, slot=0)
qc.cx(3, 1, boundary=2, slot=2)
qc.h(3, boundary=3, slot=6)
qc.m(3, boundary=3, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.716818 | 0.810138 | 0.814025 | 0.66 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 5

**Branching paths.** 3 data qubits; 2 fixed ancillas; a0 has numeric wire ID **3**. Target **0.66**, shot budget **90%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 3: 8 total slots, boundary 4: 8 total slots, boundary 18: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 3 | 0 | `b3s0` | H(a0) |
| 3 | 2 | `b3s2` | CY(a0 → q1) |
| 4 | 6 | `b4s6` | H(a0) |
| 4 | 7 | `b4s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(5)
qc.band(0, 4)
qc.band(3, 8)
qc.band(4, 8)
qc.band(18, 8)
qc.h(3, boundary=3, slot=0)
qc.cy(3, 1, boundary=3, slot=2)
qc.h(3, boundary=4, slot=6)
qc.m(3, boundary=4, slot=7)
```

**Locked automatic closure, in execution order:** CZ(a0 → q0), CY(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.705837 | 0.791840 | 0.802250 | 0.66 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 3: 8 total slots, boundary 4: 8 total slots, boundary 18: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 3 | 0 | `b3s0` | H(a0) |
| 3 | 2 | `b3s2` | CX(a0 → q1) |
| 4 | 6 | `b4s6` | H(a0) |
| 4 | 7 | `b4s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(5)
qc.band(0, 4)
qc.band(3, 8)
qc.band(4, 8)
qc.band(18, 8)
qc.h(3, boundary=3, slot=0)
qc.cx(3, 1, boundary=3, slot=2)
qc.h(3, boundary=4, slot=6)
qc.m(3, boundary=4, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.721441 | 0.800864 | 0.810745 | 0.66 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 6

**Hidden interference.** 3 data qubits; 2 fixed ancillas; a0 has numeric wire ID **3**. Target **0.67**, shot budget **87%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 2: 8 total slots, boundary 4: 8 total slots, boundary 20: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 2 | 0 | `b2s0` | H(a0) |
| 2 | 1 | `b2s1` | CX(a0 → q0) |
| 4 | 6 | `b4s6` | H(a0) |
| 4 | 7 | `b4s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(6)
qc.band(0, 4)
qc.band(2, 8)
qc.band(4, 8)
qc.band(20, 8)
qc.h(3, boundary=2, slot=0)
qc.cx(3, 0, boundary=2, slot=1)
qc.h(3, boundary=4, slot=6)
qc.m(3, boundary=4, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q0), CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.720186 | 0.783827 | 0.799362 | 0.67 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 3: 8 total slots, boundary 4: 8 total slots, boundary 20: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 3 | 0 | `b3s0` | H(a0) |
| 3 | 2 | `b3s2` | CX(a0 → q1) |
| 4 | 6 | `b4s6` | H(a0) |
| 4 | 7 | `b4s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(6)
qc.band(0, 4)
qc.band(3, 8)
qc.band(4, 8)
qc.band(20, 8)
qc.h(3, boundary=3, slot=0)
qc.cx(3, 1, boundary=3, slot=2)
qc.h(3, boundary=4, slot=6)
qc.m(3, boundary=4, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.738621 | 0.795639 | 0.807653 | 0.67 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 7

**Clifford labyrinth.** 3 data qubits; 3 fixed ancillas; a0 has numeric wire ID **3**. Target **0.67**, shot budget **86%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 3: 8 total slots, boundary 5: 8 total slots, boundary 23: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 3 | 0 | `b3s0` | H(a0) |
| 3 | 1 | `b3s1` | CX(a0 → q0) |
| 5 | 6 | `b5s6` | H(a0) |
| 5 | 7 | `b5s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(7)
qc.band(0, 4)
qc.band(3, 8)
qc.band(5, 8)
qc.band(23, 8)
qc.h(3, boundary=3, slot=0)
qc.cx(3, 0, boundary=3, slot=1)
qc.h(3, boundary=5, slot=6)
qc.m(3, boundary=5, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q0), CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.720304 | 0.777988 | 0.796235 | 0.67 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 4: 8 total slots, boundary 5: 8 total slots, boundary 23: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 4 | 0 | `b4s0` | H(a0) |
| 4 | 2 | `b4s2` | CX(a0 → q1) |
| 5 | 6 | `b5s6` | H(a0) |
| 5 | 7 | `b5s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(7)
qc.band(0, 4)
qc.band(4, 8)
qc.band(5, 8)
qc.band(23, 8)
qc.h(3, boundary=4, slot=0)
qc.cx(3, 1, boundary=4, slot=2)
qc.h(3, boundary=5, slot=6)
qc.m(3, boundary=5, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.738750 | 0.789774 | 0.804439 | 0.67 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 8

**Golden crossing.** 4 data qubits; 3 fixed ancillas; a0 has numeric wire ID **4**. Target **0.67**, shot budget **83%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

The payload is T-doped. Validity requires I/Z support at each T/Tdg crossing inside the check interval; the opening may contain X/Y at other times. This solution is accepted by the non-Clifford-aware validator and exact Aer scorer, not scored by Paulice.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 4: 8 total slots, boundary 8: 8 total slots, boundary 30: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 4 | 0 | `b4s0` | H(a0) |
| 4 | 1 | `b4s1` | CY(a0 → q0) |
| 8 | 6 | `b8s6` | H(a0) |
| 8 | 7 | `b8s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(8)
qc.band(0, 4)
qc.band(4, 8)
qc.band(8, 8)
qc.band(30, 8)
qc.h(4, boundary=4, slot=0)
qc.cy(4, 0, boundary=4, slot=1)
qc.h(4, boundary=8, slot=6)
qc.m(4, boundary=8, slot=7)
```

**Locked automatic closure, in execution order:** CY(a0 → q0), CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.723805 | 0.758841 | 0.791679 | 0.67 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 4: 8 total slots, boundary 5: 8 total slots, boundary 30: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 4 | 0 | `b4s0` | H(a0) |
| 4 | 2 | `b4s2` | CX(a0 → q1) |
| 5 | 6 | `b5s6` | H(a0) |
| 5 | 7 | `b5s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(8)
qc.band(0, 4)
qc.band(4, 8)
qc.band(5, 8)
qc.band(30, 8)
qc.h(4, boundary=4, slot=0)
qc.cx(4, 1, boundary=4, slot=2)
qc.h(4, boundary=5, slot=6)
qc.m(4, boundary=5, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.744017 | 0.770560 | 0.801410 | 0.67 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 9

**Three phase barriers.** 4 data qubits; 3 fixed ancillas; a0 has numeric wire ID **4**. Target **0.67**, shot budget **82%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

The payload is T-doped. Validity requires I/Z support at each T/Tdg crossing inside the check interval; the opening may contain X/Y at other times. This solution is accepted by the non-Clifford-aware validator and exact Aer scorer, not scored by Paulice.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 5: 8 total slots, boundary 9: 8 total slots, boundary 35: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 5 | 0 | `b5s0` | H(a0) |
| 5 | 1 | `b5s1` | CY(a0 → q0) |
| 9 | 6 | `b9s6` | H(a0) |
| 9 | 7 | `b9s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(9)
qc.band(0, 4)
qc.band(5, 8)
qc.band(9, 8)
qc.band(35, 8)
qc.h(4, boundary=5, slot=0)
qc.cy(4, 0, boundary=5, slot=1)
qc.h(4, boundary=9, slot=6)
qc.m(4, boundary=9, slot=7)
```

**Locked automatic closure, in execution order:** CY(a0 → q0), CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.723079 | 0.751840 | 0.788632 | 0.67 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 5: 8 total slots, boundary 6: 8 total slots, boundary 35: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 5 | 0 | `b5s0` | H(a0) |
| 5 | 2 | `b5s2` | CX(a0 → q1) |
| 6 | 6 | `b6s6` | H(a0) |
| 6 | 7 | `b6s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(9)
qc.band(0, 4)
qc.band(5, 8)
qc.band(6, 8)
qc.band(35, 8)
qc.h(4, boundary=5, slot=0)
qc.cx(4, 1, boundary=5, slot=2)
qc.h(4, boundary=6, slot=6)
qc.m(4, boundary=6, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.743161 | 0.763399 | 0.798262 | 0.67 |

Select **Run mission** and confirm **PASS** in Results. Return to **Mission control** to select the next unlocked mission.

## Main Mission 10

**The final invariant.** 4 data qubits; 3 fixed ancillas; a0 has numeric wire ID **4**. Target **0.67**, shot budget **80%**. Leave the hardware model unchanged.

Closing P′ is automatic: place only the authored gates listed below. The validator inserts the signed closing operator immediately before the final H, including any required ancilla phase gate. Do not add a second manual closing product.

The payload is T-doped. Validity requires I/Z support at each T/Tdg crossing inside the check interval; the opening may contain X/Y at other times. This solution is accepted by the non-Clifford-aware validator and exact Aer scorer, not scored by Paulice.

### Straightforward passing solution

**Band sizes:** boundary 0: 4 total slots, boundary 5: 8 total slots, boundary 9: 8 total slots, boundary 39: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 5 | 0 | `b5s0` | H(a0) |
| 5 | 1 | `b5s1` | CY(a0 → q0) |
| 9 | 6 | `b9s6` | H(a0) |
| 9 | 7 | `b9s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(10)
qc.band(0, 4)
qc.band(5, 8)
qc.band(9, 8)
qc.band(39, 8)
qc.h(4, boundary=5, slot=0)
qc.cy(4, 0, boundary=5, slot=1)
qc.h(4, boundary=9, slot=6)
qc.m(4, boundary=9, slot=7)
```

**Locked automatic closure, in execution order:** CY(a0 → q0), CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.731521 | 0.744778 | 0.785760 | 0.67 |

### Best-found reference (three stars)

**Band sizes:** boundary 0: 4 total slots, boundary 5: 8 total slots, boundary 6: 8 total slots, boundary 39: 8 total slots. Unused bands may remain empty. For an interior boundary with eight slots, press Insert columns twice when starting from a clean mission.

| Boundary | Slot | Canvas coordinate | Drag this gate |
|---:|---:|---|---|
| 5 | 0 | `b5s0` | H(a0) |
| 5 | 2 | `b5s2` | CX(a0 → q1) |
| 6 | 6 | `b6s6` | H(a0) |
| 6 | 7 | `b6s7` | M(a0) |

```python
# MissionCircuit is an allowlisted editor API backed by Qiskit 2.
qc = MissionCircuit(10)
qc.band(0, 4)
qc.band(5, 8)
qc.band(6, 8)
qc.band(39, 8)
qc.h(4, boundary=5, slot=0)
qc.cx(4, 1, boundary=5, slot=2)
qc.h(4, boundary=6, slot=6)
qc.m(4, boundary=6, slot=7)
```

**Locked automatic closure, in execution order:** CX(a0 → q1). These gates appear before the final H; they are not additional drag/drop instructions.

| Trusted Fidelity | Fidelity of kept shots F_ps | Shots kept S_keep | Target |
|---:|---:|---:|---:|
| 0.751848 | 0.756297 | 0.795294 | 0.67 |

Select **Run mission** and confirm **PASS**. Return to **Mission control**; with previous missions completed, the expedition is complete.

## Troubleshooting and reproduction

- **Red invariant:** check control/target direction, missing product factors, ancilla phase compensation and the exact boundary. A gate acting on the same data qubit at a different boundary is not the same check. Main 4–10 must not receive a duplicate manual P′.
- **Cannot place a gate:** insert enough slots at its band, remove an existing gate with the Dustbin, and confirm that the target is an editable slot rather than a locked payload gate. Leave M last on its ancilla.
- **Cannot run after typing:** select Apply code and resolve diagnostics. Do not paste the app-defined source into a plain Python interpreter. For visual placement, place the controlled target endpoint as well as its control.
- **FS3 shows all shots flagged:** that is expected with the reference X test fault. Remove the fault to obtain an ideal syndrome-0 comparison. A green invariant certifies the ideal shell, not absence of an intentionally injected error.
- **FS4 still locked:** answer both knowledge questions; correct closure alone is insufficient. FS3 and FS5 also require their respective answer and a successful guided run.
- **FS6 score differs:** restore default hardware settings and remove extra gates. Complete the comparison-review step. Raising noise or turning it off changes the baseline, target headroom or score; this guide is not calibrated to those custom settings.
- **Unexpected mission score:** start clean and copy just one solution. Keep unused ancillas empty. Exact scores should match to displayed precision. Counts may fluctuate independently. A different deployed game version can require redeploying the current frontend and backend together.
- **Direct link remains locked:** progress is stored on the current browser/domain. Complete prerequisites in order or use the explicit Skip Tutorial / Unlock All Levels option if you only need to inspect a solution. These instructions do not edit localStorage or bypass progression handlers.

Source records: [tutorial references](../backend/reference_solutions/tutorials.json), [FS6 references](../backend/reference_solutions/capstone.json), and [mission references](../backend/missions/references.json). Coordinate/editor semantics: [mission contracts](../src/lib/missions/contracts.ts), [tutorial contracts](../src/lib/timeline/contracts.ts), [mission compiler and validator](../backend/missions/service.py), and [tutorial compiler and validator](../backend/timeline_lab/service.py). Completion answers and controls: [Flight Schools 3–6](../src/components/learning/TimelineLab.tsx), [FS1 content](../src/lib/flight-school-1/content.ts), and [full-progression browser test](../e2e/full-progression.spec.ts).

Re-run backend reference validation from the repository root:

```powershell
.venv/Scripts/python.exe scripts/validate_all_levels.py
```

Verify the full UI progression, including all knowledge checks, review acknowledgement and unlocks:

```powershell
pnpm exec playwright test e2e/full-progression.spec.ts
```

The browser command uses the repository's local Playwright configuration and its configured development servers. See [README](../readme.md) for production/deployed browser verification. No optimizer, recalibration or gameplay edit is needed to use these solutions. If the fixtures change later, revalidate this guide against them before relying on its scores.
