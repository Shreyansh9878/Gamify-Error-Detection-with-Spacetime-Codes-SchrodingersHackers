# Trusted Fidelity migration and verification

Safety snapshot: annotated tag `pre-trusted-fidelity` at `dafdc8f`. Work is isolated on `codex/trusted-fidelity`; no history is rewritten. The agreed cutoff is **01:00 IST on Saturday 17 October 2026** (19:30 UTC on 16 October). No merge or deployment is performed by these scripts.

## What changed

The single implementation is `backend/quantum_core/scoring.py::trusted_fidelity`. FS6 and all main missions, their finite-family searches, validation, hosted smoke expectations and executed analysis call it. The former product is `correct_shot_yield` in research artifacts. `combinedScore` remains the main API field and test-id name for compatibility, but its value is Trusted Fidelity. It is not a second score formula.

FS6's budget/target are in `backend/timeline_lab/capstone_config.py`. Main budgets/targets are versioned in `backend/missions/references.json` and returned by `get_level`. Calibration changes no payload, helper count, noise parameter, gate restriction, deployment configuration or FS1–5 completion condition. Main1–3 still close manually; Main4–10 still use the generated signed inverse closing product. See `LEVEL_VALIDATION.md` for the new table, all additional strategies and paired physical metrics.

The starting budgets were raised to make blanket strategies incur a retention penalty while satisfying the required margins. Targets gently plateau at 0.67. Poor blanket fidelity also contributes to failure; blanket retention can exceed targeted retention. The ideal-shell Pauli-channel test is a controlled demonstration, not a universal improvement theorem for noisy checks or arbitrary mixtures of harmless and harmful faults. No noise model was altered to produce the expected result.

All current bounded-family winners retain less than S_min, so their scores are scaled correct-shot yields. The saturation branch is real and tested; these winners do not exercise it. Reoptimization confirms the bounded winners rather than implying a new winning strategy everywhere. “Too small” denotes an underpowered single-factor alternative, not fewer than one helper: all reasonable references already use only one helper.

Calibration also preserves the existing third-star rule (target + 0.05). A final review lowered Main2's preliminary budget from 0.98 to 0.97; its measured best and reasonable solutions can then earn three stars without changing its target, noise, payload or star rules. Automated margin and browser assertions guard this headroom.

## Stored progress

The primary key stays `quantum-shield-qed-v2`, with `missionVersion: 3`. Prior score/star records are archived under `quantum-shield.archived-missions-v1` or `v2` and cleared. `unlockedThrough` retains already earned access. Tutorial completion/skip, sound and existing lesson evidence remain. Drafts are unaffected. An old completed lesson is not represented as a newly measured score: result panels are transient and require a fresh run. Unit and browser tests cover migration.

## Statements, tables and scripts made stale by the change

| Previous statement or artifact | Required current interpretation / action |
|---|---|
| README playing section: score is the exact expectation F_ps × S_keep | Replaced by the budgeted game score; product is secondary correct-shot yield |
| README/storage documentation: missionVersion 2 and combined-score point records | Version 3, archived scores, preserved unlock access |
| FS6 overview and main objective text: combined product score, discarded shots always directly reduce that score | Trusted Fidelity and the explicit soft budget; above budget score equals F_ps |
| Main code-view comment and compact result label | Refer to authoritative Trusted Fidelity; retain API/test-id spelling only for compatibility |
| SCIENTIFIC_REPORT checks/scoring paragraph: score=Tr(rho_ideal B) | That overlap is correct_shot_yield; game score uses the central budget function |
| SCIENTIFIC_REPORT FS6 numerical example: 0.668136 / 0.686119 / 0.456980 | Those remain physical correct-shot yields; new FS6 game scores are 0.674885 / 0.693050 / 0.461596 |
| LEVEL_VALIDATION and SUBMISSION_INFO C5 old strategy table and targets | Regenerated table includes S_min and seven actual strategy drafts per level |
| SUBMISSION_INFO C3 postselection and game-objective explanation | New formula, explicit budget, simulation-only full-state fidelity and paired F_ps/S_keep |
| Earlier test counts, timings and notebook execution/cache numbers | Superseded by the actual final check record; no historical timing is relabelled as a new run |
| level_design_and_validation notebook product assertion, score-axis labels and saved search winners | Central Trusted Fidelity call, budget column, additional strategies and genuinely re-executed outputs |
| track_experiments notebook generic “score” label and best-score plot title | Original unbudgeted correct-shot-yield objective; Trusted Fidelity N/A because the study has no level budget |
| TRACK_EXPERIMENTS JSON `score` field | Retained legacy alias for correct_shot_yield only; original F_ps/S_keep/noise data preserved |
| validate_main_levels interpolation/assertions and four-strategy fixtures | Noise-preserving budget calibration, seven strategies, exact required margins and baseline-fidelity assertion |
| generate_validation_report's old schema overwrite | Updated to preserve budgeted schema and all physical/resource metrics, then render the current table |
| verify_capstone_difficulty's three-strategy certificate | Delegates to the seven-strategy FS6 calibration/verification, preserving its public command |
| smoke_deployment's hardcoded old FS6 value and four-strategy checks | Reads FS6/main reference JSON, verifies all seven main strategies and fidelity/retention/budget/protocol |
| Old copied screenshots, external report text or narration calling the product the game score | Team must replace with new UI captures/formula/table; this repository cannot inspect unpublished material |
| DEMO_SCRIPT's “show F_ps, S_keep and their product” as the primary FS6 result | Marked stale in that existing plan; use Trusted Fidelity and the budget, with the product only as secondary research yield |

Intentional unchanged uses: FS1–5 pedagogical outputs/completion, unbudgeted legacy compatibility APIs, native Paulice gamma/observable benchmarks, and the matched study's original noise protocol. None is silently described as the new game score. No game optimum is Paulice-certified; “best found” is restricted to the stated finite family.

## What to redeploy and rerun

Merge/review the feature branch only after every final check passes. Deploy **both the Next.js frontend and Python function together**, via the existing Vercel Git integration. No environment-variable, requirements or deployment-config changes are needed. Old hosted code is intentionally incompatible with the new smoke-reference protocol until redeployed.

After deployment, from the updated repository:

Run the API smoke and browser commands sequentially. Running them concurrently against one warm simulation worker can trigger the existing `429 BUSY` protection. This happened during local verification; an isolated browser rerun is required for the clean single-user check. No runtime or deployment guard was weakened.

```powershell
.venv/Scripts/python.exe scripts/smoke_deployment.py https://gamify-error-detection-with-spaceti-sand.vercel.app/ --output artifacts/trusted-live-smoke.json
$env:DEPLOYMENT_URL='https://gamify-error-detection-with-spaceti-sand.vercel.app/'
pnpm exec playwright install chromium
pnpm exec playwright test --config playwright.deployment.config.ts
```

The smoke checks 114 requests, including every direct link, assets, FS6 reveal and seven strategies per scored level. The browser suite additionally checks console/origin errors, desktop/mobile refresh, portable QSphere data, ordered FS1→Main10 completion, visible budget markers and legacy-score migration. Local production tests are not claimed as a new hosted deployment.

To reproduce the analysis, regenerate `scripts/cache_level_searches.py` after any backend/reference change, execute `scripts/run_notebook.py`, then `scripts/run_notebook.py --check-saved` in the pinned analysis environment. The matched study uses preserved data; regenerate it only with its unchanged `scripts/run_track_experiments.py` protocol. Cleanup must retain both notebooks, pins, generators, tests and reference solutions.
