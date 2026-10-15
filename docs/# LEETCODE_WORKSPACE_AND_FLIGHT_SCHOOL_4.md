# LeetCode Workspace and Flight School 4 — Implementation Specification

**Status:** Implementation-ready design. This revision changes documentation only; no application implementation is authorized by this document itself.

**Revision:** 15 October 2026.  
**Lesson ID:** `flight-school-4`.  
**Lesson name:** **Multi-Qubit Pauli Propagation & Entangling Checks**.  
**Prerequisite:** Flight School 3 complete, or access already granted by the existing skip/completion rules.  
**Next lesson:** Flight School 5 — The T-Gate Barrier & Commutation Rules.

## 1. Intent, scope and decisions

Extend the working Flight School 3 experience from single-wire evolution to products on several wires. The learner assembles a physical check around CX, discovers why one closing tap is insufficient, then authors Clifford circuits and multiwire checks in an editable sandbox.

Reuse the established visual/code workbench, signed propagation, full-schedule validation, explicit faults and retained-state comparisons. This is a tutorial-only editable-payload exception. Main missions remain fixed and authoritative. Do not change Flight Schools 1–3, mission scoring, research protocols, accounts, leaderboards or deployment.

Resolve these ambiguities in the original draft:

- A multiwire Pauli **product** is one check extracted with one ancilla and several controlled taps. It is not one syndrome bit per product factor.
- Keep the S-gate question in Flight School 3. Flight School 4 may offer it as an optional recap, but must not require it again or modify that lesson's certification.
- Require an accepted guided noiseless run, not merely a green preview. Completion also requires a valid sandbox fault run and the new CX question.
- Save detailed evidence under isolated lesson keys. Do not add incompatible fields to `quantum-shield-qed-v2`.
- Completing Flight School 4 opens Flight School 5. It does not graduate the player or unlock a separate subset of missions.

Use **Coherent Pauli Check (CPC)** throughout.

## 2. Shared workspace and interaction contract

Reuse `LearningWorkspace` and the current lab navigation. Default desktop split is 36/64 horizontally and 60/40 within the right side; breakpoint is 1100 px. Preserve constrained pointer/keyboard splitters, pane scrolling, layout restore, focus indicators and reduced motion.

```text
Header: Back | 04 Multi-Qubit Propagation | Lesson selector | Help | Skip
┌──────────────────────────────┬─────────────────────────────────────────┐
│ THEORY                       │ EXPERIMENT                              │
│ Description / Examples /     │ Guided CX / Custom Sandbox              │
│ Knowledge Check              │ Visual circuit / Code                   │
│                              │ Input prefix + payload + physical check │
│ Explanation and diagrams     │ Manual products, fault tools, Run       │
│ Tasks and achievement list   ├─────────────────────────────────────────┤
│                              │ RESULTS                                 │
│ Continue when complete       │ Operator trajectory and validity        │
│                              │ Joint syndromes, counts, data states    │
└──────────────────────────────┴─────────────────────────────────────────┘
Mobile: Theory / Experiment / Results tabs, retaining each pane's state.
```

Run, undo/redo and mode controls belong in the experiment toolbar. Run success opens Results on mobile. Validation/input errors focus readable Experiment feedback. A visible **Skip Tutorial / Unlock All Levels** action remains available at all times.

Never rely on color alone:

| Status | Visible meaning |
| --- | --- |
| Amber — incomplete | A physical H, tap or measurement is missing |
| Red — mismatch | The selected closing product/sign does not match evolution |
| Red — schedule conflict | Individually matching checks fail combined execution |
| Green — invariant closed | Valid input-independent construction, not guaranteed error coverage |
| Orange — injected error | An explicit fault, distinct from an intentional payload gate |

## 3. Learner-facing Description content

The following text is intended for the learner, not developer instructions.

### 3.1 One check can grow onto several wires

A controlled-NOT, also called CX, flips its target when its control is one. It also changes how a Pauli operator moves through a computation.

Imagine a check as a pattern that must look the same before and after the workload, once we account for the workload's action. An entangling gate can spread that pattern onto a second wire. Closing only the original wire leaves the pattern unfinished.

We need `P′ = U P U†`, or equivalently `P′ U = U P`. These are identities for every data input. Matching the counts of one input is not enough.

### 3.2 CX rules, with control c and target t

Use wire-labeled products to avoid tensor-order confusion:

| Before CX | After CX | Closing taps |
| --- | --- | --- |
| X on c | X on c times X on t | Controlled-X onto both data wires |
| Z on t | Z on c times Z on t | Controlled-Z onto both data wires |
| Z on c | Z on c | Controlled-Z onto c only |
| X on t | X on t | Controlled-X onto t only |

The control-Z and target-X operators do not spread in these examples. A check does not automatically get heavier whenever it crosses CX.

For CX(0,1), an opening X0 becomes X0 X1. An opening Z1 becomes Z0 Z1. The order of applying gates still runs forward in time; the phrase “Z spreads to the control” is not information traveling backward in time.

### 3.3 One product, one ancilla

```text
time →       opening             CX payload          closing product
q0: ─────────── X ──────────────────●────────────────── X ───────────
                │                  │                   │
q1: ────────────│───────────────────⊕───────────────────│── X ───────
                │                                      │  │
a0: |0〉── H ───●──────────────────────────────────────●──●── H ─ M
```

Every check tap uses the ancilla as control and the indicated data wire as target. The two closing taps implement the product X0 X1. They share one ancilla, which produces one syndrome bit. Extra factors require extra controlled interactions and therefore more check-gate overhead.

A correct noiseless check returns syndrome zero. A wrong product can produce false alarms even without an error. It need not return one on every shot: a wrong check can even look harmless on a particular input.

### 3.4 CZ and SWAP

CZ is symmetric between its two data wires:

```text
CZ: X0 → X0 Z1       X1 → Z0 X1
    Z0 → Z0          Z1 → Z1

SWAP(0,1): X0 → X1   Z1 → Z0
```

SWAP moves the support to the other wire. It does not itself mean “duplicate the operator.” In the resource panel, distinguish one logical SWAP from its three-CX decomposition.

### 3.5 Products and signs

Propagate the complete product, including its sign. Through CX(0,1), X0 Z1 becomes −Y0 Y1. Dropping the minus sign changes the relative phase in the controlled check. The implementation represents a negative closing product with positive-axis controlled taps plus a visible Z on the ancilla before its final H.

A longer circuit can spread a one-wire operator into a larger product, move it, or shrink it again. Follow every gate and every wire, rather than guessing a closing operator from the final state.

### 3.6 Validity and coverage are different

A closed check preserves the noiseless workload. It does not detect all errors. A fault is flagged when it anticommutes with the check's operator at the fault's actual location and time.

Try a Z fault on either output wire of a closed X0 X1 check. Then try an X fault there. Compare the no-fault reference, the faulted syndrome and the data state. An unflagged fault can still change the data, and a flagged fault can happen to leave the chosen input unchanged.

Post-selection keeps only all-zero syndrome shots. With several checks, use their joint syndrome distribution; their acceptances need not be statistically independent.

## 4. Guided CX exercise

### 4.1 Authoritative fixture

- Two data wires q0, q1; input |00〉; no editable preparation.
- One fixed payload gate `CX(0,1)` at column 2.
- One ancilla a0, opening boundary 1 and closing boundary 3.
- No stochastic hardware noise. Helpers, readout and payload are ideal.
- Explicit faults default off.
- Opening/closing H and measurement begin unplaced, as in Flight School 3.
- Data gates are visibly locked. Code compilation and server validation enforce this fixture.

### 4.2 Player sequence

1. Place opening ancilla H.
2. Attach opening controlled-X onto q0.
3. Inspect X0 → CX(0,1) → X0 X1.
4. Select closing X on q0 first. Show the missing q1 factor as red feedback.
5. Add closing X on q1 using an independent per-wire selector.
6. Add final ancilla H and syndrome-Z measurement.
7. Run the complete noiseless assembly.

Allow steps to be revisited and undone; do not enforce a brittle click order. A complete wrong product is runnable as **Run Invalid Check — Diagnostic**. Incomplete physical readout is not runnable. A valid guided run predicts P(s=0)=1 exactly, with all N sampled shots accepted.

The guided achievement requires opening X0, closing +X0 X1, complete readout, the fixed payload, no enabled fault, whole-schedule validity and a current accepted successful run. Loading supported source is a legitimate alternative to clicking.

Only this achievement opens the new sandbox for a first-time learner. Already granted access remains intact. Do not auto-switch modes or erase the guided draft.

## 5. Editable sandbox

### 5.1 Bounds and editor

| Item | Bound / behavior |
| --- | --- |
| Data wires | 1–4, default 2 |
| Check ancillas | At most 2; distinct ancilla per check; maximum 6 physical wires |
| Gate palette | H, X, Y, Z, S, S†, CX, CZ, SWAP |
| Preparation | Separate prefix outside all check windows; ≤16 gates |
| Payload | Columns 0–15; ≤64 preparation + payload gates combined |
| Check windows | Opening 0–15; closing 1–16; start < end |
| Products | At most one nonidentity X/Y/Z factor per data wire, up to four factors |
| Fault events | One by default; optional Combine Faults up to four ordered events |
| Generated schedule | ≤160 logical instructions, including syndrome readout |
| Sampling | 256 / 1024 / 4096 shots; default 1024; bounded integer seed |

T gates and arbitrary rotations are not part of this lab. The wire-count increase and SWAP/Y-fault support require new bounded tutorial contracts; the existing shared models currently cap wires at three. Do not widen mission models or silently change Flight School 3's limits.

Use click/keyboard placement and drag/drop. Two-wire gate inspectors expose distinct control/target or SWAP endpoints. Moving a gate must preserve occupancy rules; reject same-wire endpoints and collisions atomically.

Shrinking the circuit lists affected preparation gates, payload gates, check factors and faults before an explicit undoable removal. Never silently move a check/fault to q0.

### 5.2 Check designer

Each check owns its own ancilla, interval, opening product, closing product, sign and physical H/H/M flags. The **No factor (I)** selector omits a tap; an all-identity product is not a nontrivial check and cannot earn evidence.

Show expected and selected products both as wire chips and a canonical Qiskit label. Qiskit labels are q(n−1)…q0; the learner-facing chips are q0, q1, … . Thus X0 on two data wires has label IX, not XI.

Manual selection is the default. **Fill Expected Closing** is an explicit, undoable hint. A signed answer fills both factors and sign compensation. No hidden automatic correction or progress for a preview.

### 5.3 Faults and timing

Support deterministic bit_flip/X, pauli_y/Y, phase_flip/Z and a zero-temperature decoherence wait. Waiting controls use t=0…200 μs, T1=20…200 μs, 0<T2≤min(400,2T1) μs; defaults t=50, T1=100, T2=80.

At boundary b, apply:

1. Explicit faults in their order.
2. Closing checks in reverse stable-ID order.
3. Opening checks in stable-ID order.
4. Payload gates at column b.

This preserves Flight School 3 semantics: an opening-boundary fault is outside the new check; a closing-boundary fault is inside it. Fault order at each boundary is unique, 0–3. Global phase of a deterministic Y channel does not affect density evolution, but signed Pauli propagation still matters for controlled check construction.

A channel is simulated as a channel, not assigned a fictitious unique propagated Pauli. Zero waiting time is allowed but is not a nontrivial completion experiment.

## 6. Physics, validation and results

### 6.1 Validation engine

Use Qiskit 2+ `Clifford` and `Pauli.evolve(..., frame="s")` for U P U†. Include SWAP and the sign of multiwire products. Do not compute P′ from a Statevector or from the selected preparation.

For all complete checks, validate the combined noiseless helper-zero isometry against the intended payload acting on every data basis input, up to one global phase, residual tolerance 1e−8. Exclude preparation from this operator-identity test. Local signed matches are necessary but not sufficient when checks overlap.

Retain independent fields: structureComplete, localOperatorMatch, scheduleValid, valid, residual, missing stages and per-check trajectories. An incomplete assembly is not a valid green check.

### 6.2 Actual simulation

Use coherent joint density-matrix evolution with explicit syndrome branch projection. The check circuits remain ideal in this lesson, with selected explicit faults/channels only.

Return exact no-fault and faulted joint syndrome probabilities and sampled counts from one joint distribution per variant. Derive data marginals, N_kept and N_discarded from the same samples. Never multiply per-ancilla keep rates to invent joint acceptance.

Compare ideal payload, unprotected faulted payload, checked before filtering and retained output. Fidelity is full-data state fidelity against the current ideal target, not the mean of single-qubit fidelities. Bloch spheres show reduced states; local mixedness can reflect entanglement. At zero retention, retained state/fidelity are null and expected sampling overhead is infinite.

Report exact r, empirical N_kept/N, 1/r, physical and added qubits, logical gate counts, compiled CX-equivalent entangling count, depth and generated native Qiskit. Show the basis used for sampled data counts. A display resample changes counts/seed, not exact probabilities.

### 6.3 Trace and coverage

Trace selected X/Y/Z faults through the full physical check schedule, not just the data payload. A coverage sweep evaluates X/Y/Z on each data wire at boundaries 0…16, at most 204 probes. Use Clifford propagation to helper measurement bits for this ideal Clifford case; cross-check fixtures against explicit runs.

These are educational diagnostics, not mission scores or hardware predictions.

## 7. Examples and knowledge check

All theory examples are viewable before sandbox access; loading an editable preset respects access and dirty source.

| Example | Payload / task | Expected physics |
| --- | --- | --- |
| Control X spreads | CX(0,1), opening X0 | Closing +X0 X1 |
| Target Z spreads | CX(0,1), opening Z1 | Closing +Z0 Z1 |
| No spread | CX(0,1), opening Z0 or X1 | Same single-wire closing |
| CZ spreads differently | CZ(0,1), opening X0 | Closing +X0 Z1 |
| Moving support | SWAP(0,1), opening X0 | Closing +X1 |
| Sign matters | CX(0,1), opening X0 Z1 | Closing −Y0 Y1, ancilla Z compensation |
| Three-wire chain | CX(0,1), CX(1,2), opening X0 | Closing +X0 X1 X2 |

**Required MCQ — CNOT Multi-Wire Propagation**

You place an opening X check on control q0 before CX(0,1). Which closing configuration matches the propagated operator?

- A) X on q0 only.
- B) Z on q1 only.
- C) X on q0 **and** X on q1.
- D) Z on q0 and Z on q1.

**Correct: C.** CX X0 CX† = X0 X1. Both closing taps share one check ancilla. A correct product prevents construction-related false alarms in a noiseless circuit; detection of injected faults is a separate question.

Allow unlimited retries, explanatory feedback and a persisted correct submitted answer. The S X S† = Y question is an optional link back to Flight School 3; it neither gates this lesson nor awards that lesson's certification.

## 8. Models, APIs and editable source

### 8.1 Canonical draft

Create `EntanglingDraft`, isolated from the mission and three-wire check-lab schemas. Preserve the Flight School 3 field names, with four-wire bounds and added SWAP/Y-fault enum values:

```json
{
  "schemaVersion":1,
  "mode":"guided",
  "dataQubits":2,
  "preparation":[],
  "payload":[{"id":"cx0","role":"prepare","name":"cx","qubits":[0,1],"column":2}],
  "checks":[{
    "id":"c0","ancilla":0,"startBoundary":1,"endBoundary":3,
    "openingHadamard":true,"openingTaps":[{"qubit":0,"pauli":"X"}],
    "closingTaps":[{"qubit":0,"pauli":"X"},{"qubit":1,"pauli":"X"}],
    "closingSign":1,"closingHadamard":true,"measure":true
  }],
  "combineFaults":false,
  "faults":[]
}
```

The inherited `role:"prepare"` is a legacy intentional-gate tag; membership in preparation versus payload controls timing. Explicit faults remain separate records. Reject unknown fields, duplicate IDs/targets, invalid arities, out-of-range wires/columns, reused ancillas and unsafe resource sizes. Empty factors/build flags remain valid incomplete drafts, but not runnable complete checks.

Run settings are separate: faultsEnabled, observable {qubit,basis X|Z}, shotsPerVariant, sampleSeed. Settings participate in result fingerprints; they do not silently change the physical draft.

### 8.2 Source contract

Editable source is an **app-defined teaching DSL**, never general Python:

```python
from quantum_shield import EntanglingCircuit

qc = EntanglingCircuit(2)
qc.cx(0, 1, at=2)
qc.check(id="c0", ancilla=0, start=1, end=3,
    opening=[(0,"X")], closing=[(0,"X"),(1,"X")], closing_sign=1,
    opening_h=True, closing_h=True, measure=True)
```

Sandbox supports prepare_h/x/y/z/s/sdg/cx/cz/swap, the payload equivalents, check, bit_flip, pauli_y, phase_flip and decoherence. Use the existing bounded AST allowlist, 8 KiB / 128 lines / 2048 nodes. No exec/eval, dynamic attributes, arbitrary imports, loops or comprehensions. Preview must not execute source.

Compile atomically; retain invalid text and diagnostics. Run from dirty Code compiles first and stops on errors, never executes an old draft as fallback. Mode switches, resets and visual edits must resolve dirty text explicitly. Undo/redo and example loads are bounded, isolated by mode.

Provide a separately labeled, read-only standalone native Qiskit/Aer export of the actual implementation; escape authored labels in comments.

### 8.3 Dedicated route family

| POST route under /api/tutorial/entangling-lab | Request / result |
| --- | --- |
| /compile | code, mode, combineFaults → draft or diagnostics |
| /validate | draft + settings → signed traces, completeness, whole-schedule validity, generated code/resources |
| /run | draft + settings → simulation, fingerprints, guidedSuccess/sandboxSuccess eligibility |
| /trace-fault | draft + settings + proposed fault → explicit diagnostic path; no progress |
| /coverage | valid draft → bounded X/Y/Z coverage table; no progress |

Do not repurpose `/api/validate-checks` or widen `/api/tutorial/check-lab` contracts. Reuse helpers behind explicit wire/gate policies. Preserve existing body-size/compute-capacity guards and consistent validation errors. Full density matrices are not normal response payloads.

## 9. State, completion and persistence

Controller state keeps independent guided/sandbox models and histories, editor/source/dirty diagnostics, selected gate/check/fault, mode, settings, revision counter, validation, latest accepted result and achievements.

```text
guidedComplete = accepted current valid noiseless guided X0 → CX → +X0X1 run
sandboxComplete = accepted current valid sandbox run with enabled nontrivial fault
quizPassed = submitted MCQ answer C
moduleComplete = guidedComplete && sandboxComplete && quizPassed
```

A valid commuting/outside-window fault counts as exploration. Do not require a random syndrome-one sample, improved fidelity or a particular custom circuit. Mere validation, trace, coverage, invalid diagnostic, failed/obsolete run and zero wait do not earn evidence.

Use:

- `quantum-shield.flight-school-4.draft.v1.guided`
- `quantum-shield.flight-school-4.draft.v1.sandbox`
- `quantum-shield.flight-school-4.progress.v1`: contentVersion `entangling-checks-v1`, guided/sandbox achievements, quiz answer/submission, active mode and bounded settings.
- Existing `quantum-shield.workspace.v1` for layout.

Validate persisted envelopes, preserve dirty source on reload, bound in-memory histories to 30 and avoid saving large results. Invalid storage resets only its own entry with a notice; storage failures preserve a usable session.

Award **Flight School 4 Certified — Entangling Spacetime Architect**. Continue opens Flight School 5 through existing tutorial callbacks. Preserve the global progress v2 schema, prior Skip/Complete status and all mission bests. Old profiles with later access are not relocked; replay can earn new certification independently.

## 10. Future implementation map and execution order

```text
src/components/flight-school-4/
  EntanglingLab.tsx, EntanglingGuided.tsx, EntanglingTelemetry.tsx
src/lib/flight-school-4/
  contracts.ts, content.ts, examples.ts, code-generation.ts, lab.test.tsx
backend/entangling_lab/
  models.py, code_parser.py, service.py
tests/test_entangling_lab.py
e2e/entangling-lab.spec.ts
```

Reuse the shared LabFrame, LabTheory, CircuitPreview and StateCard. Parameterize the gate/check/fault editors with explicit lab capabilities where appropriate; do not globally relax their default bounds. Add new routes in backend/app.py and wire zero-based tutorial step 3 to the new component. Update lesson titles in every lesson selector to reflect the final 4/5/6 ordering.

Implement contracts/physics first, then source round trips, guided UI, sandbox/telemetry, evidence/persistence and navigation. Keep legacy numeric tutorial routes compatible until all callers/tests have migrated; do not remove passing tests to conceal a regression.

## 11. Acceptance and verification

1. Guided payload cannot be changed via UI, source, direct API or saved draft.
2. Opening X0 gives expected X0X1. Closing X0 alone is red; adding X1 becomes green. Preview alone never unlocks sandbox.
3. Signed CX(X0 Z1)CX† = −Y0Y1 passes with compensation and fails without it.
4. On the zero-input guided fixture, wrong closing X0 alone gives a 50% no-fault flag probability. On a sandbox input with q1 prepared in plus, the same wrong operator can give syndrome zero for every shot. Whole-operator validation nevertheless rejects it. Show that zero counts do not prove correctness.
5. Closing-product factors use one helper bit, not independent bits. Two checks use true joint syndromes and the all-zero filter.
6. For the valid guided check, Z0 or Z1 injected at boundary 3 is flagged; X0 there is not. Boundary 1 is outside.
7. SWAP support, control/target reversal, multiwire products, overlapping-check conflicts and Y-fault propagation agree with Qiskit.
8. Zero survivors yields null retained fidelity. Zero wait does not earn sandbox evidence.
9. Valid visual and source forms produce equivalent states, signs, syndromes and resources for every preset.
10. Wrong MCQ answers are retryable; C plus both accepted experiments certifies. Old unlocks/bests survive reload, invalid storage and replay.
11. Test obsolete responses, dirty-source failures, undo/redo, resize confirmation, keyboard/touch placement, reduced motion and desktop/mobile screenshots.
12. Run `pytest tests`, `pnpm typecheck`, `pnpm test`, existing/new Playwright suites and `pnpm build` during implementation. This documentation revision does not claim those implementation checks have been run.

## 12. References and scientific scope

The lesson teaches a bounded two-boundary CPC special case, not the paper's entire time-distributed check-search construction. For the broader spacetime framework see [Martiel & Javadi-Abhari, arXiv:2504.15725v1](https://arxiv.org/html/2504.15725v1). Qiskit bit ordering and the forward-conjugation convention must be covered by executable fixtures rather than inferred from diagram ordering.

All numerical examples in this file are exact analytical ideal-helper fixtures, not measurements from a device.

