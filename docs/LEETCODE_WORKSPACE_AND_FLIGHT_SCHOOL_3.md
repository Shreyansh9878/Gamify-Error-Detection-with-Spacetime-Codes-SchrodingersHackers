# LeetCode Workspace and Flight School 3 — Implementation Specification

**Status:** Implemented, including the Single-Qubit Operator Evolution knowledge check. See `docs/FLIGHT_SCHOOL_2_3_IMPLEMENTATION.md` for code locations and verification instructions.

**Revision:** 15 October 2026.

**Lesson ID:** `flight-school-3`.

**Lesson name:** **Coherent Pauli Checks & Low-Overhead Spacetime Detection**.

**Prerequisite:** Flight School 2 complete, or access already granted by the existing skip/unlock rules.

## 1. Intent, scope, and learning outcomes

Teach what a check physically does, not just how to press a detection button. Start with a detailed overview and explicit ancilla circuits. Guide the learner through H, opening controlled Pauli, an existing S payload, matching closing Pauli, H, and syndrome measurement. Keep the live propagation/closure feedback, then unlock an editable circuit/check sandbox with X/Z faults and thermal decoherence.

The guided exercise has a fixed S payload so the player can focus on building the check. **The unlocked sandbox permits user-created tutorial payloads.** This does not allow editing any main-mission payload. Flight School 1 and the separately specified Flight School 2 retain their mechanics; Flight School 4–6 and Missions 1–10 must not be redesigned in this pass.

By the end, learners should distinguish:

1. A data qubit, an ancilla, a controlled Pauli tap, and a syndrome readout.
2. A valid input-independent invariant from a circuit that merely happens to give zero on one input.
3. A green closed check from a fault-free execution: covered faults can trigger a perfectly valid check.
4. Opening P, forward propagation through U, and closing P′, including signs and multi-qubit support.
5. Invalid-check false alarms, undetected commuting faults, and probabilistic channel behavior.
6. Low added check weight/locality versus broad coverage and lost samples.

## 2. Shared workspace

Reuse the Flight School 1 `LearningWorkspace` shell: default 36/64 horizontal split and 60/40 right-side split, desktop at ≥1100 px, independently scrolling panes, constrained keyboard/pointer splitters, layout restore/persistence, and mobile Theory / Experiment / Results tabs. Preserve state/scroll when changing panes. Run success opens Results on mobile; invalid input focuses Experiment feedback.

```text
Header: Back | 03 Coherent Pauli Checks | Lesson selector | Help | Skip
┌──────────────────────────────┬─────────────────────────────────────────────────┐
│ THEORY & TASKS               │ EXPERIMENT                                      │
│ Description / Examples      │ [Guided S-gate] [Custom sandbox 🔒/available]      │
│ Physical check circuit      │ Visual / Code | Run | Undo/Redo | Reset           │
│ S: X → Y                   │ Data + ancilla wires; opening/closing tap slots  │
│ Multi-wire propagation      │ Propagation strip + green/red/amber validation   │
│ Low-overhead spacetime idea │ Selected gate/check/fault inspector              │
│ Guided checklist            ├─────────────────────────────────────────────────┤
│ Sandbox experiments         │ RESULTS                                         │
│                            │ Noiseless reference | injected-fault syndrome    │
│                            │ Operator trajectory | data state | shot filter  │
└──────────────────────────────┴─────────────────────────────────────────────────┘
```

Keep gate/code editing, check design and fault injection visibly distinct. Controls have drag/drop and click/keyboard equivalents; selecting a block inspects it and never deletes it. Green/red feedback includes text, symbols and explanations. Do not rely on motion or color alone.

## 3. Complete learner-facing theory

Render the following explanations with the circuits and interactive examples beside them. Use readable formulas/text equivalents and at least 15–16 px body text. Keep section links and the guided checklist reachable while the article scrolls.

### 3.1 What is a coherent Pauli check?

A data qubit carries the computation. An ancilla is a temporary helper that checks a relationship between operations at different times. We do not directly measure every data qubit to discover its unknown state. Instead, the helper compares two coherent paths: one without inserted Paulis, and one with an opening and closing Pauli around the computation.

Use **Coherent Pauli Check (CPC)** consistently. Do not substitute “coherent parity check” as though every parity-code construction were the same protocol. A CPC can reveal a particular inconsistency without disturbing the intended noiseless computation when the check is valid. An invalid check or a noisy physical implementation can disturb it.

The minimal two-boundary circuit is:

```text
                        opening              closing
data q: |ψ〉 ───────────── P ─────── U ───────── P′ ───────── output
                            │                     │
anc a:  |0〉 ── H ──────────●─────────────────────●── H ── M → s
```

Both controlled gates use **the ancilla as control and data as target**. The H before the opening tap prepares the helper in plus; the final H converts its X-basis information to a Z measurement. Measuring the helper directly without that final H is not the same check.

The two ancilla branches act on data as U and P′UP. They agree for every input if:

```text
P′U = UP, equivalently P′ = U P U† and P′ U P = U.
```

The helper then returns to zero in the noiseless case. This is an operator identity, not a comparison of one example's output probabilities. A zero syndrome from a single input does not prove the operator identity.

### 3.2 What the syndrome tells us

A covered Pauli fault changes the relative phase between the helper's branches. After the final H, that phase can become syndrome 1. Detection means flagging a run; it does not apply a recovery to repair it.

- Syndrome 0: this check did not flag the shot. A commuting or out-of-window error may still be present.
- Syndrome 1: a flag from the measured check. For a validated check with a covered injected fault, it is evidence of detection. An incorrectly constructed check can also produce ones with no noise, which is a false alarm.

For one valid ideal check, a deterministic Pauli error that anticommutes with the check operator at its actual time is flagged with probability one. A commuting Pauli error is not flagged. General channels such as thermal decoherence need full state/channel simulation and can give probabilities between zero and one. A single syndrome bit does not tell you a unique error history.

Compare no-fault and faulted results. “Green check” means the invariant closes; it does not mean every later sample will be zero or every possible error is covered.

### 3.3 Follow a Pauli through an S gate

Clifford gates send a Pauli to another **signed** Pauli under conjugation. With U=S and opening P=X:

```text
S = diag(1,i)
S X S† = [[0,−i],[i,0]] = Y
opening X → payload S → closing Y
```

The physical guided circuit is:

```text
slot:          0        1        2        3        4        5
data q0:  ───────────── X ────── S ────── Y ──────────────────
                       │                 │
anc a0:   |0〉── H ────●─────────────────●────── H ────── M(s)
```

Closing with X does not match SXS†=Y. Even with no injected error it can produce nonzero syndrome: that is a bad check, not successful protection. Try the wrong closing axis, then choose Y and verify the noiseless syndrome becomes zero.

The other S rules matter too:

```text
S Y S† = −X       S Z S† = Z
```

The minus sign cannot be dropped inside a controlled check. It becomes a relative phase on the ancilla's two branches. For the Y→−X case, using a bare controlled X requires a visible Z phase compensation on the ancilla before the final H. Otherwise a noiseless check can be inverted. The guided X→Y example needs no such compensation.

### 3.4 Propagation can spread across wires

For CX(control c, target t):

```text
X_c → X_c X_t       Z_c → Z_c
X_t → X_t           Z_t → Z_c Z_t
```

An opening one-wire Pauli can become a product on several wires. A closing product means several controlled-Pauli taps from the same ancilla, not one arbitrary substitute gate. The targets must include every nonidentity factor with the correct sign.

For example, an opening X0 before CX(0,1), then CX(1,2), becomes X0X1X2. Show the propagation directly in the theory pane using a replayable small circuit and a step-by-step operator strip. This example is available without entering or completing the sandbox.

### 3.5 Why spacetime checks can reduce overhead

A long boundary check can acquire many closing factors as operators spread. Each additional controlled interaction costs gates and can introduce errors on hardware. More protection circuitry is not automatically better.

Spacetime detection considers where checks act in both space and time. Useful checks can be supported on accessible local wires at different moments, reducing the cost of extracting their syndromes. A shorter or lower-weight check may cover fewer faults, so compare added gates, coverage and acceptance together. Do not claim every traditional code fails or that every local check dominates a global one.

This tutorial teaches the two-boundary coherent-Pauli case and localized windows as an accessible starting point. The paper's broader spacetime constructions support more general time-distributed checks and search procedures. The sandbox does not claim that a single opening/closing pair implements that entire algorithm.

### 3.6 Detection has a sampling cost

If we post-select, we keep all-zero syndrome shots and discard flagged shots. Show N_kept and N_discarded with N_kept+N_discarded=N. At exact retention r, expected attempts per accepted sample are 1/r. At r=0 there is no retained state; do not show an invented perfect fidelity.

Raw syndrome probabilities and sampled counts are different. Repeated measurements can fluctuate. An ancilla saying zero is not a measurement of the full data state. Bloch vectors are simulator reduced-state descriptions, and local mixedness may also come from entanglement.

## 4. Phase A — guided S-gate assembly

### 4.1 Initial state and slots

Open Guided S-Gate by default. Data q0 starts in zero, payload S is locked at slot 2, and ancilla a0 starts in zero. Only the check's build slots are editable. Display one data wire and one ancilla wire without decorative hidden gates.

| Slot | Learner action | Feedback |
| --- | --- | --- |
| 0 | Place H on ancilla | Helper prepared in plus |
| 1 | Place controlled-X: control a0, target q0 | Opening P=X |
| 2 | Inspect locked S on q0 | Propagated P′=Y, shown by the operator trace |
| 3 | Choose/place controlled closing Pauli | Try X to see mismatch; Y closes the guided invariant |
| 4 | Place final H on ancilla | Syndrome information rotated for readout |
| 5 | Place Z measurement on ancilla | Classical syndrome bit s available |

An opening/closing slot offers X/Y/Z so learners can see alternatives, not just fill a predetermined Y tile. The instructional goal remains opening X and closing +Y. A mathematically valid alternative, such as Z→Z, is labeled Valid Alternative — Guided Task Asks for X→Y, not falsely labeled invalid.

An advanced closing-sign control is available in both modes. A negative selection visibly inserts ancilla Z between the closing tap and final H, using an extra labeled subslot rather than moving the fixed S. The required guided X→+Y solution contains no compensation gate.

H, controlled taps, and M are separate manipulable blocks. The task hints their order, but filling a later slot first need not destroy earlier work. An H in the wrong role/order does not satisfy the stage. Show an amber missing-stage explanation instead of silently inserting essential gates.

### 4.2 Live validation and diagnostic runs

Use debounced server validation after settled edits, with obsolete-response protection:

- **Amber / incomplete:** missing H, tap, measurement, or endpoints; name the missing item. Do not claim a closed CPC.
- **Red / mismatch:** complete assembly whose selected closing operator/sign differs from propagation. Show `Expected Y; selected X` and the exact trajectory.
- **Green / invariant closed:** complete assembly with correct operator/sign and valid whole schedule. Label `Noiseless syndrome predicted 0`.

Enable Run when the physical readout assembly exists. For an invalid closure allow **Run Invalid Check — Diagnostic** so the learner can see false alarms; visually distinguish that from a valid detection experiment. Incomplete readout remains non-runnable with a useful explanation. Invalid diagnostic runs never satisfy guided completion.

The noiseless backend simulation must confirm the valid guided circuit's syndrome-zero probability is 1 within tolerance and that data agrees with S|0〉. Validation itself is input-independent; it must not declare the check valid just because this selected input gives the expected counts.

### 4.3 Unlock sandbox

```text
guidedComplete = required ancilla H/taps/H/M are present
                 AND opening X / closing +Y surround the locked S
                 AND accepted noiseless run confirms the valid circuit
```

Then enable **Open Custom Sandbox** and save the guided achievement. Keep Guided Mode available for replay. Do not auto-switch or erase its draft. Previously completed/skipped profiles may enter the sandbox immediately; show the guided exercise as available rather than revoking access.

## 5. Phase B — custom circuits and check design

### 5.1 Editable data circuit

- Allow 1–3 data qubits and up to two ancilla check lines, hence at most five physical wires.
- Separate ideal input preparation from the checked payload. Both may be edited in Sandbox; preparation is before all check windows.
- Preparation has its own prefix-column coordinates, distinct from payload columns/boundaries. All preparation finishes before payload boundary 0; checks and fault placement use only the payload timeline. The editor/source/compiler must preserve this distinction.
- Preparation/payload gates: H, X, Y, Z, S, S†, CX, CZ. This first check-design sandbox is Clifford-only. Reject unsupported T/arbitrary rotations with an explanation; do not pretend their conjugation always yields a Pauli.
- Limit payload to 16 columns; bound combined preparation+payload operations to 64. Preparation can use up to 16 of those operations. All gates have valid arity, distinct CX endpoints, and no same-wire collisions in a column.
- No connectivity restriction or implicit idle noise. Gates and readout are ideal except explicit data fault blocks. No manual operations on data are secretly appended to fix a wrong check.
- Retain drag/drop and click/keyboard input, parameter/target inspectors, movement, deletion, explicit resize handling and 30-entry undo/redo. Reset Guided and Reset Sandbox affect their own drafts only.

### 5.2 Check controls

Each check owns one ancilla and includes:

```text
startBoundary / endBoundary (0..16, start < end)
opening product: one or more distinct (qubit, X|Y|Z) taps
closing product: one or more distinct (qubit, X|Y|Z) taps
closingSign: +1 or −1
opening ancilla H / final ancilla H / Z measurement build flags
```

Identity factors are omitted. Require nonidentity products, distinct target wires within a product, and one owner per ancilla. Add/remove factors with ordinary controls; do not limit closing to one wire after a CX has spread the operator.

The sandbox keeps **manual closing selection** and live expected propagation. Offer an explicit Fill Expected Closing hint, which inserts the computed product/sign as one undoable edit and labels the assistance. Do not auto-move/replace the user's closing taps while they are experimenting with a red mismatch.

For a negative closing sign, render its physical compensation as Z on that check's ancilla before final H. The sign control and generated circuit must agree. Do not hide compensation, ignore the sign, or claim the two circuits are physically identical in the controlled setting.

### 5.3 Boundary ordering and multiple checks

Name a boundary b as the instant before payload column b and after columns below b. Use this deterministic event order at each boundary:

1. Apply explicit data fault blocks at b in stored order.
2. Close checks whose endBoundary is b, in reverse stable check order; apply any sign compensation, final H, and schedule syndrome readout.
3. Open checks whose startBoundary is b, in stable check order; prepare ancilla with H before controlled opening taps.
4. Execute payload gates in column b.

A fault at a check's starting boundary is therefore outside/before that check; a fault at its ending boundary is inside/before its closing taps. The protected boundaries satisfy `start < faultBoundary ≤ end`. Render insertion markers and tooltips so the user does not infer an ambiguous “error on S” ordering.

The guided visible slots have extra room for H/readout, while its semantic window is start=1, end=3 with S at column 2. Its post-S fault boundary is 3; its pre-S, inside-window fault boundary is 2. Export and simulator use the same order.

For multiple checks, individual P→P′ matches do **not** alone establish that their combined physical schedule is harmless. Overlapping controlled operations can interfere. Validate the assembled noiseless circuit, with all ancillas initialized in zero, against the payload on the whole data-input space. Either certify the combined schedule or show a Check Scheduling Conflict diagnostic; never grant green whole-circuit status using only independent tap comparisons.

Keep up to two checks for tractable exact validation. Render their actual ordering and independent syndromes. Do not silently reorder user windows to make an incompatible construction look valid. Removing a check also removes only its generated ancilla operations.

### 5.4 Interactive propagation

Display a stepper `Opening → each crossed payload gate → Expected closing`, including sign, wire labels and Pauli weight. Hover/select highlights the matching circuit location. Show X→Y through S and X0→X0X1 through CX with correct control/target orientation. Preparation before the check and faults are not part of the noiseless conjugation path.

During a run, green means a structurally valid invariant; a flag can coexist with it. Fault trace overlays use a separate labeled style, such as orange Flagged Fault, rather than turning a correct check red. Red means wrong construction/sign or incompatible schedule, not “an error was successfully detected.”

## 6. Fault injection and syndrome experiments

### 6.1 Fault palette and placement

Provide explicit **X Error**, **Z Error**, and **Decoherence / Wait** blocks on data wires. A fault block has an error-role badge and a different shape from an intentional payload X/Z gate. Payload gates belong to U and affect propagation; error-role blocks are omitted from the ideal operator calculation and are applied only to faulted simulation branches.

Default to one fault at a time. Replacing it is an explicit undoable action. Optional Combine Faults permits up to four ordered blocks, including repeated X/Z and separate waits. Leaving that mode requires removal of extras; do not silently delete blocks. Do not simplify X–X cancellation away.

Faults target a named data wire and boundary 0–16. Users can choose before/inside/after a check to learn coverage. Clicking a payload gate offers Before Gate / After Gate insertion markers, with concrete boundary labels. For disjoint same-column gates, all such boundary insertions occur before/after the entire column, never halfway through a two-qubit operation.

Waiting uses t=0–200 μs, T1=20–200 μs and 0<T2≤min(2T1,400 μs), defaults t/T1/T2=50/100/80 μs, zero-temperature equilibrium, and one named data wire. T1/T2 are time constants, not the elapsed-time slider. No background errors, automatic ancilla noise or idle-time inference are added.

### 6.2 Noiseless and faulted branches

Every executed diagnostic compares the same check circuit with explicit faults off/on. Also make the ideal payload and unprotected faulted payload available for data-state comparison. Use the actual coherent ancilla/data circuit for faulted simulation; an error acting on an entangled data/ancilla branch cannot be modeled by editing a data-only Bloch vector afterward.

For a valid loop and one Pauli event, the server may derive a commutation prediction and cross-check it against Qiskit simulation. Evaluate the operator at the **fault boundary**, not only the opening axis:

```text
P_b = U(start→b) P U(start→b)†
E P_b = P_b E   → no flag from this check
E P_b = −P_b E  → syndrome 1 for this ideal single-Pauli experiment
```

For the guided X→S→Y check:

| Injected operation | Location | Expected result for a valid noiseless construction |
| --- | --- | --- |
| None | — | Syndrome 0 with probability 1 |
| Z error | Inside before S, boundary 2 | Anticommutes with X: flag probability 1 |
| X error | Inside before S, boundary 2 | Commutes with X: flag probability 0 |
| Z error | Inside after S, boundary 3 | Anticommutes with Y: flag probability 1 |
| X error | Inside after S, boundary 3 | Anticommutes with Y: flag probability 1 |
| Z error | After closing, boundary 4 | Outside the check: no flag from this check |

These are exact special-case fixtures with ideal helpers/readout, not universal promises about hardware. A nonflagged operation need not damage the selected input, so distinguish No Flag from Proven Corruption. An optional advanced Y error can demonstrate commuting Y after S.

Thermal decoherence is a channel, not a single deterministic Pauli. Show Channel Experiment, its parameters and simulated syndrome probabilities. Do not label it “X propagated to Z” or assign a made-up unique fault path. A zero wait is identity and can be explored, but does not count as a nontrivial fault experiment for completion.

For multiple events, simulate the full ordered circuit; faults may cancel or their flags combine. Never infer “two errors means two syndrome ones.” With two helpers, show each marginal and the joint syndrome pattern; post-select on all-zero syndrome, not an average of independent helper retentions.

### 6.3 Diagnostic status vocabulary

| Status | Meaning |
| --- | --- |
| Incomplete | Required physical check/readout component missing; no valid CPC run yet |
| Invalid Check / False-Alarm Diagnostic | Closure/sign/schedule is wrong; compare noiseless flags, do not attribute every one to the injected fault |
| Valid — No Faults | Input-independent check passes; noiseless flags vanish within tolerance |
| Flagged / Caught | Valid check and single Pauli test give flag probability 1 |
| Not Flagged | Valid check and test give flag probability 0; may be outside/commuting/state-insensitive |
| Probabilistic Flagging | Valid check and channel/combined experiment gives intermediate flag probability |

Use tolerance, not exact floating-point equality. If the whole schedule is invalid, suppress a categorical Caught/Missed claim and identify false-alarm ambiguity. Sampling a zero or one once does not by itself prove deterministic coverage.

## 7. Results and resource visualization

### 7.1 Propagation and validity

Show selected opening product/sign, each conjugation step, expected signed closing product, selected closing product, and a plain-language mismatch explanation. Include a separate combined-schedule validation badge for multiple checks. Missing stages are listed explicitly. A selected closing product can be correct while final H or measurement is still absent.

### 7.2 Syndrome and accepted data

- N=256,1024,4096 shots, default 1024, reproducible seed 2026; Resample changes counts only.
- Exact no-fault and faulted syndrome probabilities alongside sampled histograms; for two ancillas show joint bitstrings and derived marginals.
- Adopt Qiskit order a(k−1)…a0 and display the mapping to named helper/classical bits. q(n−1)…q0 is separately labeled for data outcomes.
- Kept/all-zero and discarded/any-nonzero counts, retention, 1/r and actual accepted sample size.
- Data state views labeled Ideal Payload, Unprotected Faulted Payload, Checked Output Before Filtering, and Retained Output where available. Keep the default compact; use a comparison selector rather than eight tiny Bloch spheres.
- Selected-qubit Bloch pair, numeric components/local purity, exact/sample measurement probabilities, and expandable global fidelity/purity and joint outcomes.

Use density matrices for mixed channels and conditioned states. A mixed state has no single pure statevector. Keep identical axes/scales for paired spheres. Never replace full-state fidelity with a Z-distribution similarity score.

At exact zero retention, retained state/fidelity/expectation is null and overhead is infinite. At positive retention with zero sampled survivors, label exact conditional metrics separately from unavailable sampled retained counts. A “100% caught” test can legitimately leave no usable data, which is a sampling cost to explain rather than hide.

### 7.3 Low-overhead example and inspector

Include an editable example with input preparation H(q0) outside the check and payload CX(0,1) at column 0 followed by CX(1,2) at column 1:

- Broad check: opening X0 at boundary 0, closing X0X1X2 at boundary 2. Four controlled-Pauli taps total.
- Local check: opening Z1 at boundary 1, closing Z1 at boundary 2. Two controlled-Pauli taps total.

Show controlled interactions, Pauli weights, depth and covered interval. Count one controlled-Pauli factor as one logical two-qubit tap; if compiling controlled-Y into native operations, show the chosen basis and separate compiled single/two-qubit counts. Exclude visualization markers/barriers from gate/depth metrics.

These checks detect different faults: fewer taps does not imply equivalent coverage. Offer a bounded single-X/Z fault sweep over all data wires and boundaries, showing each checked location's flag probability. For a maximum 3×17×2=102 Pauli probes, this can use exact algebra after whole-schedule validation; cross-check representative probes with full simulation. Do not issue 102 uncontrolled browser simulation requests or claim this sweep scores arbitrary channels/hardware noise.

This is a coverage/resource explanation, not a new mission scoring system. Do not label older codes uniformly defective, claim the best check is always shortest, or assert implementation of the paper's complete check-search/routing algorithm.

For a two-check fault sweep, propagate each injected Pauli through the **entire assembled Clifford schedule**, including controlled taps and final helper H gates, then read its X/Y factors on measured helpers. Do not combine independently computed one-check coverage maps unless their equivalence has been established for that schedule. In channel/combined-fault experiments use the full simulation rather than this single-Pauli shortcut.

## 8. Canonical models and editable code

### 8.1 Draft structure

Use an isolated tutorial model, not expanded mission permissions:

```json
{
  "schemaVersion": 1,
  "mode": "guided",
  "dataQubits": 1,
  "preparation": [],
  "payload": [{"id":"s0","name":"s","qubits":[0],"column":2}],
  "checks": [{
    "id":"c0", "ancilla":0, "startBoundary":1, "endBoundary":3,
    "openingHadamard":true,
    "openingTaps":[{"qubit":0,"pauli":"X"}],
    "closingTaps":[{"qubit":0,"pauli":"Y"}],
    "closingSign":1, "closingHadamard":true, "measure":true
  }],
  "combineFaults":false,
  "faults":[]
}
```

Error records are `{id,name:"bit_flip"|"phase_flip"|"decoherence",qubit,boundary,order}` with waiting parameters only for decoherence. IDs are unique, ≤64 characters; order is a bounded nonnegative integer with unique ordering per boundary. Bound faults to four, checks to two, each product to at most three distinct data targets, and the expanded generated implementation to 128 logical operations.

Allow empty tap lists and false build flags in a draft/preview to represent incomplete construction. Run separately requires physical opening/closing/readout completeness; an operator mismatch is allowed only as a clearly labeled invalid-check diagnostic. Guided mode enforces its fixed preparation/payload server-side, even if the client submits a modified circuit.

Controller state includes separate guided/sandbox drafts and histories, selected operation/check/fault, editor/source/dirty diagnostics, mode, validation revision, propagation step, current result/fingerprint, basis/qubit/shots/seed, pending requests, guided achievement and sandbox experiment evidence.

### 8.2 Supported editable source

Use the same safe AST-based approach as Flight School 1, with an explicitly app-defined wrapper. Example full guided configuration:

```python
from quantum_shield import CheckCircuit

qc = CheckCircuit(1)
qc.s(0, at=2)
qc.check(id="c0", ancilla=0, start=1, end=3,
         opening=[(0, "X")], closing=[(0, "Y")], closing_sign=1,
         opening_h=True, closing_h=True, measure=True)
qc.phase_flip(0, boundary=3)
```

`check`, error helpers, scheduling keywords and `CheckCircuit` are teaching API constructs, not native `QuantumCircuit` methods. Each check's physical H/taps/H/M are independently editable fields/slots, even though this source declaration represents them together. Pasting a complete correct assembly is a legitimate code path; guided completion still requires a validated noiseless run.

Support payload gate calls from the Clifford palette, `at` scheduling, preparation calls `prepare_h(q,at=...)`, `prepare_x/y/z/s/sdg/cx/cz` with the corresponding gate arity, and at most two `check` declarations. Checks take bounded literal IDs, indices, lists of `(wire,"X"|"Y"|"Z")`, ±1 sign and literal Boolean stage flags. Missing flags default false so an unfinished construction is not silently completed. `bit_flip/phase_flip(q,boundary=...)` are deterministic error-role events; `decoherence` additionally takes `time_us`, `t1_us`, `t2_us`. Repeated faults require Combine Faults mode from the UI/run settings.

Parse only recognized declarations/calls and bounded literal structures/numeric expressions. No arbitrary imports, dynamic attributes, loops, definitions, comprehensions, file/network calls or execution. Source limits remain 8 KiB, 128 lines and 2048 AST nodes. Unknown Clifford/non-Clifford instructions or invalid fields return line/column diagnostics while preserving source.

Visual/source changes use one canonical draft. Apply is one undoable edit; Run in Code validates/applies that source first. Invalid source never falls back to an old circuit. Dirty source survives tab switches and requires Apply/Discard before conflicting visual edits. Mode switching preserves each mode's draft; changing away from dirty code requires an explicit choice rather than dropping text.

### 8.3 Native Qiskit view/export

Always expose generated read-only native Qiskit and an export distinct from editable supported source. For the guided assembly, the actual operation sequence includes:

```python
# q is the data index; a is the distinct ancilla index in a QuantumCircuit.
qc.h(a)
qc.cx(a, q)       # opening controlled X
qc.s(q)          # locked payload
qc.cy(a, q)      # closing controlled Y
qc.h(a)
qc.measure(a, syndrome[0])
```

An injected post-S Z belongs before `cy`, not after final readout. A negative signed closing adds a visible `z(a)` before the final H. General products expand to controlled X/Y/Z on every factor from the same ancilla. Thermal blocks export actual Aer channel instructions with explicit μs conventions.

The standalone program includes preparation, payload, full ancilla circuit, fault/no-fault variants, basis/readout mapping, seed/shots and syndrome filtering. Native code has no fictional `.check()` or `.bit_flip()` methods. Exported diagrams, code, validation order and simulator schedule must agree.

## 9. Backend validation and simulation contract

### 9.1 Isolated service

Do not loosen existing mission `/api/validate-checks` or `/api/trace-fault` contracts to accept arbitrary user circuits. They operate on authoritative missions. Add tutorial-specific endpoints and reuse safe internal primitives only where their assumptions match.

```text
src/components/flight-school-3/
  CheckLab.tsx                guided/sandbox controller and progression
  GuidedCheckAssembly.tsx     locked S and physical H/tap/H/M slots
  CheckCanvas.tsx             editable sandbox payload/check/fault layout
  PauliPropagationStrip.tsx   signed multi-wire trajectory
  CheckInspector.tsx          products, windows, stage flags, sign
  SyndromeTelemetry.tsx      validity, flags, states, accepted data
src/lib/flight-school-3/
  contracts.ts  content.ts  examples.ts  code-generation.ts
backend/check_lab/
  models.py  code_parser.py  propagation.py  schedule.py  simulator.py  service.py
```

Refactor shared workspace/editor helpers only when existing behavior is preserved. Keep module-specific schemas separate from `noise_lab` and `protection_lab` so adding check design cannot change their semantics.

### 9.2 Forward Pauli propagation

Validate payload Clifford gates and the selected interval. Build U from columns start≤column<end, then compute P′=UPU† using Qiskit Clifford tableau propagation. The intended Qiskit operation is `Pauli.evolve(Clifford(U), frame="s")`, i.e. forward conjugation; verify S:X→Y in tests so a reversed frame cannot silently yield −Y.

Preserve real ± signs and factor positions. Convert Qiskit little-endian Pauli labels into named q0/q1/q2 factors; q0 is the rightmost character in a native string. Equivalent product order on distinct wires is normalized, but the physical check-stage order is not discarded. Reject non-Hermitian/imaginary signed input Paulis rather than treating ±i as an arbitrary selectable sign in this two-boundary tutorial.

For trace display, return each gate's before/after operator, sign and weight, not just the final answer. A correct closing shape with wrong sign must fail noiseless validation unless the selected physical ancilla compensation fixes it.

### 9.3 Whole-check correctness

After structural and local Pauli checks, construct the complete noiseless ancilla unitary before measurement, with all helpers starting in zero and without the selected input preparation. Let V be its action on every data basis input tensored with zero ancillas. Require V to equal the intended payload action with zero ancillas, up to one overall global phase, with numerical residual tolerance (default 1e−8).

At most three data/two helper wires makes this bounded isometry check tractable. It catches cross-check scheduling interference and missing/wrong helper operations that a per-check Pauli comparison can miss. Do not validate using only the current prepared state, noiseless sampled counts, or equality of final probability histograms.

Report separate `structureComplete`, `localOperatorMatch`, `scheduleValid` and `runClassification`. A validation failure is diagnostic data, not proof the fault detector worked.

### 9.4 Actual quantum execution

1. Validate bounds and canonical scheduling before allocating simulation state.
2. Construct ideal preparation/payload and full helper circuit with Qiskit 2+.
3. Execute no-fault and faulted circuits with exact density matrices/channel evolution. Use Aer thermal relaxation locally for waits; fixed X/Z events are real Pauli gates.
4. Ancilla readouts can be deferred to the end for simulation because no helper is reused and there is no syndrome feedback; explain the equivalence and preserve the displayed logical readout positions. Actual native export may measure at the drawn close.
5. Compute joint syndrome probabilities and conditional data states by projection/partial trace. For valid checks all-zero acceptance is used; invalid diagnostic runs may display branch distributions but cannot claim improved protection.
6. Sample a single joint syndrome/data distribution per requested measurement setting and derive kept counts/marginals from it. Do not sample acceptance and data separately into contradictory totals.
7. Return exact/state metrics separately from counts. Compare the actual unfiltered and retained data states with the ideal final payload at the same boundary, including gates after a window closes.

Use the full channel on the coherent check circuit, not Bernoulli flag heuristics. Resampling changes no exact physics. No client-side fallback manufactures a trajectory, syndrome or fidelity if the backend is unavailable.

### 9.5 Endpoint proposals

| Endpoint | Input | Response / purpose |
| --- | --- | --- |
| POST `/api/tutorial/check-lab/compile` | Supported source, guided/sandbox mode, combine-faults setting | Draft or source diagnostics; incomplete drafts permitted for editing |
| POST `/api/tutorial/check-lab/validate` | Canonical draft | Stage completeness, signed trajectories, per-check match, schedule status, generated implementation/resources |
| POST `/api/tutorial/check-lab/run` | Draft, `faultsEnabled`, shots, seed, data basis/qubit | Noiseless/faulted syndrome comparison, data states/counts, acceptance and diagnostics |
| POST `/api/tutorial/check-lab/trace-fault` | Draft plus one proposed Pauli fault and boundary | Validity-aware Pauli path/commutation prediction and simulated flag probability |

`trace-fault` is a tutorial endpoint, not a new permissive mode on the mission endpoint. For thermal or combined-channel experiments use Run; do not force them through a single-Pauli tracing contract. Validate all direct requests independently of earlier Compile/Validate responses.

Response metadata includes `contentVersion="spacetime-checks-v1"`, engine version, request/result fingerprint, mode, canonical scheduling convention, active fault parameters/units and duration. Validation returns matrix residuals only in expandable technical details; learner-facing feedback uses clear gate/sign/window messages.

Run results include helper-bit mapping, exact no-fault/faulted joint syndrome probabilities, integer joint counts, N/kept/discarded, retention/overhead, data-state comparisons, operator traces, generated native code and resource counts. Nullability explicitly distinguishes incomplete, not applicable and no surviving state. Do not expose complete density matrices in normal responses.

Retain 16 KiB body, 8 KiB source, 128 lines, 2048 AST nodes, global simulation enable/admission guards and N≤4096. Cap at five physical wires, 64 preparation/payload operations, two checks, four faults, 16 payload columns and 128 generated logical operations. A fault sweep is a bounded explicit action; do not run it on every drag or slider pixel.

Debounce validation after settled changes and key every request by draft revision. Slider drag commits one semantic undo entry. Edits/mode changes invalidate old runs/previews; obsolete results must not overwrite a new draft or unlock progression. Failed/busy requests restore controls, preserve source and do not earn achievements.

## 10. Guided examples and completion

### 10.1 Required examples

| Example | What is shown | Expected lesson |
| --- | --- | --- |
| Complete S check | Opening X, S, closing Y, both H and M | Correct input-independent invariant; no-fault syndrome zero |
| Wrong closing | Same but closing X | Red mismatch and noiseless false alarms; not successful detection |
| Sign matters | Opening Y, S, expected −X | Visible ancilla Z compensation is essential |
| Fault time matters | X before S versus after S inside the same valid loop | Same fault axis can be commuting or anticommuting at different times |
| Local versus broad | The two-CX example in section 7.3 | Taps/coverage trade-off without claiming equivalent protection |
| Waiting channel | A valid check with nonzero thermal wait inside | Probabilistic syndrome, conditional state and sampling cost |
| Outside window | Pauli placed after close | It can affect data without triggering that completed check |

Theory diagrams are accessible before guided completion. Sandbox presets become editable once sandbox access is available. Loading a preset is one undoable edit, and never auto-certifies an unexecuted check. A Fill Expected Closing hint is allowed and visible; solving without hints is not a progression requirement.

### 10.2 Completion rules

```text
guidedComplete = the specific X → S → +Y assembly is complete
                 AND a current accepted valid noiseless run succeeds

sandboxExperimentComplete = sandbox is accessible
                            AND at least one complete valid check is present
                            AND a current sandbox run includes a nontrivial
                                data fault/channel and returns diagnostics

knowledgeCheckPassed = the learner submits B (P′ = Y) to the S-gate MCQ

moduleComplete = guidedComplete && sandboxExperimentComplete && knowledgeCheckPassed
```

The sandbox experiment may use a custom-authored circuit or an editable preset. Do not require a particular input, every channel, a prescribed fidelity, a syndrome-one sample, or a random success. A valid commuting/outside-window fault experiment counts as learning coverage. A zero-time wait, failed run, mere validation preview, incomplete/invalid loop, or superseded response does not count.

For profiles already granted access by Skip, sandbox entry does not force a new guided prerequisite or relock missions. The user may still earn this lesson's new certification by performing the two experiments and passing the knowledge check. Existing recorded access is preserved, not silently erased by a content-version bump.

#### Single-Qubit Operator Evolution knowledge check

In the Theory panel's Knowledge Check tab ask: **You attach an opening X check on data qubit q0 before an S gate (U = S). What closing check operator P′ must you select after S to prevent false syndrome alarms?**

- A) P′ = X
- B) P′ = Y
- C) P′ = Z
- D) P′ = I

Correct answer: **B**. Explain `P′ = U P U†` and show:

```text
S X S† = [[1,0],[0,i]] [[0,1],[1,0]] [[1,0],[0,−i]]
       = [[0,−i],[i,0]] = Y
```

The controlled closing Y cancels the opening operator propagated through S, so the noiseless helper returns to zero for every data input. An operator mismatch can cause syndrome-one false alarms without a fault; it does **not** imply every shot must return one. For the guided zero input, closing X instead of Y gives 50% false alarms. Allow unlimited retries with explanatory feedback. Store a correct submitted answer independently from experiment achievements; passing the quiz alone does not certify the module. No random shot outcome is a prerequisite.

Show **Flight School 3 Complete — Spacetime Check Architect**, with Continue to Flight School 4 and Experiment More. The continuation opens the **existing** next module; do not invent or rename its content to “Entangling Propagation” as part of this specification. Completing module 3 alone does not mark all six modules complete.

### 10.3 Persistence

Use validated local keys:

- `quantum-shield.flight-school-3.draft.v1.guided` and `.sandbox`: isolated validated drafts, editor mode and source/dirty text.
- `quantum-shield.flight-school-3.progress.v1`: content version, guided achievement, sandbox experiment evidence, selected/submitted knowledge-check answer, quiz achievement, active mode and bounded run settings. Module completion is derived from all three achievements.
- Reuse `quantum-shield.workspace.v1` for layout preferences.

Bound saved histories/artifacts and avoid large serialized density matrices. Invalid guided/sandbox drafts reset only the affected module draft, with a notice. Storage failures preserve in-memory sessions. Keep existing global `quantum-shield-qed-v2` progression, skip access and mission bests intact; use an explicit adapter through existing tutorial callbacks rather than writing incompatible new fields into that schema.

## 11. Future implementation order and verification

1. Reuse the stable workspace and inspect progression/module boundaries.
2. Add isolated models, strict source parsing, stage completeness and guided payload enforcement.
3. Test signed Clifford propagation and noiseless whole-check isometry before building colored feedback.
4. Implement the guided physical slots and valid/invalid diagnostic simulation; unlock sandbox from accepted guided evidence.
5. Add editable Clifford preparation/payload, multi-wire products, sign compensation, windows and schedule validation.
6. Add data X/Z/wait blocks, actual joint-channel simulation, syndrome/state telemetry and fault tracing.
7. Add low-overhead examples/resource accounting, source/native export synchronization, persistence and progression.
8. Verify desktop/mobile, existing Python/frontend suites and production build. Stop before redesigning later lessons/missions.

Required future regressions:

1. Full guided X→S→Y returns syndrome zero and ideal data for every data basis input and selected superpositions; validation is input-independent.
2. Wrong closing X is red; its no-fault flags are diagnostic false alarms rather than Caught Fault. Missing opening/final H or M is incomplete, not green.
3. S:Y→−X fails without physical phase compensation and passes with it. Signs and Qiskit label endianness survive visual/source/native round-trips.
4. CX propagation matches all four control/target rules; multi-wire closing products cannot be replaced by one factor.
5. Faults before/after S and outside the window match section 6.2, including X being missed before S and caught after S.
6. Full Qiskit simulation agrees with Pauli commutation predictions for valid single-event checks. Two-check schedules are checked globally, including a fixture where isolated local matches are insufficient.
7. Zero thermal duration is identity; nonzero waiting matches the actual coherent joint-circuit channel, not a data-only shortcut. Ordered double faults/cancellation are preserved.
8. N_kept+N_discarded=N; helper/data marginals agree with joint samples; all-zero joint acceptance is not a product of unrelated marginals. Zero exact/sample retention is represented safely.
9. Exact probabilities/state metrics do not change when only the sample seed changes. Entangled reduced states are not mislabeled as decoherence.
10. Guided payload edits, unsupported T/rotation gates, malformed products, reused ancillas, bad bounds and arbitrary Python are rejected with useful diagnostics.
11. Code Apply/Run is atomic; dirty text is preserved; native exports reproduce schedules, signs, channels and syndromes using real Qiskit APIs.
12. Completion requires real accepted guided/sandbox runs but never forces a particular syndrome outcome. Late/failed/preview requests do not earn progress.
13. Resource counts match generated circuits and the broad/local example's four/two taps. Coverage plots identify their differing tested regions.
14. Mouse/drag, click/keyboard, splitters, pane switching, focus, reduced motion, local recovery and existing skip/best-score persistence work on desktop/mobile.
15. Existing Flight School 1/2 contracts and main-mission fixed payload/scoring tests remain passing; Flight School 4–6 behavior is preserved.

Future commands: `pytest tests`, `pnpm typecheck`, `pnpm test`, relevant browser journeys and `pnpm build`. **This revision updates the design documents only: do not modify application code or run application/test suites while preparing it.**

## 12. References and interpretation

- [Martiel & Javadi-Abhari, Low-overhead error detection with spacetime codes](https://arxiv.org/html/2504.15725v1): coherent Pauli checks, spacetime-local support and controlled-check phase compensation, including supplementary section II.C. The tutorial is a deliberately bounded two-boundary teaching model rather than a claim to reproduce the full check-search algorithm.
- [Qiskit quantum-information reference](https://qiskit.qotlabs.org/docs/api/qiskit/quantum_info): Clifford/Pauli propagation, density matrices, subsystem ordering and state metrics. Verify installed Qiskit 2+ signatures during implementation.
- [Qiskit Aer thermal relaxation](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.thermal_relaxation_error.html): local time-dependent channels and the physical T2≤2T1 constraint.

Unresolved `[cite: ...]` markers and hardcoded illustrative histograms from the old draft are removed. All game telemetry must be computed from the learner's actual assembled circuit and chosen fault model.
