# Repository cleanup manifest

Feature checkpoint: `81014cd`. Cleanup is a separate commit. All removals were audited after the feature build, Python regressions, frontend tests and the complete desktop/mobile browser suite passed. The bounded optimizer was independently rerun with the final exact density-matrix engine and matched every stored reference.

The source audit resolved actual relative/alias imports against the planned deletion set: **zero external source imports** remained. Current tests were migrated from obsolete renderers before deletion; no physics regression suite was removed. Screenshot destinations were changed to ignored `artifacts/screenshots` before removing their old copies. No runtime references to `docs/screenshots` remain.

## Deleted legacy source files

- `src/components/advanced-learning/AdvancedLab.tsx`
- `src/components/advanced-learning/GraduationLab.tsx`
- `src/components/advanced-learning/SimulationTelemetry.tsx`
- `src/components/circuit-workspace/CheckCanvas.tsx`
- `src/components/circuit-workspace/GraduationCanvas.tsx`
- `src/components/CircuitBuilder.tsx`
- `src/components/flight-school-3/CheckLab.tsx`
- `src/components/flight-school-3/CheckTelemetry.tsx`
- `src/components/learning/NoiseControls.tsx`
- `src/components/ResearchLab.tsx`
- `src/components/Visualizers.tsx`
- `src/lib/advanced-learning/code-generation.ts`
- `src/lib/advanced-learning/content.ts`
- `src/lib/advanced-learning/contracts.ts`
- `src/lib/advanced-learning/examples.ts`
- `src/lib/advanced-learning/graduation.ts`
- `src/lib/tutorial-data.ts`
- `src/lib/types.ts`

Removed unused `checkTools`, `checkModel`, `resizedFaults` and their advanced-contract imports from the shared canvas adapter. Unused abstract P/P′ palette settings, their obsolete model fields and the unused legacy palette branches were removed. Current noise/protection adapters remain. Removed obsolete global layout selectors and inactive zone-header styles; current tutorial selectors remain. The selector inventory is below.

## Deleted superseded documents

- `STAGE_1_HACKATHON_DELIVERABLES.md`
- `STAGE_2_HOSTING_WITHOUT_LEADERBOARD.md`
- `STAGE_3_FULL_GAME_WITH_LEADERBOARD.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_4.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_5.md`
- `docs/# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_6.md`
- `docs/FLIGHT_SCHOOL_1_6_UNIFIED_CANVAS_REFACTOR_SPECIFICATION.md`
- `docs/FLIGHT_SCHOOL_1_IMPLEMENTATION.md`
- `docs/FLIGHT_SCHOOL_2_3_IMPLEMENTATION.md`
- `docs/FLIGHT_SCHOOL_ORDINARY_GATE_TIMELINE_IMPLEMENTATION.md`
- `docs/FLIGHT_SCHOOL_UNIFIED_CANVAS_IMPLEMENTATION.md`
- `docs/GAME_REDESIGN_SPECIFICATION.md`
- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_1.md`
- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_2.md`
- `docs/LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_3.md`
- `docs/METHODS_AND_RESULTS.md`
- `docs/REDESIGN_IMPLEMENTATION.md`
- `docs/VERIFICATION.md`
- `docs/WALKTHROUGH.md`

## Deleted generated QA screenshots

These are build/test outputs. The Playwright suite generates current replacements under `artifacts/screenshots`, outside tracked source. Qiskit circuit figures in `public/tutorial-circuits` are retained.

- `docs/screenshots/flight-school-2-desktop.png`
- `docs/screenshots/flight-school-2-mobile.png`
- `docs/screenshots/flight-school-3-desktop.png`
- `docs/screenshots/flight-school-3-mobile.png`
- `docs/screenshots/main-1-desktop.png`
- `docs/screenshots/main-1-mobile.png`
- `docs/screenshots/main-10-desktop.png`
- `docs/screenshots/main-10-mobile.png`
- `docs/screenshots/main-2-desktop.png`
- `docs/screenshots/main-2-mobile.png`
- `docs/screenshots/main-3-desktop.png`
- `docs/screenshots/main-3-mobile.png`
- `docs/screenshots/main-4-desktop.png`
- `docs/screenshots/main-4-mobile.png`
- `docs/screenshots/main-5-desktop.png`
- `docs/screenshots/main-5-mobile.png`
- `docs/screenshots/main-6-desktop.png`
- `docs/screenshots/main-6-mobile.png`
- `docs/screenshots/main-7-desktop.png`
- `docs/screenshots/main-7-mobile.png`
- `docs/screenshots/main-8-desktop.png`
- `docs/screenshots/main-8-mobile.png`
- `docs/screenshots/main-9-desktop.png`
- `docs/screenshots/main-9-mobile.png`
- `docs/screenshots/mission-control.jpg`
- `docs/screenshots/noise-lab-desktop.png`
- `docs/screenshots/noise-lab-mobile.png`
- `docs/screenshots/noise-lab-preview-desktop.png`
- `docs/screenshots/noise-lab-workbench-desktop.png`
- `docs/screenshots/noise-lab-workbench-mobile.png`
- `docs/screenshots/qed-redesign.jpg`
- `docs/screenshots/timeline-canvas-desktop.png`
- `docs/screenshots/timeline-school-3-desktop.png`
- `docs/screenshots/timeline-school-3-mobile.png`
- `docs/screenshots/timeline-school-4-desktop.png`
- `docs/screenshots/timeline-school-4-mobile.png`
- `docs/screenshots/timeline-school-5-desktop.png`
- `docs/screenshots/timeline-school-5-mobile.png`
- `docs/screenshots/timeline-school-6-desktop.png`
- `docs/screenshots/timeline-school-6-mobile.png`
- `docs/screenshots/timeline-t-sandbox-desktop.png`
- `docs/screenshots/timeline-t-sandbox-mobile.png`
- `docs/screenshots/tutorial-parameter-mcq-desktop.png`
- `docs/screenshots/tutorial-parameter-mcq-mobile.png`
- `docs/screenshots/unified-bell-desktop.png`
- `docs/screenshots/unified-bell-mobile.png`
- `docs/screenshots/unified-diagnostic-desktop.png`
- `docs/screenshots/unified-diagnostic-mobile.png`
- `docs/screenshots/unified-graduated-desktop.png`
- `docs/screenshots/unified-graduated-mobile.png`
- `docs/screenshots/unified-mixed-desktop.png`
- `docs/screenshots/unified-mixed-mobile.png`
- `docs/screenshots/unified-school-4-desktop.png`
- `docs/screenshots/unified-school-4-mobile.png`
- `docs/screenshots/unified-school-5-desktop.png`
- `docs/screenshots/unified-school-5-mobile.png`
- `docs/screenshots/unified-school-6-desktop.png`
- `docs/screenshots/unified-school-6-mobile.png`
- `docs/screenshots/unified-t-barrier-desktop.png`
- `docs/screenshots/unified-t-barrier-mobile.png`
- `docs/screenshots/unified-trash-desktop.png`
- `docs/screenshots/unified-trash-mobile.png`

## Deleted stale scripts/data and temporary artifacts

- `scripts/benchmark.py`
- `docs/benchmark-results.json`
- `artifacts/paper/coherent-checks.png`
- `.next`
- `.pytest_cache`
- `test-results`
- `backend/**/__pycache__`
- `tests/__pycache__`
- `scripts/__pycache__`
- `tsconfig.tsbuildinfo`
- `backend/missions/.optimizer-*.json`
- `artifacts/cleanup-plan.json` (temporary deletion inventory, incorporated here).

Build/test caches are regenerated by final verification and remain Git-ignored. Python environment, Node dependencies and the configured pnpm store are dependencies, not stale build output, and are retained.

## Removed selector inventory

`src/app/globals.css`: `.anchor-grid`, `.anchor-pin`, `.anchor-scroll`, `.auto-closing`, `.blochs`, `.caught`, `.check-console`, `.check-row`, `.check-toolbar`, `.chips`, `.circuit-scroll`, `.closed-loop`, `.column-label`, `.concept-quiz`, `.confetti`, `.designer-toolbar`, `.fault-location`, `.fault-pin`, `.fault-result`, `.fault-trajectory`, `.gate-bridge`, `.gate-palette`, `.goal-strip`, `.heat-row`, `.inline-label`, `.lab-grid`, `.lesson-copy`, `.locked-circuit`, `.loop-line`, `.loop-path`, `.missed`, `.open-loop`, `.operator-equation`, `.operator-inspector`, `.operator-rail`, `.panel-title`, `.payload-cell`, `.prob-row`, `.range-label`, `.rejected`, `.research-controls`, `.resource-demo`, `.resource-qubits`, `.sample-stream`, `.step-track`, `.tap-controls`, `.task`, `.tracks`, `.tutorial-controls`, `.tutorial-grid`, `.win-dialog`, `.wire-cell`, `.wire-row`.

`src/app/learning-labs.css`: `.uc-zone-inactive`, `.uc-zones`.

## Dependency and output cleanup

`requirements.txt` no longer includes unused `rich` or `pymupdf`. It now lists the FastAPI, Uvicorn and Pydantic runtime imports that were previously present only in the lock file. The tested lock remains intact; offline drawing requirements remain separate. The pnpm workspace file and `.npmrc` configure different settings and are not duplicates.

## Kept deliberately / uncertain ownership

- `backend/{engine,levels,models,research,tutorial}.py` and `backend/{check_lab,advanced_lab,graduation_lab}`: older compatibility APIs are still registered by FastAPI and exercised by existing physics/API tests. They are not unused imports. Removing them would silently break those contracts, so they remain isolated from the new main mission registry. No corresponding obsolete frontend screen remains.
- Legacy check definitions inside the shared `src/lib/learning` modules: current protection/state contracts and source-interoperability regression tests still consume these modules. They were not removed wholesale.
- The original `Qiskit Fall Fest 2026 Hackathon - Advanced Track.pdf`: user-provided source material, not generated clutter.
- `AGENTS.md`, `readme.md`, `docs/MAIN_MISSIONS.md`, `docs/TUTORIAL_GLOBAL_FIXES_IMPLEMENTATION.md`: instructions, current setup and active architecture/physics documentation.
- `scripts/generate_tutorial_circuits.py`, `requirements-draw.txt`, all public Qiskit figures and their manifest: required reproducible circuit-image assets.
- `scripts/validate_main_levels.py`, all main references/tests and `scripts/verify_capstone_difficulty.py` with the FS6 certificate: required scientific regression evidence.
- All Python test suites and all current frontend/browser suites. Older UI assertions were updated to the current components rather than dropping their test cases.

## Final verification

Completed after all removals:

- `pytest tests -q`: **193 passed** (all pre-existing Python suites retained).
- `pnpm test`: **33 passed** (all existing frontend cases retained, with obsolete renderer assertions migrated).
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `python scripts/validate_main_levels.py`: all 10 levels verified; exact uncached repeats have spread zero.
- The complete bounded-family optimizer was recomputed before cleanup and matched every stored optimum.
- `pnpm exec playwright test`: **54 passed against the production build**, covering Flight Schools 1–6 and Main Missions 1–10 on desktop/mobile, source edits, drag/drop, Dustbin, insertion/removal, auto-closings and rejected T crossings.
- Source import graph: **zero unreachable production TypeScript modules**; no removed source imports remain.
- All ten public Qiskit circuit PNGs and their manifest remain present.

Test outputs remain disposable under ignored artifact directories rather than committed screenshots. Existing warnings concern Starlette's httpx deprecation and Paulice's Clifford basis fallback in compatibility tests; no test failed.
