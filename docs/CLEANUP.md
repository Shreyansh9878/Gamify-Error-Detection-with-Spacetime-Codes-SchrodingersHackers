# Final repository cleanup

Protected supporting analysis added after this historical cleanup: retain `notebooks/level_design_and_validation.ipynb` with executed outputs, `notebooks/requirements.txt`, `notebooks/data/level_search_results.json`, `scripts/level_design_analysis.py`, `scripts/cache_level_searches.py`, `scripts/run_notebook.py` and `tests/test_level_notebook.py`. The search JSON is reproducible scientific evidence, not a disposable `backend/missions/.optimizer-*.json` cache. Existing Vercel exclusions intentionally keep notebook material out of deployment; they do not authorize deleting it from the repository.

Feature checkpoint: `696ce5e`. Cleanup follows that feature commit and is committed separately. The pre-cleanup production build, TypeScript, 208 Python tests plus the three new study tests, 34 frontend tests and all 56 desktop/mobile browser tests passed. Searches found no source/setup/test reference to the three obsolete documents before removal. Their current replacements are linked from README.

Deleted tracked documents:

- docs/MAIN_MISSIONS.md — superseded sizes, noise protocol, references and test counts; replaced by SCIENTIFIC_REPORT.md and LEVEL_VALIDATION.md.
- docs/TUTORIAL_GLOBAL_FIXES_IMPLEMENTATION.md — superseded capstone size, 63-shell search, scores and threshold; current physics/setup is in README, CORE_GUIDE.md and SCIENTIFIC_REPORT.md.
- docs/CLEANUP_MANIFEST.md — historical cleanup inventory containing outdated active-file links; Git retains that history, while this file describes the final pass.

Removed dead code/configuration fields:

- Unused `noise.background` from the main-level configuration, TypeScript contract and test fixture. Actual all-wire hardware parameters remain in `noise.hardware`.
- Unused `json` and `payload_operator` imports in the mission service, unused `noise_instruction` re-export in the mission schedule, and unused NumPy import in the study driver. The core functions themselves and their tests remain.

Removed disposable ignored outputs: ten backend/missions/.optimizer-*.json search caches; backend/scripts/tests __pycache__ directories; .next, .pytest_cache, test-results, tsconfig.tsbuildinfo; artifacts/pdf-review/brief-page-4.png and the prior artifacts/screenshots outputs. Every deletion target was resolved and verified inside this repository before native PowerShell removal. Build/test/browser verification regenerates current ignored artifacts, which are not submission source files.

Kept after audit:

- README, PROVENANCE, setup and scientific docs, notebook, source brief PDF, package locks and required configs.
- Every Qiskit static circuit image and its manifest: all are referenced by current overview content/tests. The generator and drawing requirements are preserved.
- Every validation script, test and reference-solution file, including FS1–6 and Main1–10 player drafts.
- Legacy Python APIs/research fixtures: still registered and tested. Their consumers outside the UI cannot safely be assumed absent, so deleting them would risk compatibility. The legacy Paulice failure-injection hook is intentionally retained.
- node_modules, .venv and .pnpm-store are active local dependencies/caches, not committed application assets. No dependency was removed merely for being a developer tool; runtime imports/configs and locked test tools remain in use.
- next-env.d.ts is Next-generated and already had a local dev/build-path change before this task. It was not manually edited or included in these commits; Next regenerates its paths during dev/build.

Post-cleanup: 211 Python tests, all sixteen reference experiments/mission certificates, T scorer checks, actual constrained Paulice calls, TypeScript, 34 frontend tests and the production build pass. The full 56-case Playwright suite is run against that production build, including the ordered desktop/mobile drag/drop journey. Test and build commands are in README; current ignored QA outputs are regenerated intentionally.

## 16 October 2026: post–Trusted Fidelity repository review

Reviewed the full tracked-file inventory, frontend imports/exports and dependencies, Python imports/re-exports, registered API routes, static assets, score callers, progress migration, validation scripts and scientific evidence. All current Markdown documents have a setup, submission, provenance, scientific or verification purpose; none was deleted just to reduce the file count. This pass changes no payload, gate set, level target, budget, noise model, grading formula, FS1–5 completion condition or deployment configuration.

### Removed code

- Unused imports in `backend/advanced_lab/service.py`, `backend/graduation_lab/service.py`, `backend/missions/reference.py`, `backend/noise_lab/simulator.py`, `backend/timeline_lab/service.py` and `backend/tutorial.py`.
- Unused imports in `scripts/level_design_analysis.py`, `scripts/validate_t_scoring.py`, `scripts/verify_capstone_difficulty.py` and five test modules. Every test assertion remains.
- Unused `Wire`/`Draft` imports, unused callback parameters and the unused `runCheck` helper argument in the frontend/browser code.
- Unreferenced `blockLabel`, `GateName`, `CheckValidation` and `CheckResult` declarations. The actual schemas, live timeline types and tested compatibility fixtures remain.

Python AST analysis leaves only `single_term` and `exact_density` as locally unused imports in the mission service: they are actual re-exports imported by scripts/tests and are deliberately retained. TypeScript checks with `--noUnusedLocals --noUnusedParameters` now pass without changing compiler settings.

### Browser-test repairs

The full suite found three stale fixture assumptions, affecting desktop and mobile. The manual-closure negative test expected an old CX at boundary 2; it now changes the actual final controlled check. The T negative test assumed the reasonable reference crossed T and contained CX; it now constructs Z/X shells immediately around a real T/Tdg instruction from `/api/levels`. The protection persistence test seeded score version 2 but expected that obsolete score to survive version-3 migration; it now seeds the exported current `MISSION_VERSION`, while dedicated legacy-migration tests still check archival and unlock preservation. No assertion or backend admission guard was loosened to make these tests pass. A subsequent complete run passed 63/64 and exposed an existing preview/run overlap: an automatic FS2 preview occupied the single-computation slot when the next run started. `src/lib/api.ts` now serializes POST requests per browser tab, leaves GET requests independent, and releases the queue after failures. Two unit tests verify ordering, independent health requests and failure recovery. No tutorial content, physics, level rule or deployment setting changes. This scheduling fix and the test repairs are committed separately from cleanup.

### Disposable files deleted

These 21 ignored generated files total 4,194,829 bytes. Exact paths were checked inside this repository before native PowerShell deletion; none is committed application source, a user photo or a required generator. The corresponding reproducible notebook, canonical scripts and tracked validation evidence remain.

- `artifacts/build_level_notebook.py`
- `artifacts/finalize_main2_budget.py`
- `artifacts/finalize_trusted_report.py`
- `artifacts/trusted_preflight.py`
- `artifacts/update_trusted_docs.py`
- `artifacts/update_trusted_notebooks.py`
- `artifacts/trusted-candidates.json`
- `artifacts/level-design-and-validation.html`
- `artifacts/notebook-qa-check_school-5.png`
- `artifacts/notebook-qa-cross_level.png`
- `artifacts/notebook-qa-main_level-10.png`
- `artifacts/notebook-qa-protection_school-.png`
- `artifacts/review-symbols.txt`
- `artifacts/trusted-final-backend.log`
- `artifacts/trusted-final-frontend.log`
- `artifacts/trusted-final-levels.log`
- `artifacts/trusted-final-notebook.log`
- `artifacts/trusted-final-report.log`
- `artifacts/trusted-t-scoring.log`
- `artifacts/trusted-validation-report.log`
- `artifacts/trusted-validation-table.log`

### Kept deliberately

- Both executed notebooks, notebook requirements/search JSON, every validation test/reference solution, the source brief PDF, Qiskit figure generator, drawing requirements and static circuit assets.
- All registered legacy APIs and their research fixtures: still callable/tested, so they cannot be treated as dead merely because the current UI has newer routes.
- `requirements.txt` and `requirements-deploy.txt`: their duplication is intentional and tested because Vercel's manifest parser failed on nested `-r` includes. Dependency pins/configuration are unchanged; all runtime JS dependencies have real consumers.
- Three team SVG initials placeholders: explicitly requested editable photo stand-ins, documented in README, even though member photos default to `null`.
- Active dependency environments/caches (`.venv`, `node_modules`, `.pnpm-store`, notebook environments), current production build, current QA reports and screenshots. Do not delete running-server resources or possible submission figures merely for being ignored. Notebook clean-install environments, deployment feasibility outputs and submission-review artifacts are retained because their future use is uncertain.
- Historical verification JSON and earlier dated sections above. Their original counts/timings are historical evidence, not new results; the new checks below are separate.

### Evidence freshness and grading

Backend import cleanup changes source fingerprints. `scripts/cache_level_searches.py` actually re-enumerated 4,206 candidates in 423.60 seconds; all ten results (circuits, scores, candidate counts and scope) equal the previous committed cache. `scripts/run_notebook.py` then executed all 24 cells in 24.13 seconds, with all 16 summary rows matching and zero numerical disagreements. The saved-output check passed; no execution counts or timestamps were forged.

The hosted game was independently checked with `scripts/smoke_deployment.py https://gamify-error-detection-with-spaceti-sand.vercel.app/ --output artifacts/cleanup-hosted-smoke.json`: all 114 requests passed, maximum 2.130 seconds, matching reference scores within 1e-9. It serves `main-missions-trusted-v3-all-wire`. Main 1's reasonable solution returned 0.6822061939156472 against stored 0.6822061939156473. This verifies the existing deployment's new grading; the cleanup itself is not pushed or redeployed by these checks.

Trusted Fidelity remains `F_ps * min(1, S_keep / S_min)` in the single core function. Exact state-derived scores have zero sampling spread. Above budget, score equals fidelity; below budget, retention incurs a penalty. Every scored level retains baseline/blanket failure and reasonable-solution margins; F_ps and S_keep remain paired. Bounded-family best-found scores are not unrestricted or Paulice-certified optima. All current stored winners are below their budgets, as already disclosed in the migration notes.

### Final checks after cleanup and the request-scheduling fix

- Backend: `python -m pytest tests -q` — **240 passed**, three existing dependency warnings, 48.91 seconds. No test assertion removed.
- Frontend: strict `tsc --noEmit --noUnusedLocals --noUnusedParameters` passed; **43 Vitest tests passed** (including two request-ordering/failure-recovery tests); `pnpm build` passed.
- Levels: `python scripts/validate_all_levels.py` passed every tutorial reference, all seven strategies for FS6/Main1–10, target margins, exact zero spread and T/Clifford/density-matrix agreement/rejection checks.
- Notebook: **24 genuinely re-executed cells**, **16 matching summary rows**, **zero numeric disagreements**; `--check-saved` passed. Search regeneration left all ten numerical/circuit results unchanged.
- Full local production browser suite: **64 passed**, **zero skipped/unexpected/flaky**, 266.41 seconds. Desktop and mobile coverage includes all sixteen screens, full ordered drag/drop progression, score migration, stars, green/red checks, palettes, trash, QSphere, static figures and team credits.
- Hosted API: **114 requests passed**, max **2.130 seconds**, reference agreement **1e-9**. This is a fresh hosted API check; the 64-case browser suite ran locally, not on Vercel.
- Baseline level/noise/scoring/reference JSON, runtime requirements, package locks and deployment configuration have no changes in this cleanup. `git diff --check` passed. Request scheduling and stale-test repairs have their own commit; cleanup/provenance/refreshed evidence follow separately. Nothing is pushed or redeployed by this task.

Reproduce the full browser suite against a local production build with `pnpm exec playwright test` (default port 3000). This review used an ignored temporary config pointing to an isolated production frontend on 3003 and the identical API on 8002, to avoid interrupting existing servers. The regular deployment browser config remains unchanged. The raw final browser and hosted reports are in ignored `artifacts/cleanup-browser-final.json` and `artifacts/cleanup-hosted-smoke.json`; the exact observed summary is recorded above for the public repository.

An automatic approval review rejected stopping a stalled test process because it could not verify ownership. The process was left untouched; an independent authorized test run completed successfully. No cleanup or verification remains blocked by that rejection.

Final sequential local API smoke against that same build also passed all 114 requests (maximum 0.325 seconds). After verification, generated `__pycache__` directories under api/backend/scripts/tests, `.pytest_cache` and `tsconfig.tsbuildinfo` were removed; they are disposable ignored caches and regenerate on demand. The active `.next` build and dependency environments remain intact.
