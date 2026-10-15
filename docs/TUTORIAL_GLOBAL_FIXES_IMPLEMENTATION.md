# Tutorial fixes — 16 October 2026

This implements only the eight requested changes. The three-pane workspace, drag/drop, Dustbin, physical controlled gates, dynamic check windows, hardware toggles, blank sandboxes and previous global mission access remain in place.

## Overview illustrations and text

Body paragraphs and lists in the briefing panes are justified; headings, equations, code and tables retain left alignment. All routed circuit illustrations are static Qiskit matplotlib output in `public/tutorial-circuits`. The Bloch/QSphere widgets remain interactive state visualizations, not replacement circuit drawings.

Regenerate drawings offline:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-draw.txt
.venv/Scripts/python.exe scripts/generate_tutorial_circuits.py
```

The script calls `QuantumCircuit.draw('mpl')` and uses one theme-matching style. Drawing dependencies are separate from production Python requirements. The committed manifest records each diagram's real circuit operation counts. No drawing runs on a web request.

School 3 now specifies each guided slot, contrasts a fault-free run with an X fault after S, and explains X/Y/Z commutation with the evolved Y check. School 5 introduces Clifford conjugation and the Gottesman–Knill assumptions before T/Tdg.

## Gates and parameter editing

Sdg is present wherever S is available; Tdg accompanies T. RX/RY/RZ are available in all tutorial editors; the locked capstone payload remains immutable, so its rotations can be placed only on editable helper slots. Dagger gates and rotations round-trip through the supported code view and native Qiskit export.

Click a placed rotation, or focus it and press Enter, to open its parameter-only inspector. Space still starts keyboard dragging. The inspector supports numerical radians and bounded expressions such as `pi/2`, `pi/4`, `pi` and `-π/4`, without evaluating JavaScript or Python. Apply angle edits only theta; the inspector has no add/delete controls. The Dustbin remains the removal mechanism. Angles retain the existing ±2π bound.

Conjugation uses exact Qiskit operators. Sdg maps X to −Y, Y to X and Z to Z. Signed closures can use ancilla Z compensation before final H. Arbitrary-angle rotations about the **same** Pauli axis commute (X with RX, Y with RY, Z with RZ). Other axes remain Pauli only at multiples of π/2. Non-Pauli intermediate transport is flagged red even if later gates would recombine it into a Pauli endpoint. T/Tdg pass only Z/I factors through this supported Pauli-only path. Telemetry explains these cases; the full noiseless isometry test still guards against false green loops.

The shared MCQ option wraps radio and text in a flex row with a fixed-size radio, first-line alignment and a wrapping text span.

## Noise range investigation

The 0.3 and 20 μs limits were explicit constants in `HardwareNoiseControls.tsx`, the Zod hardware schema and Python `HardwareNoise`. They were conservative teaching/UI bounds, not limits imposed by Qiskit or Aer. They are now **0–1** for each probability/depolarizing strength and **0–120 μs** for relaxation per layer.

Bit flips, phase flips, depolarization and relaxation are **independent sequential channel compositions**, not mutually exclusive branches of one probability distribution. Therefore their parameter values do not need to sum to one. Each probability is validated individually, non-finite/out-of-range API values are rejected, and T2 ≤ 2T1 is enforced. Tests execute all three School 2 methods with every probability at one and relaxation at 120 μs.

## Easier School 6

The locked workload is now four Clifford gates: X(q0), CX(q0,q1), H(q2), S(q1). The CX block is visually highlighted, and a Show hint control explains the short X1→Y1 check. Two helpers remain available and initially empty.

Background bit/phase noise defaults to 0.001 per occupied layer. A localized q1 relaxation interval after the CX lasts 70 μs with T1=100 μs and T2=200 μs. Each controlled check interaction incurs two-wire depolarization of strength 0.02. The global hardware toggle disables these channels as well. There are no draggable fixed spatial noise blocks in this lesson.

Qualification uses exact Fps × retention, with threshold **max(0.60, unchecked score + 0.01)**. This keeps the threshold above the current unchecked result if sliders are changed. Extreme settings, including disabling all noise, can leave no passing strategy; the UI states this and Reset restores the calibrated lesson. A complete valid check and the actual Paulice reveal/review remain required. Changed fixture drafts/evidence use new School 6 storage keys; prior global mission unlocks and bests are preserved.

Exact default results:

| Strategy | Score | Pass at 0.60 |
| --- | ---: | --- |
| No checks | 0.4921615548 | No |
| Short one-helper X1→Y1 check | 0.6806687434 | Yes |
| Valid broad checks across both helpers | 0.3685291113 | No |

The 63-shell reference optimum is 0.6806687434 under this protocol. The threshold is about 12% below that score, so the player need not reproduce the optimum exactly. This is still a bounded-family optimum, separate from Paulice's native heuristic cost and not a global proof over all circuits.

Reproduce the certificate, including exact gate placements:

```powershell
.venv/Scripts/python.exe scripts/verify_capstone_difficulty.py
```

This writes `docs/CAPSTONE_DIFFICULTY_VERIFICATION.json`. Seeded finite shot counts are shown separately; they never decide qualification.

## Assumptions

- Same-axis rotations remain valid at any angle. Rejecting X across RX or Y across RY would contradict the actual conjugation rule, so the requested RZ/Z exception is applied consistently to all axes.
- Clifford classical simulability is stated for stabilizer inputs and Pauli measurements. Arbitrary non-stabilizer resource states are not covered by that claim.
- A localized relaxation hotspot is used rather than only stochastic Pauli flips. Pure Pauli post-selection alone does not generally increase fidelity-weighted yield; relaxation lets this coherent-check example show the requested gain under a transparent physical model.
- The difficulty guarantee concerns the calibrated defaults and the explicitly verified broad-check strategy. It does not promise solvability at every slider setting or failure of every conceivable larger circuit.

## Verification

- `pytest tests`: 173 passed, including signed dagger transport, rotations, full-range hardware channels, deterministic capstone inequalities and reveal regression coverage.
- `pnpm test`: 30 passed, including bounded angle parsing, generated-asset manifests and source interoperability.
- `pnpm exec playwright test`: 30 passed across desktop and mobile, including inspector edits, radio geometry, real images, slider endpoints, gate trash/undo, the six-lesson journey and actual research reveal.
- `pnpm typecheck` and `pnpm build`: passed.
