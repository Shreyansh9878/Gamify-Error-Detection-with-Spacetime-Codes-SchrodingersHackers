# LeetCode Workspace and Flight School 5 — Implementation Specification

**Status:** Implementation-ready design. Documentation only; do not implement application changes as part of this revision.

**Revision:** 15 October 2026.  
**Lesson ID:** `flight-school-5`.  
**Lesson name:** **The T-Gate Barrier & Commutation Rules**.  
**Prerequisite:** Flight School 4 complete, or existing skip/completion access.  
**Next lesson:** Flight School 6 — Trade-Off Optimization & Score Calculation.

## 1. Intent and scope

Teach why Clifford propagation is special, what changes at a T gate, and how to construct a compatible Pauli check. Use a guided comparison followed by free experimentation in the same responsive workbench used by Flight Schools 1–4.

Preserve the requested 1–5 data-wire sandbox and gold-highlighted T gates, but correct these scientific and progression ambiguities:

- A propagated operator such as (X+Y)/√2 is an **operator**, not a superposition state or a probability mixture of X and Y.
- Adding a few T gates does not automatically make every circuit exponentially hard to simulate.
- Clifford-only efficient simulation requires an appropriate stabilizer input/measurement setting; arbitrary magic-state inputs are an important exception.
- T = diag(1,e^(iπ/4)) equals RZ(π/4) **up to global phase**. It is conventionally called the π/8 gate, but its relative computational-basis phase is π/4.
- Local I/Z compatibility is the rule of this lesson's stepwise Pauli-transport mode. It is not a theorem that every globally valid check must remain a single Pauli at every intermediate step.
- A complete incompatible assembly can be run as a diagnostic. It is not scored or certified as a supported check.
- Completing this lesson opens Flight School 6, not missions 6–10. Graduation/Skip remain the only tutorial-level all-mission unlock actions.

This is another tutorial-only editable-payload exception. Do not alter missions, previous lesson certifications, leaderboards, deployment or the separate Paulice research benchmark.

## 2. Workspace and navigation

Reuse `LearningWorkspace`: 36/64 horizontal and 60/40 right-side default splits, desktop at ≥1100 px, independently scrolling panes, keyboard/pointer resizing, persisted layout and mobile Theory / Experiment / Results tabs.

```text
Header: Back | 05 T-Gate Barrier | Lesson selector | Help | Skip
Theory                         Experiment
Description                    Guided T comparison / Custom Sandbox
Examples                       Visual / Code, width, gates, checks, faults
Knowledge Check                Local T crossing indicators + physical circuit
Achievement checklist          -----------------------------------------------
Continue to Flight School 6     Results
                               Operator expansion and construction validity
                               No-fault/faulted syndromes and data comparisons
```

Use gold to identify T/T† as non-Clifford payload gates. A green T crossing says **I/Z at this location — compatible**; a red crossing says **X/Y component here — leaves Pauli-only transport**. Keep red closure mismatch, unsupported transport, amber incomplete stages and orange injected faults textually distinct.

Do not label an entire circuit safe merely because one opening Pauli is Z. The operator on the T wire at the actual T column is decisive. A preceding H or entangling gate can change or spread it.

Run opens Results on mobile. Errors focus Experiment feedback. Keep accessible Skip visible, preserve prior access/bests and do not force mission entry when a learner wants to explore more.

## 3. Learner-facing Description content

### 3.1 The useful Clifford shortcut

So far we have followed operators through Clifford gates. A Clifford circuit maps a Pauli product to another signed Pauli product. That makes it possible to track a check using axes and signs instead of a large matrix.

This also makes many Clifford computations easy for classical computers: stabilizer states, Clifford gates and Pauli measurements can be simulated efficiently. That statement has conditions. A Clifford circuit supplied with special non-stabilizer inputs is a different resource.

### 3.2 What T adds

The T gate applies a relative phase:

```text
T = [[1,0],[0,e^(iπ/4)]]
T |0〉 = |0〉
T |1〉 = e^(iπ/4)|1〉
```

With suitable Clifford gates, T gives a standard universal gate set. Universal means we can approximate arbitrary quantum computations, not that every circuit containing T is useful or classically hard. Small T counts and special circuit structure can still allow efficient simulations.

Looking only at zero/one measurement counts can hide a phase change. Try plus input and compare Z-basis counts, X-basis counts and the Bloch vector.

### 3.3 An X check leaves the Pauli axes

For the forward rule P′ = U P U†:

```text
T X T† = (X+Y)/√2
T Y T† = (Y−X)/√2
T Z T† = Z
T I T† = I
```

The first result points between the X and Y operator axes. It is a coherent linear combination, not “flip a coin and apply X or Y.” Replacing it with either axis loses part of the operator.

A controlled-X or controlled-Y closing tap alone cannot implement (X+Y)/√2. A more general controlled operator could do so, but it is outside this lesson's simple Pauli-tap toolkit.

### 3.4 The clean route is I or Z at T

Z commutes with T because both are diagonal. If the propagated Pauli has I or Z on the T wire, it passes through that gate unchanged. Factors on other wires remain part of the product.

The question is **what reaches T**, not just what was selected at the opening. For H followed by T, an opening Z becomes X after H and is incompatible at T. An opening X becomes Z after H and can pass; the correct closing is then Z.

A compatible Z check does not detect a Z fault at that same crossing. Passing a gate cleanly and detecting every error at that gate are different goals.

### 3.5 A barrier is a toolkit limit, not broken quantum mechanics

The checker in this lab supports paths that stay signed Pauli products after every gate. A red non-Pauli step means the path is outside that supported family.

Sometimes later gates recombine an operator into a Pauli. For example T followed by T is S, so X evolves first to (X+Y)/√2 and finally to Y. The whole two-boundary X→T→T→Y check is an exact invariant even though its intermediate path leaves the supported stepwise family.

The inspector reports both facts honestly. It never calls this exact global invariant a false-alarm construction simply because the simplified transport policy does not support it.

### 3.6 Coverage and sampling still matter

Build a compatible check, inject a test fault and compare it with a no-fault reference. Post-selection keeps all-zero syndrome samples; it does not repair discarded outputs.

For zero survivors there is no retained state and no retained fidelity. These tutorial Bloch vectors and fidelities are exact simulator descriptions. Sampled counts fluctuate, while exact operator identities and exact channel probabilities do not change when you resample.

## 4. Guided T comparison

### 4.1 Fixed experiment

- One data wire q0, zero input, no preparation.
- Fixed T at column 2.
- One ancilla a0; opening boundary 1, closing boundary 3.
- Complete H / controlled tap / T / controlled tap / H / M shell is shown.
- The learner selects opening/closing axes and sign; fixed shell controls cannot be removed in this comparison.
- Payload, helpers and measurements ideal; explicit faults off for guided evidence.

Reuse physical stage explanations from Flight School 3; do not make the player repeat basic assembly solely to unlock this new concept.

### 4.2 Required interactions

1. Choose opening X and closing X.
2. See the T marker turn red with the exact expansion (X+Y)/√2.
3. Run **Incompatible Check — Diagnostic** and compare no-fault syndrome probabilities. For the default zero input, P(s=1) = (1−1/√2)/2 ≈ 0.1464466094. It is not 100%.
4. Switch to opening Z and closing Z.
5. Observe compatible transport and a closed invariant.
6. Run the noiseless compatible check; exact P(s=0)=1.

Both accepted observations form the guided achievement. An operator preview or clicking both axes is insufficient. Keep the comparison replayable and preserve each last result with matching settings.

Afterward unlock Custom Sandbox for new learners, without switching automatically or deleting the guided draft. Previously unlocked profiles retain sandbox access.

## 5. Sandbox controls and limits

| Capability | Contract |
| --- | --- |
| Data wires | 1–5, default 2 |
| Ancillas | Up to 2 distinct helper owners; ≤7 physical wires |
| Input prefix | Separate ideal preparation, ≤16 gates |
| Payload gates | H, X, Y, Z, S, S†, CX, CZ, SWAP, T, T† |
| Grid | Columns 0–15; ≤64 combined preparation/payload gates |
| Non-Clifford budget | ≤4 T/T† gates across prefix + payload |
| Checks | ≤2, one nonidentity factor per data wire, signed closing product |
| Check windows | Opening 0–15, closing 1–16, ordered |
| Faults | X/Y/Z or thermal wait; one default, Combine Faults ≤4 |
| Generated schedule | ≤192 logical instructions |
| Sampling | 256 / 1024 / 4096; default 1024; bounded seed |

Preparation can include T; it changes the state, not the check's payload-identity test. T count includes that prefix for resource bounding, but only payload T gates inside a check window are relevant to its transport constraint.

No arbitrary-angle rotations, arbitrary controlled matrices or automatic extra-tap repairs are available. A Help note can explain that richer constructions exist without claiming they have been implemented.

Reuse explicit four-/five-wire capable editors through lab policies, not a global relaxation of the three-wire contracts. Include width changes with affected-operation confirmation, keyboard/click/touch placement, drag/drop, inspectors, bounded history and separate guided/sandbox drafts.

The check editor exposes manual opening and closing products, sign, interval, stages and an explicit **Fill Expected Closing** action. Disable that hint when the final operator is not one signed Pauli, explaining why; never approximate it by its largest term. If the final operator is a Pauli but stepwise transport is unsupported, the hint may fill it with an explicit **global closure only** label.

Fault placement and wait bounds match Flight School 4. Keep identical boundary ordering: faults, reverse-ID closings, ID-order openings, then payload column gates. Distinguish intentional T/X/Z gates from orange error blocks.

## 6. Two independent validation questions

### 6.1 Full operator evolution

For a check window, compute O0=P and Oj+1=Gj Oj Gj†. Use Clifford tableau evolution only on Clifford gates. Never pass a T-containing circuit to `Clifford` or coerce an operator expansion to one Pauli.

Represent a bounded expansion with Qiskit `SparsePauliOp` and a canonical signed term list; Clifford gates permute signed terms. Apply the exact local T/T† formulas on the affected factor:

```text
T:   X → (X+Y)/√2       Y → (Y−X)/√2
T†:  X → (X−Y)/√2       Y → (Y+X)/√2
I,Z remain unchanged for either gate.
```

Merge equal Pauli strings and retain relative signs. Keep coefficients to numerical tolerance 1e−10; at most four T/T† gates bounds the raw term growth by 16 from a single product. Do not truncate genuine terms to force a match. Compare against dense Qiskit Operator conjugation for test fixtures.

At each step expose gate/column, input/output expansion, Pauli-only status and the local factor arriving at T. Operator expansions are not Bloch vectors or data-state trajectories.

### 6.2 Supported transport versus actual closure

Return separate fields:

```text
structureComplete: all physical readout stages exist
transportSupported: every intermediate step is one signed Pauli
                    and T/T† crossings have I or Z on their local wire
endpointOperatorMatch: selected signed P′ equals full U P U†
scheduleValid: full noiseless helper-zero isometry matches payload
valid: structureComplete && transportSupported
       && endpointOperatorMatch && scheduleValid
```

Whole-schedule validation tests every data input, excluding preparation, against the intended payload with helpers zero, up to one global phase, tolerance 1e−8. The maximum isometry is 128×32 for five data wires and two helpers; cache by canonical draft and avoid returning matrices.

For T→T with opening X and closing Y, report endpointOperatorMatch=true and scheduleValid=true but transportSupported=false. Label **Globally closed / outside stepwise Pauli mode**; do not show “false alarms expected” when the exact schedule has none.

For X→T→X, endpoint match and schedule validity fail. Label **Operator mismatch / false-alarm diagnostic**. For Z→T→Z, all fields pass.

An incomplete assembly cannot run. A complete unsupported or mismatched assembly may run a clearly labeled diagnostic, never a supported-certification run. No scoring endpoint or mission score is involved in this lesson.

## 7. Simulation and diagnostics

Use Qiskit 2+ joint density-matrix/channel evolution of the actual physical implementation, including the selected closing operators even in diagnostic mode. Exact no-fault and faulted syndromes come from that implementation; do not substitute a canned “blocked” result.

Show:

- Operator expansion and canonical q(n−1)…q0 ordering, plus readable q0/q1 chips.
- No-fault versus faulted joint syndrome probabilities and integer counts.
- N_kept + N_discarded = N, exact retention r, empirical retention and 1/r.
- Ideal, unprotected faulted, checked unfiltered and retained data states.
- Full-state fidelity, reduced Bloch vectors, basis-aware counts and observable estimates.
- Active/added wires, logical gates, CX-equivalent entangling count, depth and T count.
- Generated standalone native Qiskit/Aer code and post-selection logic.

Keep helpers/readout ideal here, with only explicit data faults/channels. Noise from check circuitry is introduced explicitly in Flight School 6.

A fault propagated across T can become an operator expansion. Show that coherent expansion; never pick a single Pauli at random as its “path.” For general channel faults show simulated probabilities without a unique operator trace.

Bound coverage to X/Y/Z × data wires × boundaries 0…16, maximum 255 probes. A general T-containing coverage sweep must use exact state/channel evaluation or a mathematically equivalent exact check observable, not a Clifford-only anticommutation shortcut. Cache fixed-input results, serve probes in pages of at most 32 and label input dependence when relevant. Coverage is optional exploration, not a completion prerequisite.

## 8. Examples and assessment

| Preset | Purpose / expected result |
| --- | --- |
| X meets T | X→T→X; non-Pauli endpoint and false-alarm diagnostic |
| Z passes T | Z→T→Z; supported, no-fault syndrome zero |
| H changes the question | H then T: opening Z reaches T as X and is unsupported; opening X reaches it as Z and closes Z |
| Remote T | Product has I on the T wire; that crossing imposes no new factor |
| Entangling detour | CX changes support before T; inspect the factor at T, not just the opening |
| T† reverses phase | Inspect (X−Y)/√2 rather than the T expansion |
| Recombination | T then T, X→Y endpoint; global closure versus supported-path distinction |
| Missed phase fault | Valid Z check across T with an internal Z error; valid does not mean detected |

Presets are undoable and editable after sandbox access. Theory examples can be inspected before completing Guided Mode.

### Required knowledge check

You are designing a spacetime Pauli check spanning a single T gate on q0. Which nonidentity single-qubit Pauli can pass this gate unchanged within the lesson's Pauli-transport mode?

- A) X, because T X T† = X.
- B) Y, because T Y T† = Y.
- C) Z, because T is diagonal and T Z T† = Z.
- D) Both X and Y, provided an S gate is added afterward.

**Correct answer: C.** Explain the X and Y expansions and that I also commutes, but is the trivial local factor. An S gate after one T merely rotates the X/Y combination; it does not turn that single crossing into a Pauli.

Unlimited retries and persisted feedback; no penalty or random result requirement.

## 9. Draft, source and API contracts

### 9.1 Draft and state

Use `NonCliffordDraft` with Flight School 4's structure: schemaVersion, mode, dataQubits, preparation, payload, checks, combineFaults, faults. Introduce T/T† and five-wire bounds in this lab's model; enforce the guided fixture server-side.

Gate records retain id/name/qubits/column and the compatible intentional-gate role field. Check records retain ancestor fields, signed products and physical stage flags. Fault records retain explicit event ordering and thermal parameters. Reject unknown fields, non-finite numbers, overlapping wire occupancy, duplicate IDs/factors and reused ancillas.

Run settings: observable {qubit,basis X|Z}, shotsPerVariant, sampleSeed and faultsEnabled. Responses include canonical draft/settings fingerprints, engine/content versions, run ID, validation fields, traces, probabilities/counts, resources and guided observation eligibility.

Store both the actual simulated result and the supported-policy verdict; one must not overwrite the other.

### 9.2 Supported editable source

```python
from quantum_shield import NonCliffordCircuit

qc = NonCliffordCircuit(1)
qc.t(0, at=2)
qc.check(id="c0", ancilla=0, start=1, end=3,
    opening=[(0,"Z")], closing=[(0,"Z")], closing_sign=1,
    opening_h=True, closing_h=True, measure=True)
```

This is an app-defined DSL, not native Qiskit. Support the documented Clifford/prepare calls from Flight School 4 plus t/tdg and prepare_t/prepare_tdg. Use the safe AST allowlist, 8 KiB / 128 lines / 2048 nodes and bounded literals. Never execute learner Python.

Keep invalid dirty text on compile failure, stop Run instead of falling back, require explicit resolution before visual/mode/reset mutations, and preserve visual/source physics equivalence. Native export is a separate read-only standalone QuantumCircuit/Aer program with actual T gates, helper gates, channels and measurements.

### 9.3 Dedicated APIs

| POST route under /api/tutorial/non-clifford-lab | Contract |
| --- | --- |
| /compile | source/mode/combineFaults → draft or diagnostics |
| /validate | draft/settings → expansion, supported-policy and exact closure verdicts |
| /run | complete physical assembly → actual simulation and eligibility |
| /trace-fault | one proposed X/Y/Z event → exact propagated expansion and syndrome diagnostic |
| /coverage | draft/settings plus bounded cursor → probe page and next cursor |

Use existing body/compute guards. Source errors return line/column diagnostics. Physics/model errors are meaningful validation responses. A policy-unsupported diagnostic is a successful explicitly labeled simulation, not a 500 or a certified run. Keep route contracts isolated from missions and Flight School 3.

Revision guards exclude responses from obsolete edits/settings/modes/unmounted workbenches. Stale results retain their original basis/width labels and cannot award achievements.

## 10. Completion, persistence and progression

```text
sawBarrier = current accepted guided X→T→X diagnostic run, faults disabled
sawCompatible = current accepted valid guided Z→T→Z run, faults disabled
guidedComplete = sawBarrier && sawCompatible
quizPassed = correctly submitted answer C
moduleComplete = guidedComplete && quizPassed
```

Sandbox exploration is encouraged, not an extra unspecified gate. Do not require a particular fault, a syndrome-one sample or improved fidelity. Zero noise/incorrect construction are not mislabeled as useful detection. The required guided runs are deterministic fixtures; sampled fluctuations do not alter eligibility.

Store:

- `quantum-shield.flight-school-5.draft.v1.guided`
- `quantum-shield.flight-school-5.draft.v1.sandbox`
- `quantum-shield.flight-school-5.progress.v1`: contentVersion `t-barrier-v1`, both accepted observations, quiz fields, mode and bounded settings.

Use validated envelopes, isolated notices, bounded histories and no saved density matrices. Preserve existing layout/global progress, Skip status and mission bests. Older profiles retain their furthest access even if they have not earned the new observation badges.

Keep the existing `quantum-shield-qed-v2` schema unchanged: version, tutorial status, furthest step, sound preference and mission bests. Detailed new lesson evidence belongs only in the dedicated keys above. Do not reset global progress to migrate this lesson.

Award **Flight School 5 Certified — Non-Clifford Navigator**. Continue opens Flight School 6; it never selectively unlocks missions 6–10. The original “Master” label is deliberately softened to avoid claiming universal-computation expertise from one exercise.

## 11. Future implementation plan

```text
src/components/flight-school-5/
  NonCliffordLab.tsx, OperatorExpansion.tsx, NonCliffordTelemetry.tsx
src/lib/flight-school-5/
  contracts.ts, content.ts, examples.ts, code-generation.ts, lab.test.tsx
backend/non_clifford_lab/
  models.py, code_parser.py, propagation.py, service.py
tests/test_non_clifford_lab.py
e2e/non-clifford-lab.spec.ts
```

1. Add bounded isolated contracts and exact signed expansion/conjugation tests.
2. Add full-isometry checks with independent transport-policy flags.
3. Implement safe source parsing and standalone native exports.
4. Add the guided comparison, sandbox gate policies and local T inspector.
5. Add real density-matrix diagnostics, paged coverage and result fingerprinting.
6. Add quiz/evidence persistence and wire zero-based tutorial step 4.
7. Update all shared lesson selectors to the new order without changing previous completion rules.
8. Preserve legacy numeric routes until callers/tests migrate; keep existing passing suites.

No new database, cloud service, remote quantum execution or dependency is required for these bounded local Qiskit models.

## 12. Verification checklist

- Exact T and T† X/Y/Z conjugations match dense Qiskit matrices.
- X→T→X default no-fault flag ≈0.1464466094; Z→T→Z flag 0. No canned 100% failure.
- H then T tests the operator reaching T, not the initial opening letter.
- T on an I-supported remote wire is compatible.
- T→T, X→Y reports actual global closure and unsupported intermediate transport separately.
- Multiwire signs, multiple T sites, SWAP, overlapping checks and five-wire limits are covered.
- Whole-isometry validation rejects checks that only happen to pass the selected input.
- Native Qiskit exports execute; visual/source forms agree for every preset.
- Retained data and joint syndromes come from the same physical model; zero acceptance is null-safe.
- Non-Pauli fault traces and general-channel probes never use invalid Clifford shortcuts.
- Both guided runs plus correct C certify, while previews, stale responses and the quiz alone do not.
- Graduation remains unavailable until Flight School 6, apart from the existing explicit Skip.
- Exercise dirty source, storage failures, history, resize, keyboard/touch controls and desktop/mobile screenshots.
- During implementation run `pytest tests`, `pnpm typecheck`, `pnpm test`, all existing/new browser suites and `pnpm build`. This revision is a specification, not a claim that the new module exists.

## 13. References and scope

See [Martiel & Javadi-Abhari, arXiv:2504.15725v1, Supplementary Section V](https://arxiv.org/html/2504.15725v1) for the broader non-Clifford extension. The paper also discusses richer repairs to incompatible checks; this lab deliberately teaches a bounded stepwise Pauli family and does not implement that whole method.

The equations and default diagnostic probabilities above are analytical tutorial fixtures, not device measurements. Remove the original unresolved [cite: n] markers from learner-facing content.

