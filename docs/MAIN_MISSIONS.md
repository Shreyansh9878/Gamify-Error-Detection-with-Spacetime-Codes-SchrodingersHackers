# Main mission implementation and verification

The main missions use `LearningWorkspace`, `UnifiedCircuitCanvas`, `CodeEditor` and `useWorkbench`, the same shell, drag/drop engine, source editor and state-history controller used by Flight School 6. `MissionCanvas` maps mission data onto that renderer; it does not implement another drag/drop system. Tutorial controllers and their physics protocol remain separate.

## Circuit authority and editing

`backend/missions/levels.py` owns every locked payload, register, noise setting and score target. `GET /api/levels` supplies those definitions. New main routes use `backend/missions`; the old `backend/levels.py` registry remains solely for compatibility/research API regressions. Never mix their score scales.

A draft contains `version: 1`, `levelId`, `bands` and `operations`. Boundary b means immediately before locked payload instruction b; the final boundary follows all instructions. Each band has zero, four or eight editable slots. The initial and final bands exist by default; the main-only insertion control adds/removes four internal slots at a time. Removing an occupied slot is rejected instead of silently deleting a check. Payload ordering and channel locations cannot change.

Authored operations contain an ID, gate name, physical qubit indices, boundary and slot. Data wires are 0..n−1; ancillas follow. The fixed registers are 3 data wires for missions 1–7 and 4 for missions 8–10. Ancillas are 1 for missions 1–2, 2 for missions 3–6 and 3 for missions 7–10. All requests use strict bounded models. Data gates cannot be authored; CP controls must be ancillas and their targets data wires. Source editing uses an AST allowlist and cannot run Python, alter the payload, change registers or submit scores.

The palette offers ordinary Clifford gates and terminal M. Gate placement, movement and Dustbin deletion use shared pointer/touch/keyboard drag/drop. Standard H and M operate on ancillas. There are no abstract P tiles or column/zone headings. The insertion selector uses numeric positions to locate a gap without adding rigid headings to the canvas.

## Manual and assisted windows

Each used ancilla needs initial H, one or more controlled Pauli interactions, final H and terminal M. There is one coherent check window per helper. Opening factors can occur inside U, including at different intermediate boundaries. Empty unused ancillas remain |0〉 and can be eliminated from the simulation without changing the result.

Missions 1–3 require closing controlled Pauli products after the last enclosed payload operation. Missions 4–10 treat player-controlled interactions as opening factors and generate the inverse propagated product immediately before the final H. Moving that H changes the endpoint. The auto-generated factors and any helper Z/S/Sdg phase compensation appear in locked, non-draggable subcolumns, never overwriting a payload or authored gate. Fractional execution ranks order these generated instructions before that H. Inserted columns are editable only in main missions.

Qiskit `Pauli.evolve(Clifford(...), frame='s')` tracks signed transport, including Sdg. At T/Tdg, I/Z commute while an X/Y component immediately marks the path unsupported and red. Only payload operations inside the selected interval act on the transported operator. Intermediate controlled interactions multiply that operator in chronological order.

Each completed loop is checked as a noiseless isometry on **every data input**, with its ancilla initially |0〉. The combined isometry is checked again for multiple helpers, so individually valid but interfering checks cannot score. A red loop blocks execution. The connector uses actual opening/closing node coordinates, including generated subcolumns, rather than fixed screen indices. Only compact status and color are shown in missions; detailed educational trajectories remain in tutorials.

## Noise and exact score

The calibrated model extends FS6's physical mechanism: localized thermal relaxation after the orange q0→q1 crossing, weak depolarizing background after each payload instruction, and two-qubit depolarizing overhead after each authored or generated controlled check. Relaxation time increases from 76 to 94 microseconds across missions; T1=100, T2=200 microseconds. Background strength is 0.0005 and controlled-check strength 0.025. The initial payload excites q1 at the crossing; coherent X-branch protection can symmetrize this non-unital relaxation channel. Pure stochastic Pauli filtering alone would not generally improve fidelity-weighted yield.

Qiskit Aer executes channels on the **exact density matrix**, with no sampled trajectories or counts in scoring. The ideal target is U|0…0〉. The unnormalized all-zero measured-ancilla block is ρ_accept. The combined score is:

`〈ψ_ideal| ρ_accept |ψ_ideal〉 = F_ps × S_keep`.

Only that score, pass/fail and a one-line outcome are returned by `/api/missions/run`. Readout is terminal, allowing exact deferred syndrome projection. Inactive ancillas are traced/eliminated, not postselected as if they were measured. The Aer path is checked against independent `DensityMatrix.evolve` channel evolution. Counts are not used, so shot noise cannot change passing decisions.

## Reference certificate and optimizer scope

`backend/missions/references.json` stores four complete reachable drafts per mission: unchecked, legal blanket checking, reasonable and reference-family optimal. Manual drafts contain actual closing gates; assisted drafts contain only authored opening factors, H and M. Validation regenerates every assisted closing operator through the player engine. The T-doped reasonable solutions cross a real T barrier: their active X component becomes Z under H, crosses T cleanly, then returns to X under H. Unsupported X/Y crossings are separately tested.

The optimizer uses the same **bounded exact enumeration method** as FS6, not Paulice's different native heuristic cost. It enumerates every nonidentity single-helper Pauli product in five declared windows: full span, the hotspot gate alone, its immediate predecessor plus hotspot, hotspot to end, and hotspot plus its next three instructions. Duplicate windows are removed. Every candidate is an actual draft, subjected to the same interval validator, ancilla limit, generated closure, noise and score as a player. The maximum is exact within this family. It is **not a global optimality certificate over arbitrary multi-helper gate sequences**; the general upper bound remains 1. The optimizer and fixture data retain this scope explicitly.

For Clifford missions, blanket checking uses all available helpers with an X product across every data wire and the full payload. For T-doped missions it uses all helpers with the broadest valid full-span product; among equal-width products the noisier comparison is selected. Thus blanket scores are valid physical simulations, not zero assigned to a red/invalid circuit. This comparison proves that the documented careless strategy fails; it does not claim every conceivable larger circuit must fail.

Targets are rounded down to two decimals near 65–78% of the baseline-to-family-optimum improvement. The verifier requires them to remain within 60–80%, above baseline and blanket checking, and at least 0.005 below the reasonable solution. The actual reasonable margins are larger than 0.05. A near-optimal solution is not required even though the stored simple example is strong. Absolute targets fall as noise worsens; relative improvement and the design space become more demanding.

| Level | Data qubits | Ancillas | T/Tdg | Baseline | Blanket checks | Reasonable | Family optimum | Target | Spread |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 1 | 0 | 0.465797 | 0.423072 | 0.682204 | 0.682285 | 0.60 | 0 |
| 2 | 3 | 1 | 0 | 0.456080 | 0.412728 | 0.675695 | 0.675775 | 0.60 | 0 |
| 3 | 3 | 2 | 0 | 0.445384 | 0.345062 | 0.668869 | 0.668948 | 0.59 | 0 |
| 4 | 3 | 2 | 0 | 0.436065 | 0.341254 | 0.662683 | 0.662761 | 0.59 | 0 |
| 5 | 3 | 2 | 0 | 0.425663 | 0.329553 | 0.654725 | 0.654802 | 0.58 | 0 |
| 6 | 3 | 2 | 0 | 0.416447 | 0.333517 | 0.648314 | 0.648390 | 0.58 | 0 |
| 7 | 3 | 3 | 0 | 0.407133 | 0.291174 | 0.641556 | 0.641631 | 0.58 | 0 |
| 8 | 4 | 3 | 1 | 0.393164 | 0.228822 | 0.625780 | 0.626072 | 0.56 | 0 |
| 9 | 4 | 3 | 3 | 0.383283 | 0.222117 | 0.617066 | 0.617354 | 0.56 | 0 |
| 10 | 4 | 3 | 5 | 0.374174 | 0.236342 | 0.609439 | 0.609723 | 0.55 | 0 |

All four reference strategies were rerun three times without the result cache. Maximum minus minimum is exactly zero for every score. Numerical comparisons allow 1e−9 for supported platform arithmetic; passing uses the full score, never a rounded display value.

## Difficulty definition

Difficulty is measured by strictly increasing locked circuit depth, increasing operation count and available interval choices, larger late registers, increasing relaxation and additional non-Clifford constraints. This is a reproducible circuit-complexity progression, not a claim about subjective difficulty for every player. FS6 has four payload gates and depth three. Main payloads are:

1: 8 gates / depth 5; 2: 10 gates / depth 7; 3: 13 gates / depth 9; 4: 15 gates / depth 10; 5: 18 gates / depth 11; 6: 20 gates / depth 12; 7: 23 gates / depth 15; 8: 30 gates / depth 19; 9: 35 gates / depth 21; 10: 39 gates / depth 22.

Missions 1–7 contain only Clifford payload gates. Missions 8, 9 and 10 contain respectively 1, 3 and 5 T/Tdg gates (T counts plus inverse T counts); the reasonable solutions retain green connectors. Additional ancillas are optional resources, not a requirement to use every wire.

## Reproduction

```powershell
.venv/Scripts/python.exe scripts/validate_main_levels.py
.venv/Scripts/python.exe scripts/validate_main_levels.py --optimize
.venv/Scripts/python.exe -m pytest tests -q
pnpm typecheck
pnpm test
pnpm build
# Keep pnpm dev:all running for browser checks:
pnpm exec playwright test
```

`--calibrate` is the deliberate fixture-update command; review changes to references and targets. Temporary optimizer caches are ignored and disposable. The default verifier does not trust precomputed outcomes: it validates each stored draft, regenerates assisted closings, simulates it uncached three times, checks all pass/fail inequalities, round-trip spread and strict depth progression. `--optimize` additionally reruns the entire bounded search. The browser suite enters all ten missions, applies the reference through the same source editor a player uses, checks green connectors and locked closings, runs the real API, verifies passing outcomes and persistence, and exercises insertion/removal plus Dustbin interaction. Existing suites exercise all six tutorials on desktop and mobile.
