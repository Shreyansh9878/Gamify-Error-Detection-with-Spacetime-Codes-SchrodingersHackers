# Quantum Shield · Stage 1

A Next.js game with a real Qiskit 2+ backend: six visual onboarding modules, ten locked-payload missions, manual and assisted spacetime checks, a separate Paulice research lab, and device-local progress. No database, paid API, IBM account, or quantum hardware is required.

## Run locally

Use Node.js 22+ and Python 3.10+. From the repository root:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
node scripts/dev.mjs
```

Open http://127.0.0.1:3000. The launcher runs Python on port 8000 and Next.js on port 3000. Stop both with Ctrl+C. On macOS/Linux replace `.venv/Scripts/python.exe` with `.venv/bin/python`; the launcher detects the platform.

For the exact tested Python 3.10 dependency versions, install `requirements.lock.txt` instead of the compatible ranges in `requirements.txt`. Use a clean virtual environment; inheriting unrelated system packages can introduce plugin warnings or missing user-site dependencies. `pnpm-lock.yaml` pins the frontend dependency tree. The local pnpm store is ignored by Git.

Alternatively use two terminals:

```powershell
.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

```powershell
pnpm dev
```

The Next.js server proxies `/api/*` to Python. Set `QUANTUM_API_URL` before building if the Python service is elsewhere. `.env.example` documents the two optional settings. No secrets are necessary. Python reads environment variables directly; it does not automatically load Next's `.env.local`.

For a local production build, keep Python running and execute `pnpm build`, then `pnpm start`. Stage 2 will package the Python runtime for Vercel and verify current free-tier bundle, execution, and usage limits; this Stage 1 checkout does not claim that deployment has already been qualified.

## Source structure

```text
src/app/                    Next.js entry, metadata, responsive theme
src/components/Game.tsx     Mission map, onboarding gate, saved personal bests
src/components/Tutorial.tsx Six-step interactive lesson engine
src/components/CircuitBuilder.tsx  Locked payload, manual/assisted taps, boundary pins
src/components/Mission.tsx  Run orchestration, results, export, stars, audio
src/components/Visualizers.tsx     Probabilities, amplitudes, Bloch vectors, radar
src/components/ResearchLab.tsx     Paulice and controlled T-family experiments
src/lib/                    Typed contracts, API adapter, validated local storage
backend/levels.py           Authoritative mission rules and target payloads
backend/models.py           Strict bounded request contracts
backend/engine.py           Gate validation, coherent checks, noisy density states
backend/tutorial.py         Real Qiskit lesson experiments
backend/research.py         Paulice stabilizer observable estimator
backend/app.py              FastAPI endpoints and bounded compute admission
tests/                      Python physics and API regression tests
e2e/                        Playwright user-journey regression specifications
scripts/benchmark.py        Reproducible solutions and QFF comparisons
docs/benchmark-results.json Generated scientific evidence
docs/METHODS_AND_RESULTS.md Physics, scoring, findings, limitations
docs/WALKTHROUGH.md         Demo and verification guide
```

The previous terminal/notebook implementation is not used. The three `STAGE_*.md` files are earlier planning documents; their six-level/legacy-reuse descriptions are superseded by this fresh ten-mission implementation and this README.

## Game and state flow

`Game` loads the authoritative level registry from Python and validates stored progress using Zod. New profiles open flight school automatically. Both completing all six lessons and the visible skip override unlock all ten missions. Mission cards suggest a progression without trapping advanced players behind sequential locks.

`Tutorial` tracks completed experiments for the current module. An invalid manual loop does not complete the invariant task. The current module persists; a refresh repeats its short experiments. `Mission` owns only the protection draft: payload gates are read-only. Missions 1–5 require an explicit closing selection; missions 6–10 provide signed Clifford-tableau propagation with T-crossing validation. Multi-wire closing products are supported. Boundary pins and select controls are keyboard accessible. A ten-run comparison history, a single-fault tracer, and a live validation preview support strategy design. Changed settings mark results stale and disable exporting a mismatched result.

Every scored run travels to Python. The server selects its own target, limits, noise, and score formula. The client cannot submit a score, target vector, Python code, or arbitrary circuit instructions. Noise settings other than 100% are sandbox runs and cannot earn stars. Score and star personal bests are tracked independently. Local storage can be edited by its owner and is not a trusted leaderboard.

Storage key: `quantum-shield-qed-v2`. Schema:

```json
{"version":2,"tutorial":"new","step":0,"sound":false,"best":{"1":{"score":843,"stars":3}}}
```

The v2 storage namespace preserves old data without mixing scores from the previous state-building missions. Tutorial values: `new`, `complete`, `skipped`. Corrupt or incompatible storage resets to safe defaults. Unavailable storage produces a visible session-only notice. The game sends no analytics or account information.

## API

| Endpoint | Contract |
|---|---|
| `GET /api/health` | Engine and installed package versions |
| `GET /api/levels` | Ten immutable server mission definitions |
| `POST /api/tutorial/{1..6}` | `{action, noise, pauli, closingPauli, shots}`; module-specific experiments |
| `POST /api/run-circuit` | `{levelId, gates, checks, noiseScale, shots}` |
| `POST /api/validate-checks` | Fixed payload plus checks; returns closure, Pauli paths, and T-crossing diagnostics |
| `POST /api/trace-fault` | Fixed payload plus checks, `faultQubit`, `faultColumn`, `faultPauli`; ideal single-fault diagnostic |
| `POST /api/research` | `{levelId, targets, repetitions, tCount}` |

Example mission request:

```json
{"levelId":1,"gates":[{"id":"x-0-0","name":"x","qubits":[0],"column":0}],"checks":[{"qubit":0,"pauli":"Z","start":1,"end":4,"closingQubit":0,"closingPauli":"Z"}],"noiseScale":1,"shots":1024}
```

Gate names, arity, overlap, IDs, time bounds, fixed-payload integrity, gate budgets and ancilla budgets are checked on the server. `rz` uses integer multiples of π/2. Paulice rejects T inputs; manual T-crossing checks must remain Pauli at every gate. Invalid or interfering checks return 422, oversized requests 413, busy computation 429, and disabled simulation 503. The 16 KiB body cap, three data qubits, two helpers, three research repetitions, one concurrent simulation per process, and fixed shots bound each job. The application is a local Stage 1 service; distributed rate limits and public abuse controls belong to hosting work.

## Verify

```powershell
.venv/Scripts/python.exe -m pytest tests -q
pnpm typecheck
pnpm test
pnpm build
.venv/Scripts/python.exe -m scripts.benchmark
```

The Python suite verifies authoritative payload enforcement, manual closure and products, independent tableau/operator agreement, fault timing, T barriers, shot conservation, and a passing solution for every level, noise-free state preservation, rejection of invalid T crossings and overlaps, real Paulice check insertion, tutorial syndromes, score penalties, and API validation. Frontend unit tests cover corrupt storage, skip state, independent score/star records, and rendered locked payloads, assisted/manual controls, Bloch vectors, and shot metrics.

With both servers running, optional repeatable browser tests:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright specifications cover tutorial completion, skipping, a scored mission, refresh persistence, and mobile overflow. All four desktop/mobile journeys passed against the production build and real API. Additional visual checks used the Codex browser. See `docs/WALKTHROUGH.md`.

## Scientific scope

The QFF PDF defines experiments, not ten official numbered levels or official gate budgets. These missions are authored translations. The supplied document does not include the organizer's calibration/noise parameters, so the implemented channel rates are explicitly synthetic development values. Replace and version those values when official parameters are available.

The game implements localized two-endpoint coherent-Pauli invariants; the Research Lab uses the actual `qiskit-paulice` implementation. The app teaches detection and post-selection. It does not claim fault-tolerant correction, correction of arbitrary errors, or monotonic improvements from adding checks. A written report and reproducible results are included. Recording a presentation and publishing/submitting a repository remain user-controlled hackathon submission steps.

Sources: the supplied QFF Advanced Track PDF; [Martiel and Javadi, arXiv:2504.15725](https://arxiv.org/abs/2504.15725); [Paulice spacetime tutorial](https://qiskit.github.io/qiskit-paulice/guides/low_overhead_error_detection_using_spacetime_codes.html); [Aer density-matrix save API](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.library.save_density_matrix.html).

The current redesign contracts and scientific clarifications are documented in [docs/REDESIGN_IMPLEMENTATION.md](docs/REDESIGN_IMPLEMENTATION.md).
