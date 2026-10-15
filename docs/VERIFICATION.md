# QED redesign verification · 15 October 2026

## Executed successfully

- `pytest tests`: **52 passed**, including every original physics/API regression adapted to the fixed-payload contract and 25 new redesign cases.
- `pnpm typecheck`: passed.
- `pnpm test`: **8 passed**, covering the original progress tests and rendered QED controls/visualizers.
- `pnpm build`: passed after the completed browser and accessibility fixes.
- `pnpm test:e2e`: **4 passed** against the production build: desktop and mobile tutorial/protection journeys plus skip/T-crossing journeys.
- `python -m compileall -q backend`: passed.
- `python -m scripts.benchmark`: regenerated ten passing strategies and 24 controlled research comparisons with the current engine.
- `git diff --check`: passed.

The changed gameplay intentionally replaces state-building fixtures. The existing test coverage was retained: all mission solutions, target fidelity, noisy detection, no-noise preservation, signed conjugation, interference rejection, invalid T paths, score penalties, tutorial states, API validation, payload integrity, and actual Paulice insertion remain tested.

New regressions cover required manual closure, multi-wire products, independent tableau-versus-operator conjugation for X/Y/Z, actual propagated T-crossing components, fault timing inside/outside checks, harmless missed faults versus damaged outputs, non-Pauli fault trajectories through T, shot conservation for all allowed budgets, inverse-retention overhead, phase damage hidden from probabilities, false alarms from open loops, and the new endpoint contracts.

## Browser verification actually performed

Used the local Next.js application and the real Python API, without mocked quantum results:

- Completed all six redesigned tutorial modules, including the methods question and valid manual-loop requirement.
- Observed a broken X→X loop around S with false alarms; corrected X→Y and observed a deterministic syndrome after Z injection.
- Compared zero, one, and two helpers with measured kept/discarded shot counts.
- Tested X through S/T and Z through T, then unlocked the missions.
- Confirmed payloads have locked graphics and no gate-editing controls.
- In mission 1, selected a wrong closing Pauli and verified that the run control is disabled. Restored the valid Z closure and completed a scored run.
- The mission-1 example produced F_post ≈ 99.2%, exact retention ≈ 78.8%, 804 kept / 220 discarded sampled shots, sampling overhead ≈ 1.27×, and score 843 under the declared synthetic model.
- Injected X after q0/column 2 and observed a 100% ideal flag probability, without altering the scored circuit.
- In mission 3, manually selected X on both closing wires after CX and observed a closed invariant.
- In mission 8, observed the red T barrier for propagated X and green closure after switching to Z.
- Inspected the designer at 390×844 and 1440×1000. The overall mobile page remained within viewport width; circuit and anchor grids scroll internally.
- Browser console error log was empty in the inspected session.
- Saved `docs/screenshots/qed-redesign.jpg` as a visual record of the locked-payload mission and shot-cost panel.

The Playwright journey specifications were updated and executed through the CLI against the production build and real API. All four passed, covering tutorial completion, invalid/valid manual closure, immutable payload rendering, test-fault detection, scored runs, refresh persistence, skip override, T barriers, and mobile page bounds. The separate visual checks above used the Codex browser. This is not exhaustive browser/device coverage or a complete accessibility audit.

## Reproducibility and environment limits

The benchmark records Qiskit 2.5.2, Aer 0.17.2, and Paulice 0.2.1. The exact 36-package Python dependency closure was refreshed to the installed versions used for these checks. The frontend dependency tree is unchanged. Next.js 16.4.0 and React 19.3.0 were used.

The initial Playwright launch reported a missing browser executable; the official Chromium headless runtime was installed, and the complete suite then passed. The installed FastAPI/httpx adapter emits a deprecation warning, and Paulice can warn that inserted checks need its internal Clifford basis. Those are warnings, not test failures; generated circuits are explicitly transpiled to the simulation basis. On this Windows environment the sandbox blocked the loopback socket that Python's asyncio event loop creates. API tests were therefore run with normal loopback access rather than altering application behavior to work around the sandbox. The requested checks passed in that environment.

The implementation follows the paper's invariant, syndrome, post-selection, and resource-trade-off principles within the documented small-circuit Pauli-only model. It does not claim to reimplement the paper's full connectivity-aware optimizer using two-endpoint checks; actual Paulice experiments remain available for the richer construction. See `REDESIGN_IMPLEMENTATION.md` for scientific clarifications to the design input.

Temporary preview servers were stopped after verification. Run `node scripts/dev.mjs` to restart locally.
