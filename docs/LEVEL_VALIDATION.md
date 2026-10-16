# Level validation: Trusted Fidelity

All numbers below are generated from the stored, simulator-verified player drafts. Score = F_ps · min(1, S_keep / S_min); correct_shot_yield = F_ps · S_keep is a separate secondary metric. Trusted Fidelity is an explicit-budget game design choice and a simulation-only full-state fidelity objective. Always read F_ps and S_keep together.

“Best found” is the exact maximum in a declared finite family, never a Paulice-certified game optimum or an unrestricted global optimum. Main levels enumerate one-helper Pauli products over five windows; FS6 enumerates 15 full-payload products. Native Paulice gamma cost is separate. T circuits use custom admissible-Pauli search and Aer density matrices with statevector ideal references.

## Reference scores

| Level | Data | Ancillas | T/Tdg | S_min | Baseline | Blanket | Reasonable | Best found | Target | Spread |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| FS6 | 2 | 1 | 0 | 0.99 | 0.494132 | 0.461596 | 0.674885 | 0.693050 | 0.62 | 0 |
| 1 | 2 | 1 | 0 | 0.99 | 0.466665 | 0.440177 | 0.682206 | 0.688500 | 0.63 | 0 |
| 2 | 3 | 1 | 0 | 0.97 | 0.455944 | 0.418645 | 0.692925 | 0.693160 | 0.64 | 0 |
| 3 | 3 | 2 | 0 | 0.94 | 0.445385 | 0.357518 | 0.707868 | 0.708107 | 0.65 | 0 |
| 4 | 3 | 2 | 0 | 0.92 | 0.436066 | 0.360783 | 0.716577 | 0.716818 | 0.66 | 0 |
| 5 | 3 | 2 | 0 | 0.90 | 0.424433 | 0.353367 | 0.705837 | 0.721441 | 0.66 | 0 |
| 6 | 3 | 2 | 0 | 0.87 | 0.414982 | 0.369557 | 0.720186 | 0.738621 | 0.67 | 0 |
| 7 | 3 | 3 | 0 | 0.86 | 0.405382 | 0.321153 | 0.720304 | 0.738750 | 0.67 | 0 |
| 8 | 4 | 3 | 1 | 0.83 | 0.390749 | 0.255343 | 0.723805 | 0.744017 | 0.67 | 0 |
| 9 | 4 | 3 | 3 | 0.82 | 0.381199 | 0.248999 | 0.723079 | 0.743161 | 0.67 | 0 |
| 10 | 4 | 3 | 5 | 0.80 | 0.371958 | 0.271754 | 0.731521 | 0.751848 | 0.67 | 0 |

## Additional plausible strategies

| Level | Misplaced | Too small | Slightly overchecked |
|---|---:|---:|---:|
| FS6 | 0.476705 (FAIL) | 0.471220 (FAIL) | 0.454099 (FAIL) |
| 1 | 0.452116 (FAIL) | 0.446788 (FAIL) | 0.667821 (PASS) |
| 2 | 0.448693 (FAIL) | 0.444334 (FAIL) | 0.666097 (PASS) |
| 3 | 0.438304 (FAIL) | 0.448677 (FAIL) | 0.681358 (PASS) |
| 4 | 0.429133 (FAIL) | 0.448829 (FAIL) | 0.690513 (PASS) |
| 5 | 0.417693 (FAIL) | 0.446301 (FAIL) | 0.673823 (PASS) |
| 6 | 0.408395 (FAIL) | 0.451507 (FAIL) | 0.688579 (PASS) |
| 7 | 0.398953 (FAIL) | 0.446181 (FAIL) | 0.687558 (PASS) |
| 8 | 0.384169 (FAIL) | 0.443691 (FAIL) | 0.688552 (PASS) |
| 9 | 0.374792 (FAIL) | 0.437830 (FAIL) | 0.707467 (PASS) |
| 10 | 0.365711 (FAIL) | 0.437568 (FAIL) | 0.715758 (PASS) |

“Misplaced” protects a region before the hotspot in main missions; FS6's IZ check does not cover the relaxing wire during the hotspot. “Too small” is a single-factor alternative. “Overchecked” adds controlled interactions relative to the reasonable strategy. The latter two may pass or fail: their measured outcomes are reported, not predetermined.

## Required margins and calibration

Baseline and blanket are at least 0.05 below target; reasonable is at least 0.03 above; best found is strictly better than reasonable and reaches the existing third-star threshold (target + 0.05). The baseline fidelity itself is below target, so retention alone cannot explain failure. Misplaced checks fail. All seven strategies are valid reachable drafts (baseline has no check); each is rerun three times with zero exact score spread. Fewer helpers than the fixed allowance are allowed. Manual P/P′ in Main1–3 and generated signed P′ in Main4–10 are certified by the ordinary validator. Targets occupy 60–80% of the baseline-to-best interval and gently plateau at 0.67 so T missions retain nonoptimal headroom.

The proposed starting budgets (0.60 in FS6/Main1–3, 0.50 later) did not penalize blanket retention. Calibration changes only budgets, targets and stored strategies, not payloads or noise. Budgets are therefore higher: 0.99 in FS6, then the values above. The search selects the highest two-decimal budget below 1 satisfying the target-position and safe-margin requirements. Blanket retention is below its budget, causing a real penalty, but blanket fidelity is also poor. In early levels blanket retains MORE shots than targeted checks; do not claim blanket failure is exclusively caused by lower retention.

All current bounded-family winners lie below S_min. For these particular drafts the score is correct_shot_yield divided by the level budget; the saturation branch is implemented and tested but is not reached by these winners. Do not claim the new metric changed the winning placement in every family.

The Pauli-only monotonicity demonstration isolates an IDEAL check shell around a detectable X channel on |0>. It is not a theorem for every state, error distribution or noisy shell. Background channels after extra check layers can reduce fidelity even with extra check-interaction depolarization disabled. No noise model was changed to manufacture improvement.

FS1–5 retain their experiment/MCQ/method-coverage completion contracts, with no numeric score threshold. Their stored experiments remain in backend/reference_solutions/tutorials.json. The full-progression browser test certifies FS1→Main10 completion through actual drag/drop, readout/reveal review and ordered unlocks on desktop and mobile.

## Full physical metrics

| Level | Strategy | F_ps | S_keep | correct_shot_yield | Trusted Fidelity |
|---|---|---:|---:|---:|---:|
| FS6 | baseline | 0.494132 | 1.000000 | 0.494132 | 0.494132 |
| FS6 | everywhere | 0.478589 | 0.954849 | 0.456980 | 0.461596 |
| FS6 | reasonable | 0.816186 | 0.818607 | 0.668136 | 0.674885 |
| FS6 | optimal | 0.827609 | 0.829038 | 0.686119 | 0.693050 |
| FS6 | misplaced | 0.488080 | 0.966928 | 0.471938 | 0.476705 |
| FS6 | tooSmall | 0.937114 | 0.497813 | 0.466508 | 0.471220 |
| FS6 | overchecked | 0.900542 | 0.499208 | 0.449558 | 0.454099 |
| 1 | baseline | 0.466665 | 1.000000 | 0.466665 | 0.466665 |
| 1 | everywhere | 0.454601 | 0.958589 | 0.435775 | 0.440177 |
| 1 | reasonable | 0.822369 | 0.821266 | 0.675384 | 0.682206 |
| 1 | optimal | 0.827453 | 0.823750 | 0.681615 | 0.688500 |
| 1 | misplaced | 0.459707 | 0.973652 | 0.447595 | 0.452116 |
| 1 | tooSmall | 0.939735 | 0.470686 | 0.442320 | 0.446788 |
| 1 | overchecked | 0.813637 | 0.812578 | 0.661143 | 0.667821 |
| 2 | baseline | 0.455944 | 1.000000 | 0.455944 | 0.455944 |
| 2 | everywhere | 0.437008 | 0.929240 | 0.406086 | 0.418645 |
| 2 | reasonable | 0.819311 | 0.820369 | 0.672137 | 0.692925 |
| 2 | optimal | 0.819429 | 0.820529 | 0.672365 | 0.693160 |
| 2 | misplaced | 0.448693 | 0.973652 | 0.436871 | 0.448693 |
| 2 | tooSmall | 0.932589 | 0.462158 | 0.431004 | 0.444334 |
| 2 | overchecked | 0.801854 | 0.805776 | 0.646114 | 0.666097 |
| 3 | baseline | 0.445385 | 1.000000 | 0.445385 | 0.445385 |
| 3 | everywhere | 0.412004 | 0.815689 | 0.336067 | 0.357518 |
| 3 | reasonable | 0.814416 | 0.817022 | 0.665396 | 0.707868 |
| 3 | optimal | 0.814533 | 0.817181 | 0.665621 | 0.708107 |
| 3 | misplaced | 0.438304 | 0.973652 | 0.426755 | 0.438304 |
| 3 | tooSmall | 0.928823 | 0.454076 | 0.421756 | 0.448677 |
| 3 | overchecked | 0.799313 | 0.801283 | 0.640476 | 0.681358 |
| 4 | baseline | 0.436066 | 1.000000 | 0.436066 | 0.436066 |
| 4 | everywhere | 0.407866 | 0.813798 | 0.331921 | 0.360783 |
| 4 | reasonable | 0.810022 | 0.813868 | 0.659251 | 0.716577 |
| 4 | optimal | 0.810138 | 0.814025 | 0.659472 | 0.716818 |
| 4 | misplaced | 0.429133 | 0.973652 | 0.417826 | 0.429133 |
| 4 | tooSmall | 0.926062 | 0.445891 | 0.412923 | 0.448829 |
| 4 | overchecked | 0.797133 | 0.796946 | 0.635272 | 0.690513 |
| 5 | baseline | 0.424433 | 1.000000 | 0.424433 | 0.424433 |
| 5 | everywhere | 0.392453 | 0.810364 | 0.318030 | 0.353367 |
| 5 | reasonable | 0.791840 | 0.802250 | 0.635253 | 0.705837 |
| 5 | optimal | 0.800864 | 0.810745 | 0.649297 | 0.721441 |
| 5 | misplaced | 0.417693 | 0.973652 | 0.406688 | 0.417693 |
| 5 | tooSmall | 0.916722 | 0.438160 | 0.401671 | 0.446301 |
| 5 | overchecked | 0.772580 | 0.784955 | 0.606441 | 0.673823 |
| 6 | baseline | 0.414982 | 1.000000 | 0.414982 | 0.414982 |
| 6 | everywhere | 0.385864 | 0.833232 | 0.321514 | 0.369557 |
| 6 | reasonable | 0.783827 | 0.799362 | 0.626562 | 0.720186 |
| 6 | optimal | 0.795639 | 0.807653 | 0.642600 | 0.738621 |
| 6 | misplaced | 0.408395 | 0.973652 | 0.397634 | 0.408395 |
| 6 | tooSmall | 0.912869 | 0.430304 | 0.392811 | 0.451507 |
| 6 | overchecked | 0.767688 | 0.780348 | 0.599064 | 0.688579 |
| 7 | baseline | 0.405382 | 1.000000 | 0.405382 | 0.405382 |
| 7 | everywhere | 0.366800 | 0.752976 | 0.276192 | 0.321153 |
| 7 | reasonable | 0.777988 | 0.796235 | 0.619462 | 0.720304 |
| 7 | optimal | 0.789774 | 0.804439 | 0.635325 | 0.738750 |
| 7 | misplaced | 0.398953 | 0.973652 | 0.388441 | 0.398953 |
| 7 | tooSmall | 0.907323 | 0.422910 | 0.383716 | 0.446181 |
| 7 | overchecked | 0.761217 | 0.776782 | 0.591300 | 0.687558 |
| 8 | baseline | 0.390749 | 1.000000 | 0.390749 | 0.390749 |
| 8 | everywhere | 0.332529 | 0.637343 | 0.211935 | 0.255343 |
| 8 | reasonable | 0.758841 | 0.791679 | 0.600758 | 0.723805 |
| 8 | optimal | 0.770560 | 0.801410 | 0.617534 | 0.744017 |
| 8 | misplaced | 0.384169 | 0.973652 | 0.374046 | 0.384169 |
| 8 | tooSmall | 0.886592 | 0.415370 | 0.368263 | 0.443691 |
| 8 | overchecked | 0.744491 | 0.767636 | 0.571498 | 0.688552 |
| 9 | baseline | 0.381199 | 1.000000 | 0.381199 | 0.381199 |
| 9 | everywhere | 0.322992 | 0.632148 | 0.204179 | 0.248999 |
| 9 | reasonable | 0.751840 | 0.788632 | 0.592925 | 0.723079 |
| 9 | optimal | 0.763399 | 0.798262 | 0.609392 | 0.743161 |
| 9 | misplaced | 0.374792 | 0.973652 | 0.364916 | 0.374792 |
| 9 | tooSmall | 0.879308 | 0.408300 | 0.359021 | 0.437830 |
| 9 | overchecked | 0.742881 | 0.780910 | 0.580123 | 0.707467 |
| 10 | baseline | 0.371958 | 1.000000 | 0.371958 | 0.371958 |
| 10 | everywhere | 0.327538 | 0.663749 | 0.217403 | 0.271754 |
| 10 | reasonable | 0.744778 | 0.785760 | 0.585217 | 0.731521 |
| 10 | optimal | 0.756297 | 0.795294 | 0.601479 | 0.751848 |
| 10 | misplaced | 0.365711 | 0.973652 | 0.356075 | 0.365711 |
| 10 | tooSmall | 0.872818 | 0.401062 | 0.350054 | 0.437568 |
| 10 | overchecked | 0.735890 | 0.778115 | 0.572607 | 0.715758 |

## Reproduce

```powershell
.venv/Scripts/python.exe scripts/validate_all_levels.py
.venv/Scripts/python.exe scripts/validate_main_levels.py --optimize
.venv/Scripts/python.exe scripts/validate_capstone.py
.venv/Scripts/python.exe scripts/validate_t_scoring.py
.venv/Scripts/python.exe scripts/render_level_validation.py
```

Explicit recalibration: validate_main_levels.py --calibrate and validate_capstone.py --calibrate. Regenerate the notebook search cache afterwards. Keep the validation scripts, tests, both reference JSON files, notebook requirements and image-generation scripts through cleanup.
