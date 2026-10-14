# Stage 1 verification · 14 October 2026

## Executed successfully

- Python test suite: 27 tests passed (engine, API, six tutorial experiments, all ten mission solutions, signed Pauli propagation, interference rejection, and real Paulice insertion).
- Frontend unit suite: 3 tests passed (progress parsing, independent personal bests, tutorial bypass).
- `pnpm typecheck`: passed.
- Next.js production build: passed, including TypeScript checks and static page generation.
- Reproducible benchmark: generated 10 complete solution records and 24 research comparisons in `benchmark-results.json`.
- `git diff --check`: passed.

## Browser checks actually performed

The production build was tested through the local Next.js proxy and the real Python service, without mocked quantum results:

- Completed all six tutorial microsteps, including all required lesson-3 methods.
- Verified that successful experiments enable progression and final completion unlocks missions.
- Found and fixed the lesson-1 OR/AND mismatch: either X or H now satisfies its stated requirement.
- Built X on q0 in mission 1, ran it, and obtained 811 points with two stars.
- Refreshed the page and verified persisted tutorial completion, mission score, and stars.
- Built H(q0) followed by CX(q0,q1) in mission 4, added a Z check, and obtained 93.5% retained fidelity with 86.1% retained runs and three stars.
- Ran the mission-7 Paulice research experiment with three payload repetitions and targets `[0,1]`: two checks, 97.9% sampled fidelity estimate, 90.2% retained shots.
- Inspected the layout at 1440×1000 and 390×844. Both the mission map and laboratory fit the mobile page width; circuit content scrolls within its own container.
- Browser console error log was empty during the inspected session.
- Saved a desktop mission-map screenshot under `docs/screenshots/mission-control.jpg`.

The Playwright regression specifications in `e2e/` are provided but were not executed by the CLI during this implementation. Browser verification used the Codex browser. Comprehensive accessibility auditing, every browser/device combination, hosting qualification, and load testing are not claimed.

## Environment notes

Tested with Qiskit 2.4.1, Aer 0.17.2, Paulice 0.2.1, Next.js 16.4.0, React 19.3.0, and Python 3.10. The exact frontend lockfile and a 36-package Python dependency closure are included. The development virtual environment inherited preinstalled Qiskit packages; README setup recommends a clean environment.

Warnings were emitted by the installed FastAPI/httpx test adapter, an inherited IBM transpiler plugin, and Paulice's documented fallback to its internal Clifford basis. They did not cause test failures. Paulice-generated circuits are explicitly transpiled into the simulation basis before execution.

Temporary preview servers were stopped after verification. Run `node scripts/dev.mjs` to start the app again.
