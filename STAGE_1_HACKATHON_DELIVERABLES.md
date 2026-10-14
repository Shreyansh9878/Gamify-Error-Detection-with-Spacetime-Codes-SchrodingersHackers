# STAGE_1_HACKATHON_DELIVERABLES.md

## 1. Outcome and source of requirements

Build the complete educational game locally: onboarding, six missions, a circuit workspace, correct Qiskit evaluation, experiment comparisons, and hackathon evidence. Hosting belongs to Stage 2; accounts and global competition belong to Stage 3.

The five-page QFF Advanced Track PDF defines an open-ended spacetime-code experiment. It does not prescribe numbered levels, target states, score weights, or ancilla budgets. The six missions below retain this repository's Quantum Shield structure and are our implementation choices. The PDF's submission instructions inform deliverables; they do not authorize automatic publication or contacting organizers.

Mandatory scientific outputs: Clifford and T-doped payloads; width/depth; ideal-reference method; Paulice checks; a declared noise model; unchecked and post-selected fidelity; retained-shot fraction; ancilla/two-qubit/depth overhead; and comparisons across T count, depth, and check location. The organizer's exact noise configuration is absent from the supplied PDF. Label the development configuration synthetic, never organizer-approved.

## 2. Existing implementation: corrections before reuse

Preserve the terminal interface and notebook, but fix these issues before treating their outputs as evidence:

| Existing area | Required correction |
|---|---|
| `quantum_engine/simulator.py` | Remove `F_post = clip(F_dm / f_kept)`. An unconditional reduced state cannot generally recover conditional fidelity this way. |
| Paulice filtering | Use `CheckedCircuit.get_postselection_method()` and explicit classical-bit mapping. Zero ancilla bits alone are insufficient. |
| Manual checks | Propagate Pauli strings through every intervening gate; the closing Pauli need not equal the opening Pauli. |
| Manual interval indices | Derive boundaries from stable operation IDs, not hardcoded indices that change with T count. |
| T comparison | Add the zero-T member of `_make_t_doped_base`; `make_random_clifford_5q` is a different payload. |
| Physics text | A Z check detects anticommuting X/Y errors at its location, not a commuting Z error. Some errors escape. |
| T explanations | T and RZ(pi/4) differ by global phase. Conjugating X through T generally produces a linear combination of X and Y, not simply Y. |
| Noise | Cover all payload and ancilla qubits, and all executed gate names after transpilation. |
| Claims about outcomes | More checks or more T gates do not guarantee a monotonic fidelity trend. Show measured outcomes. |

Keep legacy results out of new comparisons by assigning the corrected engine a new version.

## 3. Directory and ownership blueprint

```text
quantum_engine/
  circuits.py             # pure payload builders and matching T family
  noise_model.py          # Aer noise and immutable model definitions
  spacetime_checks.py     # Paulice adapter and validated manual checks
  simulator.py            # reference, noisy execution, measurement protocols
  scoring.py              # versioned deterministic score calculation
  contracts.py            # validated request/result models
  registry.py             # level and benchmark authority
  service.py              # evaluate(request) orchestration
game/
  levels.py               # six mission descriptions
  game_engine.py          # terminal adapter to the same service
  ui_terminal.py
web/
  src/app/{page.tsx,layout.tsx,globals.css}
  src/app/intro/page.tsx
  src/app/levels/page.tsx
  src/app/play/[level]/page.tsx
  src/components/{intro,circuit,results,ui}/
  src/lib/{contracts.ts,progress.ts,api.ts}
  src/stores/{progress.ts,circuit.ts}
  public/levels.json      # generated public projection of registry
backend/{__init__.py,app.py} # local HTTP adapter, deploy in Stage 2
tests/quantum/
tests/contracts/
web/tests/
notebook/quantum_shield_demo.ipynb
docs/{report.md,walkthrough.md,benchmark-results.json}
scripts/{export_levels.py,benchmark.py}
```

The server registry is authoritative. Generate frontend metadata from it; CI compares the generated file to its committed version. Client-visible descriptions are not validation rules.

## 4. Mission definitions and target states

| ID | Existing title | Payload | Budget | Decisions and completion evidence |
|---|---|---|---|---|
| 1 | Bell State Guard | 3 data qubits: Bell pair on q0/q1 and H-S-H on q2 | 1 ancilla | Run baseline and one Paulice configuration; identify retained and discarded shots |
| 2 | GHZ Fortress | 4-qubit GHZ | 2 ancillas | Compare zero, one, and two checks; explain resource cost |
| 3 | Clifford Labyrinth | Existing fixed 5-qubit Clifford payload | 3 ancillas | Compare target order and shallow/deep variants |
| 4 | T-Gate Minefield | Matching 5-qubit family with T count 1 | 2 ancillas | Compare T=0/1; reject an invalid automatic-check request |
| 5 | Double T Catastrophe | Same family with T count 2 | 2 ancillas | Compare valid manual checks or unchecked results |
| 6 | Magic State Chaos | Same family with T count 4 | 2 ancillas | Complete T=0/1/2/4 comparison and justify a Pareto-efficient strategy |

For every payload U, the target is U|0...0>. Level 1's full target includes q2; it is not just a two-qubit Bell state. Level 2 targets (|0000> + |1111>)/sqrt(2). Compute other targets from their exact circuit rather than inventing state labels.

Add `t_doped_0` using the identical backbone and insertion locations as the other T variants. Review whether T gates land on states where their phase has an observable effect. If changing the backbone to improve teaching, version all four variants together. Offer repeated payload blocks with repetition counts 1, 2, and 3 for depth comparisons; recompute each target and report actual depth. T count in a repeated block must also be recomputed.

Benchmark mode fixes the payload. Players edit checks and permitted variant selectors. Sandbox mode permits payload editing, but its results remain outside ranked benchmark comparisons. Tutorial completion should depend on actions and understanding, not on forcing a fidelity increase.

### Gate validation

Automatic-check payload allowlist: `cx`, `cz`, `h`, `s`, `sdg`, `sx`, `sxdg`, `x`, `z`, and `rz(k*pi/2)` for integer k. Terminal measurements are server-generated. Reject T, RZ(pi/4), unknown operations, unbound parameters, resets, and unsupported control flow in this mode.

Represent RZ angles as integer quarter turns, avoiding floating-point near-Clifford ambiguity. Manual mode adds T only where the mission permits it. Controlled X/Y/Z operations belong to check construction, not to the automatic payload allowlist.

```python
from qiskit.quantum_info import Statevector, StabilizerState
from qiskit_paulice import add_pauli_checks
from qiskit_paulice.noise_models import NoiseModel as PauliceNoiseModel

def reference_state(payload, clifford: bool):
    unitary = payload.remove_final_measurements(inplace=False)
    if clifford:
        stabilizer = StabilizerState(unitary)
        # Small-circuit display conversion after constructing the stabilizer reference.
        return Statevector(stabilizer.clifford.to_matrix()[:, 0])
    return Statevector.from_instruction(unitary)

def automatic_candidates(payload, targets):
    measured = payload.remove_final_measurements(inplace=False)
    measured.measure_all()
    return add_pauli_checks(
        measured, target_qubits=targets,
        noise_model=PauliceNoiseModel(gate_noise=0.01),
        cost="gamma", method="windowed", seed=2026,
    )
```

Validate targets for uniqueness, range, order, and budget before this call. Select from the configurations actually returned; do not assume a requested number of checks was always found. Paulice's optimization noise model and Aer's execution noise model are different classes.

## 5. Noise, simulation, and fidelity protocols

### Versioned development noise

Use `synthetic-depolarizing-v1` initially: one-qubit depolarizing parameter 0.001, two-qubit parameter 0.01, and symmetric readout flip probability 0.02. These are design parameters, not organizer values. Aer's depolarizing parameter is not simply the total probability of a nonidentity Pauli error.

```python
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError

def make_development_noise():
    model = NoiseModel()
    model.add_all_qubit_quantum_error(
        depolarizing_error(0.001, 1),
        ["h", "s", "sdg", "sx", "sxdg", "x", "y", "z", "rz", "t", "tdg", "id"],
    )
    model.add_all_qubit_quantum_error(
        depolarizing_error(0.01, 2), ["cx", "cz", "cy"],
    )
    model.add_all_qubit_readout_error(ReadoutError([[0.98, 0.02], [0.02, 0.98]]))
    return model
```

Freeze the transpiler seed, optimization level, and supported gate basis. Inspect resulting operations and fail if any physical gate is missing from the model. Use optimization level 0 for experiments intended to preserve displayed gate counts; record compiled counts as well. Added checks receive noise too.

Retain the existing thermal model as a separately versioned experiment: T1=100 microseconds, T2=80 microseconds, 50 ns one-qubit gates, 300 ns two-qubit gates. Maintain consistent units and validate T2 <= 2*T1. Do not mix rankings across noise versions.

### Protocol A: exact conditional state fidelity for manual checks

Use Aer density-matrix simulation immediately before terminal measurements. For an explicitly constructed state-preserving check, extract the payload density block rho_s for each true ancilla syndrome s after its final H gates. These blocks are unnormalized; their traces are the syndrome probabilities.

With an independent readout confusion matrix R, the retained state is:

```text
w_s = product over ancillas j of R_j[true_bit_j, reported_bit=0]
rho_keep_unnormalized = sum_s w_s * rho_s
p_keep = trace(rho_keep_unnormalized)
rho_keep = rho_keep_unnormalized / p_keep
F_post = <psi_ideal|rho_keep|psi_ideal>
```

This integrates readout mistakes on syndrome bits. Payload readout errors affect displayed measurement counts, not premeasurement state fidelity. State this distinction in the UI. If the announced model has correlated readout, use its joint confusion model rather than the independent product.

```python
import numpy as np
from qiskit.quantum_info import DensityMatrix, state_fidelity

def conditional_payload(joint_dm, n_data, n_ancilla, ideal, readout):
    # Contract: data occupy low-order qubits, ancillas high-order qubits.
    # joint_dm is saved after syndrome-basis rotations, before measurements.
    d = 1 << n_data
    matrix = np.asarray(joint_dm.data)
    kept = np.zeros((d, d), dtype=complex)
    for syndrome in range(1 << n_ancilla):
        weight = 1.0
        for j in range(n_ancilla):
            weight *= readout[j][(syndrome >> j) & 1][0]
        indices = slice(syndrome * d, (syndrome + 1) * d)
        kept += weight * matrix[indices, indices]
    probability = float(np.trace(kept).real)
    if probability <= 1e-12:
        return {"p_keep": 0.0, "fidelity": None}
    conditional = DensityMatrix(kept / probability)
    return {"p_keep": probability,
            "fidelity": float(state_fidelity(ideal, conditional))}
```

Validate the qubit-layout contract before calling this helper. It is not a generic Paulice decoder. Never divide unconditional fidelity by retention or silently clamp a large numerical inconsistency.

### Protocol B: Paulice's observable-specific stabilizer benchmark

Follow the documented stabilizer workflow for automatic checks. For n <= 5, enumerate all 2^n signed stabilizers, including identity, from the ideal Clifford state. For each nonidentity stabilizer, append its measurement-basis rotation, generate compatible Paulice checks, execute with Aer, apply the returned post-selection function, and calculate the signed retained expectation. Identity contributes exactly +1.

```text
F_stabilizer = (1 + sum of nonidentity signed expectations) / 2^n
p_keep = total kept shots / total executed shots over nonidentity settings
```

Calculate the unchecked counterpart using the same measurement settings. Retain per-setting counts, retention, generated checks, and costs. Report maximum circuit depth and ancilla usage, plus mean and maximum added two-qubit gates across settings.

Because automatic checks can differ between observables, label the result `paulice-observable-benchmark-v1`; it is an operational fidelity estimator, not proof of one common post-selected density matrix. Do not pool this metric with `conditional-state-fidelity-v1` in one level ranking. Comparisons of T count use Protocol A consistently, including its zero-T baseline; Protocol B independently fulfills the Paulice experiment requirement.

Canonicalize all measurement maps explicitly. Validate string/register ordering against known bit patterns before feeding Paulice's syndrome function. Keep shots only when every returned syndrome entry is zero. Reject a run as insufficient when any required observable has fewer than 256 retained shots. Preserve raw estimators and uncertainty; do not hide out-of-range statistical estimates by silently calling them exact fidelities.

Use 4096 shots per setting for final experiments and 1024 for practice. Sample-based practice results are not ranked. Fix all random seeds in reproducible runs; use deterministic `gamma`/`windowed` check selection. [Paulice tutorial](https://qiskit.github.io/qiskit-paulice/guides/low_overhead_error_detection_using_spacetime_codes.html), [syndrome API](https://qiskit.github.io/qiskit-paulice/apidocs/qiskit_paulice.checked_circuit.html)

### Manual-check construction

Represent each check by opening boundary, closing boundary, and a signed full-width opening Pauli P. Propagate it through the protected segment U to Q=U P U-dagger, preserving sign. Build ancilla H, controlled-P, the segment, controlled-Q, and ancilla H. The closing operation cancels the opening operation in a noiseless run.

At every T gate, the propagated local Pauli must be I or Z. A starting Z alone does not establish validity: intervening H or CX gates can change its support. Reject non-Pauli propagation. Implement negative closing signs with the corresponding phase on the control ancilla. Validate complete multi-check circuits, since individually valid placements can interact. Initially offer a catalog of jointly verified check combinations rather than arbitrary unchecked overlaps.

## 6. Scoring and result contract

Use `score-v1 = floor(1000 * F * p_keep + 0.5)`, retaining the repository's product score. Do not mix it with the previously proposed square-root retention score. The product rewards retained fidelity yield and can favor the unchecked circuit; this is a real outcome, not a failure to manufacture a win. Also show the fidelity/retention Pareto frontier.

All scores are calculated in Python from Qiskit results. In sampling mode, mark the score estimated and provide an uncertainty interval derived from reproducible resampling of each setting's outcome counts. Invalid/insufficient runs have null scores. Round only for presentation after retaining full-precision metrics.

```typescript
type RunRequest = {
  schemaVersion: 1;
  levelId: 1 | 2 | 3 | 4 | 5 | 6;
  variantId: string;             // server allowlisted payload/depth/protocol
  mode: "practice" | "benchmark";
  targetOrder: number[];
  checkCount: number;
  manualCheckIds: string[];      // server catalog, never executable code
};
type RunResult = {
  status: "ok" | "insufficient";
  engineVersion: string;
  benchmarkId: string;
  metricId: string;
  configurationHash: string;
  fidelityBefore: number;
  fidelityAfter: number | null;
  retention: number;
  retentionKind: "exact_probability" | "sample_fraction";
  shots: number;
  keptShots: number;
  score: number | null;
  scoreInterval: [number, number] | null;
  payloadDepth: number;
  checkedDepth: number;
  ancillas: number;
  addedTwoQubitGates: number;
  probabilities: Record<string, number>;
  idealAmplitudes: { basis: string; re: number; im: number }[];
};
```

For Protocol B, add a `settings` array with its individual costs and statistics. Exact retention and observed kept-shot counts are separate fields and need not match exactly.

## 7. ELI5 onboarding: actions, feedback, and completion

| Step | Explanation and action | Feedback and completion evidence |
|---|---|---|
| Qubit | “When we measure a qubit, we get 0 or 1.” Prepare zero, apply X, measure. | Histogram changes from zero to one; complete after both runs. |
| Superposition | “Quantum possibilities have phases that can combine or cancel.” Apply H, then H again. | First histogram is balanced; second returns zero. Show amplitude arrows, not a hidden classical coin. |
| Noise | “An unwanted change can disturb the computation.” Inject X into zero, then Z into plus. | X changes Z-basis results. Z needs an X-basis measurement, implemented by H before measurement. |
| Detection | “A helper can flag some bad runs.” Toggle an error that anticommutes with a check, then one that commutes. | Animate syndrome, discard bin, and an undetected error. Require identifying that “no alarm” does not prove no error. |
| Mitigation | “We use extra knowledge to improve an estimate.” Compare a noisy Z expectation with calibrated readout correction. | For symmetric flip p=0.1, use E_corrected=E_measured/(1-2p). Label finite-shot uncertainty and known calibration; no state repair occurs. |
| Correction | “We spread information into a code, read clues, and recover.” Inject one X error into a three-qubit repetition-code demonstration. | Show syndrome and recovery. State explicitly that this restricted code does not protect against arbitrary phase errors. |
| Low overhead | “A few helpers check the computation; extra checks also cost gates and discarded runs.” Compare zero/one/two checks. | Display fidelity, retained fraction, ancillas, and added gates together; select a trade-off explanation. |

Each widget uses the quantum engine or immutable Qiskit-generated fixtures with engine/version metadata. Animation is illustrative; numerical results are never invented in JavaScript. Explain that a shot is one preparation/execution/measurement, and a syndrome is a pattern of check results.

Add optional cards on stabilizers, surface-code locality, qLDPC checks, and why fault tolerance requires more than post-selection. These cards do not delay unlocking.

### Progress state and flow

```typescript
type IntroStatus = "not_started" | "in_progress" | "completed" | "skipped";
type Progress = {
  tutorialVersion: 1;
  introStatus: IntroStatus;
  completedSteps: string[];
  unlockOverride: boolean;
  completedLevels: number[];
};
const canPlay = (p: Progress) =>
  p.introStatus === "completed" || p.unlockOverride;
```

Flow: first visit -> intro in progress -> required widget actions and checks completed -> intro completed -> all main missions accessible. Recommended mission order is guidance, not a second lock.

Show “Skip Tutorial / Unlock All Levels” on the intro, level map, and locked-route screen. Activation sets `introStatus="skipped"` and `unlockOverride=true` atomically. Replaying the tutorial preserves access. Completion after skipping changes status to completed. Skipping never reduces score or eligibility. Only explicit Reset Progress relocks levels. Guard direct `/play/3` navigation after hydration without briefly rendering an unlocked page.

## 8. Circuit mechanics and wireframes

```text
Desktop
[Quantum Shield] [Learn] [Levels] [Experiments] [Accessibility]
[Mission + limits] [Circuit grid: qubits vertically, time horizontally] [Results]
[Allowed gates  ] [Payload operations + shaded check spans          ] [F before]
[Check palette  ] [Ancilla rows + syndrome readout                   ] [F after ]
[Hints          ] [Undo] [Redo] [Reset circuit] [Run]                  [Kept %  ]
                  [Baseline / Checked / Compare tabs]                [Cost    ]

Mobile
[Mission] [Build | Results | Compare]
[Scrollable circuit, fixed wire labels]
[Tap gate/check -> choose target -> choose boundary -> confirm]
[Run] [Undo] [Accessible circuit list]
```

Use SVG for the grid, Tailwind for layout, Lucide for labeled controls, Zustand for editor state, and accessible UI primitives for dialogs. Every drag action also has keyboard and tap alternatives. Minimum control target: 44 CSS pixels. Support reduced motion and non-color status cues.

```typescript
type Gate = {
  id: string;
  name: "h" | "s" | "sdg" | "sx" | "sxdg" | "x" | "z" | "cx" | "cz" | "rz" | "t";
  qubits: number[];
  column: number;
  quarterTurns?: number;
};
type EditorState = {
  mode: "benchmark" | "sandbox";
  revision: number;
  gates: Gate[];
  selectedGateId: string | null;
  targetOrder: number[];
  manualCheckIds: string[];
  undo: Gate[][];
  redo: Gate[][];
  runState: "idle" | "validating" | "running" | "success" | "error";
  requestRevision: number | null;
};
```

Validate gate arity, occupied wires, distinct control/target, allowlists, and boundary order before committing edits. Increment revision on every semantic edit. Mark existing results stale; accept an arriving response only for its captured revision. Cancel obsolete fetches, while acknowledging that cancellation may not stop server compute.

Show ideal complex amplitudes and their phases; show noisy probabilities and, for Protocol A, density matrices/reduced Bloch vectors. Never draw a mixed state as a unique statevector. For entangled states, explain that separate Bloch vectors omit correlations.

## 9. Verification and hackathon evidence

Implement and run these checks before Stage 2:

1. Bell/GHZ references match analytical targets; all ideal probabilities sum to one.
2. Every manual catalog combination preserves the noiseless target and reports zero syndrome.
3. A commuting injected error can escape; an anticommuting error in the protected span is detected.
4. Conditional density matrices have trace one and nonnegative eigenvalues within tolerance.
5. Exhaustive small density-matrix evaluation and high-shot estimates agree within declared uncertainty.
6. Paulice parity tests cover multiple classical registers and nontrivial measurement mappings.
7. Automatic T/RZ(pi/4) requests fail; invalid propagated T crossings fail.
8. Zero retained shots produce null fidelity/score, never a success badge.
9. Noise reaches ancillas and generated gates; T-family and depth comparisons share benchmark settings.
10. Complete, skip, replay, direct navigation, and reset flows behave as specified.
11. Keyboard-only circuit editing and 360-pixel-wide layout remain usable.

Use pytest for physics/contracts and Vitest plus Playwright for UI behavior. Add scripts so `python -m pytest tests/quantum tests/contracts`, `npm --prefix web run test`, and `npm --prefix web run test:e2e` execute the implemented suites. Keep the existing terminal demo functioning through the shared service.

Generate `docs/benchmark-results.json` with circuit/noise hashes, package versions, seeds, protocols, all metrics, and uncertainty. The notebook reproduces this file. The report explains detection versus mitigation/correction, methods, comparisons, limitations, and findings. The walkthrough demonstrates intro, skipping, one Clifford experiment, the T restriction, and a measured trade-off.

The PDF's judging weights are Presentation 40%, Effect 30%, Methods 20%, Qiskit 10%; they are not player-score weights. Prepare source, report, and recording materials for the required public-repository submission. Stage 1 is complete only when the physics tests and all six playable mission flows pass.
