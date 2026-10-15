# LeetCode Workspace and Flight School 1 — Implementation Specification

**Status:** Implementation-ready design for a future pass. This revision changes this Markdown document only.
**Revision:** 15 October 2026.
**First implementation target:** Flight School 1 only.
**Lesson ID:** `flight-school-1`.
**Lesson name:** **Understanding Quantum Errors**.

## 1. Product direction and scope

Build a consistent LeetCode-inspired learning workspace: substantial lesson content on the left, an interactive circuit/code workspace on the upper right, and experiment results on the lower right. Reading, experimenting, and comparing results should not require navigating between pages.

Redesign lessons **one at a time**. Establish the reusable workspace shell while implementing Flight School 1, then wait for the user's individual specifications before changing Flight School 2–6 or Missions 1–10. The shell is a reusable target architecture, not an instruction to replace every existing level in one batch.

This module teaches bit flips, phase flips, and time-dependent decoherence to beginners through detailed explanations, animated examples, a freely editable experiment, and three MCQs. It is not a fidelity optimization challenge or a spacetime-check puzzle.

### 1.1 Explicit exception to fixed payloads

In **this introductory sandbox**, the player **can prepare their own state** with basic gates. They need to discover how the same error acts differently on different states.

The main QED missions retain fixed, authoritative payloads. They may later reuse the same layout with payload editing disabled. Do not weaken their server-side integrity checks, widen their gate permissions, or move them onto this editable sandbox API.

### 1.2 Learning outcomes

The learner should be able to:

1. Explain why physical qubits experience unwanted changes.
2. Predict X acting on zero and one.
3. Predict Z acting on plus and minus, and explain the Z-measurement blind spot.
4. Distinguish an intentional preparation gate from an injected error, even when both use the same operator.
5. Explain that decoherence develops over time and can affect both energy populations and phase coherence.
6. Prepare a state, insert an error, and compare before/after Bloch vectors and measurement counts.
7. Distinguish exact simulator probabilities from finite sampled counts.

### 1.3 Scope boundary

| Implement next | Wait for later specifications |
|---|---|
| Shared workspace shell, mounted for Flight School 1 | Migrating all existing lessons and missions |
| Detailed X/Z/decoherence lesson and examples | Redesigning Flight School 2–6 |
| Editable state preparation on 1–5 qubits | Editing main-mission payloads |
| Visual canvas and editable supported code mode | Arbitrary hosted Python/notebook execution |
| Bloch views, probabilities, counts, and three MCQs | Syndrome checks, post-selection, mission scoring, leaderboards |
| Optional ordered combinations of errors | New objectives for any other level |

## 2. Shared workspace layout

### 2.1 Desktop composition

Use a compact header and a full-height three-pane workbench. Retain application identity, but prioritize readable content and working space over a large hero or decorative mission cards inside the lesson.

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ Back to Flight School | 01 Understanding Quantum Errors | Lesson selector     │
├────────────────────────────┬──────────────────────────────────────────────────┤
│ THEORY & TASKS              │ EXPERIMENT                                       │
│                            │ [Visual circuit] [Code]          [Run] [Reset]   │
│ Overview                   │ Qubits [1–5]  Preparation gates  Error blocks    │
│ What errors are            │                                                  │
│ Bit flip                   │ q0 |0〉──[H]────[phase_flip]──────────────────     │
│ Phase flip                 │ q1 |0〉──────────────────────────────────────     │
│ Decoherence                │                                                  │
│ Guided examples            │ Selected block inspector                         │
│ Try your own experiment    │ Decoherence: elapsed t [slider] · T1/T2          │
│ Knowledge check            ├──────────────────────────────────────────────────┤
│                            │ RESULTS                                          │
│ Independently scrollable   │ Compare [Before/after selected error ▾]          │
│                            │ Qubit [q0 ▾]  Measurement basis [Z | X]          │
│                            │ Before / reference       After / affected       │
│                            │ [Bloch sphere]           [Bloch sphere]          │
│ [Knowledge check]          │ Paired probabilities, counts, and explanation   │
└────────────────────────────┴──────────────────────────────────────────────────┘
```

Default horizontal split: **36% theory / 64% right workspace**. Default right-side vertical split: **60% experiment / 40% results**. Both splitters are resizable.

Use the desktop composition at available viewport widths of at least **1,100 px**. Target minimum widths of approximately 320 px for theory and 560 px for the right column. Clamp resizing to keep both usable. Base constraints on available workbench width rather than assuming a permanent wide sidebar.

Use a header around 56–64 px high and fill the remaining dynamic viewport height. Each pane scrolls internally. Circuit/code content can scroll horizontally inside its pane; the page itself must not overflow horizontally.

### 2.2 Header and theory pane

The header shows lesson number/name, Back, completion state, a lesson selector following current unlock rules, and compact Help. Keep Skip Tutorial / Unlock All Levels discoverable. Show engine availability unobtrusively; package strings and backend implementation details do not belong in the primary learning header.

The theory pane has Description, Examples, and Knowledge Check sections or tabs, plus section links for the three errors. Description is the default. Render the complete learner-facing content below, including mechanisms, transformations, and consequences for circuits. A few short cards or a paragraph above a slider are not sufficient.

Support readable mathematics, text equivalents, small state-transition illustrations, and Load Example buttons. Body text should be at least 15–16 px with comfortable line height and line length. Keep section navigation and a Knowledge Check action reachable as the article scrolls; do not make the entire long article one sticky element.

### 2.3 Experiment pane

Provide **Visual circuit** and **Code** tabs. Code is editable using the supported API in section 7, not a read-only preview. Both modes represent one canonical circuit.

Place Run, Reset, Undo, and Redo in a stable toolbar. Organize the palette into **Prepare a state** and **Inject an error**. A preparation X and an error-role `bit_flip` perform the same operator, but their roles in the reference comparison must be visually distinct.

Keep the selected block inspector in a consistent position. Switching blocks must not move the Run button. The inspector holds target wires, rotation angles, and waiting-time controls as appropriate.

### 2.4 Results pane

Before a run, show an explicit empty state. After a real simulation, show the returned state pair, measurement basis, Bloch views, counts, and a short interpretation. After an edit, retain the result with **Previous run — settings changed** until rerun.

Do not show mission scores, post-selection overhead, helper budgets, or stars here. This lesson has no detection filter; all sampled shots are used.

### 2.5 Responsive and accessible behavior

Below the desktop breakpoint, use accessible full-width **Theory / Experiment / Results** pane tabs. Preserve their state and scroll positions. On first entry on a phone, open Theory. A successful Run can open Results; invalid input remains in Experiment with useful focus/error feedback.

Do not squeeze three narrow desktop panes onto a phone. Circuit, code, and large histogram content scroll inside their containers. Main controls should have approximately 44 px touch targets.

Splitters need keyboard adjustment, visible focus, separator semantics, constrained sizes, and Restore Default Layout. Save pane preferences locally. Respect reduced motion and do not rely on color alone for selection or errors.

Drag-and-drop is optional input, not the only input: selecting a palette item and activating a cell by mouse, keyboard, or touch must also place it. Provide accessible controls for moving, editing, and deleting selected blocks.

## 3. Complete learner-facing description

Use this as the content baseline. Formatting can improve during implementation, but preserve the explanations and scientific distinctions.

### 3.1 What can go wrong with a qubit?

**Before we learn to protect a quantum circuit, let's learn what can damage its information.**

A classical bit is measured as 0 or 1. A qubit is also measured as 0 or 1 in the usual computational measurement, but it has more structure before measurement. For example, plus and minus are different superposition states even though both produce 0 and 1 equally often in that measurement.

Think of the Bloch vector as a tiny arrow. Gates turn it deliberately. An error is an unwanted change to the state or intended operation. Some errors turn the arrow; interaction with the environment can also shrink it, meaning the state is a statistical mixture rather than one pure state.

Real qubits are physical devices. Stray fields, imperfect control pulses, timing/frequency fluctuations, neighboring qubits, and environmental interactions can disturb them. The exact mechanisms depend on the hardware. Here we isolate simple error models so you can understand one effect at a time.

You will prepare a state, inject an error, and inspect the difference. There is no best score to chase. Experiment and rerun as often as you like.

### 3.2 Bit flip: X swaps zero and one

A **bit flip** exchanges the computational basis states:

```text
X |0〉 = |1〉
X |1〉 = |0〉
```

If a circuit should leave a qubit in zero but an unwanted X occurs before measurement, you now measure one. The same error changes one into zero.

On the Bloch sphere, X corresponds, up to an irrelevant overall phase, to a half-turn about the X axis. The north and south poles exchange places. Bit-flip-like behavior can result from unwanted excitation, interactions, or control mistakes.

A physical noise process can produce errors unpredictably. In this sandbox, a `bit_flip` block deliberately applies **one known X error** so you can inspect it. This is not a random-probability X channel unless a later lesson explicitly introduces one.

**The input matters.** X leaves plus unchanged. It changes minus only by an overall sign, which does not change measurement predictions. An X that completely changes zero can be harmless to another state.

**Try it:** run a blank one-qubit preparation with a `bit_flip` at the end. Then prepare one using a preparation X and repeat. Finally prepare plus using H and compare.

### 3.3 Phase flip: Z changes the relative sign

A **phase flip** changes the relative sign between the zero and one components:

```text
Z |0〉 = |0〉
Z |1〉 = −|1〉
Z |+〉 = |−〉
Z |−〉 = |+〉

|+〉 = (|0〉 + |1〉) / √2
|−〉 = (|0〉 − |1〉) / √2
```

The minus sign on a complete one state is an overall phase and does not alone make a different physical state. The relative minus sign in the minus superposition, however, changes interference when later gates act.

Phase disturbances can arise from unwanted frequency shifts, fluctuating fields, timing mistakes, and environmental interactions. Z models one full phase flip. Other disturbances may be partial rotations or gradual dephasing.

**The Z-measurement blind spot:** measuring plus immediately in Z gives zero or one equally often. Measuring minus in Z also gives zero or one equally often. The phase changed, but these two immediate probability bars did not.

The Bloch arrow reveals the difference: plus points along +X and minus along −X. Choosing **X-basis measurement** also distinguishes these particular states: plus produces the + outcome, minus the − outcome.

**Why this can change a circuit's answer:** H followed by H returns an initial zero to zero. Put Z between those H gates and the final state becomes one. A phase error is not harmless just because an earlier Z-basis histogram looked unchanged.

**Try it:** prepare plus with H and insert `phase_flip`. Compare the arrows, first with Z counts and then X counts. Add a later H and compare the final outputs with and without the error.

### 3.4 A full flip versus a slow change

The X and Z blocks represent complete operations. A phase flip maps plus to minus; it is not itself a slowly accumulating loss of coherence.

The illustrations can animate the arrow turning to make this transformation easier to follow. That is an explanatory replay, not a claim that a statistical mixture gradually becomes a coherent minus state.

A separate, clearly labeled **Gradual phase drift — a rotation** illustration can show:

```text
(|0〉 + exp(iφ)|1〉) / √2, with φ increasing from 0 to π.
```

It starts at plus and ends at minus; intermediate pure states rotate around the equator. Expressing that operation as RZ changes only an overall phase. This illustration is not a new required sandbox block or assessment task.

Random phase flips/dephasing are different: uncertainty about phase can shorten the Bloch arrow. It need not rotate plus smoothly into a definite minus state.

### 3.5 Decoherence: information changes while you wait

Qubits interact with their environment while waiting. **Decoherence** broadly describes losing the quantum information needed to maintain an intended state. This lesson's waiting block includes:

- **Energy relaxation, T1:** excited one tends toward zero in our zero-temperature model.
- **Loss of phase coherence, T2:** X and Y components decay, weakening phase relationships.

**t** is the time you wait. **T1** and **T2** describe how quickly information is lost. They are not the same control.

If you prepare one, the probability of still measuring one after waiting is:

```text
P(1 at time t) = exp(−t / T1).
```

At t = 0 it is still one. At t = T1, about 37% of repeated measurements give one and 63% give zero. Every qubit does not suddenly flip at exactly T1; this exponential describes probabilities over repeated runs.

For an initial plus state, phase coherence decreases with time. Energy relaxation also pulls its arrow toward the zero pole. This differs from Z turning plus into minus. The state can become mixed, and its arrow can lie inside the sphere.

**Try it:** prepare one, add `decoherence`, and move the elapsed-time slider. Then prepare plus and repeat. Compare counts, the X component, and purity. A shorter arrow and an arrow pointing in the opposite direction mean different things.

### 3.6 How to read the results

The Bloch sphere is a simulator's description of a qubit state. One hardware measurement does not reveal its complete vector. Qiskit computes the state and samples repeated measurements for this lesson.

**Probability** is a predicted chance. **Counts** are how often an outcome appeared in a finite sample. Counts can fluctuate without any change in the predicted probabilities.

With multiple qubits, the chosen sphere shows one qubit's **reduced state**. An entangled pair can have a zero-length local arrow for either qubit while the full pair is perfectly pure. A short local arrow alone is not proof of an error. Compare the same preparation with and without the chosen error, and inspect joint outcomes where useful.

## 4. Illustrations and reproducible examples

Each error section contains a small Before → After illustration and a Load Example action. Explain the effect before sending the learner to the sandbox.

| Example | Preparation | Error | Expected observation |
|---|---|---|---|
| Zero becomes one | Empty | `bit_flip(q0)` | Z result changes 0→1; +Z arrow becomes −Z |
| One becomes zero | X(q0) | `bit_flip(q0)` | Z result changes 1→0 |
| Plus becomes minus | H(q0) | `phase_flip(q0)` | +X becomes −X; immediate Z probabilities match; X outcomes differ |
| Minus becomes plus | H then preparation Z | `phase_flip(q0)` | −X becomes +X |
| Phase changes a later answer | H then later H | `phase_flip` between H gates | Final Z result changes from 0 to 1 |
| One relaxes | X(q0) | Wait t=100 μs, T1=100 μs, T2=80 μs | P(1)≈0.3679, P(0)≈0.6321 |
| Coherence fades | H(q0) | Same waiting block | X decays and Z grows toward +1 |
| Entanglement is not local noise | H(q0), CX(q0,q1) | None initially | Local arrows can be zero while global purity is 1 |

Loading a preset is one undoable edit, not a permanent loss of the current experiment. Examples are editable suggestions, not locked tasks.

Use replayable X/Z illustrations around 1–2 seconds long with labeled endpoints, rather than perpetual auto-looping. Reduced motion displays endpoints immediately. Decoherence illustrations use computed intermediate states at the selected physical times, not arbitrary picture interpolation. Keep phase-drift rotation visibly separate from decoherence.

## 5. Sandbox rules and interactions

### 5.1 Starting state and limits

- Default to one qubit in zero and an empty circuit. Permit **1–5** data qubits, all initialized to zero; the learner prepares other states with gates.
- Cap the draft at **16 columns, 64 operations, and 8 error blocks**. Start with eight visible columns and allow extension without reordering existing operations.
- No ancillas, syndrome measurements, post-selection, implicit resets, or hidden background noise.
- Preparation gates and readout are ideal. Only explicitly placed error blocks affect the error branch.
- A column specifies order; it does not introduce an unmentioned physical waiting channel. Waiting time is explicit in a decoherence block.
- Both visual and code inputs obey the same limits and validation.

### 5.2 Preparation palette and editing

Show **H, X, Z, S, CX** by default. More Gates exposes **Y, S†, RX, RY, RZ**. Rotation inspectors offer 0, ±π/4, ±π/2, π and a bounded numeric angle in [−2π, 2π].

CX placement explicitly chooses distinct control and target wires and draws the connector. No device connectivity restriction is implied.

Desktop dragging places blocks on cells. The non-drag equivalent is select a block, then activate its cell. Selecting an existing block opens its inspector; it must not delete the block accidentally. Delete through a visible action or Delete/Backspace while the item is selected.

Support moving blocks, editing parameters, deletion, and undo/redo. Operations sharing a wire cannot share a column; disjoint-wire operations may be parallel. All edit paths use the same occupancy/arity rules as the server.

### 5.3 Error palette

| Identifier | Visible label | Action |
|---|---|---|
| `bit_flip` | Bit flip · X error | Apply X once to its named qubit |
| `phase_flip` | Phase flip · Z error | Apply Z once to its named qubit |
| `decoherence` | Decoherence · wait | Apply a local time-dependent T1/T2 channel |

Error blocks have a distinct shape/color and an explicit error-role marker. Preparation X and `bit_flip` cannot appear as indistinguishable blocks.

Permit errors before, between, and after preparation gates. Their positions affect subsequent computation. Preserve their roles when creating the reference circuit: omit error-role blocks, not every X or Z operation.

### 5.4 One error first; optional combinations

Default to **Single Error** mode. If an error is already placed, choosing another error type can replace that selected block as an explicit undoable edit; do not silently add a second cause.

A visible **Combine Errors** toggle enables up to eight ordered error blocks, including repeated types. Each waiting block has its own parameters. Show a Combined Experiment badge and keep isolated examples easy to load again. Combining errors is optional, not a quiz requirement.

Do not simplify blocks away in the editor: X–X and Z–Z cancellation are worth observing. Do not claim every reordering changes the output: X and Z can differ only by global phase when reordered, while relaxation and other operations generally do not commute.

To leave combination mode, the learner removes extras until at most one remains. Do not silently discard blocks when toggling modes.

### 5.5 Waiting-time inspector

| Control | Default and bounds |
|---|---|
| Elapsed time **t** | Primary slider: 0–200 μs, step 1 μs, default 50 μs |
| Relaxation time **T1** | Advanced control: 20–200 μs, default 100 μs |
| Coherence time **T2** | Advanced control: positive, ≤2×T1, upper UI bound 400 μs, default 80 μs |
| Target wire | One explicitly selected qubit |
| Equilibrium excited-state population | Fixed at zero; describe this assumption |

Never label the elapsed-time slider T1 or imply t=T1 is a deterministic flip time. Display units consistently in the inspector, canvas labels, code, and results. Reject an invalid T1/T2 combination with useful feedback rather than silently changing another physical parameter.

Zero duration is allowed and is the identity channel. Changing a slider marks the result stale; provide Run/Rerun. Optional debounced previews are allowed only after the slider settles, with obsolete-response protection.

The block does not automatically decohere every wire. Multi-wire waiting experiments require explicit local blocks in combination mode.

### 5.6 Resize, reset, and unlimited practice

Adding qubits introduces zero-initialized wires. Removing wires must identify affected operations and offer an explicit undoable Remove Affected Blocks and Resize action or Cancel. Never silently retarget a gate.

Reset Canvas returns to one zero-initialized qubit and no operations as one undoable action. Preserve reading/quiz progress. Keep at least 30 bounded undo entries; a slider drag commits one semantic edit, not an entry for every pointer pixel.

There is no experiment-attempt penalty, countdown, or negative score. Learners can run as often as they want within resource limits.

## 6. State comparison and telemetry

### 6.1 Explicit comparison modes

**Before / after selected error** is available when an error is selected and is the default for the first isolated example:

- Left: immediately before the selected error.
- Right: immediately after that error.
- Include earlier gates and earlier errors on both sides.
- Exclude later gates; say so in the panel.

This answers what the selected error does to the prepared state.

**Final circuit without errors / with errors** compares:

- Left: all preparation gates in order, omitting every error-role block.
- Right: the same circuit with all gates and error blocks preserved.
- The same final boundary, measurement basis, and shot budget.

This answers what errors do to the circuit's final answer, including propagation through later gates.

Do not use an unexplained Original State label. In combination mode the state before one error may already contain previous errors. If an error is deleted, choose a valid remaining selection or explicitly return to the final comparison. With no errors, explain that the predicted states match.

### 6.2 Bloch sphere pair

Render one matched pair for the selected qubit, with the same scale, axes, and viewpoint. Labels reflect the active comparison. Show the arrow, numeric X/Y/Z components, and local purity. The sphere surface and interior must be distinguishable.

A zero vector has no defined direction: do not fabricate an angle or draw it as a pure pole state. A mixed state has no single pure statevector.

Provide q0–q(n−1) selection and a compact all-qubit summary table. Do not squeeze ten spheres into the default pane. Selecting a qubit changes the reduced-state view, not the circuit.

For entangled examples, explain that local mixedness can come from entanglement; include optional global purity/fidelity details to avoid calling every short local arrow decoherence.

### 6.3 Basis, probabilities, and counts

Default to **1,024 shots per compared state**, with 256 and 4,096 alternatives. Support **Z** and **X** measurement. X measurement uses the appropriate basis rotation on a copy immediately before sampling; it does not alter the preparation canvas or repair the state.

Display exact probabilities alongside integer counts. Default to selected-qubit marginals and offer Joint Outcomes for all n-qubit outcomes, at most 32. Derive marginals from those same joint sampled outcomes so they cannot contradict one another.

In X basis, label marginal outcomes plus/minus. Explain that a joint result bit 0 means plus and bit 1 means minus in X measurement. Document ordering as q(n−1)…q0, with q0 at the right.

Each compared state's histogram sums to N. Do not label 1,024 as though it is split between the two panels; N is sampled from each state.

Use reproducible default seed 2026. The same seed may stabilize both comparison panels; describe this as simulator sampling, not two independent hardware experiments. Resample Counts changes the seed/samples only, not exact states or completion.

Finite counts can fluctuate for identical probabilities. Never infer phase damage merely from unequal sampled Z counts. For plus versus minus, immediate Z probabilities match; X measurement or the X component reveals that phase difference.

### 6.4 Computed interpretation

Required contextual messages cover:

- Zero became one under X.
- X left plus unchanged because plus is an X eigenstate.
- Z reversed X direction but left immediate Z probabilities unchanged.
- A later H converted a phase difference into a Z-outcome difference.
- Waiting reduced excited population and/or phase coherence.
- This error did not change this selected state in this comparison.
- A local mixed state can reflect entanglement rather than an error.

Derive messages from the returned state/comparison, not just the error's name. Keep technical metrics expandable rather than putting a wall of numbers above the beginner explanation.

## 7. Editable code and visual synchronization

### 7.1 Supported code mode

Code is genuinely editable for preparation and error placement. Use a **Qiskit-backed tutorial API** parsed into the same canonical model as the canvas. Do not execute arbitrary submitted Python on the server.

Proposed wrapper: `TutorialCircuit`, backed by `QuantumCircuit` and Qiskit noise channels. Its ordinary gate methods mirror Qiskit, while error helpers are **application-defined**, not native `QuantumCircuit` methods. Explain that in the editor.

```python
from quantum_shield import TutorialCircuit

qc = TutorialCircuit(1)
qc.h(0, at=0)
qc.phase_flip(0, at=1)
```

An optional combined experiment:

```python
from quantum_shield import TutorialCircuit

qc = TutorialCircuit(2)
qc.h(0, at=0)
qc.cx(0, 1, at=1)
qc.bit_flip(0, at=2)
qc.phase_flip(1, at=3)
qc.decoherence(0, time_us=50, t1_us=100, t2_us=80, at=4)
```

### 7.2 API and parsing contract

| Method | Meaning |
|---|---|
| `TutorialCircuit(n)` | 1–5 zero-initialized qubits |
| `h(q)`, `x(q)`, `y(q)`, `z(q)`, `s(q)`, `sdg(q)` | Preparation gates |
| `rx(angle,q)`, `ry(angle,q)`, `rz(angle,q)` | Bounded preparation rotations |
| `cx(control,target)` | Distinct control and target |
| `bit_flip(q)` | Error-role X |
| `phase_flip(q)` | Error-role Z |
| `decoherence(q,time_us=50,t1_us=100,t2_us=80)` | Error-role waiting channel |

All operations accept optional `at=<column>`. This scheduling keyword belongs to the wrapper, not Qiskit's native gate methods. Without it, append in the next column after the last occupied column. Generated editable code includes `at` to preserve visual parallelism/order on round-trip.

Allow comments, blank lines, numeric literals, and `from math import pi` with bounded arithmetic such as `pi/2`. Evaluate only whitelisted numeric arithmetic and pi. Require one circuit variable `qc`. Treat imports as recognized declarations, not executed statements.

Disallow arbitrary imports/names, dynamic calls, attribute chains, loops, definitions, comprehensions, file/network access, and general Python execution. Server validation checks method names, signatures, indices, times, angles, occupancy, operation limits, and combination rules. Line/column diagnostics must preserve the learner's source text.

### 7.3 Editing flow

1. The visual editor reads/writes the canonical model.
2. Entering Code generates source unless an unapplied draft already exists.
3. Typing marks source unapplied; it does not mutate half a circuit on each keystroke.
4. Apply Code parses/validates and atomically replaces the model as one undoable edit.
5. Run in Code first validates/applies that source, then simulates it. Invalid code never silently executes a different saved circuit.
6. Preserve invalid text. Visual can show the last valid model with an Unapplied Changes banner; require Apply or Discard before conflicting visual edits.
7. Both modes share physics, parameters, roles, limits, and result behavior.

If multiple errors appear while Single Error mode is active, report that combination mode is required. Do not drop extra blocks.

### 7.4 Native Qiskit export

A separate read-only Export Native Qiskit action generates a standalone Qiskit 2+ program with real `QuantumCircuit` gates and explicit `thermal_relaxation_error` instructions. Do not export nonexistent native methods like `QuantumCircuit.bit_flip`.

Export the reference and affected experiment, measurement basis, units, and ordering. Preserve parallel-column boundaries with barriers as needed. The exported program can run in a user's own Python environment; it does not require arbitrary-code execution in the web service.

## 8. Future state, API, and quantum implementation contract

This section specifies the later implementation; it does not request application changes now.

### 8.1 Separate the noise lab from mission execution

Add a dedicated five-qubit lab contract/service instead of broadening the existing fixed-payload `RunRequest`. The tutorial engine routes module 1 into this workbench while other modules continue using existing components/data until separately specified.

Suggested responsibility map:

```text
src/components/workspace/
  LearningWorkspace.tsx      resizable shell and responsive pane navigation
  TheoryPane.tsx            description, examples, assessment access
src/components/flight-school-1/
  NoiseLab.tsx              module controller
  PreparationCanvas.tsx     visual gates/errors and editing interactions
  TutorialCodeEditor.tsx    source draft, apply/run, diagnostics
  ErrorBlockInspector.tsx   selected-block controls
  ComparisonTelemetry.tsx  Bloch pair, basis selection, counts, interpretation
  NoiseKnowledgeCheck.tsx   three-question assessment
src/lib/flight-school-1/
  contracts.ts              canonical lab and response types
  content.ts                lesson copy and reproducible examples
  code-generation.ts        editable API and native Qiskit exports
backend/noise_lab/
  models.py                 strict bounded lab contracts
  code_parser.py            whitelisted AST-to-model conversion
  simulator.py              Qiskit state, channel, and sampling calculations
  service.py                comparisons and result explanations
```

File placement may follow repository conventions, but keep these responsibilities separate. Reuse suitable existing visualizer primitives without forcing mission mechanics into this introductory lesson.

### 8.2 Canonical draft

```json
{
  "schemaVersion": 1,
  "qubits": 1,
  "combineErrors": false,
  "operations": [
    {"id":"prep-h","role":"prepare","name":"h","qubits":[0],"column":0},
    {"id":"fault-z","role":"error","name":"phase_flip","qubits":[0],"column":1}
  ]
}
```

Rotations add `angleRadians`. Waiting blocks add `timeUs`, `t1Us`, and `t2Us`. Require unique IDs and valid arity. Preparation and error names have separate allowlists. Measurement settings belong to view/run settings, not editable mid-circuit measurements.

For disjoint-wire operations within a column, capture snapshots using deterministic ordering: preparation gates first, then errors ordered by qubit and stable ID. Because shared-wire occupancy is forbidden, those parallel operations commute and this ordering does not change the final state. The selected-error snapshot applies only that block between its before and after states.

Controller state:

```text
circuitDraft, selectedOperationId, activeEditorTab
codeDraft, codeDirty, parseDiagnostics
comparisonMode, selectedQubit, basis, shots, sampleSeed
lastSuccessfulResult, resultDraftHash, isRunning, runError
undoStack, redoStack
quizAnswers, quizSubmitted, quizFeedback, moduleCompletion
paneSizes, activeMobilePane
```

### 8.3 Proposed endpoints

| Endpoint | Input and role |
|---|---|
| `POST /api/tutorial/noise-lab/compile` | `{code, combineErrors}` → canonical draft or source diagnostics |
| `POST /api/tutorial/noise-lab/run` | `{circuit, comparisonMode, selectedErrorId, basis, shots, sampleSeed}` → state pair and measurements |

`selectedErrorId` is required for selected-error comparison. Reject missing, deleted, or preparation-role selections rather than guessing the learner's intent. The server validates canonical input even if it previously came from Compile.

The response includes:

- Circuit/result fingerprint and content/engine versions.
- Active comparison mode, selected error, and unambiguous state labels.
- For each state: per-qubit Bloch vectors/local purity, global purity, exact joint probabilities in the chosen basis, sampled joint counts, and marginals derived from those counts.
- Optional exact global state fidelity between the compared states, clearly a simulator metric rather than a lesson score.
- Shot budget, basis, seed, relevant parameters/units, computed explanation, and run duration.

Do not generate physical results from client-side heuristics. Do not serialize every density matrix into the ordinary response. A later optional matrix-details view is not required for this beginner module.

### 8.4 Quantum execution

All state preparation, errors, reduced-state calculations, and measurement sampling use Qiskit 2+. Use density matrices when the waiting channel produces mixed states.

1. Validate the whole draft before any execution.
2. Initialize the selected number of wires in zero.
3. Apply preparation gates in order. For the global reference, omit error-role blocks while preserving every preparation operation.
4. Apply exact X/Z for `bit_flip`/`phase_flip` on their named wires.
5. Apply `thermal_relaxation_error(T1, T2, t, excited_state_population=0)` locally for each waiting block. Keep units consistent and enforce T2 ≤ 2T1.
6. Capture either the requested selected-error state pair or the final reference/affected pair.
7. Compute reduced density matrices with correct subsystem ordering, then Bloch components and purity.
8. Rotate the basis on a copy of each compared state before Qiskit sampling. Derive marginals from the same sampled joint outcomes.
9. Return exact probabilities and finite samples separately. Do not infer exact purity/fidelity from a small histogram by a shortcut.

For the zero-temperature single-qubit channel, verification equations are:

```text
x(t) = x(0) exp(−t/T2)
y(t) = y(0) exp(−t/T2)
z(t) = 1 + [z(0) − 1] exp(−t/T1)
```

Initial one gives P(1)=exp(−t/T1). Initial plus gives P(1)=0.5 exp(−t/T1) and x=exp(−t/T2). Use these as independent test expectations, not hardcoded substitute outputs.

### 8.5 Bounds and failure handling

Retain the existing request-body cap and compute admission guard. Bound source to 8 KiB/128 lines and its AST to a finite size, for example 2,048 nodes. Cap the draft at five qubits, sixteen columns, sixty-four operations, eight errors, and 4,096 shots per compared state.

Reject unknown instructions, invalid times/indices/angles, wire collisions, malformed source, and over-budget requests before simulation. Show useful source/field diagnostics. Failed/busy requests restore controls and preserve the draft; never fabricate a local physics fallback.

Run gate/code edits on demand. Optional waiting-slider previews must be debounced after settling, with sequence/cancellation handling. Do not issue a request on every pointer movement or allow an old response to replace a newer result.

This implementation introduces no accounts, database, remote hardware access, deployment changes, or leaderboard dependencies.

## 9. Three-question knowledge check

Experiments are unlimited. Use **three single-answer MCQs**, require all three correct, and allow unlimited retakes with explanations. No penalty or competitive score applies.

Require at least one successful sandbox run to demonstrate use of the results UI. Do not require every preset, every error combination, or a specific self-created state for completion. The quiz can be opened at any time from the theory pane; preserve the sandbox while it is displayed.

### Question 1 — Bit flip

**You prepared zero. A single X bit-flip error occurs immediately before a Z-basis measurement. What do you expect?**

A. Always 0.  
B. Always 1.  
C. Equal probability of 0 and 1.  
D. No measurement result.

**Correct: B.** X swaps zero and one. This deterministic example includes no extra noise/readout error; it does not mean real device faults always occur deterministically.

### Question 2 — Phase flip

**Z changes plus into minus. Which statement is correct?**

A. They must give opposite deterministic Z outcomes.  
B. They are physically identical in every experiment.  
C. They have the same immediate Z probabilities, but X measurement can distinguish them.  
D. Z necessarily changes either state into zero.

**Correct: C.** Both give zero and one equally often in Z measurement, but their arrows point in opposite X directions. A later basis change can reveal that relative phase.

### Question 3 — Decoherence

**You prepare one and increase elapsed time t in this lesson's zero-temperature relaxation model. What generally happens?**

A. The probability of measuring 1 decreases and the probability of 0 increases.  
B. Every qubit flips at exactly t=T1.  
C. Waiting is the same as applying one Z phase flip.  
D. Nothing changes unless another preparation gate is added.

**Correct: A.** Relaxation changes probabilities over time. T1 is an exponential time constant, not a scheduled flip event. For a superposition, loss of coherence must also be considered.

### Completion and progression

```text
moduleComplete = successfulRunCount >= 1 AND correctQuizAnswers == 3
```

On success, show **Flight School 1 complete — you can explain the three error models**, save completion/content version, and offer Continue to Flight School 2. Keep Experiment More available.

Completing only this module does not finish all flight school or bypass existing main-mission unlock rules. Preserve Skip Tutorial / Unlock All Levels. Do not revoke previously unlocked access or force a learner who already skipped to retake a new quiz; offer the revised lesson as available content.

## 10. Persistence and safe integration

Keep workspace preferences and this sandbox separate from main-mission results. Suggested local keys:

- `quantum-shield.workspace.v1`: pane proportions/editor preference.
- `quantum-shield.flight-school-1.draft.v1`: bounded circuit, code draft, view settings.
- `quantum-shield.flight-school-1.progress.v1`: content version, quiz completion, successful-run flag.

Validate saved data. A corrupt sandbox draft resets only that draft, with a notice; it must not wipe unrelated mission progress. Unavailable storage falls back to session state.

Connect module completion to the current progression callback. If extending the existing progress schema, deliberately preserve older valid profiles, skip state, and personal bests rather than making them fail parsing.

Use a module content version such as `noise-basics-v1`. Updating lesson text/quiz does not imply changing the mission physics engine or invalidating every score.

## 11. Ordered implementation roadmap

1. Inspect current Next.js guidance and tutorial/progression contracts.
2. Build the reusable resizable workspace and responsive pane tabs; mount it for Flight School 1 only.
3. Add dedicated five-qubit lab contracts/server validation; leave fixed-payload mission request models unchanged.
4. Implement and test Qiskit state comparisons and the three error models before wiring displays.
5. Build visual preparation/error editing, target/parameter inspectors, keyboard/click input, optional dragging, history, qubit sizing, and combination mode.
6. Add supported source parsing, visual round-trip, and valid native Qiskit export.
7. Add before/after and final comparisons, Bloch pairs, basis switching, sampled counts, and computed interpretations.
8. Render the detailed lesson, replayable illustrations, and example presets.
9. Add the MCQs, retry feedback, local completion, and current progression adapter.
10. Run existing suites plus the regressions below and inspect desktop/mobile behavior.
11. **Stop after Flight School 1.** Wait for the user's next level-specific specification before redesigning another tutorial or mission.

## 12. Acceptance criteria and verification

### 12.1 Learning and experience

- Detailed theory covers causes, state action, and circuit consequences for X, Z, and decoherence.
- Both zero/one and plus/minus transformations are demonstrated. A pure flip/rotation animation is distinguished from gradual loss of coherence.
- The theory/experiment/results workspace is resizable on desktop and usable on mobile without page overflow.
- A learner can freely prepare a state on 1–5 qubits, inject errors at selected locations, and repeat without attempt limits.
- Dragging, click/keyboard placement, and editable code produce the same supported experiment.
- State pairs clearly identify the active comparison, qubit, basis, probabilities, and sampled counts.
- Waiting time is distinct from T1/T2 and consistently labeled in μs.
- Combination mode is optional, ordered, reversible, and visible.
- The quiz explains answers, allows retries, and completes only module 1.

### 12.2 Required quantum/API regressions

1. X maps zero↔one and leaves plus unchanged.
2. Z maps plus↔minus. Immediate Z probabilities match; X outcomes differ.
3. H–Z(error)–H and H–H have different final Z outcomes.
4. Zero-duration decoherence is identity for arbitrary supported states.
5. Initial one at t=T1 has P(1)=exp(−1) within tolerance.
6. Initial-plus Bloch evolution matches the stated exponential equations at multiple times.
7. Invalid T1/T2, indices, shared-wire collisions, and budgets are rejected.
8. Ordered combinations are preserved without editor simplification; test X–X/Z–Z cancellation and a relaxation/order example against Qiskit.
9. Entangled states have correct reduced vectors and joint correlations; local mixedness is not automatically called decoherence.
10. Five-qubit execution has normalized probabilities and correct qubit ordering.
11. Each branch's joint counts sum to N; marginals agree with those same samples.
12. Visual/code round-trips preserve roles, targets, parameters, columns, and exact state metrics.
13. The parser rejects arbitrary Python behavior without executing it and returns useful diagnostics.
14. Changing only the sample seed changes no exact state/probability metrics.
15. Generated native Qiskit exports use valid APIs and reproduce the canonical experiment.

Use tolerances for floating-point state calculations. Do not assert that a finite-shot histogram exactly equals its theoretical expectation unless the outcome is deterministic.

### 12.3 Integration/browser regressions

- Existing Python and frontend suites remain passing. Update the first module's intentional journey without removing unrelated coverage.
- Existing main-mission payloads, scoring, validation, and result contracts stay unchanged.
- Other tutorial content/mechanics stay unchanged.
- Dirty source is not lost; invalid code never silently executes an older circuit.
- Late responses cannot overwrite new drafts; failures restore controls and retain work.
- Saved personal bests, unlocks, and skip states survive the module update.
- Desktop/mobile journey: read a detailed explanation, prepare/load a state, apply all three error types, compare before/after, change measurement basis, use Code, and pass the quiz.
- Verify keyboard focus, reduced motion, splitters, pane scrolling, labels, histogram totals, and stale-result notices.

Future checks include `pytest tests`, `pnpm typecheck`, `pnpm test`, appropriate browser journeys, and a production build. **For this documentation-only revision, do not modify application code or run application/test suites.** Review the document's completeness and consistency instead.

## 13. References and interpretation

- [Qiskit Aer thermal relaxation API](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.thermal_relaxation_error.html): waiting-channel parameters, equilibrium population, and the physical T2 ≤ 2T1 constraint. Use consistent time units.
- [Qiskit DensityMatrix API](https://qiskit.qotlabs.org/docs/api/qiskit/qiskit.quantum_info.DensityMatrix): mixed-state evolution and simulator state evaluation. Reduced-state and measurement views must respect subsystem ordering.
- [Martiel and Javadi-Abhari, arXiv:2504.15725](https://arxiv.org/abs/2504.15725): background for the later QED game. This first module establishes error literacy rather than simulating protection/post-selection.

The old unresolved citation markers are removed. The learner-facing copy is authored teaching content. References support the future implementation; they do not instruct publication, deployment, or changes to other levels.
