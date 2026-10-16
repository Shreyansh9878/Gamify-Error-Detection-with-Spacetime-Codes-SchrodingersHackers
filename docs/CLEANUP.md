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
