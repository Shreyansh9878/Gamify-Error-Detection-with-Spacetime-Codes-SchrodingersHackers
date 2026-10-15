# Flight Schools 1–6: Unified Canvas, QSphere and Interaction Refactor

**Revision:** 15 October 2026.  
**Scope:** All six Flight School lessons, their tutorial physics/visualization APIs, state models, accessibility and regression tests. Main-mission gameplay, leaderboard work and deployment are outside scope.

## 1. Authority and implementation baseline

The user's latest tutorial-overhaul request governs this document. Where it conflicts with an older specification, use the decisions recorded here. Retain the detailed lesson explanations and scientifically valid fixtures from:

- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_1.md`
- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_2.md`
- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_3.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_4.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_5.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_6.md`

Inspect the checkout before implementing. Flight Schools 1–3 have working but fragmented editors. Flight Schools 4–6 have partially written `advanced-learning`, `advanced_lab` and `graduation_lab` modules, but `Tutorial.tsx` still routes their steps through the legacy activities. Those partial modules are reusable work, not proof that the lessons are integrated or regression-tested. Preserve existing work and finish or replace it deliberately; do not start a fresh repository or restore unrelated files.

### 1.1 Decisions that supersede older documents

| Area | Required decision |
| --- | --- |
| State display | Bloch only for a one-wire state in a one-wire experiment; QSphere for any multiwire experiment, including active helpers |
| Editing | Drag/drop creates, moves, retargets and removes circuit items; no click-to-add slots or add-check buttons |
| Gate inspector | Remove it entirely, including its modal/panel, wire/column selectors and Delete Selected Gate controls |
| Canvas | One continuous wire grid and timeline; no separate preparation, payload or syndrome circuit editors |
| Noise scope | Independent decoherence may target one, several or all eligible wires; no single-data-wire restriction |
| Flight School 4 | Valid multiwire closure plus two local MCQ answers; no mandatory custom sandbox fault experiment |
| Flight School 5 | Accepted valid Z-commuting T experiment plus one local MCQ; X/T diagnostic is encouraged, not a completion prerequisite |
| Flight School 6 | Accepted nonempty valid check strategy with exact product score ≥0.65, followed by benchmark review; old mandatory fidelity-floor/two-strategy rules are removed |
| Paulice reveal | Qualification triggers a real backend Paulice request; show its computed suggestion separately from any certified finite-catalogue optimum |

Do not mislabel a heuristic suggestion as a maximum over all possible circuits. Do not impose an extra hidden pass condition because the unchecked circuit has a high product score: require an active valid check, explain the product honestly, and keep higher-fidelity targets optional.

## 2. Shared three-pane IDE shell

Every lesson, including every guided/sandbox/method mode, renders inside `LearningWorkspace`.

```text
Header: Back | Lesson number and title | Lesson selector | Help | Skip
┌──────────────────────────────┬────────────────────────────────────────────┐
│ THEORY                       │ EXPERIMENT                                 │
│ Description / Examples /     │ Visual / supported Code                    │
│ Knowledge Check              │ Shared palette + parameter settings        │
│                              │ One horizontal circuit canvas              │
│ Detailed explanations        │ Zone headers + live check connectors       │
│ Objective checklist          │ Dustbin + undo/redo + Run                   │
│ Progress and continuation    ├────────────────────────────────────────────┤
│                              │ RESULTS                                    │
│                              │ QSphere / single-wire Bloch                │
│                              │ Probabilities, counts, syndrome diagnostics│
│                              │ Fidelity, sampling cost and score/reveal   │
└──────────────────────────────┴────────────────────────────────────────────┘
```

- Default desktop split: 36% theory, 64% right workspace; right side 60% experiment and 40% results.
- Desktop breakpoint remains 1100 px. Reuse constrained pointer/keyboard splitters, independent scrolling, layout restore and reduced-motion behavior.
- Mobile uses persistent Theory / Experiment / Results tabs. A successful Run opens Results; invalid input focuses Experiment feedback.
- Palette, timeline ruler, wire labels, section labels and connector overlay share one coordinate system. Vertical scrolling keeps the palette/toolbar reachable; horizontal canvas scrolling keeps wire labels sticky.
- No detached second canvas appears below the editor. Generated physical implementations are layers or modes of this same canvas.
- Keep **Skip Tutorial / Unlock All Levels** visible. Preserve old Skip/Complete access and mission bests.
- Theory examples, quizzes, Run, resample, undo, redo, source application, navigation and parameter sliders remain normal controls. “Pure drag/drop” governs structural canvas editing, not every button in the application.

## 3. One continuous circuit canvas

### 3.1 Zones and semantic timing

Always show the requested four-stage legend above the grid:

```text
[1 State Prep] → [2 CPC Opening: H, CP] → [3 Payload] →
[4 CPC Closing & Readout: CP′, H, M]
```

Use shared continuous data and ancilla rows. There is one scroll container, timeline and operation model. Vertical zone dividers and background tints indicate stages; they do not create separate boxes with independent wires.

**Preserve physical ordering.** A localized check may open or close inside the workload. Its actual H/taps/readout remain anchored to the correct internal payload boundary, with a labeled local-opening/local-closing marker. Do not move them before/after the whole workload merely to fit four decorative bands. The legend describes roles; per-operation zone tags and nested boundary dividers describe the real schedule.

For the simple guided S/CX/T examples, the four bands can be contiguous. For the capstone, fixed ancilla H is before the workload, local taps occur at their true internal boundaries, and the final H/M shell follows the workload.

### 3.2 Methods that are not CPCs

Do not invent CPC operations for lessons/methods that do not use them:

- Flight School 1: Prep and Noise Experiment are active; CPC bands are visibly inactive and contain no fake ancillas.
- Flight School 2 Detection: show the actual H/controlled-P/noise/controlled-P/H/M implementation on the shared grid.
- Flight School 2 Mitigation: one canvas with a selected λ=1/3/5 variant. Repeated noise channels and intended gates remain visible; no ancilla/CPC shell is fabricated.
- Flight School 2 Correction: the same grid shows encoding, physical noise, parity extraction, conditional recovery, decoding and readout. Use accurate secondary labels within the four-stage framework. A repetition code is not relabeled a CPC.

Generated method operations use lock badges and cannot be deleted independently unless the lesson explicitly offers manual construction. Editing the player's base circuit or noise changes the generated layer atomically. Read-only ownership is visible and enforced on the server.

### 3.3 Logical anchors versus display columns

Keep circuit timing independent from screen coordinates:

```ts
type Anchor = {
  region: "preparation" | "payload";
  boundary: number;
  event: "fault" | "close" | "open" | "gate" | "readout";
  order: number;
};

type CanvasNode = {
  id: string;
  kind: "gate" | "check-tap" | "ancilla-h" | "measurement" | "noise";
  owner: "player" | "generated-method" | "fixed-fixture";
  zone: 1 | 2 | 3 | 4;
  anchor: Anchor;
  wireIds: string[];
  checkId?: string;
  editable: boolean;
};
```

These are proposed adapter types, not application changes in this task. Existing lesson schemas may retain separate preparation/payload arrays internally; `buildTimeline` flattens them into one render/edit model. One shared canvas is the UI requirement, not an excuse to merge distinct execution semantics.

The existing sandbox boundary order remains faults → reverse stable-ID closings → stable-ID openings → payload gates. The capstone retains its explicit rail-order scheduler. Screen-zone labels must never change those schedules.

## 4. Strict drag/drop editing and trash

### 4.1 Structural action policy

| Action | Required interaction |
| --- | --- |
| Add H/X/S/rotation/T/etc. | Drag configured palette item onto an allowed slot |
| Add controlled gate | Drag gate, then drag its endpoint handle to the second wire |
| Add opening/closing check factor | Drag P/P′ factor to the chosen wire and check boundary |
| Add helper H or measurement | Drag the corresponding ancilla item to an eligible helper slot |
| Add deterministic X/Z/Y fault or wait | Drag an orange noise item to a wire/boundary |
| Move gate/noise/check factor | Drag its placed node or endpoint handle |
| Remove editable item | Drag its node into the canvas Dustbin |
| Add stochastic noise location | Drag a channel marker; a clickable probability-noise slot may select/configure a stochastic location |
| Change stochastic probability | Slider or numeric field; no click-created deterministic gate |

Remove empty-cell `onClick` placement, “Add Gate,” “Add Helper,” “Inject X/Z” click placement and guided “Place H/M/Tap” buttons. Do not retain an invisible click fallback or make a tap-to-select/tap-to-place sequence the mobile implementation.

Clicking/focusing a placed gate may show its name/tooltip but never adds, moves or deletes it. Configure rotation angles and other gate parameters in the palette **before dragging**; change an existing gate by source editing or delete/re-drag. Do not recreate a Gate Inspector under a different title.

### 4.2 Drag state machine

```text
Idle → Lifted → OverEligibleSlot / OverInvalidSlot / OverTrash
     → Committed or Cancelled → Idle
```

- Use pointer events/drag overlays for mouse, touch and stylus; do not depend exclusively on HTML5 desktop drag events.
- Touch uses a short hold to lift. An ordinary swipe scrolls the canvas. Auto-scroll near canvas edges while carrying an item.
- Keyboard users focus an item, press Space to lift, navigate eligible targets with arrows, and press Space/Enter to drop. Escape cancels. The Dustbin is a named keyboard drop target. This is keyboard drag/drop, not click-to-add.
- The drag payload carries only an internal capability token/type and item ID. Never trust arbitrary transferred JSON as an executable circuit.
- Show a ghost, eligible targets and the exact intended wire/boundary. Invalid drops do not change the model.
- Controlled gates reserve both wires only on a completed second-endpoint drop. Escape cancels an unfinished connector without leaving a one-wire CX.
- For multiwire products, each dropped factor is a controlled tap owned by the same check. Do not create one independent helper/check per factor.
- Commit each complete drop as one undoable transaction. Validate arity, bounds, occupancy, ownership and budgets before committing.

### 4.3 Dustbin semantics

Place a prominent labeled **Delete — drop here** zone on the canvas boundary, fixed relative to the visible canvas. Show a Trash icon and drag hover state; a tiny toolbar icon alone is insufficient.

- Any player-owned gate, check factor, helper stage or noise block can be deleted by dragging into it.
- Deleting one factor removes only that factor, not the entire check product or all factors with the same axis.
- Deleting an opening/final H or measurement in a manually constructed check leaves an incomplete amber assembly.
- A check's draggable ownership/rail handle represents the complete check; dropping that handle deletes all of that check's player-owned stages in one transaction.
- Fixed payload gates and fixed/generated shells cannot be dragged or deleted. Display the lock reason; a rejected trash drop leaves the model untouched.
- Independent noise copies delete independently. A grouped multi-target wait has a distinct group handle to delete the group; each per-wire node can be deleted to remove only that target.
- After deletion, focus a nearby valid element, announce what was removed, invalidate stale physics, and offer Undo. No confirmation modal for reversible one-item deletion.

### 4.4 Code and example actions

Visual/code mode remains available. Supported source is an explicitly labeled safe teaching DSL, not arbitrary Python execution. Applying source is an intentional alternate authoring route, not a hidden click-placement handler.

Loading an example may replace the draft as one explicit undoable action. It does not earn completion without the required accepted run/quiz. Dirty source is applied or discarded explicitly before a visual mutation; do not overwrite it on drag or Run.

## 5. Multi-target decoherence and other noise

### 5.1 Targets and grouping

One-qubit local decoherence channels can be applied independently to any eligible set of wires. A shared wait duration does not imply correlated noise.

Palette controls:

- Scope: **Dropped wire**, **Selected wires**, **All eligible wires**.
- A wire checklist for Selected Wires, with clear data/helper labels.
- t slider 0…200 μs; T1 20…200 μs; 0<T2≤min(400,2T1) μs. Preserve existing defaults unless a fixture specifies otherwise.
- Parameters are visible before the drag. Drop on a boundary to create the configured single/multi-target event.

Repeated individual drops can cover any subset. Selecting All applies at the chosen boundary to every eligible wire, including the fifth data wire in a five-data-wire lesson. Do not make the old four-fault-event cap prevent a five-wire wait: one multi-target wait is one authored event expanded into several local channels.

```json
{
  "id":"wait-group-1",
  "role":"error",
  "name":"decoherence",
  "anchor":{"region":"payload","boundary":3,"event":"fault","order":0},
  "targets":[{"kind":"data","index":0},{"kind":"data","index":1}],
  "timeUs":50,
  "t1Us":100,
  "t2Us":80,
  "scopeMode":"selected"
}
```

`scopeMode` describes the authored intent; execution uses the explicit target list. Later increasing the wire count never silently adds targets to an old All event. Offer an explicit scope change if the learner wants the new wire included.

### 5.2 Execution and editing

- Reject duplicates, missing wires, inactive helper targets, non-finite times and T2>2T1.
- Expand a wait into Qiskit local thermal-relaxation channels on the listed wires at the same logical boundary. Apply targets in a canonical order; independent disjoint channels commute.
- No Y/X/Z gate substitutes for a decoherence channel. t is elapsed waiting time, not the relaxation constant T1.
- A group can be moved by its group handle; a per-wire handle moves just that target, splitting the event if its boundary changes.
- Undo restores the complete prior group/target configuration.
- At t=0 the channel is identity, with no fake phase flip. It does not count as a nontrivial experiment where earlier lessons require one.
- Wire shrink identifies affected operations/targets and requires an explicit undoable removal. Never silently retarget to q0.

### 5.3 Lab capabilities and locked fixtures

In free experiments, expose noise drops on all editable data wires. Guided CPC/sandbox experiments may additionally expose active helper wires as clearly labeled exploratory targets; the API must distinguish data and helper identities rather than interpreting both as a data index.

Generated-method and fixed-fixture ownership still applies. A lab may show generated helper/redundancy wires without allowing its canonical method implementation to be rewritten. An exploratory helper-noise overlay must be visibly labeled and simulated separately from canonical completion evidence.

Flight School 6's qualifying noise model remains authoritative. Optional dragged test faults/waits there are **Diagnostic Overlay — not a qualifying run**. They must not modify the fixed benchmark or the stored qualifying score. The qualifying Run uses only the fixture channels. Explain locked targets on invalid drops rather than pretending an override was applied.

Migrate old one-wire noise records to one-target events. Do not broaden old mission schemas or change the meaning of their noise parameters.

## 6. Scientifically correct QSphere visualization

### 6.1 Selection rule

Use QSphere whenever the current experiment has at least two active quantum wires, counting data, redundancy and active ancillas. Use it for separable multiwire states too; entanglement detection is not needed to choose the renderer.

Use Bloch only when there is exactly one active quantum wire and the displayed frame is one-qubit. A single-qubit mixed state can still use its valid shortened Bloch vector. Reduced Bloch vectors of entangled systems are mathematically meaningful, but they do not describe the joint state; this product will no longer use them as the primary multiwire visualization.

The renderer receives both `experimentWireCount` and the displayed frame's wire mapping. A one-qubit reduced-data frame in a two-wire checked experiment still uses the QSphere renderer, clearly labeled as reduced data. Offer the actual joint frame so the learner can inspect the helper correlation. Do not invent amplitudes for missing wires merely to make the picture larger.

For an inactive reserved ancilla rail, do not increase the active wire count. For correction, count the actual active redundancy/syndrome wires, not just logical data qubits.

### 6.2 Pure states

- Use computational-basis labels with explicit ordering, e.g. a0 q1 q0; Qiskit's lowest-index bit is rightmost.
- Place basis nodes by Hamming-weight latitude, with deterministic ordering around each latitude. All 2^n labels must be inspectable.
- Node area is proportional to probability |amplitude|²; radius therefore scales with its square root.
- Color encodes relative complex phase with a legend. Fix one global phase using a deterministic nonzero reference amplitude. Global phase must not alter the displayed relative colors.
- Zero-probability nodes have no defined phase and remain faint/neutral.
- Provide rotate/zoom, reset view, tooltips and a keyboard-readable amplitude/probability table. Respect reduced motion.
- Do not infer phase from counts. Bell states with opposite relative phases must look different even when their Z-count distributions match.

### 6.3 Mixed states after noise or discarded information

A noisy density matrix generally has no unique statevector or phase per computational-basis outcome. Do not compute `sqrt(diagonal probability)` and assign fake phases, and do not label a probability-only sphere as the full quantum state.

Required mixed-state experience:

1. Show **Mixed state**, rank/purity and the joint computational-basis populations on a QSphere with neutral phase coloring.
2. Offer a **Spectral components** selector: ρ=Σ λj |vj〉〈vj|. Show each selected pure component's QSphere and its weight λj.
3. Explain that these are a mathematical decomposition, not a record of which physical error happened. Eigenvectors inside a degenerate eigenspace are not unique.
4. Provide a coherence table or bounded density-matrix view for off-diagonal information; aggregate populations alone cannot distinguish all mixed states.
5. Page all nonzero components rather than showing only the dominant eigenvector as though it were the entire state. State the residual weight if components below numerical display tolerance are omitted.

Use purity tolerance 1e−10 for the pure/mixed display decision, numerical eigenvalue cleanup ≤1e−10 and density-matrix validation. Do not clip material negative eigenvalues or normalize an invalid simulation into looking correct.

Qiskit's QSphere accepts Statevector/DensityMatrix inputs; its installed implementation uses a spectral decomposition for density matrices. The browser implementation should use equivalent quantum data with an explicit mixed-state UI, not a server-rendered static PNG dependency. See [IBM Quantum visualization reference](https://quantum.cloud.ibm.com/docs/en/api/qiskit/visualization).

### 6.4 State frames, measurement and comparisons

Offer explicit frames, as applicable: prepared input, ideal output, unprotected noisy output, joint checked state before measurement, unfiltered output after readout, and accepted output conditioned on all-zero syndrome.

- Joint premeasurement frames may contain coherence between helper branches.
- For an unconditioned postmeasurement joint frame, dephase the measured helper sectors. Do not present the coherent premeasurement state as though measurement had not happened.
- Accepted frames are normalized projected states. Helpers may be displayed as fixed zero bits or reduced away, with the chosen scope labeled.
- When exact acceptance is zero, show **No retained state**, not a perfect QSphere or fidelity.
- Mitigation produces an observable estimate, not a repaired quantum state. Keep its final estimate card; do not invent a “mitigated QSphere.” Its measured noisy variants and ideal reference can have state visualizations.
- Basis-rotated counts and the pre-readout state frame are different things. Label which basis produced a histogram and whether measurement rotations are included in the displayed frame.

### 6.5 Visualization data contract

Add a versioned optional visualization payload while preserving older API fields during migration:

```ts
type StateVisualization = {
  schemaVersion: 2;
  experimentWireCount: number;
  frameId: string;
  scope: "joint" | "data" | "conditional-joint";
  wireOrder: string[];
  stage: "before-measurement" | "after-measurement" | "postselected";
  stateKind: "pure" | "mixed" | "unavailable";
  purity: number | null;
  probabilities: number[];
  amplitudes?: [number, number][];
  spectral?: {rank:number; componentCount:number; omittedWeight:number};
  visualizationToken?: string;
};
```

Pure-state amplitudes are complex [real,imag] pairs in stated wire order. Mixed states never include a fabricated single amplitude vector.

Keep the largest supported tutorial experiment bounded at seven active wires (dimension 128). Inline a pure vector or the first mixed component; page up to four spectral components per response. A bounded coherence view may return selected matrix rows or elements, not an unbounded normal run payload.

Proposed supplemental endpoint: `POST /api/tutorial/state-visualization` with runId/token, frameId, component cursor and requested scope. A bounded in-memory result cache may supply frames. Bind tokens to canonical draft/settings/frame fingerprints; return a useful expired-frame error if a serverless instance lacks the cache. The client can rerun or request a deterministic recomputation from a validated draft. Never display a different run's state on token expiry.

State construction, amplitudes and channel evaluation remain Qiskit 2+ backend work. The browser renders geometry and interaction; it does not implement an alternate physics simulator from measurement counts.

## 7. Lesson-by-lesson behavior and completion

### 7.1 Flight School 1 — Quantum Errors

Retain the full explanations of bit flip, phase flip and decoherence. The learner drags preparation gates and error blocks onto one continuous grid, with 1–5 data wires. No CPC rails are fabricated.

Single-wire runs use Bloch. Any two-or-more-wire run uses QSphere, including Bell states and separable products. Compare ideal/error-free and error-affected frames and counts. Multi-target wait groups apply independent local channels at their selected boundary.

Retain the accepted experiment plus three-question knowledge check completion rule. Deletion, resizing, source edits or resampling do not themselves earn completion.

### 7.2 Flight School 2 — Detection / Mitigation / Correction

Retain detailed theory and free method selection in any order, with repeatable accepted runs. Complete after trying all three methods at least once; no new quiz.

The base circuit and its currently selected physical method are represented on the same continuous timeline. A method switch changes generated layers without deleting the authored base circuit. Generated circuitry is locked and identified; no separate method-preview canvas appears below the editor.

- Detection: show actual ancilla H/controlled-P/H/M, joint syndromes and all-zero post-selection.
- Mitigation: select the λ=1/3/5 variant in the same canvas, explain channel composition and the actual fit/post-processing. No fake corrected state.
- Correction: show the actual encoded data/redundancy/syndrome rails, parity measurements and conditional recovery; full active-wire QSphere plus labeled logical-data view.
- A probabilistic-noise boundary can retain clickable noise-only configuration affordances. Deterministic error gates still require drag/drop.
- Multiple noise targets must be simulated explicitly, not silently ignored by a one-wire model. If the repetition-code family protects only one selected logical wire, label other noise targets as unprotected; do not claim simultaneous universal correction.

### 7.3 Flight School 3 — Coherent Pauli Checks

Rebuild the guided S exercise on the same canvas: drag H onto a0, opening controlled-X onto q0, closing controlled-Y after the locked S, final ancilla H and measurement. The control is always the ancilla; the data wire is the controlled target.

No detached prep editor, payload editor or H/tap slot-card assembly remains. A correct X→S→Y loop is green. Complete mismatches are red and can run false-alarm diagnostics; missing physical stages are amber and cannot run.

Keep the full sandbox after the accepted guided run. User-authored input/payload/checks occupy the same timeline with exact logical boundaries. Allow dropped X/Z/Y test faults and single/multi-target waits, including explicit helper-noise exploration where enabled.

Retain certification: accepted valid noiseless guided run, accepted valid nontrivial sandbox fault experiment, and the S-gate MCQ answer B. A zero-time wait, trace-only response or obsolete result does not earn experiment evidence.

Audit every Flight School 3 preset and guided code round trip. The user's earlier “third example” complaint is not treated as one assumed isolated bug: test control direction, product factors, signs, boundary timing, stage completeness, helper ownership, visualization frames and stale-response behavior across this lesson.

### 7.4 Flight School 4 — Multi-Qubit Propagation

Use the fixed guided CX(0,1) payload, zero input, opening boundary 1 and closing boundary 3. Drag opening X0 and closing X0 and X1 as two factors of one product on one helper. All H/M controls are dragged in manual construction.

```text
Expected: CX X0 CX† = X0 X1
One closing factor X0: red incomplete operator match
Closing +X0 X1: green invariant closed
One product: one ancilla syndrome bit
```

Use QSphere for the two data wires and the active helper frame. Green feedback is based on full operator/schedule validity, not whether one input happened to give syndrome zero.

The four-data-wire Clifford sandbox from the source specification remains available for replay/exploration after the guided success or existing access, with CX/CZ/SWAP and signed products. Its custom fault run is optional for this lesson's new completion rule.

**Required local MCQs:**

1. Opening X before S: closing X / Y / Z / I. Correct **B: Y**, because S X S†=Y. This is a local recap; it does not alter Flight School 3's saved certification.
2. Opening X0 before CX(0,1): X0 only / Z1 only / X0 and X1 / Z0 and Z1. Correct **C: X0 X1**.

Both allow unlimited retries and explanatory feedback. A mismatch can cause false alarms without implying every shot must return one.

**Complete:** current accepted valid noiseless guided multiwire check with green closure **and both MCQs correct**. A green preview alone is insufficient evidence that the experiment executed. Continue opens Flight School 5.

### 7.5 Flight School 5 — T-Gate Barrier

Offer 1–5 data wires and a draggable gold T/T† palette. The simple comparison starts with an empty editable payload slot; drag T into it rather than clicking a preset “Place T” action. A Reset cannot auto-certify anything.

Drag X/Y/Z check taps across the chosen T window. Show the actual operator arriving at T:

```text
T X T† = (X+Y)/√2
T Y T† = (Y−X)/√2
T Z T† = Z
```

X/Y paths that leave the Pauli family turn the relevant connector red with an operator-expansion warning. Z/I at T is locally compatible. The opening letter alone is insufficient: preceding H/CX may change its factor at the T location.

Keep exact global closure distinct from stepwise support: X→T→T→Y can close globally while leaving the Pauli axes in the middle. Never fabricate false alarms for a globally closed schedule. Continue to permit clearly labeled exact diagnostic simulations.

Use QSphere whenever active data/helper count is at least two. Preserve a state visualization separately from the operator-expansion inspector: an operator sum is not a statevector.

**MCQ:** which nonidentity Pauli passes one T unchanged: X / Y / Z / X and Y with an S afterward? Correct **C: Z**.

**Complete:** an accepted valid canvas experiment with a nontrivial check crossing at least one T on a wire with a Z factor at that crossing, plus correct C. The default Z→T→Z fixture satisfies this. An I-only remote crossing, empty payload, T in the input prefix only, or a non-Pauli diagnostic does not satisfy the Z-commutation objective. The old mandatory X/T diagnostic observation is now optional.

Continue opens Flight School 6, not selected main missions.

### 7.6 Flight School 6 — Fixed-Workload Capstone

Retain the source specification's fixed three-data-wire Clifford payload, authoritative data noise and noisy controlled-tap model. Do not simplify/cancel its workload gates during simulation.

The same continuous grid includes the two fixed ancilla shells, active/bypassed state and actual internal opening/closing windows. Drag P and P′ factors into the eligible catalogue slots. No click-based product dropdown or Add Rail structural action remains. Dragging the first check handle onto an eligible rail activates its fixed shell; trashing that handle bypasses it. Fixed H/H/M blocks are locked.

Allow a dragged diagnostic noise overlay only as a visibly separate experiment. Qualifying score and benchmark use the immutable fixture channels.

Show exact full-data retained fidelity F_ps, exact all-zero acceptance r, score F_ps×r, sampled N_kept/N, kept/discarded shots and sampling overhead. Real-time construction/connector feedback is cheap and debounced; expensive exact noisy evaluation runs on Run or a cancellable debounce after a completed drop, never on every pointer movement.

**Qualify:** accepted current valid nonempty check strategy with exact F_ps×r≥0.65. Require no hidden 0.90 fidelity floor or mandatory two-strategy comparison. Those remain optional learning targets and comparison tools. An unchecked circuit can show its legitimate score but cannot satisfy “design a check.”

After qualification, invoke the backend Paulice reveal flow in Section 8, display the player's qualifying strategy beside the computed suggestion and the certified allowed-catalogue result where available, and require review/acknowledgement before graduation. Do not require matching the benchmark winner.

Graduate through the existing onFinish flow, preserving old progress, and unlock all main missions 1–10. Skip remains available independently.

## 8. Paulice reveal, optimum claims and scoring integrity

### 8.1 Required qualification-triggered request

Introduce `POST /api/tutorial/graduation-lab/reveal`. Submit the immutable fixture version and canonical qualifying strategy, not a client-supplied fidelity/score.

The backend:

1. Revalidates/reruns the strategy and confirms score≥0.65 with an active valid check.
2. Resolves the matching fixture/noise/scheduler/metric fingerprint.
3. Invokes installed `qiskit-paulice` for its supported Clifford check-search protocol, or returns a provenance-tagged cached result from a prior actual invocation with the same key.
4. Validates any proposed mapping back into the game's strategy/circuit model.
5. Evaluates comparable mapped candidates with the game's exact noise/state engine.
6. Loads/verifies the exhaustive allowed-catalogue certificate when that finite search is complete.
7. Returns truthful, separately labeled results and exact placement diagrams.

Do not rename an artifact GET request “a Paulice call,” and do not reuse `backend/research.py`'s observable-specific fidelity estimate as common retained-state fidelity.

### 8.2 Result categories

```text
Your qualifying strategy:
  exact retained-state fidelity, acceptance, product, placement, resources

Paulice-suggested strategy:
  actual tool/version/protocol provenance
  native objective/cost, separate from game score
  mapped exact game metrics only if faithfully comparable

Certified best within the allowed game catalogue:
  exact same metric/noise/schedule
  enumerated/valid/evaluated counts, certificate hash and winning placement
```

Paulice provides heuristic check search; an actual call does not prove a maximum theoretical score over every possible circuit. The source paper describes heuristic candidate generation rather than that guarantee. See [Martiel & Javadi-Abhari, arXiv:2504.15725v1](https://arxiv.org/html/2504.15725v1).

The existing capstone catalogue has 36 individual candidates and at most 1297 structural strategies before combined-schedule filtering. A complete evaluation can certify a maximum **within that declared set**, not outside it. With the latest score-only qualification rule, the primary catalogue winner is the best nonempty valid strategy without a hidden fidelity-floor constraint. The unchecked/unconstrained result remains a separately labeled comparison. An optional F≥0.90 winner can remain as an additional quality-target comparison, never the only displayed “optimum.”

The theoretical upper bound 1 is not an experimentally achieved or tool-computed optimum and must not be displayed as such.

### 8.3 Mapping and failure behavior

- Preserve original payload anchors and the declared gate/channel schedule. A mapped candidate must satisfy the same whole-input noiseless invariant and active-helper limits.
- If Paulice emits a circuit outside the game's allowed catalogue or a different observable-specific protocol, label **Research candidate — not directly comparable**. Do not fabricate an equivalent player strategy or game score.
- Report unavailable/unsupported tool calls, version mismatches, failed mappings and timeouts explicitly. Retry is available. Saved qualification is not erased.
- A completed failed-attempt response may offer an acknowledgement of the limitation and the verified finite-catalogue comparison, instead of permanently blocking graduation on an external tool condition. Do not silently pretend the required tool call succeeded.
- Cache by complete versioned physics/protocol key. Bound compute and response size; do not exhaustively search on every view or pointer move.
- Recompute/update the benchmark artifact for the latest objective. The partially generated old `bestQualityEligible` result alone does not certify the newly requested primary score-only winner.

## 9. Physics and API invariants

All state evolution, gate matrices, channels, syndrome probabilities and fidelities use Qiskit 2+ backend code. Render geometry only in the browser.

- Validate P′=U P U†, including product signs. A negative controlled closing requires visible ancilla phase compensation.
- Validate the combined helper-zero isometry for every data input, up to one global phase, not just the currently prepared state.
- Do not construct a Qiskit Clifford object from a T-containing circuit. Preserve exact signed Pauli expansions and global-versus-stepwise verdicts.
- Build actual H/controlled-P/U/controlled-P′/H/M circuits. A drawn connector alone is not the check implementation.
- Use a true joint syndrome/data distribution. Derive all-zero retained samples from the joint distribution, not products of marginal acceptance rates.
- Noise on a helper can create false flags; distinguish that from an invalid noiseless construction.
- Exact retention and fidelity are invariant under sampling seed/count. Display counts as finite samples.
- Validate grouped target lists, operations, owner policies, source limits, dimensions, body size and compute capacity on the server.
- In-flight runs, visualization requests and reveals carry canonical revision/fingerprint keys. Superseded responses cannot award progress or replace a current state frame.

Keep old API contracts available during migration. Add adapter/versioned fields for grouped noise and visualization rather than silently changing a one-wire field's meaning. New detailed tutorial schemas must not relax main-mission permissions.

## 10. State, completion evidence and migration

Separate these concerns:

```text
Physical draft: operations, checks, grouped noise, immutable fixture identity
Canvas view: selection, drag state, viewport and folded inactive zones
Source view: text, dirty flag and diagnostics
Accepted execution: canonical draft/settings, run ID and exact/sampled result
Visualization: frame ID, scope, component cursor and request revision
Lesson evidence: accepted objectives and correct submitted quiz answers
```

Use a new content/interaction revision for changed completion requirements. Preserve `quantum-shield-qed-v2` fields and all previous unlocks/bests. Do not invalidate global access because a tutorial has a new certification rule.

- Migrate single-target errors to target-list events without changing physics.
- Preserve valid existing drafts/source. If a new canvas cannot represent an old draft yet, offer the supported source view or a focused migration notice; do not erase unrelated lessons.
- Keep existing lesson progress keys or explicit adapters. Add two independent local FS4 answers (B and C); do not infer both from a single old quiz flag.
- Existing skipped/completed profiles retain access. They may replay to earn the revised badges.
- FS4 custom-fault and FS5 barrier-observation achievements may remain in history but are no longer mandatory gates.
- FS6 qualification evidence is versioned by fixture/noise/scheduler/metric and must be rerun against the changed acceptance policy when needed; old mission access remains untouched.
- Bound histories, cached frames and comparison logs. Store no unbounded complex matrices in localStorage.
- Source application, grouped deletion, move/retarget and complete DnD placement are atomic undoable transactions.
- Storage failure leaves an in-memory usable session. A corrupt entry resets only that entry with an explanation.

## 11. Proposed implementation map

```text
src/components/workspace/
  LearningWorkspace.tsx                keep and reuse for all six lessons
src/components/circuit-workspace/
  UnifiedCircuitCanvas.tsx             one grid, ruler, wires and zones
  CanvasPalette.tsx                    pre-drag gate/noise configuration
  CanvasNode.tsx                       ownership and drag handles
  CheckConnectorLayer.tsx              product paths and validity labels
  CanvasTrashTarget.tsx                pointer/touch/keyboard deletion
  NoiseScopeControls.tsx               explicit wire targets and timing
src/components/state-visualization/
  QuantumStateView.tsx                 one-wire Bloch / QSphere routing
  QSphere.tsx                         pure-state geometry and phase legend
  MixedStateControls.tsx              spectral pages, populations, coherence
  StateAmplitudeTable.tsx              accessible numerical equivalent
src/lib/circuit-workspace/
  model.ts, capabilities.ts            strict item/owner/drop contracts
  timeline.ts                         logical anchors ↔ display columns
  reducer.ts                          atomic operations and history
  drag-controller.ts                  pointer/touch/keyboard state machine
  lesson-adapters.ts                   existing schemas → shared canvas
src/lib/state-visualization/
  contracts.ts, geometry.ts            bounded response and geometry models
backend/learning/
  visualization.py                    Qiskit states → bounded frame payloads
  noise_targets.py                    validated independent local expansion
backend/graduation_lab/
  paulice_adapter.py                  actual tool call, mapping and provenance
```

Use equivalent names if an existing suitable component already exists. Avoid creating another competing canvas framework beside the first one.

Replace the visual authoring responsibilities of `PreparationCanvas`, `GateEditor`, `AdvancedGateEditor`, guided slot cards, separate `CheckDesigner` forms and click-based `StrategyDesigner` product controls with the shared canvas/adapters. Keep useful theory, safe parsers, validated simulation services and result calculations.

Remove inspector rendering/state and dead event handlers once callers migrate. Do not leave hidden panels mounted or a legacy click-to-add branch behind a mode toggle.

Wire zero-based tutorial steps 3/4/5 to the integrated Flight School 4/5/6 workspace components. Update all lesson selectors and titles to the final order. Retain legacy numeric tutorial endpoints for compatibility until all their callers/tests are intentionally migrated.

Before future Next.js edits, read the applicable local Next documentation required by AGENTS.md. No Next.js changes are part of the present documentation task.

## 12. Future execution roadmap

1. **Inventory and baseline:** preserve current work, record test results and identify unfinished advanced-module wiring. Do not claim a green baseline from a prior turn without rerunning appropriate checks.
2. **Contracts and pure helpers:** add ownership/drop policies, grouped targets, timeline anchors, visualization schemas and migration adapters with meaningful unit tests.
3. **Shared canvas:** implement one-grid rendering, pointer/touch/keyboard drag, controlled endpoints, local-window connectors and trash transactions. Remove all click-placement and Gate Inspector behavior.
4. **State visualization backend:** produce correct pure/mixed/joint/conditional frames from Qiskit and bounded component/coherence requests; verify against known density matrices.
5. **QSphere frontend:** implement dimension routing, amplitude geometry, phase legend, mixed-state components, tables and null-state behavior.
6. **Migrate FS1 and FS2:** preserve their pedagogical goals, generated method distinctions and source equivalence; add multi-target waits.
7. **Rebuild/audit FS3:** one physical grid, correct control direction, signed propagation, stage completeness and honest syndrome diagnostics.
8. **Integrate FS4/FS5:** new three-pane routes, DnD multiwire/T tasks, updated two-question/one-question completion and previous-access behavior.
9. **Integrate FS6:** fixed workload/shells, DnD checks, exact score-only qualification, actual Paulice reveal and versioned catalogue comparison.
10. **Regression and presentation:** run old/new physics and frontend suites, migrate end-to-end interactions to real drag/drop, verify desktop/mobile screenshots and the production build.

Do not deploy, add a database, invent leaderboard behavior or alter mission physics during this tutorial-only pass.

## 13. Acceptance tests and release checklist

### 13.1 Canvas and interactions

- Every lesson uses the same three-pane shell at desktop and persistent pane navigation on mobile; FS4–6 never enter legacy layouts.
- There is exactly one visible editable circuit grid per lesson/method view, with continuous wires and the four-stage legend. No independent prep/payload/check canvas remains.
- Clicking/tapping any empty deterministic-gate slot causes no structural mutation. No Add Gate/Add Helper/Place H/Inject X click handlers remain.
- Dragging a gate places it once; moving it preserves its ID and timing semantics. Invalid occupancy, wrong zone, locked item and cancelled drags leave the draft unchanged.
- CX/CZ endpoints require distinct wires and atomic completion; no invalid half-gate survives.
- Mouse, touch and keyboard drag/drop can create, move and trash an item. Edge auto-scroll works without turning ordinary touch scrolling into placement.
- Trashing one gate/factor/noise target removes only that item; undo restores it. Trashing a group/check handle removes its defined scope atomically.
- No Gate Inspector or equivalent detached edit/delete panel appears in any lesson or source mode.

### 13.2 QSphere and state correctness

- One active qubit uses Bloch; two or more active wires use QSphere even if separable. An inactive reserved helper does not count.
- Bell |00〉+|11〉 and |00〉−|11〉 have identical node probabilities and different relative-phase colors; neither is replaced with two zero Bloch vectors.
- A multiwire product state also uses QSphere. A one-qubit marginal in a multiwire experiment is labeled as a marginal and never presented as the full joint state.
- A global phase change leaves relative-phase display unchanged. Zero amplitudes have undefined phase.
- Mixed states use real populations plus weighted spectral components/coherence information. The renderer never manufactures phases from counts or uses only a dominant eigenvector as the complete state.
- Spectral reconstruction matches the backend density matrix within tolerance; degenerate components are labeled non-unique.
- Premeasurement coherence, postmeasurement dephasing and conditioned helper-zero states are distinguished.
- No survivors yields no state. Mitigation has no fabricated final-state QSphere.
- Frame responses are bounded, accessible, correctly ordered and excluded when stale/expired.

### 13.3 Multi-target noise

- Place waits separately on q0 and q1, on selected q0/q2, and on all five data wires; every selected target is actually simulated.
- A grouped wait at the same boundary equals the tensor product of the corresponding independent local channels.
- All mode includes explicit eligible helpers where the lab permits them, never inactive/fixed uneditable wires silently.
- Remove one target, move one target, trash the whole group, undo and resize; verify scope and state equivalence after each operation.
- t=0 is identity. Invalid T2, duplicate targets and out-of-range wires produce actionable errors.
- Diagnostic helper/capstone noise is not confused with the canonical method or immutable qualifying fixture.

### 13.4 Lesson and reveal evidence

- FS1/FS2 retain their established accepted-run/quiz or three-method completion rules.
- FS3 accepted X→S→Y construction, sandbox fault evidence and B still work through the new canvas; wrong operator, missing stage and wrong control direction never certify.
- FS4 closing X0 alone is red; +X0X1 is green. Both B and C local quiz answers are required; old one-answer evidence cannot satisfy both.
- FS5 a real Z-supported T crossing plus C certifies; an empty/remote-I-only crossing does not. A barrier diagnostic is optional and never falsely labeled valid protection.
- FS6 no-check score is displayed honestly but does not qualify; a valid nonempty score≥0.65 does, without a hidden fidelity floor or mandatory comparison count.
- Qualification sends the reveal request. Tests verify a real Paulice invocation/cached-invocation provenance, mapping validity and independent exact evaluation rather than a canned suggestion.
- Certified maxima state their finite search space and matching metric; unsupported/unavailable results are explicit. Acknowledgement preserves access without fabricating tool success.
- Source, visual, native-Qiskit and restored-draft paths agree on physical circuits and outputs. Failed/stale responses never award progress.

### 13.5 Required implementation checks

Run `pytest tests`, `pnpm typecheck`, `pnpm test`, existing/new Playwright desktop/mobile suites and `pnpm build` during implementation. Replace obsolete click-based end-to-end steps with actual pointer/keyboard/touch drag flows; preserve their meaningful physics, persistence and mission-access assertions.

Capture reviewed desktop/mobile evidence for each lesson, including a Bell QSphere, mixed-state view, single-item trash deletion, multi-target wait, valid/invalid product, T barrier and the capstone reveal. Add no tests that merely mirror CSS or restate a reducer implementation.

No application tests or implementation completion are claimed by this documentation-only revision. The future implementation is complete only when every applicable requirement above is verified in the actual integrated lessons.
