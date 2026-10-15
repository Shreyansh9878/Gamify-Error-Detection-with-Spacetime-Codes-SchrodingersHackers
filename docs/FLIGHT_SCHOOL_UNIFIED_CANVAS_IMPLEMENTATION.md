# Flight Schools 1–6: implemented workspace refactor

The implementation follows `FLIGHT_SCHOOL_1_6_UNIFIED_CANVAS_REFACTOR_SPECIFICATION.md`. All six lessons now enter `LearningWorkspace`; steps 4–6 no longer render the legacy tutorial activities. The existing mission engine, mission controls, leaderboard scope and deployment configuration are unchanged.

## Shared authoring surface

`src/components/circuit-workspace/UnifiedCircuitCanvas.tsx` owns pointer, long-press touch and keyboard drag/drop. `src/lib/circuit-workspace/model.ts` defines display columns, physical boundary anchors, wire identities, item ownership and palette parameters. Lesson adapters translate their existing physics contracts to that one continuous grid:

| Adapter | Physical model |
| --- | --- |
| `NoiseCanvas.tsx` | Ordered preparation gates and explicit error-role operations; 1–5 data wires |
| `ProtectionCanvas.tsx` | Authored base circuit plus the selected generated detection, mitigation or repetition-correction layer |
| `CheckCanvas.tsx` | Guided or authored payload, local check windows, controlled product factors, helper stages and fault events |
| `GraduationCanvas.tsx` | Immutable three-wire workload, fixed helper shells, editable check taps and separate diagnostic overlays |

The four-stage legend identifies operation roles. Local checks remain at their actual internal workload boundaries; the canvas does not reorder operations into decorative bands. Inactive CPC stages are labeled in experiments without CPCs. Correction labels its generated encoding/parity/recovery circuitry explicitly rather than presenting it as CPC circuitry.

Palette clicks do not add operations. Drag a configured item to a slot; for CX/CZ/SWAP, drag the staged target endpoint to a distinct data wire to commit the whole gate. Escape cancels an unfinished connector. Keyboard interaction uses Space to lift, arrows to navigate, Space/Enter to drop, and Escape to cancel. Touch uses a 200 ms hold and supports scrolling without immediate placement. Pointer drags can scroll the timeline and experiment pane at their edges; keyboard drags do not trigger pointer auto-scroll.

The labeled **Delete — drop here** target removes one gate, product factor, manual helper stage or individual noise target. A draggable check/group handle removes its owned assembly as one transaction. A guided assembly resets its editable stages while retaining the prescribed helper/window descriptor. Fixed/generated workload and shell operations remain locked. Undo/redo restores complete edits. Capstone diagnostic edits have their own explicitly labeled undo/redo controls.

The former `PreparationCanvas`, `ErrorBlockInspector`, gate editors, click-based guided assembly, separate check/fault editors and click-based capstone strategy designer have been removed after their callers migrated. Probability-channel settings remain ordinary controls in School 2; they are not gate inspectors. Safe teaching source and explicit example loading remain supported alternate authoring routes.

## Noise contracts and timing

School 1's `decoherence` operation accepts an explicit `qubits` list of up to five wires. Schools 3–5 accept a fault's optional `targets` list containing `{kind:"data"|"ancilla", index:number}` records; older `qubit` records retain their original meaning. The backend expands a wait into independent Qiskit thermal-relaxation channels on those targets. One five-wire wait remains one authored event and does not consume five fault-event slots.

Configure dropped-wire, selected-wire or all-eligible-wire scope, elapsed time, T1 and T2 before dragging. Explicit target lists are snapshots: increasing the wire count does not silently extend an old event. Group deletion and per-target deletion are distinct. Moving a target in free noise/check experiments splits its grouped wait where needed, with atomic undo. Resize removes out-of-range targets only through an explicit accepted resize action.

School 2 retains its canonical single shared noise boundary so detection, ZNE and restricted repetition correction compare the same declared experiment. Repeated wire drops can add independent local targets at that boundary. Its channel group handle moves the common boundary; individual handles retarget a wire without silently moving the other copies. Generated redundancy/helper circuitry is locked. Only the selected logical wire receives repetition-code protection; other noisy data wires are labeled unprotected.

Server validation rejects duplicate/missing targets, inactive helpers, invalid T2/T1 and out-of-budget operations. Helper-noise exploration must occur at or before that helper's readout boundary; post-readout quantum edits are rejected instead of incorrectly changing an already recorded syndrome. School 6 overlays are a separate diagnostic request and never modify the fixture, certificate or qualifying score.

## Quantum-state visualization

`backend/learning/visualization.py` generates bounded state frames from Qiskit density matrices. `QuantumStateView`, `QSphere` and `BlochSphere` render those frames without a browser circuit simulator.

- Bloch is used only for a one-active-wire experiment and a one-wire frame.
- Any experiment with multiple active quantum wires uses QSphere, including product states and one-wire data marginals of checked experiments. Reserved inactive ancillas do not inflate the physical width.
- Pure-state frames include gauge-fixed complex amplitudes, probabilities and explicit bit ordering. Node area is proportional to probability; hue represents relative phase. Tables, tooltips, rotation, zoom and reset are available.
- Mixed-state frames show neutral populations and purity/rank. Weighted spectral components are selectable; more components load four at a time. Coherences are supplied independently. Components are labeled as a decomposition, with non-uniqueness in degenerate eigenspaces explained.
- Joint frames distinguish coherent pre-readout, unconditioned postmeasurement and helper-zero-conditioned states. Readout deferral is labeled. Correction provides encoded joint snapshots and decoded output separately, and does not invent a helper-zero acceptance rule.
- No retained state is fabricated at zero exact acceptance. Mitigation returns an observable estimate rather than a repaired quantum state.
- Frame identifiers and request guards prevent obsolete spectral responses from replacing a current frame. The bounded per-process cache returns an explicit expiration error when a token is unavailable.

`POST /api/tutorial/state-visualization` accepts `{visualizationToken,cursor}`. The legacy numeric tutorial route uses an integer path converter so it cannot shadow this endpoint. Frames are limited to seven active wires, initial mixed-component batches of four and the sixteen largest coherences.

## Lesson completion and access

| School | Required evidence |
| --- | --- |
| 1 | Accepted experiment and the existing three correct answers |
| 2 | Accepted detection, mitigation and correction runs, in any order and repeatable |
| 3 | Valid noiseless X→S→Y guided run, valid nontrivial sandbox fault run, and answer B |
| 4 | Valid noiseless X0→CX→X0X1 guided run, local S recap B and local product question C |
| 5 | Valid nontrivial Z-supported crossing of an actual payload T/T† gate, and answer C |
| 6 | Valid nonempty strategy with exact F_ps × r ≥ 0.65, then reveal review/acknowledgement |

School 4's extra sandbox experiment, School 5's X/T diagnostic and School 6's second-strategy comparison are optional. The old 0.90 fidelity floor is an optional quality target, not a qualification condition. A legitimate unchecked score is displayed but cannot fulfill designing a check.

Global `quantum-shield-qed-v2` progress and mission bests remain intact. Existing access and Skip remain available. School 4 does not infer its new recap answer from an old single quiz flag. Capstone evidence accepts the old stored metric version for migration but clears its local qualification/reveal evidence and requests a rerun under `fidelity-yield-v2`; global access is preserved.

## Capstone reveal and certificate

`POST /api/tutorial/graduation-lab/reveal` receives the fixture version and strategy, then revalidates its exact score on the backend. It calls the installed `qiskit-paulice` package using gamma/windowed search, targets `[0,1]` and seed 2026. A bounded cache is keyed by fixture/noise/scheduler/metric/protocol/package identity. The response distinguishes a fresh invocation from a cached actual invocation.

Paulice's emitted circuit uses a resynthesized, measured research workload and a different noise/search protocol. It is explicitly **Research candidate — not directly comparable** to the game's four-window strategy catalogue. The UI shows the actual package provenance, native gamma cost, support and gate schedule; it assigns no fictional game fidelity or global optimality claim to that candidate. Failures are explicit and retryable, while saved qualification remains available for acknowledgement.

The independent game certificate is rebuilt for the score-only nonempty objective:

```text
metricVersion: fidelity-yield-v2
individual candidates: 36
structural strategies: 1297
valid/evaluated strategies: 1201
bestNonempty.score: 0.7823901661249981
bestNonempty.fidelity: 0.9816597285784632
bestNonempty.retention: 0.7970074999999986
```

The artifact stores the nonempty winner, optional quality-target winner, unchecked/unconstrained comparison, ties, Pareto points and version/hash metadata. Loading verifies fixture, catalogue, payload, noise and engine versions and rechecks the winning strategy's exact score. The UI compares the player's placement/score with the certified allowed-catalogue result; it makes no maximum claim outside that finite search space.

Reproduce the offline certificate without putting exhaustive search in a web request:

```powershell
.venv/Scripts/python.exe -m backend.graduation_lab.benchmark
.venv/Scripts/python.exe -m backend.graduation_lab.benchmark --verify
```

`POST /api/tutorial/graduation-lab/diagnostic` accepts the usual strategy request plus a bounded `overlay` fault list. Its output is labeled diagnostic and always has `qualifies:false`, even if its exact product exceeds the goal. The normal run and reveal endpoints use only immutable fixture channels.

## Verification and visual evidence

The regression commands are:

```powershell
.venv/Scripts/python.exe -m pytest tests -q
pnpm typecheck
pnpm test
pnpm build
# With the Python API on 127.0.0.1:8000 and the built Next app on :3000:
pnpm exec playwright test --reporter=line
```

The suites cover 138 Python tests, 23 Vitest tests and 26 desktop/mobile browser tests. Browser coverage includes real mouse and long-press touch drags, keyboard drag/drop, inactive clicking, endpoint cancellation, individual trash deletion/undo, five-wire waits, Bell phases, mixed QSphere populations, source/persistence, both School 4 answers, the T barrier, diagnostic nonqualification, actual Paulice reveal, graduation and unchanged main-mission scoring/access. Existing meaningful click-era assertions were migrated to the new interactions rather than removing their physics or persistence coverage.

Screenshots are saved in `docs/screenshots/`: the noise lab and Schools 2–3 have desktop/mobile captures; `unified-school-4-*`, `unified-school-5-*` and `unified-school-6-*` cover the advanced workspaces. `unified-bell-*`, `unified-mixed-*`, `unified-trash-*`, `unified-t-barrier-*` and `unified-diagnostic-*` show the corresponding behaviors. `unified-graduated-*` records mission access after completing the revised sequence.

Local production preview and regression checks do not publish a site, add a database or deploy external infrastructure.
