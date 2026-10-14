# Methods and reproducible results

## Reference and noise

All game state preparation, gates, noise, state evaluation, and sampled measurements use Qiskit 2.4.1 and Aer 0.17.2. The research adapter uses qiskit-paulice 0.2.1. Gate-column payloads have one to three data qubits; at most two helper qubits are added. Every unused data cell becomes an explicit identity operation so its storage noise is represented. Active helper intervals also include identity operations.

For these small circuits the game computes the pure ideal reference using `Statevector.from_instruction`. It computes noisy states using `AerSimulator(method='density_matrix')`, then saves the complete density matrix before measurement. State fidelity is the pure-target overlap `<ψ|ρ|ψ>` via `state_fidelity`. This captures phase errors that matching output probabilities alone would miss. The Clifford research estimator builds the signed stabilizer group using `Clifford`; T-doped references use statevectors.

Mission idle channels are bit flip, phase flip, depolarizing, phase damping, and amplitude damping. Their rates are in `backend/levels.py`. Every active one-qubit basis operation has depolarizing parameter 0.002; every two-qubit operation has parameter 0.008. Readout has symmetric confusion 0.005. The sandbox multiplier scales all rates. These are development settings, not organizer-approved hardware parameters. Aer depolarizing parameters are not probabilities of applying a nonidentity Pauli; use the channel definitions rather than interpreting every rate identically.

Compilation uses an explicit noisy basis, optimization level zero, and seed 2026, preserving modeled operations. Game measurements use 1024 sampled shots. Exact conditional-state metrics determine the score; sampled frequencies are illustrative and may differ from exact probabilities. Data readout noise affects sampled counts, not premeasurement state fidelity. Ancilla readout confusion affects the reported-zero selection probability and conditional state.

## Coherent checks

An opening Pauli P is controlled by a helper prepared in |+>. Across a payload interval U its closing Pauli is Q = U P U†, including its sign. The closing controlled-Q and helper Hadamard disentangle a valid ideal check. A sign correction is applied to the helper when required. At every intermediate operation the propagated operator must be a signed Pauli. X/Y crossings of T fail this test; I/Z crossings are allowed. Interacting multiple checks receive an additional full noiseless preservation test before any noisy score is accepted.

For a reported-zero syndrome, the engine sums the relevant ancilla diagonal blocks of the complete density matrix, weighted by readout confusion. Its trace is the kept fraction. Dividing that block by its trace gives the retained data density matrix. This avoids the incorrect shortcut of dividing unconditional fidelity by kept fraction.

The noise radar is an analytic single-Pauli anticommutation probe across payload intervals. It is a coverage proxy, not the actual probability that an arbitrary noisy run is detected. For amplitude damping it probes X/Y/Z as an approximation and does not replace the exact channel calculation.

## Score and stars

Let F be retained fidelity, p the kept fraction, C the radar coverage, A the added two-qubit gates, and D the added depth. The deterministic game score is:

```text
round(1000 × F × sqrt(p) × (0.90 + 0.10 C)
      / (1 + 0.015 A + 0.005 max(0,D)))
```

The score is capped at 1000. Fidelity, retained shots, and coverage are computed from the circuit; the weights are game-design choices. The score is not the organizers' judging score. “Added operations” includes identity markers; two-qubit overhead is reported separately.

Passing requires nominal noise, noiseless target match greater than 0.999, the mission fidelity goal, p at least 0.40, and the minimum check count. A pass earns one star. A second requires F ≥ min(0.97, goal+0.04), p ≥ 0.60. A third requires F ≥ min(0.99, goal+0.08), p ≥ 0.75, and at most six added two-qubit gates. Sandbox runs cannot earn stars.

## Ten mission solutions

Reproduce all rows with `python -m scripts.benchmark`. The full gates, checks, counts, versions, hashes, and output vectors are saved in `benchmark-results.json`. Values below are rounded; these are feasible examples, not claims of global optimality.

| Mission | Strategy | Bare F | Retained F | Kept | Score |
|---|---|---:|---:|---:|---:|
| 1 First light | X | .9014 | .9014 | 1.0000 | 811 |
| 2 Phase whisper | H | .8760 | .8760 | 1.0000 | 788 |
| 3 Catch the glitch | X; Z(q0), boundaries 0–4 | .8401 | .9937 | .8293 | 858 |
| 4 Entangled allies | H0, CX01; Z(q0), 0–5 | .8777 | .9346 | .8607 | 778 |
| 5 Memory leak | H; X(q0), 1–5 | .9132 | .9849 | .8327 | 843 |
| 6 Three-body signal | GHZ; Z(q0), 0–6 | .8397 | .9054 | .8506 | 732 |
| 7 Clifford cartographer | Fixed payload; Z(q0), 0–7 | .8398 | .9262 | .8261 | 739 |
| 8 A little magic | Fixed +1T; Z(q0), 3–7 | .7358 | .7331 | .8944 | 597 |
| 9 Narrow passage | Fixed +2T; Z(q0), 3–7 | .8693 | .8620 | .9325 | 727 |
| 10 Spacetime architect | Fixed +4T; Z(q0), 3–8 | .8661 | .8513 | .9212 | 715 |

Missions 8–10 deliberately demonstrate that a valid check can hurt fidelity: it adds noisy operations and may cover the wrong error types. The game does not falsely require every detector to improve every channel. Alternative placements and smaller intervals invite replay.

## Paulice and controlled comparisons

The Research Lab runs the same Clifford backbone with 1–3 repetitions and ordered target lists `[]`, `[0]`, `[1]`, `[0,1]`, `[1,0]`. Paulice uses `cost='gamma'`, `method='windowed'`, and a fixed seed. The requested target count is a budget, not a guarantee: no useful check may be inserted for a short circuit. The report records actual inserted checks.

Each nonidentity stabilizer is rotated into a computational-basis measurement, receives Paulice checks, and is sampled. Selection uses `get_postselection_method()` rather than assuming that all-zero ancilla bits always encode the valid syndrome. Signed stabilizer expectations reconstruct a finite-shot fidelity estimate. Different observables can use different checks, so this is not the fidelity of a single common post-selected density matrix. Sampling can produce values outside physical bounds; estimates are not silently clipped.

Paulice's input gate restrictions exclude identity markers, so its research inputs omit idle operations. Its bare and checked estimates share that protocol. The separate `exactReference` field always uses the common original payload, including idle noise, for all T counts. Compare **that field** across T counts; do not mix a Paulice observable estimator with an exact state reference.

For three repetitions of mission 7's backbone:

| Ordered targets | Baseline estimate | Checked estimate | Kept | Actual helpers |
|---|---:|---:|---:|---:|
| none | .9333 | .9287 | 1.0000 | 0 |
| 0 | .9333 | .9591 | .9488 | 1 |
| 1 | .9333 | .9603 | .9474 | 1 |
| 0, 1 | .9333 | .9794 | .9022 | 2 |
| 1, 0 | .9333 | .9698 | .9062 | 2 |

The slight difference between the two no-check estimates is finite-shot sampling of separate circuit executions. The two-helper `[0,1]` strategy has the highest retained estimate in this sampled set, while `[0]` retains more shots. Under the simple comparison utility F√p, `[0]` is about 0.934 and `[0,1]` about 0.930, so the single-check strategy wins that utility despite lower retained fidelity. These differences are small and finite-shot; a statistical claim requires more seeds/shots or uncertainty analysis.

Exact unchecked reference comparisons under mission 7's single fixed noise model:

| Repetitions | 0 T per payload | 1 T | 2 T | 4 T |
|---|---:|---:|---:|---:|
| 1 | .8398 | .8463 | .8562 | .8730 |
| 2 | .7297 | .7274 | .7412 | .7533 |
| 3 | .6161 | .6192 | .6315 | .6530 |

The T gates replace noisier idle cells in this fixed-slot model. Their presence can therefore improve fidelity, even while restricting valid check paths. Do not attribute these numbers solely to a notion that T gates are intrinsically better or worse. Depth increases reduce fidelity in this tested family; this is evidence about this family and model, not a universal theorem.

## Limits and remaining submission work

The physical simulation is intentionally small, with synthetic channels and no device connectivity/scheduling calibration. The research helper searches a bounded family rather than proving a global optimum. The introductory repetition-code demo only recovers a logical Z result under at most one X fault; it is not full fault-tolerant quantum error correction. Complete surface-code/qLDPC architectures are background concepts, not simulated here.

Before competition submission, substitute the organizers' announced noise configuration, regenerate and interpret results, record the walkthrough, and publish the repository under the team's chosen license. The PDF's instructions do not authorize this app to submit or publish on the user's behalf.
