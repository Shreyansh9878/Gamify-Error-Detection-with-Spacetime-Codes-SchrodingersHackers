# Level validation

All scores use the same authoritative engine as the player. Exact channel evolution has no shot variance. “Optimal” means best in the declared finite search family, not a proof over arbitrary circuits. See SCIENTIFIC_REPORT.md for the search boundary and separate Paulice results.

| Level | Data | Ancillas | T/Tdg | Baseline | Blanket | Reasonable | Best found | Target | Spread |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| FS6 | 2 | 1 | 0 | 0.494132 | 0.456980 | 0.668136 | 0.686119 | 0.62 | 0 |
| 1 | 2 | 1 | 0 | 0.466665 | 0.435775 | 0.681383 | 0.681615 | 0.60 | 0 |
| 2 | 3 | 1 | 0 | 0.455944 | 0.406086 | 0.672137 | 0.672365 | 0.60 | 0 |
| 3 | 3 | 2 | 0 | 0.445385 | 0.336067 | 0.665396 | 0.665621 | 0.59 | 0 |
| 4 | 3 | 2 | 0 | 0.436066 | 0.331921 | 0.659251 | 0.659472 | 0.59 | 0 |
| 5 | 3 | 2 | 0 | 0.424433 | 0.318030 | 0.649079 | 0.649297 | 0.58 | 0 |
| 6 | 3 | 2 | 0 | 0.414982 | 0.321514 | 0.642386 | 0.642600 | 0.58 | 0 |
| 7 | 3 | 3 | 0 | 0.405382 | 0.276192 | 0.635114 | 0.635325 | 0.57 | 0 |
| 8 | 4 | 3 | 1 | 0.390749 | 0.211935 | 0.616308 | 0.617534 | 0.56 | 0 |
| 9 | 4 | 3 | 3 | 0.381199 | 0.204179 | 0.608187 | 0.609392 | 0.55 | 0 |
| 10 | 4 | 3 | 5 | 0.371958 | 0.217403 | 0.600295 | 0.601479 | 0.55 | 0 |

FS1–5 do not define fidelity-score thresholds. Their completion contracts are experiments plus MCQs/method coverage; a numeric zero-check or blanket-check “fail” would be misleading. Stored experiments are in backend/reference_solutions/tutorials.json; e2e/full-progression.spec.ts exercises completion, drag/drop and sequential unlocking for all sixteen screens on desktop and mobile.

Main references include actual editable bands and gate operations. Main1–3 manually close checks; Main4–10 use the same generated closures as the UI. T-level candidates are rejected whenever the transported Pauli has X/Y at a T/Tdg crossing. Blanket means all data wires/all allowed helpers for Clifford; for T levels it is the broadest valid full-span product, since invalid X/T circuits cannot be assigned a score.
