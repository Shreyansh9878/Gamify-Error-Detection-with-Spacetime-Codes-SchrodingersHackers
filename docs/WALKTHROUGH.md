# QED redesign walkthrough

1. Start both services with `node scripts/dev.mjs`. A fresh v2 profile opens the six-module flight school. Main levels stay locked until completion or the visible skip override. Payload gates are never part of the player's editing tools.
2. In Quantum Noise compare X, Z, and depolarizing channels on the fixed plus state. Change noise strength and rerun. Z noise changes the Bloch vector and fidelity while Z-basis bars stay 50/50. X noise leaves this eigenstate unchanged. Relaxation uses |1> so energy decay is visible.
3. Explore detection, mitigation, and correction. Distinguish the QED state/shot reference, a two-noise-scale observable extrapolation, and the restricted repetition decoder. The full-QEC resource footprint is explicitly illustrative. Answer QED for the small-helper retained-state task.
4. Compare the boundary sandwich and localized interval on the fixed GHZ cascade. Explain operator spread, closing weight, two-qubit overhead, fidelity, and the fraction of shots kept. Report measured values without promising which strategy must win.
5. In Close the Invariant leave X→X around S and test: this is an open loop and can raise false alarms. Change closing to Y and test again. Inject Z into the closed loop; syndrome 1 is flagged. Negative propagated signs are handled by a helper phase correction.
6. In Shots Have a Cost compare no helpers, one, and two. Change total shots between 256, 1024, and 4096. Check integer conservation and distinguish sampled counts from the exact retained fraction that determines score and expected overhead.
7. In The Non-Clifford Frontier test X through S and T, then Z through T. Explain that (X+Y)/sqrt(2) is not a Pauli and cannot close using the game's simple Pauli taps. General controlled non-Pauli operators are outside this resource model.
8. Unlock missions. In mission 1 add a helper. Default Z(q0) from boundary 1 to 4 closes as Z(q0). Change the closing to X; observe red loop feedback and a disabled scored run. Restore Z; observe the green invariant.
9. Toggle Inject Test Fault. Click X after q0 column 2 and inspect the unit-probability alarm. Try Z instead: no alarm, and |1> is unchanged by that fault up to global phase. A missed flag is not automatically output damage. The fault diagnostic is noiseless apart from the selected fault and never modifies the scored circuit.
10. Run mission 1 and inspect fidelity, exact sampling overhead, observed kept/discarded counts, score, and resource cost. Close the result dialog, return to the map, refresh, and verify personal-best persistence. Run a non-100% noise setting and confirm it is a sandbox result.
11. In mission 3 open X on q0 after H at boundary 1, ending at 4. A single closing X on q0 fails after CX. Switch to a multi-wire product and choose X on q0 and q1. The invariant closes. Compare its overhead with a localized Z strategy.
12. In mission 6, select an opening tap and interval. Qiskit automatically supplies the signed closing product. Explore how a shorter interval can keep it localized. Competing checks may interfere and are validated together before scoring.
13. In mission 8, place X on q0 from 4 to 8. The T at column 4 turns red and the backend rejects that Pauli crossing. Select Z: the T glows green. Move the opening before the initial H to see why the Pauli at the crossing matters more than the opening letter.
14. In mission 7's Research Lab choose three repetitions and targets 0 then 1. Run Paulice Synthesizer. Inspect actual helpers, per-observable selected targets/supports, gamma costs, finite-shot estimates, retention, and added gates. Compare target order 1 then 0. These are observable-specific experiments, separate from game state fidelity and score.
15. Compare T counts using the exact unchecked reference under a fixed mission and repetition count. Use `docs/benchmark-results.json` and `METHODS_AND_RESULTS.md` for the full controlled comparison. Passing mission 10 earns the saved Master Spacetime Architect badge and enables a final strategy export.

## Accessibility and responsive checks

- Keyboard users can operate all tap selectors, boundary pins, diagnostic buttons, and dialogs. Payload graphics have no editing handlers. Fault overlays switch their cell to a group so diagnostic buttons remain exposed to assistive technology.
- The mobile workspace stacks panels and scrolls the circuit, anchor grid, and tables inside their containers. The overall page must not overflow horizontally.
- A native dialog contains the win overlay and supports Escape. Visible focus, reduced-motion support, and an explicit default-off sound toggle remain in place.
- Draft changes mark old results stale and disable their export. Debounced validation ignores replies for obsolete drafts. Errors are visible and controls recover after failed requests.

## Recording outline

Record 5–7 minutes covering: the fixed-workload protection role; detection versus mitigation/correction; manual loop matching and false alarms; a caught versus missed test fault; the fidelity/shot-cost trade-off; T crossings and assisted propagation; Paulice's richer check family and distinct estimator; reproducibility and model limitations. No recorded presentation or repository publication is implied by this code refactor.
