## 2. Level Specification: Flight School 2 — Detection vs. Mitigation vs. Correction

### Level Overview
* **ID**: `flight-school-2`
* **Name**: Detection vs. Mitigation vs. Correction
* **Target Audience**: Students comfortable with basic noise who want to understand protection paradigms.
* **Prerequisites**: `flight-school-1` Completed.
* **Objective**: Experimentally discover how Error Detection, Error Mitigation, and Error Correction modify circuits, alter execution overhead, and improve output metrics.

---

### Left Panel Content (Rendered Markdown)

```markdown
# Flight School 2: Detection vs. Mitigation vs. Correction

Now that you know how environmental noise damages quantum states, how do we protect quantum computations? In quantum information processing, protection falls into three distinct paradigms.

---

## 1. Error Detection (Spacetime Checks)
* **What it does**: Flags errors when they occur using ancilla checks and **discards noisy shot outcomes**[cite: 1, 2]. It does **not** repair the damaged quantum state[cite: 1].
* **How it works**: Ancilla qubits interact with data qubits via controlled-Pauli checks. If an ancilla measures a non-zero syndrome, that shot is filtered out in post-processing.
* **Circuit Impact**: Adds ancilla lines, controlled two-qubit check gates, and syndrome readout measurements.
* **Trade-off**: Yields extremely high post-selected fidelity, but costs extra shots due to discarded data (Sampling Overhead = $1 / \text{retention}$)[cite: 2, 3, 7].

---

## 2. Error Mitigation (Zero-Noise Extrapolation / ZNE)
* **What it does**: Leaves the physical hardware noisy, but estimates what the noiseless expectation value of an observable would be by post-processing results across multiple noise levels.
* **How it works**: Runs the circuit at baseline noise ($1\times$), then intentionally scales the noise ($3\times, 5\times$) by folding gates (e.g., replacing gate $G$ with $G G^\dagger G$). It then fits a curve to extrapolate back to zero noise ($0\times$).
* **Circuit Impact**: Generates multiple execution circuits with amplified gate depths. No ancilla qubits are required.
* **Trade-off**: Recovers clean expectation values without physical qubit overhead, but requires significantly more total shots and cannot recover single-shot quantum state fidelity[cite: 1, 7].

---

## 3. Error Correction (Quantum Stabilizer Codes)
* **What it does**: Encodes 1 logical qubit across multiple physical qubits, repeatedly measures syndrome checks, and actively infers and **repairs the state in real time**[cite: 1, 7].
* **How it works**: Uses stabilizer checks (e.g., 3-qubit bit-flip repetition code or surface code footprint)[cite: 1, 7]. A classical decoder reads syndromes and applies real-time recovery gates ($X$ or $Z$) to restore the logical state before measurement[cite: 1, 7].
* **Circuit Impact**: Massive expansion of physical qubit count (e.g., 1 data qubit $\rightarrow$ 3 or 9 physical qubits + ancilla check lines) and entangling gates[cite: 1, 7].
* **Trade-off**: Full physical error recovery and fault tolerance, but requires massive hardware overhead and high-fidelity gates below the threshold[cite: 1, 7].

---

## Comparative Paradigm Matrix

| Feature | Error Detection | Error Mitigation (ZNE) | Error Correction (QEC) |
| :--- | :--- | :--- | :--- |
| **State Repaired?** | ❌ No (Shots Discarded)[cite: 1] | ❌ No (Observable Post-Processed)[cite: 1] | ✅ Yes (Active Real-Time Recovery)[cite: 1] |
| **Ancilla Qubits Needed?** | ✅ Yes (For Spacetime Checks) | ❌ No (Data Qubits Only)[cite: 1] | ✅ Yes (Large Stabilizer Footprint)[cite: 1, 7] |
| **Primary Cost** | Lost Shots ($1/\text{retention}$ overhead)[cite: 2, 3, 7] | Extra Circuit Runs ($1\times, 3\times, 5\times$)[cite: 1, 7] | High Physical Qubit & Gate Count[cite: 1, 7] |
| **Primary Use Case** | Near-term verifiably high-fidelity runs[cite: 2] | NISQ observable expectation values[cite: 1] | Fault-tolerant quantum computing[cite: 1] |

---

## Mission Objectives
To complete this tutorial and unlock the next track:
1. Construct a base circuit and select a noise channel in the sandbox.
2. Apply **Error Detection** at least once and inspect the post-selected shot reduction[cite: 2, 3].
3. Apply **Error Mitigation (ZNE)** at least once and inspect the noise scaling curve[cite: 1, 7].
4. Apply **Error Correction (Repetition Code)** at least once and observe active state recovery[cite: 1, 7].

### Interactive Completion Checklist
* [ ] **Error Detection Tested**
* [ ] **Error Mitigation Tested**
* [ ] **Error Correction Tested**

Top-Right Panel: Interactive Workbench Controls1. Base Payload & Noise SetupPayload Presets:[ Bell State (|00> + |11>) ] (2 Qubits)   [ Superposition (|+>) ] (1 Qubit)   [ Custom Circuit ] (1–3 Qubits)   Noise Injection Toggle:[ Bit Flip Noise (p = 0.05) ]   [ Phase Flip Noise (p = 0.05) ]   [ Depolarizing Channel (p = 0.03) ]   2. Paradigm Protection ToolbarPlayers can click any technique button freely in any order and as many times as desired:   +-----------------------------------------------------------------------------------+
| APPLY PROTECTION: [ 1. Detection ]  [ 2. Mitigation (ZNE) ]  [ 3. Correction ]    |
| CURRENT ACTIVE MODE: None (Unprotected Noisy Baseline)                            |
+-----------------------------------------------------------------------------------+
3. Live Circuit Transformation Visualizer
When a protection button is clicked, the visual circuit grid immediately transforms to show how the circuit is re-architected:
1. When Detection is Active: Inserts an Ancilla Line ($a_0$) running parallel to data qubits[cite: 2, 3].Adds controlled-Pauli check gates connecting data wires to $a_0$[cite: 2, 3].Displays a post-selection filter block [ IF SYNDROME == 0 KEEP ELSE DISCARD ] at the measurement stage.   
2.When Mitigation (ZNE) is Active: Renders 3 stacked sub-circuit tabs representing noise scaling factors: [ 1x Baseline ], [ 3x Noise (G G† G) ], [ 5x Noise ][cite: 1, 7].Highlights that zero extra physical qubits were added[cite: 1, 7].
3. When Correction (Repetition Code) is Active: Encodes the data qubit into a 3-qubit logical block ($q_0 \rightarrow q_0, q_1, q_2$)[cite: 1, 7].Adds entangling CNOT gates and 2 syndrome ancilla wires ($a_0, a_1$)[cite: 1, 7].Displays an active Syndrome Decoder Block [ DECIDE & APPLY RECOVERY ] before final measurement[cite: 1, 7].

Bottom-Right Panel: Telemetry & Post-Processing Inspector
The bottom-right panel updates dynamically when Run Simulation is clicked, showing a 3-column analysis:   +---------------------------------------------------------------------------------------------------+
|  TELEMETRY & POST-PROCESSING INSPECTOR                                                            |
+----------------------------------+----------------------------------+-----------------------------+
| 1. STATE COMPARISON              | 2. TECHNIQUE TELEMETRY           | 3. POST-PROCESSING LOG      |
|                                  |                                  |                             |
| - Ideal Fidelity:     100.0%     | - Active Mode: Detection         | [1] Measured 1024 Shots     |
| - Noisy Baseline:      78.4%     | - Post-Selected Fidelity: 96.2%  | [2] Syndrome '0': 812 Shots |
| - Selected Mode:       96.2%     | - Retained Shots: 812 / 1024     | [3] Syndrome '1': 212 Shots |
|                                  | - Retention Rate: 79.3%          | [4] Discarded 212 shots!    |
|                                  | - Sampling Overhead: 1.26x       | [5] Calculated F_ps = 0.962 |
+----------------------------------+----------------------------------+-----------------------------+
Dynamic Telemetry Displays per Technique Detection Mode Display:Post-Selected Fidelity ($F_{\text{ps}}$)[cite: 2, 3].Kept Shots vs. Discarded Shots Histogram (Showing green retained shots vs. red discarded shots).   Sampling Overhead: $1 / \text{retention}$ calculation.   Post-Processing Log: Displays shot filtering logic[cite: 2, 7].Mitigation Mode (ZNE) Display:Extrapolated Expectation Value ($\langle Z \rangle$): Displays measured values at $1\times$ (e.g., 0.72), $3\times$ (e.g., 0.51), $5\times$ (e.g., 0.34).   ZNE Fitting Chart: Renders a polynomial/exponential extrapolation curve fitting back to $0\times$ noise (recovering $\langle Z \rangle \approx 0.95$)[cite: 1, 7].Post-Processing Log: Displays step-by-step curve-fitting weights and zero-noise intercept calculation[cite: 1, 7].Correction Mode Display:Corrected Logical State Fidelity: Shows fidelity after active feedback recovery[cite: 1, 7].Syndrome Measurement Breakdown: Shows how many times bit flips occurred on physical qubits $q_0, q_1, q_2$[cite: 1, 7].Post-Processing Log: Shows majority-vote decoding trace (e.g., "Syndrome 10 detected $\rightarrow$ Bit flip on physical qubit $q_0$ $\rightarrow$ Applied recovery gate $X_0$ $\rightarrow$ Restored logical state")[cite: 1, 7].Evaluation & Tutorial CompletionDynamic Completion TrackingThe engine tracks user actions using state variables:tried_detection: booleantried_mitigation: booleantried_correction: booleanAs the user runs simulations with each technique, the corresponding checkbox in the Left Panel ticks automatically.   Completion Banner & TriggerWhen all 3 checkboxes are ticked:Render success banner: 🎉 Flight School 2 Complete! You have mastered the three quantum protection paradigms.Update local storage: Save flight-school-2: completed under key quantum-shield-qed-v2[cite: 7].Unlock Flight School 2 Badge in user profile[cite: 7].Render button: [ Proceed to Flight School 3: Spacetime Check Placement ] (Disabled/locked per global level lock rules).