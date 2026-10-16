"""Render the human-readable certificate from verified reference artifacts."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]


def tables():
    main=json.loads((ROOT/'backend/missions/references.json').read_text())['levels']
    fs6=json.loads((ROOT/'backend/reference_solutions/capstone.json').read_text())
    rows=[fs6]+main
    summary=['| Level | Data | Ancillas | T/Tdg | S_min | Baseline | Blanket | Reasonable | Best found | Target | Spread |',
             '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    extras=['| Level | Misplaced | Too small | Slightly overchecked |','|---|---:|---:|---:|']
    physical=['| Level | Strategy | F_ps | S_keep | correct_shot_yield | Trusted Fidelity |',
              '|---|---|---:|---:|---:|---:|']
    for row in rows:
        label=str(row['id'])
        summary.append(f'| {label} | {row["qubits"]} | {row["ancillas"]} | {row["tCount"]} | {row["minimumKept"]:.2f} | '+
                       ' | '.join(f'{row[k]:.6f}' for k in ('baseline','everywhere','reasonable','optimal'))+f' | {row["target"]:.2f} | {row["spread"]:.0f} |')
        extras.append('| '+label+' | '+' | '.join(f'{row[k]:.6f} ({"PASS" if row[k]>=row["target"] else "FAIL"})' for k in ('misplaced','tooSmall','overchecked'))+' |')
        for kind,m in row['metrics'].items():
            physical.append(f'| {label} | {kind} | '+ ' | '.join(f'{m[k]:.6f}' for k in ('fidelity','retention','correct_shot_yield'))+f' | {row[kind]:.6f} |')
    return '\n'.join(summary),'\n'.join(extras),'\n'.join(physical)


def main():
    summary,extras,physical=tables()
    text='''# Level validation: Trusted Fidelity

All numbers below are generated from the stored, simulator-verified player drafts. Score = F_ps · min(1, S_keep / S_min); correct_shot_yield = F_ps · S_keep is a separate secondary metric. Trusted Fidelity is an explicit-budget game design choice and a simulation-only full-state fidelity objective. Always read F_ps and S_keep together.

“Best found” is the exact maximum in a declared finite family, never a Paulice-certified game optimum or an unrestricted global optimum. Main levels enumerate one-helper Pauli products over five windows; FS6 enumerates 15 full-payload products. Native Paulice gamma cost is separate. T circuits use custom admissible-Pauli search and Aer density matrices with statevector ideal references.

## Reference scores

'''+summary+'''

## Additional plausible strategies

'''+extras+'''

“Misplaced” protects a region before the hotspot in main missions; FS6's IZ check does not cover the relaxing wire during the hotspot. “Too small” is a single-factor alternative. “Overchecked” adds controlled interactions relative to the reasonable strategy. The latter two may pass or fail: their measured outcomes are reported, not predetermined.

## Required margins and calibration

Baseline and blanket are at least 0.05 below target; reasonable is at least 0.03 above; best found is strictly better than reasonable and reaches the existing third-star threshold (target + 0.05). The baseline fidelity itself is below target, so retention alone cannot explain failure. Misplaced checks fail. All seven strategies are valid reachable drafts (baseline has no check); each is rerun three times with zero exact score spread. Fewer helpers than the fixed allowance are allowed. Manual P/P′ in Main1–3 and generated signed P′ in Main4–10 are certified by the ordinary validator. Targets occupy 60–80% of the baseline-to-best interval and gently plateau at 0.67 so T missions retain nonoptimal headroom.

The proposed starting budgets (0.60 in FS6/Main1–3, 0.50 later) did not penalize blanket retention. Calibration changes only budgets, targets and stored strategies, not payloads or noise. Budgets are therefore higher: 0.99 in FS6, then the values above. The search selects the highest two-decimal budget below 1 satisfying the target-position and safe-margin requirements. Blanket retention is below its budget, causing a real penalty, but blanket fidelity is also poor. In early levels blanket retains MORE shots than targeted checks; do not claim blanket failure is exclusively caused by lower retention.

All current bounded-family winners lie below S_min. For these particular drafts the score is correct_shot_yield divided by the level budget; the saturation branch is implemented and tested but is not reached by these winners. Do not claim the new metric changed the winning placement in every family.

The Pauli-only monotonicity demonstration isolates an IDEAL check shell around a detectable X channel on |0>. It is not a theorem for every state, error distribution or noisy shell. Background channels after extra check layers can reduce fidelity even with extra check-interaction depolarization disabled. No noise model was changed to manufacture improvement.

FS1–5 retain their experiment/MCQ/method-coverage completion contracts, with no numeric score threshold. Their stored experiments remain in backend/reference_solutions/tutorials.json. The full-progression browser test certifies FS1→Main10 completion through actual drag/drop, readout/reveal review and ordered unlocks on desktop and mobile.

## Full physical metrics

'''+physical+'''

## Reproduce

```powershell
.venv/Scripts/python.exe scripts/validate_all_levels.py
.venv/Scripts/python.exe scripts/validate_main_levels.py --optimize
.venv/Scripts/python.exe scripts/validate_capstone.py
.venv/Scripts/python.exe scripts/validate_t_scoring.py
.venv/Scripts/python.exe scripts/render_level_validation.py
```

Explicit recalibration: validate_main_levels.py --calibrate and validate_capstone.py --calibrate. Regenerate the notebook search cache afterwards. Keep the validation scripts, tests, both reference JSON files, notebook requirements and image-generation scripts through cleanup.
'''
    (ROOT/'docs/LEVEL_VALIDATION.md').write_text(text,encoding='utf-8')
    print(summary)


if __name__=='__main__':main()
