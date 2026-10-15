# Flight School 2 and 3 implementation

Implemented against the two workspace specifications, with the additional S-gate knowledge check required for Flight School 3 certification. Both lessons reuse Flight School 1's responsive LeetCode workspace, independent scrolling, keyboard-accessible splitters, mobile pane navigation and layout persistence.

## Entry points and boundaries

`src/components/Tutorial.tsx` routes steps 1 and 2 (zero-based) to the new labs. Flight School 1, the existing Flight School 4–6 activities, and the authoritative fixed mission payloads retain their own engines. The lesson selector preserves the furthest previously accessible lesson; Skip retains existing mission unlock behavior.

```text
src/components/flight-school-2/
  ProtectionLab.tsx            orchestration, settings, accepted-run evidence
  ProtectionTelemetry.tsx      three-way comparisons, ZNE and recovery details
src/components/flight-school-3/
  CheckLab.tsx                 guided/sandbox modes and knowledge check
  CheckDesigner.tsx            physical assembly and signed Pauli products
  FaultEditor.tsx              explicit X/Z/wait events and tracing
  CheckTelemetry.tsx           syndrome, retained state and fault diagnostics
src/components/learning/
  LabFrame.tsx, LabTheory.tsx   shared navigation, theory, code and feedback
  GateEditor.tsx               bounded visual gate editing and fault drops
  NoiseControls.tsx            one explicit stochastic noise boundary
  CircuitPreview.tsx           generated physical circuit and resources
  StateCard.tsx                Bloch vectors, probabilities and counts
src/lib/learning/
  contracts.ts                 validated models and typed responses
  useWorkbench.ts              atomic source editing, history, revision guards
  code-generation.ts           supported teaching-source representation
  content.ts, examples.ts      learner explanations, presets and MCQ
backend/learning/
  common.py                    Qiskit states/channels, sampling and exports
  source.py                    bounded AST allowlist; no learner code execution
backend/protection_lab/        models, source parser, physical method engine
backend/check_lab/             models, source parser, propagation/check engine
src/app/learning-labs.css      scoped visual styles
```

## Flight School 2

The learner edits 1–3 data wires, input/output gates and a local noise boundary. Detection, mitigation and correction can be selected in any order and repeated. Selecting a method previews its circuit; only an accepted successful Run earns that method's completion flag. All three flags complete the lesson. No required improvement or quiz is imposed.

- **Detection:** an ideal H / controlled-P / noise / controlled-P / H / measurement check. Joint syndrome/data samples determine accepted counts. Conditional states are normalized from actual density-matrix branches. Zero acceptance yields no retained state and infinite expected sampling overhead.
- **Mitigation:** compose the explicit channel at factors 1, 3 and 5. Fit sampled observable expectations using linear weights `(13/12, 1/3, −5/12)` or quadratic weights `(15/8, −5/4, 3/8)`. Display the intercept, approximate sampling interval, raw variants, bias limitation and possible overshoot. No repaired state or mitigation fidelity is invented. The factor-one run doubles as the noisy baseline, giving 3N sampled executions.
- **Correction:** encode the selected data wire using two redundancy wires, apply independent physical channels on the three encoded wires, extract two parity syndromes, conditionally recover, decode and trace redundancy. The phase variant rotates the encoded basis around noise. Entangled spectator data remain part of the state comparison. This restricted repetition code cannot correct arbitrary noise. All method shots are retained; baseline plus method uses 2N sampled executions.

The ideal reference is exact and consumes zero sampled shots. Channel parameters and input/basis changes can make a technique ineffective or worse; these cases remain visible. Resources describe ideal logical operations, not hardware routing or fault-tolerance costs.

## Flight School 3

Guided mode locks the zero input, one data wire, S at column 2, and the window from boundary 1 to 3. The learner assembles the opening H, opening tap, closing tap, final H and measurement individually. Opening X must close with +Y. Complete mismatches can run as false-alarm diagnostics; unfinished physical readouts cannot run.

A successful accepted noiseless X→S→Y run unlocks the custom sandbox. Existing skipped/completed profiles retain sandbox access. The sandbox supports 1–3 data wires, an input preparation prefix, Clifford payloads, up to two independently owned ancillas, manual multiwire taps and signed closings. Fill Expected Closing is an explicit undoable hint.

Propagation uses Qiskit Clifford conjugation in the forward Schrödinger frame. `S Y S† = −X` requires the displayed ancilla Z compensation. Local Pauli matches alone are insufficient: the full helper-zero isometry must equal the intended payload on **every** data input, up to a single global phase. Conflicting schedules are rejected as valid protection even when individual operators match.

At each payload boundary the engine applies faults first, then closing checks in reverse ID order, opening checks in ID order, and payload gates. Consequently a fault at the opening boundary is outside the new check and a fault at its closing boundary is inside. X/Z error blocks have a different role from intentional payload X/Z gates. Fault buttons support click placement and dragging onto a payload cell; selected gate inspectors also offer before/after injection. Thermal waiting uses a bounded zero-temperature T1/T2 channel. Combine Faults permits up to four explicitly ordered events.

The coverage sweep propagates each single X/Z probe through the entire validated Clifford schedule, including the physical helper interactions. Trace Fault displays the actual propagated operator through that schedule. Channels use joint density-matrix simulation and are not assigned a fictitious single Pauli path.

Certification requires all three:

1. Accepted valid guided noiseless X→S→+Y run.
2. Accepted valid sandbox run with a nontrivial enabled data fault/channel.
3. Correct submitted MCQ answer **B: P′ = Y**, explained by `P′ = U P U†` and `S X S† = Y`.

Quiz retries are unlimited. A mismatch **can** cause false syndrome alarms; it need not return syndrome one every shot. The guided closing-X mismatch has a 50% no-fault flag probability. A valid commuting fault experiment counts toward exploration even if it is not flagged. Preview, coverage, trace-only, zero-time wait and obsolete responses do not award experiment evidence.

## API and source contract

All new endpoints use the existing backend request-size and compute-capacity guards. Models reject unknown fields, missing wires, excessive operations, malformed noise parameters and invalid physical ranges.

| POST endpoint | Purpose |
| --- | --- |
| `/api/tutorial/protection-lab/compile` | Supported source → validated experiment or line/column diagnostics |
| `/api/tutorial/protection-lab/preview` | Generated method circuits, resources and native Qiskit export |
| `/api/tutorial/protection-lab/run` | Baseline, selected method, processing and sampled/exact diagnostics |
| `/api/tutorial/check-lab/compile` | Supported source → guided/sandbox draft or diagnostics |
| `/api/tutorial/check-lab/validate` | Stage completeness, signed propagation and whole-schedule validity |
| `/api/tutorial/check-lab/run` | No-fault/faulted syndromes, data states and achievement eligibility |
| `/api/tutorial/check-lab/trace-fault` | One explicit proposed X/Z fault with actual propagation trace |
| `/api/tutorial/check-lab/coverage` | Exact single-Pauli coverage across all 17 boundaries |

Editable `ProtectionCircuit` / `CheckCircuit` code is an app-defined teaching DSL, explicitly labeled in the UI. It is parsed with an AST allowlist, never executed. It accepts only documented declarations, gate/noise/check calls and bounded literals. The separately generated, read-only native `QuantumCircuit` export uses Qiskit 2+ and Aer, including actual channels, measurements, and `if_test` recovery. Tests execute these trusted generated exports to verify they are standalone programs.

Source changes remain unapplied until compiled. Invalid source is retained and never silently falls back to running the previous visual model. Undo/redo covers successful model edits. Revision guards discard responses from superseded runs, edits or unmounted workbenches; result badges identify stale settings.

## Persistence

Validated local storage keys:

```text
quantum-shield.flight-school-2.draft.v1
quantum-shield.flight-school-2.progress.v1
quantum-shield.flight-school-3.draft.v1.guided
quantum-shield.flight-school-3.draft.v1.sandbox
quantum-shield.flight-school-3.progress.v1
```

Drafts save canonical models, source/dirty text and editor mode. Progress saves bounded settings and achievements; Flight School 3 additionally saves quiz answers. Histories are bounded and session-local; large density matrices and results are not persisted. Invalid storage resets only its own lab entry and shows a notice. Storage failures keep the in-memory session usable. Existing `quantum-shield-qed-v2` access and mission bests are preserved, and the existing workspace layout key is reused.

## Running and verification

Use the repository's installed Python environment and pnpm dependencies. From the repository root run the backend and frontend in separate terminals:

```powershell
.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
pnpm dev
```

Open `http://127.0.0.1:3000`, finish or revisit the preceding lesson and enter Flight School 2. Next proxies the tutorial API to the local backend using the existing rewrite configuration; no new database, account, service key or package is required.

```powershell
.venv/Scripts/python.exe -m pytest tests
pnpm typecheck
pnpm test
pnpm exec playwright test
pnpm build
```

Physics tests cover post-selection, zero acceptance, entangled repetition recovery, wrong-code/high-noise counterexamples, actual repeated-channel ZNE, signed S propagation, fault timing, conflicting checks, whole-schedule coverage, safe source parsing and generated native exports. Frontend tests cover model limits, physical-stage rendering, full theory and visual/source physics equivalence for every preset. Browser regressions cover arbitrary method order and repetition, resampling, invalid-source retention, stale response exclusion, guided/sandbox progression, drag placement, coverage persistence, MCQ retries and stored certification on desktop and mobile. The existing end-to-end game journey now completes the new labs before continuing through the unchanged later activities and a mission.

Visual evidence is stored in `docs/screenshots/flight-school-2-desktop.png`, `flight-school-2-mobile.png`, `flight-school-3-desktop.png` and `flight-school-3-mobile.png`.

### Verification results — 15 October 2026

- Python: **123 passed**, including all existing suites and 33 new lab tests. Existing FastAPI/httpx deprecation and Paulice basis-translation warnings remain non-failing.
- TypeScript: `pnpm typecheck` passed; production build also completed TypeScript checking.
- Vitest: **20 passed** across four files.
- Playwright: **16 passed** across desktop Chromium and mobile Chromium, including the existing noise lab and complete game journey.
- Production: `pnpm build` succeeded. The production page, both new source compilers and both Qiskit run endpoints passed a live check through the Next API proxy. The six new desktop/mobile browser regressions were also exercised against the production server.

These checks verify the bounded ideal-helper educational models. They do not certify a hardware noise model, universal correction code, or implementation of the paper's full spacetime check-search algorithm.
