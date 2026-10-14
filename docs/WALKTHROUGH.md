# Demonstration and verification

1. Start both services using `node scripts/dev.mjs`. Open the app. A fresh browser profile opens flight school. The mission map remains locked until completion or the explicit skip override.
2. Run H in lesson 1, change noise, and run again. Explain why 50/50 output bars can conceal lost coherence. Run X to distinguish intentional flips from noise.
3. In lesson 2 compare clean, X, and Z. The Z check flags the anticommuting X error. Explain why a commuting Z is not flagged and why Z has no effect on the example |0> input.
4. Explore all three lesson-3 buttons. Distinguish discarding detected errors, correcting observable estimates, and decoding the restricted repetition code. The three comparison cards use different quantities; none claims that mitigation repairs individual qubits.
5. Compare bare and protected runs in lesson 4. Point to both fidelity and kept fraction. Never report one without the other.
6. In lesson 5 place H, then CX with the guided controls. In lesson 6 prepare and protect. Unlock missions. Experienced users can instead use the visible skip button at any time.
7. Open First light. Select X, click q0/t0, run. Confirm real Qiskit results and the mission-complete dialog. Close it with Escape. Return to the map, refresh, and verify personal best persistence.
8. Open Entangled allies. Place H(q0,t0), then choose CX and click q0/t1 followed by q1/t1. Add a Z helper from 0 to 5. Compare the retained state, baseline, helper overhead, syndrome distribution, and sampled kept shots. Export the JSON experiment.
9. Change the noise slider to 0.5 and run. Confirm that it is a sandbox score and cannot award stars. Return it to 1 for scored runs. Edit a gate after running; verify the stale-results label and disabled export until a new run.
10. Open mission 8. Add a Z helper from 3 to 7. Then try start 0: propagation through the leading H makes the T crossing invalid, and the server explains the rejection. The same letter at the opening and at the T location need not represent the same propagated operator.
11. In mission 7's Research Lab choose three repetitions and targets 0 then 1. Run and inspect the actual number of Paulice checks. Compare one helper with two and reverse the target order. Use the benchmark file for a complete controlled comparison table.
12. Compare T counts 0, 1, 2, 4 at the same repetition count. Use the explicitly labeled comparable unchecked state fidelity, not the separate observable-specific estimator. Explain why the synthetic fixed-slot model can improve fidelity when a T replaces an idle.

## Accessibility and responsive checks

- Keyboard: Tab to gates and cells, Enter/Space to place; use selectors for checks. Undo and clear have accessible names. Dragging is never required.
- Modal: focus stays inside the native dialog; Escape closes it and returns focus. Buttons retain visible focus rings.
- Mobile: at 390 px the sidebar becomes compact navigation, tutorial and lab panels stack, and circuit/table content scrolls inside its container. The page itself must not overflow horizontally.
- Motion/audio: system reduced-motion preference suppresses transitions and celebration animation. Audio is off by default and toggled explicitly.
- Failure handling: stop Python and run an experiment; a visible error should appear, and controls should re-enable. Restart Python, retry, and verify recovery. No simulated client fallback fabricates a result.

## Recording outline

Record a 5–7 minute walkthrough: 45 seconds on the problem and detection/mitigation/correction; 60 seconds on onboarding; 90 seconds building and protecting a circuit; 90 seconds comparing fidelity/retention/overhead; 60 seconds on T restrictions and Paulice; 45 seconds on limitations, reproducibility, and findings. Include the package versions and benchmark regeneration command. This repository supplies a recording outline, not a completed recorded presentation.
