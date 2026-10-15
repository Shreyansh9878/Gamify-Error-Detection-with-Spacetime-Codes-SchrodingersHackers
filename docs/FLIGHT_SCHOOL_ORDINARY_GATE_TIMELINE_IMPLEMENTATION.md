# Flight Schools 1–6: ordinary gates, dynamic checks and hardware noise

Implemented 15 October 2026. This records the user's latest requirements and supersedes the zone/palette/shell conventions in the earlier unified-canvas specification. The earlier tutorial APIs remain available for compatibility and their physics regression coverage is retained.

## Workspace and interaction

All six routed lessons use `LearningWorkspace`: theory left, experiment upper right, results lower right, with independently scrollable panes and accessible splitters. Small screens use Theory / Experiment / Results tabs. The skip control and existing mission access/bests remain intact.

`UnifiedCircuitCanvas` no longer renders a zone legend, colored zone columns, or per-column headings. Empty slots retain neutral accessible time coordinates for keyboard navigation. A gate is created by dragging from the palette, or through the safely parsed teaching source; a click does not place it. Controlled gates use a staged control endpoint followed by a target endpoint in the same time column. Both endpoints may be data or helper wires. Drag either endpoint to retarget it, or to the Dustbin to remove that controlled gate atomically. Undo/redo restore the operation.

The routed check lessons offer ordinary H, X, Y, Z, S, CX, CY, CZ and M, with gold T in School 5. There are no abstract opening/closing operator tiles, Pauli pop-ups, or special initial/final Hadamard tools. The fundamental and protection editors also support CY, CZ and terminal M alongside their existing preparation rotations. Decoherence blocks in Schools 1, 3, 4 and 5 may target one, selected, or all available wires; their channels are independent, not correlated.

M is terminal on its wire. Placing an interaction or waiting channel after M is rejected by the client and server. Other wires can continue. This restriction makes deferred terminal projection exact and prevents displaying coherent states after an actual measurement. FS1 native exports use an equivalent nonselective Kraus measurement before their final sampled comparison.

## Guided and blank circuits

Column indices in this table are zero-based implementation coordinates; they are not printed as rigid headers.

| School | Initial workload | Opening space | Optional fault | Closing space |
| --- | --- | --- | --- | --- |
| 1 | User-created preparation | No generated check | User-dragged X/Z/wait | User-created gates/readout |
| 2 | User-created base circuit only | Generated method is separate | Hardware channels, no spatial blocks | Separate read-only execution view |
| 3 | Locked S(q0), column 2 | Columns 0–1 | Column 3 | Columns 4–6 |
| 4 | Locked H(q0), column 3; CX(q0,q1), column 4 | Columns 0–2 | Column 5 | Columns 6–9 |
| 5 | Locked gold T(q0), column 2 | Columns 0–1 | Column 3 | Columns 4–6 |
| 6 | Original three-data-qubit Clifford workload, shifted to columns 4–8 | Columns 0–3 | Hardware channels, no spatial blocks | Columns 9–14 |

School 6 preserves the original ordered workload H(q0), H(q2), CX(q0,q1), S(q1), S(q2), CX(q0,q1), CX(q0,q1). The H pairs and S pairs occupy simultaneous disjoint-wire layers. Both ancillas start with no gates. Players supply their own initial H, any controlled factors, sign compensation if necessary, final H and M.

Schools 3–5 have independent guided and sandbox drafts. Every sandbox initializes with **no operations** and supports 1–5 data wires, 1–2 helpers and up to 24 timeline slots. Shrinking a register asks before dropping affected operations and remaps surviving ancilla indices. Reset clears only the selected mode. Data-only gates between the outer controlled-helper interactions define the sandbox workload; with no interior data gate it is identity. State preparation outside that interval remains part of the actual experiment.

## Dynamic check validation

`backend/timeline_lab` accepts actual physical operations rather than user-supplied closing-P labels. In guided mode the server inserts the authoritative workload and rejects collisions with its locked cells. In sandbox mode the workload is inferred from the authored data-only gates.

For each helper controlling data:

1. Find controlled Pauli interactions before and after the workload.
2. Anchor the connector to the **last** interaction before it and **first** interaction afterwards, using their actual column coordinates.
3. Compose every opening and closing factor in execution order, including signs. Compare the closing product with transported opening operator. Clifford cases use Qiskit `Pauli.evolve(Clifford(qc), frame='s')` and cross-check its matrix. T cases use exact operator conjugation and coherent Pauli expansion.
4. Require an initial H and closing H then M on the helper.
5. Validate the complete noiseless authored circuit as an isometry on **every data input** with helpers initialized to zero. Intermediate gates, cross-helper interactions and overlapping loops cannot bypass this final test.

Deterministic test faults and waiting channels are excluded from the operator identity test but included in the actual noisy execution. Consequently a properly built detector can remain green while reporting a nonzero syndrome. A wrong closure can produce false alarms; it does not necessarily produce syndrome one for every state or every shot.

The H→CNOT lesson needs opening **Z0**, which becomes X0 through H and then X0 X1 through CNOT. Opening X0 before this entire workload instead becomes Z0. The separate CNOT-only identity X0→X0 X1 remains a quiz concept.

## Hardware noise and protection methods

Schools 2 and 6 replace spatial error tools with controls under the canvas. Independent bit-flip and phase-flip probabilities, depolarizing strength, and T1/T2 relaxation act after each occupied quantum layer on every live physical wire. Empty timeline slots add no duration. A terminally measured wire receives no later channels. Probabilities are per layer, not probabilities of an error anywhere in the entire execution. The model is a teaching model, not device calibration.

School 2 retains the user's base circuit untouched in its authoring view. Selecting detection, mitigation or correction displays a separate read-only transformed circuit and its post-processing recipe. The experiment compares storage protection of the prepared output: all methods and the baseline include one output-storage interval. Errors already accumulated before opening/encoding are not retroactively repaired.

- Detection adds H/CP, the storage interval, CP/H/M and filters syndrome one. Helper gates are noisy.
- Mitigation composes the same channels at factors 1, 3 and 5 at every noise location, then extrapolates the observable estimate. It creates no repaired quantum state. Sampling variance and extrapolation bias can worsen the result.
- Correction encodes the selected output wire into a restricted three-wire repetition code, extracts two parity bits, performs branch-dependent recovery, and decodes. Exact simulation includes hardware channels after encoding, extraction, conditional recovery cycles and decoding. All syndrome branches are retained. This is limited X- or Z-family protection, not general fault-tolerant QEC.

Methods may be tried in any order and repeated. Three successful executions, one of each kind, complete School 2. Source editing uses `qc.hardware(...)` and `qc.protect_wire(index)`; arbitrary Python is never executed.

## States, sampling and completion

Qiskit density matrices determine states and full-state fidelity; seeded Qiskit sampling determines finite counts. A state with more than one displayed/experiment wire uses QSphere, including helpers. Mixed states show populations, coherences and weighted spectral components instead of fabricated pure phases. Joint labels distinguish `a1`, `a0` from the data wires.

Post-selection uses **only actually measured ancilla bits** and accepts their all-zero outcomes. Unmeasured helpers are traced out rather than silently post-selected. No measured helper means no shots are filtered. N_kept + N_discarded = N. Zero acceptance gives no retained state, undefined fidelity, infinite sampling overhead and score zero.

Schools 3, 4 and 5 require a successful guided execution and their knowledge checks. School 3 uses the provided S X S† = Y question; School 4 asks about CNOT spreading and the entire H→CNOT workload; School 5 asks which Pauli commutes with T. Sandbox experiments remain unrestricted practice. New lesson evidence is stored under version-2 timeline keys, while old global skip/completion access and mission bests are preserved.

School 6 qualifies with a complete valid nonempty check and exact Fps × acceptance ≥ 0.65. Its finite histogram is separate from exact qualification. Noise/circuit edits invalidate current validation, output and comparison. No hidden fidelity floor is added.

## Research reveal and honest bounds

Qualification triggers `/api/tutorial/timeline/reveal`. The server reruns and revalidates the submitted circuit, calls actual `qiskit_paulice.add_pauli_checks`, and computes an exact comparison under the current game hardware settings. Failed Paulice searches can be retried; the game does not fabricate success or silently unlock on an absent research result.

The reference family enumerates all **63 nonidentity three-data-qubit Pauli products**, each with a single helper, a full-workload window, fixed tap order and terminal readout. It reports the exact best score in that family, exact opening/closing placement, candidate count, noise protocol and physics fingerprint. It is cached by the complete noise settings. The player's score is displayed beside this reference. A player's more general placement can exceed this restricted reference.

The universal score upper bound is 1. Neither this finite-family certificate nor Paulice's heuristic proves an optimum over arbitrary circuits, windows, two-helper shells or all hardware models. Paulice's gamma cost uses its own gate-depolarization protocol; its actual returned circuit, supports, package version and native cost are displayed separately. Assigning that cost the meaning of the game's layer-noise fidelity score would be incorrect.

## API and regression compatibility

New strict, bounded endpoints:

- `POST /api/tutorial/timeline/compile`: parse the allowlisted `FlightCircuit` teaching source.
- `POST /api/tutorial/timeline/validate`: derive windows/products and verify the complete shell.
- `POST /api/tutorial/timeline/run`: exact density matrices, finite shots, joint QSphere frame, metrics and native Qiskit export.
- `POST /api/tutorial/timeline/reveal`: revalidated capstone comparison and actual research call.

Payloads remain bounded to 16 KiB; the simulator retains its process-level computation semaphore. Timelines allow at most seven physical wires, 24 slots and 96 authored operations. Existing mission routes and legacy tutorial request contracts remain supported. Protection experiments without `hardware` retain the old explicit-channel semantics for backward compatibility; the routed School 2 always uses hardware settings.

Verification commands:

```powershell
.venv/Scripts/python.exe -m pytest tests
pnpm typecheck
pnpm test
pnpm exec playwright test
pnpm build
```

Regression coverage includes actual source-parser round trips, signed Clifford/T transport, multiwire products, dynamic endpoints, terminal measurement, seven-wire relaxation, noisy-helper propagation, actual branch-dependent recovery, bounded optimum provenance, stale requests, desktop/mobile gate dragging, Dustbin/undo, blank sandboxes, MCQs and full mission unlock.

Verified results: **157 Python tests, 27 frontend unit tests, all 26 desktop/mobile browser tests, TypeScript checking and the production build passed**. The final School 2 hardware-preset correction was additionally checked on desktop and mobile and round-tripped through the real Python allowlist. The visual reference is `docs/screenshots/timeline-canvas-desktop.png`.
