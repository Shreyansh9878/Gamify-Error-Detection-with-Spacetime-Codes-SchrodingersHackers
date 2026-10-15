# LeetCode Workspace and Flight School 2 — Implementation Specification

**Status:** Implemented. See `docs/FLIGHT_SCHOOL_2_3_IMPLEMENTATION.md` for code locations and verification instructions.

**Revision:** 15 October 2026.

**Lesson ID:** `flight-school-2`.

**Lesson name:** **Detection vs. Mitigation vs. Correction**.

**Prerequisite:** Flight School 1 complete, or access already granted by existing tutorial skip/unlock rules.

## 1. Product intent and scope

Explain the three protection paradigms thoroughly, then let the learner compare them on a circuit and noise model they choose. The player edits a base experiment using a visual circuit or supported code, selects any technique, sees the actual circuit transformation and classical processing, and runs it. Techniques can be selected in any order, repeated indefinitely, and compared without destroying the base experiment.

Completion requires at least one successful execution of each technique. Do not impose a sequence, a required fidelity improvement, a particular input state, or a new mandatory quiz. Reading remains available beside the experiment.

This module adopts the workspace established for Flight School 1. Its editable payload is another **tutorial-only exception**: Missions 1–10 remain fixed and authoritative. Implement this module separately from Flight School 3; neither specification authorizes changes to Flight School 4–6, mission mechanics, deployment, accounts, or leaderboards.

### 1.1 Scientific promises

- Detection flags covered errors and filters shots. It does not repair those shots or guarantee that unflagged shots are clean.
- Mitigation estimates an observable using noisy measurements and post-processing. It does not produce a repaired density matrix or corrected single-shot state.
- This correction demonstration is a **restricted three-qubit repetition code**, not a universal code or fault-tolerant computation. Bit-flip mode corrects single X faults; its phase-flip variant corrects single Z faults. General noise and multiple faults can defeat it.
- None of these methods is guaranteed to improve every experiment. Default examples show benefits; counterexamples remain visible and educational.
- Keep state fidelity, observable-estimation error, sampling cost, and physical-qubit overhead distinct. Do not rank incomparable numbers as though all were fidelity percentages.

## 2. Workspace and interaction contract

Reuse `LearningWorkspace`, its responsive breakpoint, pane persistence, independent scrolling, keyboard/pointer splitters, focus styling, reduced motion, and mobile Theory / Experiment / Results tabs.

```text
Header: Back | 02 Detection / Mitigation / Correction | Lesson selector | Help | Skip
┌─────────────────────────────┬────────────────────────────────────────────────┐
│ THEORY & TASKS              │ EXPERIMENT                                     │
│ Description / Examples     │ Visual / Code | Run selected method | Undo/Redo │
│ What each method does      │ Editable base circuit A → noise → B            │
│ What it costs              │ Target wire / channel / strength / observable  │
│ What it cannot do          │ [Detection] [Mitigation] [Correction]           │
│                            │ Generated implementation + processing steps    │
│ Completion checklist       ├────────────────────────────────────────────────┤
│ ○ Detection                │ RESULTS                                        │
│ ○ Mitigation               │ Ideal | Unprotected noisy | Selected technique │
│ ○ Correction               │ State views where meaningful, observable error │
│                            │ Method chart + post-processing inspector       │
└─────────────────────────────┴────────────────────────────────────────────────┘
```

Default splits remain 36% theory / 64% work area and 60% experiment / 40% results, with Flight School 1's minimum widths and desktop breakpoint of 1100 px. On mobile, keep panes mounted, preserve drafts/scroll positions, and open Results after a successful run. Errors focus a useful message in Experiment.

### 2.1 Free technique selection

Provide three equally available buttons without ordinal numbers implying an order. Default to Detection, but leave all three enabled. Selection updates an **implementation preview**; Run Selected Method performs the actual simulation. Selecting a button alone never checks a completion box.

Switching techniques must not accumulate protections. Correction is not applied on top of an earlier Detection or Mitigation transformation. Every method starts from the same canonical base circuit/noise definition. An Unprotected Baseline view is available without becoming a fourth completion requirement.

Save the last run for each method with its experiment fingerprint. Side-by-side comparisons use only runs matching the current experiment; older runs say Previous Experiment. Global completion checkmarks remain earned after later edits. Repeat any technique as often as desired.

### 2.2 Editable base and visible transformations

Inside Experiment, distinguish:

1. **Base experiment — editable:** ideal gates and one explicit local noise boundary.
2. **Selected method — generated:** added ancillas, encoding/check/recovery gates, noise variants, and classical processing. This preview is read-only; technique settings regenerate it.

Mark additions with text/shapes, not color alone: Added Ancilla, Encode, Check, Recovery, Decode, Noise Copy, Classical Processing. Offer Original / Transformed views and a gate/resource difference summary. Processing is not a quantum gate and must not be drawn as one on a data wire.

## 3. Complete learner-facing description

Render substantial prose with diagrams, state examples, and Load Example actions. This copy is the baseline; do not collapse it into three tooltips.

### 3.1 Three different jobs

An error can change a circuit's answer. Detection asks, “Should we trust this run?” Mitigation asks, “Can several noisy experiments help us estimate a cleaner average?” Correction asks, “Can redundant quantum information and a syndrome tell us how to recover the encoded state?”

You define the preparation and error, then inspect what each method adds. The first two result columns show the ideal and noisy experiment. The third shows a retained state, estimated observable, or recovered logical state depending on the method. Those are different objects.

### 3.2 Error detection — notice and filter

Imagine checking a parcel's seal before accepting it. A broken seal tells you to reject that parcel; it does not repair the contents. A quantum check uses an ancilla, a temporary helper, to reveal a selected inconsistency without directly measuring all the data.

The helper starts in zero, receives H, interacts with the data through an opening controlled Pauli, and interacts again through a matching closing check. A final H and measurement produce a syndrome. A correctly closed noiseless check gives zero. A covered fault can change it to one.

Keep syndrome-zero shots and discard syndrome-one shots. The retained ensemble can be cleaner, but fewer useful shots survive. At retention r, collecting K accepted shots takes about K/r attempts on average. On real hardware the added gates can introduce errors too; here those gates are ideal so the filtering mechanism is clear.

A zero syndrome means “this check did not flag this run,” not “there were no errors.” A Z check detects X-like faults at the protected location but misses commuting Z faults. No single check catches everything.

**Try it:** use bit-flip noise on zero and a Z check. Inspect kept/discarded shots. Then use phase-flip noise on plus with the same check; switch to an X check and see why coverage matters.

### 3.3 Error mitigation — estimate a better average

Suppose a noisy thermometer's bias grows as conditions worsen. Several readings under controlled conditions may help estimate a reading without that bias. Zero-noise extrapolation uses a similar idea for quantum observable estimates.

An observable such as Z has outcomes +1 and −1. Its expectation is their average. Run the same intended experiment at amplified noise levels, then fit back to a zero-noise intercept. The executions remain noisy. The output is a classical estimate, not a healed qubit, new Bloch sphere, or corrected shot.

This sandbox amplifies the explicit noise channel by composing it 1, 3, and 5 times, leaving intended gates unchanged. Hardware ZNE may instead use noisy gate folding, such as G G† G. Adding noiseless inverse gates around an unrelated noise block would not amplify that block, so this lab does not pretend it does.

Extrapolation costs extra executions and can amplify sampling uncertainty. A fit can be biased or overshoot the physical observable range. Sometimes the estimate improves and sometimes it does not. Report that honestly rather than clipping a bad result into an attractive score.

**Try it:** measure Z on zero with bit-flip noise. Inspect three measured averages, the intercept, and ideal expectation. Change the fit or noise strength and compare estimation error and shot cost.

### 3.4 Error correction — encode, diagnose, recover

Correction adds redundancy before the error region. It does not copy an unknown qubit into three independent copies: information is encoded into correlations. In the bit-flip repetition code,

```text
α|0〉 + β|1〉  →  α|000〉 + β|111〉.
```

Two parity measurements reveal which single X fault occurred without measuring α or β directly. A classical decoder selects a recovery X on the indicated wire. Decode and compare the logical qubit with the intended state. Other data qubits, including an entangled partner, remain in the comparison.

Two X faults can look like one fault on the remaining wire, causing wrong recovery. This code also does not protect arbitrary phase errors. Its phase-flip variant changes basis to protect single Z faults instead. Neither variant simultaneously corrects every X, Y, Z, or relaxation error.

General QEC uses codes, repeated syndrome extraction, decoding/recovery, and fault-tolerant operations to protect against richer noise. This lab shows one ideal extraction/recovery round with a restricted code. A few extra gates do not make an arbitrary computation fault tolerant.

**Try it:** use bit-flip noise with the bit-flip code, then increase error probability. Compare phase noise with that code and with the phase-flip variant. Inspect the syndrome-to-recovery table rather than a fabricated repair animation.

### 3.5 Compare outputs and costs

| Question | Detection here | Mitigation here | Repetition correction here |
| --- | --- | --- | --- |
| Output | Conditional retained data state | Observable estimate | Decoded logical data state |
| Repairs flagged shots? | No | No | Attempts recovery of covered faults |
| Extra qubits | One check ancilla | None | Two redundancy wires + two syndrome ancillas |
| Extra sampling | Rejected shots | Three noisy variants | No syndrome-based rejection in this demo |
| Failure mode | Missed faults; no survivors | Bias, variance, overshoot | Wrong recovery; unsupported fault types |
| Inspect | Syndrome + acceptance filter | Noise scaling + fit weights | Encoding + syndrome + conditional recovery |

Changing the input can make an error harmless. Changing the observable can hide it. Always use the ideal result for the current experiment and distinguish exact simulator metrics from sampled estimates.

## 4. Canonical base experiment

### 4.1 Gates, placement, and bounds

- Allow 1–3 data qubits initialized in zero; default one wire and empty preparation.
- Gates: H, X, Y, Z, S, S†, RX, RY, RZ, CX; rotation angles [−2π,2π]. Limit to 16 columns and 64 preparation operations.
- Reuse Flight School 1's drag/drop, click/keyboard placement, inspector, arity/occupancy validation, explicit shrink confirmation, and at least 30 undo entries.
- Use one explicit local **noise boundary**, between columns, targeting one data wire. Boundary b is before column b and after all lower columns; b is 0–16 and never splits a CX.
- Label `A → noise → B`: A contains columns < b; B contains columns ≥ b. Both are editable, so a phase error can affect a later H without pretending a check covers the entire workload.
- Ideal reference is B∘A. Unprotected reference is B∘E∘A. Preparation/readout and protection gates are ideal by default. Columns do not introduce hidden waiting noise.

### 4.2 User-defined noise

| Channel | Parameters | Explicit action at the boundary |
| --- | --- | --- |
| Bit flip | p in [0,1], default 0.15 | (1−p)ρ + pXρX |
| Phase flip | p in [0,1], default 0.15 | (1−p)ρ + pZρZ |
| Depolarizing | d in [0,1], default 0.15 | (1−d)ρ + dI/2 on the named subsystem |
| Decoherence | t 0–200 μs; T1 20–200 μs; 0<T2≤min(2T1,400 μs) | Local zero-temperature thermal relaxation, defaults t/T1/T2 = 50/100/80 μs |

Distinguish a stochastic channel from Flight School 1's deliberately injected X/Z event. Show each parameter's meaning. Depolarizing follows Qiskit's convention above: d is not total nonidentity Pauli probability, which is 3d/4.

Keep one boundary to make comparisons and encoding placement precise. Multiple fault locations belong in Flight School 3. Do not simplify or relocate user operations silently.

### 4.3 Observable and samples

Choose an observed data wire and Z or X measurement; default q0/Z. Offer N=256,1024,4096 shots per execution variant, default 1024, seed 2026 and Resample. Global state metrics compare the full data register, not just the displayed reduced wire.

Document basis rotations, q(n−1)…q0 outcome order, exact probabilities versus finite counts, and local mixedness from entanglement. Derive marginal counts from the same joint samples.

## 5. Actual method transformations

### 5.1 Detection

Generate a check around **only the noise boundary**, after A and before B. The intervening ideal unitary is identity, so opening and closing Paulis match. Default P=Z; allow X/Y/Z choices to investigate coverage. Solving propagation is not a prerequisite here.

```text
data:  ── A ───── P ── E ── P ───── B ── data measurement
                  │         │
anc:   |0〉── H ──●─────────●── H ── M(s)
processing: s=0 → keep data outcome; s=1 → discard data outcome
```

The ancilla is the control. P targets the data; do not reverse that direction. Expose both H gates, both controlled Paulis, measurement, and the filter. Label ideal protection-gate/readout assumptions.

Construct the joint state with Qiskit, project the syndrome branches, and normalize s=0 only when its probability is nonzero. Apply B consistently to branch states. Sample one joint distribution for syndrome counts and kept data counts; enforce N_kept+N_discarded=N.

At exact retention zero, retained state/fidelity/observable are null and attempts per accepted sample are infinite. If exact retention is positive but sampled N_kept=0, exact conditional metrics may exist but sampled retained estimates are unavailable. Never invent a perfect result by dividing by zero.

### 5.2 Mitigation

Generate and expose all three variants:

```text
λ=1: A ── E ────────── B
λ=3: A ── E ─ E ─ E ─ B
λ=5: A ── E ─ E ─ E ─ E ─ E ─ B
                         measured averages → fit → zero-noise estimate
```

Use actual E^λ, not p multiplied by λ and clipped. For thermal relaxation with fixed T1/T2, this equals waiting λt. Derived durations may reach 1000 μs, while base input remains capped at 200 μs; validate generated variants accordingly.

No ancillas/recovery are added. Each variant uses N shots, so method cost is 3N, excluding separately labeled reference executions. Reuse the λ=1 sample as this run's noisy baseline; do not count it twice.

Default to ordinary least-squares linear extrapolation at λ=(1,3,5):

```text
E_hat(0) = (13/12) E_hat(1) + (1/3) E_hat(3) − (5/12) E_hat(5).
```

An advanced Quadratic option uses weights (15/8,−5/4,3/8). Show active fit, weights, measured values, curve, intercept, ideal expectation, and absolute estimation error. Expandable details show exact noisy expectations and the exact-input fitted intercept; the main estimate uses sampled outcomes.

For independent scale samples, estimate variance as `Σ w_i² s_i²/N`, where `s_i²=N(1−E_hat_i²)/(N−1)` for ±1 outcomes. Show an approximate normal 95% interval, labeled as a sampling approximation excluding fit bias; deterministic/boundary samples can make it misleading. Derive distinct reproducible seeds per factor. Do not reuse one sample across noise factors.

Never clamp estimates/intervals to [−1,1]. Extend chart axes and explain overshoot. The technique's state card says **No repaired state — classical observable estimate**. Keep ideal/noisy Bloch views and raw variant histograms; do not manufacture a mitigated density matrix, fidelity, or probability distribution from one observable.

### 5.3 Correction

Protect the **one selected noisy wire**, preserving spectator states and entanglement. Add two redundancy wires r1/r2 and two syndrome ancillas a0/a1. Peak physical width is n+4≤7, not 3n+2 and not a fictitious nine-qubit code.

After A, encode q/r1/r2 with CX(q,r1), CX(q,r2). Apply independent copies of the selected local channel, at identical parameters, to the three physical data wires. Helpers/protection gates remain ideal. Disclose that this creates three physical fault opportunities versus one in the unencoded baseline; equal local strength does not mean equal total fault count.

Measure s0=q⊕r1 and s1=r1⊕r2 using zero ancillas, data-controlled CX gates and Z readout. For ordered syndrome `(s0,s1)`:

| Syndrome | Single-X hypothesis | Active recovery |
| --- | --- | --- |
| 00 | None | Identity |
| 10 | Fault on q | X(q) |
| 11 | Fault on r1 | X(r1) |
| 01 | Fault on r2 | X(r2) |

Recover the **quantum conditional state**, not just majority-vote final classical counts. Decode with inverse encoding, trace out redundancy/helpers, then apply B. The full decoded data state has the reference's dimension and supports genuine state-fidelity comparison.

Phase-flip mode adds H on q/r1/r2 after encoding/before noise, then H on all three before ordinary parity extraction/recovery/decode. Visually expose these gates; do not simply relabel X recovery as Z without changing the circuit.

Use exact Qiskit syndrome projection branches, conditional recovery and branch recombination. The native export uses actual syndrome measurements and classical `if_test` recovery. Branch enumeration is acceptable for simulation only if it matches that physical circuit and displayed decoder table.

Default to the bit-flip family; let users switch freely. For phase noise in bit-flip mode, Y, depolarizing, or decoherence, execute the real selected circuit and show limitations. Never substitute a perfect channel. No syndrome shots are discarded in correction mode.

### 5.4 Resource accounting

Compute added/peak qubits, added one/two-qubit gates, transformed depth, variant count and shot budget from generated circuits. Distinguish channel locations from hardware gates and exclude barriers from depth. Detection's 1/r is acceptance overhead; ZNE's 3N is execution budget; correction adds wires/gates. Do not collapse them into one unlabeled multiplier.

The ideal state is an exact simulator reference, with zero sampled shots by default; do not describe it as a noiseless hardware run. Detection/correction each sample N baseline shots plus N selected-method shots, for 2N total comparison executions. ZNE samples 3N in total because its factor-one sample is the baseline. Report `methodShots`, `baselineShots`, `reusedBaselineShots`, and `totalComparisonShots` explicitly. Additional optional ideal-reference sampling, if offered later, must be labeled and included rather than hidden. This teaching comparison uses equal shots per variant, not an equal-total-budget claim of superiority.

## 6. Results and processing inspector

Always align three semantic columns, stacking them on phones:

| Column | Required content |
| --- | --- |
| Ideal | Final ideal reduced Bloch view, global purity, probabilities and exact observable expectation. Ideal fidelity with itself is 1 by definition, not a measured achievement. |
| Unprotected noisy | Same boundary/basis/register, global fidelity with ideal, probabilities, counts, sampled/exact expectation and error against ideal. |
| Selected technique | Detection: retained state; correction: decoded logical state; mitigation: classical estimate with explicit absence of a repaired state. |

Use paired/triple state scales consistently. Selected-qubit changes affect the view only. The displayed ideal target is derived from the user's A/B circuit rather than hardcoded zero, plus, or Bell. If the chosen state/observable is insensitive to the noise, say so using returned metrics.

For all methods, report observable estimation error `abs(E_estimate−E_ideal)` and improvement relative to the noisy estimate, including negative improvement. State fidelity is available only for actual state outputs. Do not infer fidelity from one observable or a small histogram.

### 6.1 Detection panel

Show syndrome probabilities, integer kept/discarded histogram, exact retention r, sampled acceptance N_kept/N, 1/r, actual N and accepted count. Provide a target-accepted-sample control K=100,1000,10000 and calculate expected attempts ceil(K/r); this is a prediction, not an automatic unbounded sampling loop.

The processing inspector shows the actual rule, branch counts, accepted data counts, normalization denominator and selected observable's retained estimate. Empty sampled subsets are explicit. Do not call syndrome zero a proof of correctness.

### 6.2 Mitigation panel

Show three noisy distributions/expectation samples, the fit chart and numerical weights, extrapolated value and approximate uncertainty. Use graph styling to separate measured points, fitted curve, extrapolated intercept and ideal reference. Include N per factor, 3N total and any separately counted baseline/reference sampling.

The processing log is generated from that run's measurements, not canned example values. A result outside the observable range or worse than baseline remains visible with a helpful explanation.

### 6.3 Correction panel

Show the measured syndrome distribution, exact branch probabilities, recovery decision per syndrome and unconditional decoded data state. Include the code-family limitation and number of added wires/gates.

Do not claim a measured syndrome identifies the true fault history uniquely. Label it Decoder Hypothesis. With multiple physical faults, the same syndrome can imply a wrong recovery. Distinguish the optional simulator's known fault model from information available to a real decoder.

In Qiskit a two-bit register displays s1s0, while the teaching table uses `(s0,s1)`. Convert explicitly: table 10 → displayed register 01, table 11 → 11, table 01 → 10. Never index recovery gates using an unexplained reversed bitstring.

## 7. Editable code, generated Qiskit, and model contract

### 7.1 One canonical experiment

Use a dedicated protected-lab model; do not widen mission `RunRequest` or change the working Flight School 1 schema/API.

```json
{
  "schemaVersion": 1,
  "qubits": 2,
  "operations": [
    {"id":"h0","role":"prepare","name":"h","qubits":[0],"column":0},
    {"id":"cx0","role":"prepare","name":"cx","qubits":[0,1],"column":1}
  ],
  "noise": {"channel":"bit_flip","targetQubit":0,"boundary":2,"probability":0.15}
}
```

Preparation rotations add `angleRadians`; channel-specific fields are exclusive. Depolarizing uses `strength`; decoherence uses `timeUs`, `t1Us`, `t2Us`. Enforce unique operation IDs, valid targets/arity, no shared-wire column collisions, and exactly one noise definition. Unknown fields/instructions are rejected.

Method settings are separate from this base model:

```text
technique: detection | mitigation | correction
detectionPauli: X | Y | Z
correctionFamily: bit_flip | phase_flip
zneFit: linear | quadratic
observable: {qubit, basis: X | Z}
shotsPerVariant: 256 | 1024 | 4096
sampleSeed: 0..2147483647
```

### 7.2 Safe supported source

The editable tab uses an app-defined, Qiskit-backed subset, clearly labeled rather than advertised as arbitrary hosted Python:

```python
from quantum_shield import ProtectionCircuit

qc = ProtectionCircuit(2)
qc.h(0, at=0)
qc.cx(0, 1, at=1)
qc.noise("bit_flip", qubit=0, probability=0.15, boundary=2)
```

`ProtectionCircuit`, `noise`, and `at` belong to the teaching wrapper, not native Qiskit. Ordinary gate signatures match Flight School 1. `noise` is one declarative call with a literal channel string, named wire/boundary and the channel's parameters; no repeated or dynamic noise declarations. A phase channel uses `phase_flip`, depolarizing uses `depolarizing` plus `strength`, and relaxation uses `decoherence` plus `time_us`, `t1_us`, `t2_us`.

Reuse the allowlisted AST approach: recognized wrapper import, optional `from math import pi`, one `qc` constructor, gate calls, bounded numeric arithmetic and one noise declaration. No arbitrary imports, execution, file/network I/O, loops, functions or attribute chains. Cap at 8 KiB, 128 lines and 2048 AST nodes. Return line/column diagnostics and preserve invalid source.

Apply is one atomic undoable edit. Run in Code parses/applies that exact source first and never falls back to an older circuit after failure. Switching to Visual with unapplied text requires Apply or Discard before conflicting edits. Selecting a technique may show a preview of the last valid model, labeled as such, but cannot silently execute it while source is unapplied.

### 7.3 Generated native implementation

Provide a separate read-only Native Qiskit / Processing tab for the active method and a standalone export. Use actual Qiskit 2+ `QuantumCircuit` operations, Aer channel instructions, measurements and conditional recovery where relevant. Never emit nonexistent native `.noise()`/`.bit_flip()` methods.

The export must contain the base reference, unprotected experiment, transformed execution(s), parameter units, seed/shot choices, observable basis rotation and actual classical processing. Detection exports its filter; mitigation exports all factors and fit calculation; correction exports encoding, syndrome bits, `if_test` recovery and decoding. Annotate generated additions and the protected boundary. These programs run in the learner's own environment, not through arbitrary server execution.

## 8. Backend architecture and API

Suggested responsibilities:

```text
src/components/flight-school-2/
  ProtectionLab.tsx            draft, technique selection, progression
  BaseExperimentEditor.tsx     visual/source editor adapter
  TechniquePreview.tsx         circuit differences and generated code
  ProtectionTelemetry.tsx      aligned result columns
  ProcessingInspector.tsx     filter, fit, decoder detail
src/lib/flight-school-2/
  contracts.ts  content.ts  examples.ts  code-generation.ts
backend/protection_lab/
  models.py  code_parser.py  transforms.py  simulator.py  service.py
```

Reuse suitable workspace/canvas/parser primitives without coupling new contracts to fixed missions. Keep method implementations modular and testable. Use Qiskit density matrices for mixed states, Qiskit reduced states/state fidelity, Aer Pauli/depolarizing/thermal channels and actual syndrome branch calculations. No client-side fabricated improvement multipliers or recovery percentages.

| Endpoint | Request | Required behavior |
| --- | --- | --- |
| POST `/api/tutorial/protection-lab/compile` | `code` | Canonical base model or line/column diagnostics |
| POST `/api/tutorial/protection-lab/preview` | `experiment`, method settings | Validated circuit IR/diagram, native code, processing recipe and resources; no earned completion |
| POST `/api/tutorial/protection-lab/run` | Base model + method + observable + N + seed | Ideal/noisy/output metrics, method evidence, generated implementation, processing results |

Run validates the model independently of Compile or Preview. The server generates all protection circuits; do not accept a client-supplied corrected state, fit intercept, decoder output, score, or resource count as authoritative.

A run returns:

```text
runId, contentVersion="protection-basics-v1", engineVersion
experimentFingerprint, settingsFingerprint, technique, status
ideal, baseline: reduced states/global purity/fidelity/probabilities/counts/expectations
outputKind: retained_state | observable_estimate | decoded_state
output: actual state metrics OR observable estimate/fit/uncertainty
syndrome: probabilities/counts/ordering, where applicable
resources, processingSteps, warnings, durationMs, seed metadata
```

Do not send full joint density matrices in ordinary responses. Nullable fields must distinguish Not Applicable, No Surviving State, and Not Yet Run. Finite-shot counts and exact branch metrics are separately labeled.

Keep the existing 16 KiB body cap, compute enable flag, admission guard and useful 422/429/503 responses. Bound expanded width to seven physical wires, three ZNE variants and N≤4096 per variant. Do not densify an unbounded encoded register. Bound generated artifacts and operation counts; code/gate input limits are checked before expansion.

Changing drafts/settings marks results stale and invalidates pending responses. Use cancellation or sequence tokens across both preview and run. A late response must neither replace new results nor earn completion for a superseded draft. Failures restore controls and preserve experiments/source.

## 9. Examples, completion, and persistence

### 9.1 Editable examples

| Preset | Base experiment | Learning purpose |
| --- | --- | --- |
| Default comparison | Zero, X-channel p=0.15, Z observable, noise before final boundary | All three may improve their respective output metrics; inspect different costs |
| Hidden phase | H → phase channel → final Z or X measurement | A histogram can hide phase damage; choose the right observable/check/code |
| Phase becomes an answer | H → phase channel → H | Later gates turn relative phase into Z-output error |
| Entangled data | H(q0), CX(q0,q1), noise on q0 | Protect a subsystem without measuring away the encoded amplitudes or entanglement |
| Imperfect correction | Bit-flip p=0.6 | Repetition can be worse; multiple faults defeat the decoder |
| Relaxation | Prepare one or plus, thermal wait | Restricted detection/correction and ZNE need not perfectly undo general noise |

Loading is one undoable edit. Do not auto-run all techniques, change a chosen observable secretly, or lock users into a preset.

For independent X-channel probability p, bit-flip repetition's logical error is `3p²−2p³`; use this as a regression expectation, not as a replacement for actual circuit simulation. At p=0.15 it is 0.06075 versus baseline 0.15. With default zero/Z input and ideal Z detection, exact retention is 0.85 and retained fidelity is 1. These are special-case checks, not promises for every input/channel.

### 9.2 Completion

```text
triedDetection  = at least one accepted successful detection run
triedMitigation = at least one accepted successful mitigation run
triedCorrection = at least one accepted successful correction run
moduleComplete = triedDetection && triedMitigation && triedCorrection
```

Runs may occur in any order, on the same or different valid circuits; recommend the same experiment for meaningful side-by-side comparison without forcing it for completion. Repetitions remain allowed. Count only returned results still associated with the accepted request. Preview clicks, failed/invalid/busy runs, or discarded late responses do not count. A successful detection run with zero survivors counts as trying detection, but shows no retained-state metrics.

No mandatory MCQ is added. On completion, offer **Continue to Flight School 3** and **Experiment More**. Completing this module does not mark all flight school complete or newly unlock every mission. Preserve any access previously granted by Skip Tutorial / Unlock All Levels.

Profiles whose existing step/completion/skip state already grants later modules retain that eligibility. Offer the revised checklist on revisit without forcing a new completion gate onto previously unlocked content.

### 9.3 Local storage and integration

Use validated, versioned local keys:

- `quantum-shield.flight-school-2.draft.v1`: base experiment, unapplied source, editor/view/technique settings, observable and shots/seed.
- `quantum-shield.flight-school-2.progress.v1`: content version, tried-method flags, completion and bounded method/run evidence.
- Reuse `quantum-shield.workspace.v1` for pane preferences.

Do not store large states/circuit histories indefinitely. Existing `quantum-shield-qed-v2` remains the global progression adapter; do not insert ad hoc fields that invalidate its current schema, reset personal bests, or revoke a skip state. Update only the relevant tutorial step through existing callbacks when continuing. Corrupt module drafts reset only this module; unavailable storage keeps session state with a notice.

## 10. Future implementation order and acceptance

1. Verify existing workspace/progression contracts and Qiskit runtime versions.
2. Add isolated base/noise schemas and source parsing, then test A/noise/B ordering.
3. Implement true detection branches, repetition encoding/recovery/decode, and ZNE channel composition/fit independently.
4. Add editable base and read-only method transformations/code, using one canonical experiment.
5. Build aligned state/estimate panels, resource accounting and processing inspector.
6. Add free-order technique execution, examples, completion evidence and safe persistence.
7. Verify desktop/mobile and all existing mission/tutorial regressions. Stop at the approved module scope.

Required future regressions:

- Every technique is selectable initially, rerunnable, and independent of the prior active technique.
- Arbitrary supported preparations and later gates determine the ideal result; no hardcoded target.
- Detection flags anticommuting Pauli faults, misses commuting faults, preserves noiseless data, and handles exact/sample zero retention without NaN or invented fidelity.
- ZNE executes E, E³, E⁵; validates p endpoints without multiplication/clipping; thermal composition agrees with λt; both fits reproduce known constant/linear/quadratic test functions appropriately.
- ZNE uses sampled estimates, reports variance/total shots, preserves overshoot, and never returns a fake mitigated state.
- Repetition recovers arbitrary single-X faults in bit-flip mode and single-Z faults in phase mode, including inputs entangled with a spectator. Double faults and unsupported noise must not be “magically” corrected.
- Syndrome bit order matches recovery; independently simulated circuits and exported programs agree. Bit-flip logical error matches 3p²−2p³.
- All samples sum to declared budgets; resources match generated gates/wires; methods with different costs are labeled honestly.
- Visual/source round-trips preserve gates, roles, placement and noise. Malformed/arbitrary code cannot execute; dirty drafts survive errors and tab changes.
- Only successful, current results earn method checkmarks. Editing, resets and resampling do not erase earned completion.
- Mobile tabs, splitters, keyboard alternatives, focus, stale results, storage recovery, personal bests and existing skip access remain usable.

Future verification commands are `pytest tests`, `pnpm typecheck`, `pnpm test`, the relevant desktop/mobile browser journeys and `pnpm build`. **This revision is documentation only: do not change application code or run application/test suites as part of preparing this specification.**

## 11. References and interpretation

- [Martiel & Javadi-Abhari, Low-overhead error detection with spacetime codes](https://arxiv.org/html/2504.15725v1), including supplementary discussion of detection versus mitigation/correction. This supports the later check-design context; the three-technique sandbox is an authored teaching design.
- [IBM Quantum: error mitigation and suppression techniques](https://quantum.cloud.ibm.com/docs/en/guides/error-mitigation-and-suppression-techniques), for ZNE as observable estimation using noise amplification and extrapolation, with no guarantee of unbiased improvement.
- [IBM Quantum: repetition-code introduction](https://qiskit.qotlabs.org/learning/courses/foundations-of-quantum-error-correction/correcting-quantum-errors/repetition-codes), for classical repetition intuition; quantum amplitude-preserving encoding/syndrome/recovery must be implemented as specified above, not replaced by classical majority voting.
- [Qiskit Aer thermal relaxation](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.thermal_relaxation_error.html), for valid T1/T2/time conventions.

The unresolved `[cite: ...]` markers and fabricated example telemetry from the earlier draft are removed. All displayed run results must come from the user's actual experiment.
