# LeetCode Workspace and Flight School 6 — Implementation Specification

**Status:** Implementation-ready design. This revision changes documentation only.

**Revision:** 15 October 2026.  
**Lesson ID:** `flight-school-6`.  
**Lesson name:** **Trade-Off Optimization & Score Calculation**.  
**Prerequisite:** Flight School 5 complete, or existing skip/completion access.  
**Outcome:** Flight School graduation and access to all ten existing main missions.

## 1. Intent and decisions

This capstone changes the player's job from freely building a tutorial payload to protecting a **fixed workload**. The player chooses valid spacetime checks, compares quality and shot cost, qualifies, and reviews a reproducible benchmark before graduating.

Preserve the original goals: locked three-data-qubit payload, two fixed ancilla rails, manual opening/closing taps, green/red construction feedback, noisy physical check overhead, retained/discarded shots, score ≥0.65 and an explanatory post-pass strategy reveal.

Make these corrections explicit:

1. Use **Coherent Pauli Check**
2. Keep the requested score F_ps × S_keep, but distinguish exact acceptance r from sampled N_kept/N. Qualification uses exact metrics and cannot be gamed by resampling.
3. Add a retained-fidelity floor F_ps≥0.90 and at least one active valid check. Otherwise the unchecked baseline can already pass 0.65 and defeat the learning objective.
4. Do not promise that filtering increases the product score. Increasing retained fidelity can reduce that product.
5. Do not invent numerical “optimal” results or claim qiskit-paulice globally maximizes this game score. Define an exact finite player search space and compute its best **quality-eligible** strategy.
6. A separately labeled Paulice heuristic comparison is optional enrichment. Its native cost and observable estimator are not substitutes for the game's exact common retained-state metrics.
7. Completing Flight School 5 opens this lesson; completing this lesson graduates the tutorial. Preserve existing explicit Skip behavior and prior mission access.

No mission circuits, mission scores, leaderboard schemas or previous lesson certifications are redesigned by this specification.

## 2. Workspace and UI

Reuse the existing responsive three-pane `LearningWorkspace`, default 36/64 and 60/40 splits, desktop ≥1100 px, persisted layout, independent scrolling, accessible splitters and mobile Theory / Experiment / Results tabs.

```text
Header: Back | 06 Trade-Off Optimization | Lesson selector | Help | Skip
┌─────────────────────────────┬──────────────────────────────────────────────┐
│ THEORY                      │ EXPERIMENT                                   │
│ Description / Examples      │ Locked data workload U + heatmap             │
│ Goals and experiment log    │ Fixed ancilla H...H/M shells, active toggles  │
│ Quality/score explanation   │ Opening/closing products and window selectors│
│ Qualification status        │ Visual / Code, Run, compare, undo/redo       │
│ Post-pass benchmark reveal  ├──────────────────────────────────────────────┤
│                             │ RESULTS                                      │
│ Graduate when qualified     │ F_ps, r, score, overhead, joint shot histogram│
│                             │ Baseline/current/history/Pareto comparison   │
└─────────────────────────────┴──────────────────────────────────────────────┘
```

Payload gates are non-draggable, non-deletable and non-clickable for editing, with lock icons and an explanation. Hover/focus can explain a gate without making it editable. Heatmap intensity comes from the declared noise manifest; it is not random animation.

Ancilla H and H/M blocks are fixed for active rails. The player edits check windows, opening Pauli/wire and manual closing product/sign. Inactive rails are gray and bypassed: no fictitious measurement or post-selection cost is counted for an unused rail.

Keep **Skip Tutorial / Unlock All Levels** visible. Show all completion criteria in the theory footer. Qualification/reveal must be accessible inline as well as in an optional modal; no keyboard trap or forced animation.

## 3. Learner-facing Description content

### 3.1 Cleaner outputs cost attempts

A quantum error-detection run produces a data output and syndrome bits. We keep a run only if every active syndrome is zero. Other runs are discarded rather than repaired.

Two questions matter: how close are the retained data states to the intended output, and how many attempts are needed to collect enough retained samples? A high-fidelity output is useful only if we can afford to produce it often enough for the task.

### 3.2 Fidelity and retention are different

The simulator compares the retained full data state with the ideal pure target |ψ〉:

```text
F_ps = 〈ψ|ρ_kept|ψ〉
r = exact probability of all-zero syndrome
observed retention = N_kept / N
N_kept + N_discarded = N
expected attempts for K retained samples = K/r
```

Fidelity is not the percentage of data strings that match a single correct answer. An entangled target can have several legitimate measurement strings. Matching one histogram also does not prove that the phase information is correct. Reduced Bloch spheres cannot replace full-state fidelity.

### 3.3 The capstone score

This game uses:

```text
Score_exact = F_ps × r
Score_display_sampled = F_ps × (N_kept/N)
```

The exact product is a fidelity-weighted yield per attempted run for this fixed target. It is a game objective, not a universal formula from the paper or a substitute for every statistical precision requirement.

For a pure target it equals the target overlap of the unnormalized accepted state. Discarding shots can improve their conditional quality while reducing the total accepted target weight. A score reduction is a valid scientific result, not a broken detector.

To qualify, achieve **F_ps≥0.90** and **Score_exact≥0.65** with at least one active valid check. The quality floor rules out an unchecked output that is frequent but too noisy.

### 3.4 Why extra checks can hurt

Every controlled check interaction adds another physical noise opportunity. A check may reject useful runs or introduce errors it does not detect. Two ancillas are not automatically better than one, and a green operator identity is not proof of improved noisy performance.

Compare the unchecked baseline, a targeted check and another strategy. Inspect fidelity, retention, score, extra entangling gates and depth together. The best choice depends on the objective and the noise model.

The examples use a transparent teaching noise model. They are not calibration data from a quantum device.

### 3.5 A useful check has limits

A syndrome-zero shot can still contain undetected errors. Several check bits can be correlated, so their joint all-zero acceptance is not generally the product of their separate acceptance rates.

If exact retention is zero, there is no retained state and its fidelity is undefined. The score is zero by the capstone's explicit convention, and expected sampling overhead is infinite.

This model adds noise on controlled check gates. It is more realistic than the ideal helpers in the earlier lessons, but still omits routing, idle errors, crosstalk and readout errors. Do not treat its optimum as a recommendation for every processor.

### 3.6 What the benchmark proves

After qualification, review the best quality-eligible strategy among the choices this lesson allows. Its certificate names the fixture, noise model, candidate catalogue and score version.

That is a finite comparison, not proof of an optimum over all possible error-detection circuits. A heuristic suggestion alone does not prove a global maximum.

## 4. Authoritative payload and noise fixture

### 4.1 Fixture identity

Use `graduation-fixture-v1`, three data wires q0/q1/q2, initial |000〉, no editable input preparation. Columns are logical positions, not physical durations.

Pin `graduation-noise-v1`, `graduation-schedule-v1`, `graduation-catalogue-v1` and `fidelity-yield-v1` as the corresponding noise, scheduler, catalogue and metric identifiers. A change to any physical operation, rate, allowed strategy or score definition requires the appropriate version change and benchmark regeneration.

| Payload column | Gates |
| --- | --- |
| 1 | H(q0), H(q2) |
| 2 | CX(q0,q1) |
| 3 | S(q1), S(q2) |
| 5 | CX(q0,q1) |
| 6 | CX(q0,q1) |

All other payload columns are empty. Gates within the same column act on disjoint wires. The last two CX gates cancel ideally but remain workload operations; do not optimize them away or fold them during evaluation. The target is the exact noiseless output of this complete circuit.

Annotate columns 0…8, with ancilla preparation at boundary 0 and fixed final H/measurement at boundary 8. The last payload boundary is 7. Empty spans have no idle noise.

### 4.2 Fixed data noise manifest

Use exactly these independent local channels, in this order:

| Boundary | Data channel | Parameter / meaning |
| --- | --- | --- |
| 3 | X channel on q0 | p_X=0.20 |
| 3, second event | Z channel on q1 | p_Z=0.01 |
| 5 | Z channel on q2 | p_Z=0.005 |

These are anisotropic teaching channels associated with a high-noise region after the first CX and a much quieter q2 region. They are not a complete hardware model or an assertion that all CX noise is a single-qubit X fault. The later payload CX gates are ideal in this manifest.

A Pauli channel is E_P,p(ρ)=(1−p)ρ+p PρP. Use Qiskit/Aer channel objects, not a classical mutation of output strings.

### 4.3 Noise introduced by checks

After **every logical controlled-X/Y/Z tap**, opening and closing, apply two-qubit depolarizing noise with Qiskit parameter λ=0.005 on that ancilla/data pair:

```text
E_dep,λ(ρ_pair) = (1−λ)ρ_pair + λ I4/4
```

On an entangled full state use the corresponding local quantum channel; do not replace the full state with I/4. λ is the depolarizing parameter, not directly the probability of any nonidentity Pauli.

Payload gates have only the explicitly listed data channels. Ancilla H, sign-compensation Z, measurement and classical post-selection are ideal. No idle, routing or readout noise is present.

Use the same noisy tap model on each active rail. Count every tap and its noise site. A negative closing sign uses a visible ideal Z on that ancilla before its final H.

### 4.4 Physical event ordering

- Boundary 0: fixed H on each active ancilla.
- Boundaries 1…7: data-noise events first; closing products in reverse rail order a1,a0; opening products in rail order a0,a1; then payload gates at that column.
- Within a product: taps in increasing data-wire order, each immediately followed by its depolarizing channel.
- Boundary 8: sign-compensation Z if required, then final H and Z measurement for each active ancilla.

The sign Z may be deferred from closing to before final H because that ancilla has no intervening interactions; explain this in the native export.

Do not use arbitrary authored IDs to reorder a strategy. Rail ordering is part of this fixture and differs from the earlier stable-ID sandbox scheduler; use its own versioned adapter.

No early measurement, ancilla reset/reuse, auto-routing or noise-dependent optimization is permitted. No active checks means baseline evolution with no helper operations; reserved display rails are not active resources.

### 4.5 Numerically checked feasibility witnesses

A read-only Qiskit density-matrix calculation during this specification revision produced:

| Strategy | F_ps | Exact r | Score_exact |
| --- | --- | --- | --- |
| No checks | 0.7880400000 | 1.0000000000 | 0.7880400000 |
| Z0 opening boundary 2, +Z0 closing boundary 4 | 0.9809082110 | 0.7970075000 | 0.7817912010 |
| Above plus X2 opening boundary 2, +Y2 closing boundary 6 | 0.9833542898 | 0.7890871383 | 0.7759522225 |

These are reference fixtures to reproduce, **not claims of an exhaustive optimum**. The unchecked product exceeds 0.65 but fails the quality floor. A targeted check qualifies. A second check can increase fidelity while reducing retention and product score.

Reproduce these values within 1e−8 before release; do not hardcode them into live metrics or scripted animations.

## 5. Player search space and fixed shells

### 5.1 Allowed controls

- Fixed 3 data wires; up to 2 active ancilla rails.
- Explicitly activate/deactivate a0 or a1.
- Opening is exactly one X/Y/Z on one data wire.
- Choose a window from (2,4), (1,7), (4,7), (2,6).
- Manually select closing factors on q0/q1/q2 and sign ±1.
- Closing is derived from the fixed Clifford payload inside that window and has 1–3 nonidentity factors.
- H and final H/M shells are fixed and complete on active rails.
- Duplicate candidate checks across rails are disallowed.
- Zero checks is a valid comparison, not a qualifying solution.

Four windows times nine openings produce **36 individual candidates**. This finite set makes the reveal reproducible and affordable. Window labels can be “local noisy region,” “broad workload,” “late region” and “extended middle,” with boundaries always visible.

Inactive rails have no taps and consume no readout bit. A single active rail yields one syndrome bit with explicit rail mapping; two yield a1a0. Do not count unused zero bits as evidence of acceptance.

A single active rail is invariant under helper-label swapping in this symmetric noise model. Canonicalize that symmetry for benchmarking while retaining the visible label. For two active checks both assignments are distinct: interaction order can matter.

### 5.2 Construction validation

Green requires a signed match and full combined noiseless helper-zero isometry for every data input. Never weaken this test to only the fixed prepared input.

Mismatches/conflicts are red with expected and selected factors/signs. **Fill Expected Closing** is an explicit undoable hint. Complete wrong assemblies may run **Invalid Check — Diagnostic**, with no qualification/evidence.

Treat the empty strategy as a valid executable **Unchecked baseline**, using the trivial helper-free identity. Its status is neutral, not “incomplete” and not “a closed check.” Do not inherit a validator that requires at least one check for every run; the nonempty condition belongs to qualification.

No free gate palette is available. Code edits only the strategy; payload/noise are separate read-only views. UI, source and direct requests cannot replace them.

### 5.3 Comparison workflow

1. Run the no-check baseline and populate actual metrics.
2. Activate a rail, choose an opening/window, build the closing and run.
3. Compare at least two distinct accepted valid strategies; the baseline may be one.
4. Tune and replay freely, with no forced click order or required failed attempts.
5. A qualifying strategy opens the benchmark reveal.

Default N=1024, seed=2026; offer 256/1024/4096 and Resample Counts. Sampling cannot change exact qualification. Reset Strategy is undoable and never edits the workload.

## 6. Backend evaluation and resources

### 6.1 Authoritative run

Load target, fixture, catalogue and channels by version on the server. Clients submit a strategy, not a score, fidelity, payload or noise model.

Build the actual joint circuit with fixed active helper shells and noisy taps. Compute the ideal target, noisy unchecked baseline, checked joint state, unfiltered data state, and all-zero projected state. Sample one joint syndrome/data distribution per variant; derive all marginals and accepted/discarded counts from that distribution.

For the unnormalized all-zero data block σ0:

```text
r = Tr(σ0)
ρ_kept = σ0/r for r > 1e−12
F_ps = state_fidelity(ideal_pure_target, ρ_kept)
scoreExact = F_ps * r
```

For no checks, r=1 and retained data equals the noisy baseline. For r≤1e−12 return retainedState=null, fidelity=null, samplingOverhead=null with an infinite label, scoreExact=0 and qualifies=false.

Reject non-finite results. Numerical clipping/normalization may remove residue within 1e−10, never hide physically poor outcomes.

Qualification uses unrounded metrics with 1e−10 comparison tolerance:

```text
eligible = activeCheckCount >= 1 && noiselessConstructionValid
qualityEligible = eligible && fidelityExact >= 0.90
qualifies = qualityEligible && scoreExact >= 0.65
```

This capstone does not write mission bests, award mission stars or submit leaderboard scores.

### 6.2 Fidelity, counts and precision

Label F_ps as **Exact simulator state fidelity**. A counts histogram is not state reconstruction. Display observed N_kept/N separately from exact r; sampled product is informational.

K/r is the expected number of attempts for K accepted samples, not the full cost of arbitrary statistical precision. Observable variance, bias and correlations matter too. Optional K input is bounded 1…100000 and promises an expectation, not a fixed attempt count.

Resampling changes counts, never exact state, score, eligibility or benchmark.

### 6.3 Resources

Display active/added helpers, controlled taps, logical one-/two-qubit gates, CX-equivalent check interactions, dependency depth and added depth versus baseline. Logical depth is not elapsed time.

Resource transpilation uses a fixed H/S/S†/X/Y/Z/CX basis, optimization level 0 and recorded seed. CY/CZ each require one CX-equivalent entangling interaction in the declared decomposition; display their basis gates. Simulate the tap noise once per logical tap, not again after decomposition.

Separate N method execution shots from any sampled baseline shots. Cache exact baseline by fixture; reuse sampled baseline counts only for matching N/seed/basis. Never count an exact reference as another hardware execution.


## 7. Score inspector and history

Results contain:

1. Fidelity, exact retention, exact product and each qualification condition.
2. Joint syndrome bars; all-zero accepted, every nonzero syndrome discarded.
3. N_kept/N, N_discarded/N, exact r and expected overhead 1/r.
4. Ideal/baseline/current unfiltered/retained full-state comparisons and reduced Bloch views.
5. Added resources and the reminder that check gates are noisy.
6. The latest 20 accepted strategy runs and a fidelity-versus-retention scatter plot.
7. Exact metric values and original settings for stale/historical results.

Match comparisons by fixtureVersion, noiseVersion, schedulerVersion and metricVersion. Seed changes may share exact points but not sampled counts. Never rank a Paulice observable estimator beside exact retained-state fidelity without a separate metric label.

Use Pareto highlighting for nondominated fidelity/retention points. A lower product with higher fidelity can remain a useful trade-off point; do not label it universally worse.

Live construction validation is debounced. Exact noisy simulation runs explicitly. The source editor is the editable strategy; physical native Qiskit and the noise manifest are read-only.

## 8. Reproducible post-pass benchmark

### 8.1 Complete finite enumeration

Enumerate all legal strategies:

- One empty strategy.
- 36 single-check strategies after symmetric helper-label canonicalization.
- 36×35=1260 ordered distinct two-check assignments.
- At most **1297 structural candidates** before whole-schedule filtering.

Every candidate has the exact signed expected closing for its opening/window. Validate the combined schedule and exclude conflicting pairs. Evaluate every valid candidate under the same fixture and noisy tap schedule.

Among nonempty valid strategies with F_ps≥0.90, maximize F_ps×r. The learner's 0.65 threshold is not a reason to skip other quality-eligible candidates.

Tie breaking: scores equal within 1e−10 → fewer controlled taps → fewer active helpers → smaller logical depth → lexicographic canonical strategy ID. Report ties/tolerance rather than overstating precision.

Also record the unconstrained product winner, even if it is the unchecked baseline, and the fidelity/retention Pareto set. This makes the quality constraint explicit.

### 8.2 Offline artifact and truthful labels

Compute the enumeration offline or in a developer verification command, never from scratch on every page visit or serverless request. Commit:

```text
backend/graduation_lab/data/graduation-fixture-v1-benchmark.json
fields:
  artifactVersion, fixtureVersion, noiseVersion, schedulerVersion, metricVersion
  catalogueHash, payloadHash, noiseHash, engineVersions, tolerance
  structuralCandidateCount, validCandidateCount, evaluatedCandidateCount
  enumerationComplete, qualityFloor, tieBreakPolicy
  bestQualityEligible {canonicalStrategy, fidelity, retention, score, resources}
  bestUnconstrained {canonicalStrategy, fidelity, retention, score, resources}
  tiedBestIds, paretoPoints, generatedAt
```

Use **Best quality-eligible strategy in this catalogue**. “Certified optimum within this catalogue” is allowed only if enumerationComplete=true and every valid candidate has been evaluated. Never say “maximum possible quantum score.”

On version/hash mismatch, do not display a stale winner. Show Benchmark unavailable, a retry and an explanatory acknowledgement. Keep qualification saved; graduation must not depend on an external tool or a long-running search becoming available.

### 8.3 Role of qiskit-paulice

The repository's research endpoint uses an observable-specific Paulice benchmark, not this game's optimizer. Its fidelity estimate and gamma cost are not the capstone score.

An optional local adapter may request Paulice candidates for this Clifford payload. If a candidate fits the two-boundary/two-rail catalogue and schedule, map it explicitly and evaluate it with the same exact engine. Label **Paulice-suggested candidate**, with provenance and the tool's native cost separately.

A candidate outside the catalogue is an illustrative research comparison, not its optimum or a required gameplay solution. If Paulice is unavailable, skip the enrichment. No new runtime dependency or API call is required for graduation.

### 8.4 Reveal interaction

After an accepted qualifying run, show:

- Your actual strategy, F_ps, r, score and resources.
- The certified best quality-eligible catalogue strategy and the same metrics.
- A diagram of its precise windows/taps/signs.
- Score gap within that constraint, with tied optima.
- The separate unchecked/unconstrained result and why it may have a larger product.
- Search-space size, versions and limitations.
- An explicit undoable Replay Strategy action and **Acknowledge & Graduate**.

Loading the winner never silently overwrites the player's strategy. If the artifact is unavailable, provide an honest acknowledgement path rather than fabricated metrics or a progression trap. No extra MCQ is required for this capstone.

## 9. Data, source and APIs

### 9.1 Canonical request

```json
{
  "fixtureVersion":"graduation-fixture-v1",
  "strategy":{
    "schemaVersion":1,
    "rails":[
      {
        "ancilla":0,"active":true,"startBoundary":2,"endBoundary":4,
        "openingTaps":[{"qubit":0,"pauli":"Z"}],
        "closingTaps":[{"qubit":0,"pauli":"Z"}],"closingSign":1
      },
      {"ancilla":1,"active":false}
    ]
  },
  "observable":{"qubit":0,"basis":"Z"},
  "shotsPerVariant":1024,
  "sampleSeed":2026
}
```

Exactly two rail descriptors, unique indices 0/1. Inactive rails carry no taps/window/sign fields; use strict discrimination. Active rails need the documented single opening and allowed window. Empty closing lists may represent an incomplete editable draft, but cannot run. Closing sign is ±1.

Reject client-supplied gates, noise overrides, state/fidelity/score claims and unknown versions/fields. Canonicalize factor order and cosmetic IDs while preserving rail-specific physics order. Validate both at parse and before execution.

### 9.2 Supported source

```python
from quantum_shield import GraduationStrategy

strategy = GraduationStrategy("graduation-fixture-v1")
strategy.check(ancilla=0, start=2, end=4,
    opening=[(0,"Z")], closing=[(0,"Z")], closing_sign=1)
```

Unspecified rails are inactive. This is an app-defined DSL, not general Python or native Qiskit. The parser accepts only its declaration and up to two literal strategy.check calls. It cannot call h/cx/noise, change width or replace fixed H/M.

Use a separate safe AST policy, the same 8 KiB / 128-line / 2048-node envelope, bounded literal values and line/column diagnostics. No arbitrary Python execution.

Invalid source remains visible; Run compiles dirty Code first and stops on failure. Visual edits/mode resets must explicitly resolve dirty text rather than overwrite it. Keep bounded undo/redo and visual/source equivalence.

Generate a separate read-only standalone QuantumCircuit/Aer program containing the workload, exact channels, noisy taps, fixed shells and joint post-selection. Explain the depolarizing parameter and execute trusted native exports in tests.

### 9.3 Endpoint family

| Endpoint under /api/tutorial/graduation-lab | Contract |
| --- | --- |
| GET /fixture | Locked payload, channels, allowed windows, versions and goals |
| POST /compile | Source → canonical strategy or diagnostics |
| POST /validate | Fixture/strategy → completeness, signed match, combined isometry, physical circuit/resources |
| POST /run | Fixture/strategy/settings → exact/sampled metrics, fingerprints and qualification eligibility |
| GET /benchmark?fixtureVersion=graduation-fixture-v1 | Matching bounded artifact or explicit unavailable status |

No runtime optimization job or database. Reuse request-size/compute-capacity guards, structured errors and bounded responses. Do not send full density matrices or all 1297 candidate circuits to the browser.

Benchmark access after qualification is a learning flow, not a secret or anti-cheat mechanism. Future competitive validation remains separate.

## 10. State, evidence and graduation

Controller state includes strategy/history, source/editor/dirty state, diagnostics, selected rail, settings, revision counter, validation, current accepted result, comparison log, qualification and reveal acknowledgement.

```text
comparisonComplete = two distinct accepted valid canonical strategies
                     under current fixture/metric versions
                     (baseline may be one)

qualified = accepted current valid nonempty run
            with fidelityExact >= 0.90 and scoreExact >= 0.65

moduleComplete = comparisonComplete && qualified && revealAcknowledged
```

Qualification persists even after the player explores a poorer strategy. The current result must show that poorer result honestly. Reveal is tied to the stored qualifying run and matching artifact, not to the currently displayed draft.

Only accepted current responses award evidence. Preview, invalid diagnostic, failed/obsolete response, repeated identical canonical strategy and resampling alone do not satisfy distinct-comparison evidence.

Use:

- `quantum-shield.flight-school-6.draft.v1`: validated strategy, source/dirty text and editor.
- `quantum-shield.flight-school-6.progress.v1`: contentVersion `tradeoff-capstone-v1`, fixture/noise/scheduler/metric versions, bounded comparison IDs, qualifying summary and reveal acknowledgement.
- Existing `quantum-shield.workspace.v1` for layout.

Persist no density matrices or complete benchmark search logs. Bound comparison summaries to 20 and session undo history to 30. Validate saved evidence; invalid storage resets only this entry with a notice and storage failures preserve the in-memory session.

On **Acknowledge & Graduate**, call existing onFinish, mark tutorial complete through the unchanged `quantum-shield-qed-v2` schema, award **Flight School Graduate — Spacetime Master**, and open the mission dashboard with missions 1–10 accessible.

Skip retains the established skipped status and all-mission unlock. Old completed/skipped profiles are not relocked for missing new evidence. Replay never erases best scores or downgrades prior access.

## 11. Future implementation map and order

```text
src/components/flight-school-6/
  GraduationLab.tsx, FixedPayloadView.tsx, StrategyDesigner.tsx
  TradeoffTelemetry.tsx, BenchmarkReveal.tsx
src/lib/flight-school-6/
  contracts.ts, content.ts, fixture.ts, code-generation.ts, lab.test.tsx
backend/graduation_lab/
  models.py, fixture.py, scheduler.py, code_parser.py, service.py
  benchmark.py
  data/graduation-fixture-v1-benchmark.json
tests/test_graduation_lab.py
tests/test_graduation_benchmark.py
e2e/graduation-lab.spec.ts
```

1. Pin fixture/noise/schedule/metric versions and reproduce feasibility witnesses.
2. Add strict immutable-fixture models and full-isometry validation.
3. Add real noisy tap evolution, joint post-selection, resource reporting and null-safe zero acceptance.
4. Enumerate the catalogue offline; validate certificate counts/hashes and generate the bounded artifact.
5. Implement safe strategy source and executable native exports.
6. Build the fixed workspace, manual designer, comparison log, score inspector and reveal.
7. Add isolated progress behavior and wire zero-based tutorial step 5 to onFinish.
8. Update every lesson selector to the final order: multi-qubit propagation, T barrier, then trade-off capstone.
9. Preserve legacy numeric routes until callers/tests migrate and run all existing suites.

Earlier editable labs and this capstone share presentation primitives, not an unrestricted circuit-editing API. Never send client payload edits for this fixture.

## 12. Verification and release gates

### Physics and benchmark

1. Reproduce all Section 4.5 witnesses within 1e−8.
2. Validate every candidate's noiseless helper-zero isometry for every input. Wrong constructions can be diagnostic but never qualify.
3. Attach noise exactly once after every controlled tap; clients cannot disable it.
4. Joint syndrome counts sum to N; kept/discarded data counts agree with the same sample.
5. Exact metrics/qualification are invariant under seed, shot count and data measurement basis.
6. The unchecked high product cannot qualify because quality/nonempty conditions fail.
7. Zero retention has null state/fidelity, zero score and infinite overhead.
8. Enumerate 1297 structural candidates before filtering; record valid/evaluated counts. Independently rerun the winner and tie candidates through the live engine.
9. Test ordered rail assignments, signed products and boundary timing. Never omit a candidate because its sampled score was unlucky.
10. Native exports execute and reproduce the physical schedule. Source/API cannot change the payload/noise or inject Python.
11. Version/hash mismatches never display a stale optimum; benchmark failure cannot erase qualification.

### UI, storage and regression

12. Payload and H/M shells cannot be edited via mouse, keyboard, drag/drop, source, storage or API.
13. Two distinct valid accepted strategies, qualification and acknowledgement complete; preview/stale results/resamples alone do not.
14. A current poor result remains honestly labeled after historical qualification.
15. Benchmark replay is explicit/undoable; inline/modal reveal and fallback are keyboard/mobile accessible.
16. Prior Skip/Complete access, mission bests and Flight School 1–5 evidence survive reload/corrupt storage.
17. Test independent scrolling, splitter restore, touch/keyboard controls, reduced motion and desktop/mobile screenshots.
18. During implementation run `pytest tests`, `pnpm typecheck`, `pnpm test`, all existing/new Playwright suites and `pnpm build`.

This documentation revision contains a numerical feasibility calculation, not a completed capstone or an exhaustive optimization result.

## 13. References and interpretation

The hardware-versus-sampling trade-off is motivated by [Martiel & Javadi-Abhari, arXiv:2504.15725v1](https://arxiv.org/html/2504.15725v1). The paper uses heuristic check search; it does not establish this game score as a universal objective or certify this finite catalogue.

The repository's `backend/research.py` labels Paulice's observable-specific estimator separately from common retained-state fidelity. Preserve that distinction. Remove unresolved citation markers and numerical reveal mockups not backed by the matching benchmark artifact.

