export const titles = {
  3: "Coherent Pauli checks",
  4: "Multi-qubit propagation",
  5: "The T-gate barrier",
  6: "Trade-off optimization",
};
export const theory: Record<number, string> = {
  3: `### A check travels through time

A coherent Pauli check (CPC) uses one helper qubit to compare an operator before a computation with its evolved operator afterwards. It checks a relationship through the circuit rather than reading out the unknown data state.

The ancilla starts in |0〉. Drag H onto it to create |+〉. Then drag a controlled Pauli from the ancilla to a data wire: CX means controlled X, CY controlled Y, CZ controlled Z. The first endpoint is the control; the second is the target. These are ordinary two-qubit gates, so you can also connect data wires in a sandbox.

After the data computation U, apply the closing controlled Pauli, H on the same ancilla, and M. A noiseless closed check returns syndrome zero for every possible data input when P′ U = U P. The closing operator is P′ = U P U†. A wrong closure can produce false alarms, but a mismatch does not guarantee syndrome one on every input or every shot.

![Guided S-gate check without faults](/tutorial-circuits/school-3.png)

### Guided S circuit

The canvas has seven slots in time. Put H on a0 in the first slot, CX(a0,q0) in the second, and leave the locked S in the third. The fourth is an optional fault location. Put CY(a0,q0) in the fifth, H(a0) in the sixth, and M(a0) in the seventh. This implements S X S† = Y. Swap the closing operator and inspect the red connector and syndrome counts.

Allowed fixed-slot assembly: slot 1 accepts H on a0; slot 2 accepts an opening CX, CY or CZ from a0 to q0; slot 3 is the locked S. Slot 4 is the optional X/Z error location. Slot 5 accepts the closing CX, CY or CZ; slot 6 accepts H on a0; slot 7 accepts M on a0. Keep gates in time order.

**Task:** first run the X → S → Y check without an error and observe syndrome 0. Then drag Bit Flip (X error) into slot 4, immediately after S, and run again. The syndrome becomes 1: X anticommutes with the evolved check Y. A Z error also anticommutes with Y and is detected. A Y error commutes and goes undetected; in the sandbox, place ordinary Y at that location to explore it.

![The same S-gate CPC with a bit flip after S](/tutorial-circuits/school-3-fault.png)

### Faults and filtering

A controlled check does not actively fix a qubit. An X or Z fault anticommutes with some operators and commutes with others. Whether this particular check flags the fault depends on its location and propagated operator. Syndrome zero is evidence of passing this check, not proof that no error occurred. Waiting implements amplitude relaxation and phase decay, which can produce a mixture rather than a certain flip.

### Build your own experiment

The sandbox starts completely blank. Choose 1–5 data qubits and 1–2 ancillas; drag state preparation, a workload, checks and readout yourself. The app infers the data workload from data-only gates inside the outer ancilla check interactions. With no interior data gate, the enclosed workload is identity. The connector starts at the last controlled Pauli before that workload and ends at the first afterwards. All opening and closing factors contribute to the product; intermediate operations still undergo whole-circuit validation. M must be the last operation on its wire.

### Why low overhead matters

Localized spacetime checks protect selected fault locations using short operator supports. They are not a universal replacement for quantum error correction. Every extra helper, controlled gate and discarded shot has a cost. Later lessons make that trade-off explicit.`,
  4: `### A Pauli operator can spread

A two-qubit gate can turn a single-wire operator into a product. Across a CNOT with q0 as control and q1 as target, X0 becomes X0 X1. Z1 becomes Z0 Z1. X1 and Z0 each remain on their original wire. The product is essential: closing only half of a spread check does not implement the intended operator identity.

![Two-qubit H and CNOT check with a closing X product](/tutorial-circuits/school-4.png)

### The guided workload includes H then CX

The locked computation is H(q0) followed by CX(q0,q1). Therefore opening Z0 first becomes X0 across H, then X0 X1 across CNOT. Opening X0 instead becomes Z0 across H and remains Z0 across CNOT. Follow the entire workload, not only the CNOT.

### Assemble the ordinary gates

The first three slots are blank. Place H(a0) first and CZ(a0,q0) next. The remaining opening slot allows a second controlled factor if you want to test a product. The fixed H(q0) and CNOT follow. The next slot is an optional fault location. Close with CX(a0,q0) and CX(a0,q1), then H(a0), then M(a0). Both closing gates use the same helper. Run and compare with a single-wire closure.

A red connector may mean an incorrect operator, a missing sign, an incomplete H/readout shell, or an interaction elsewhere that breaks the complete check. A green connector certifies the noiseless operator relationship for every data input, not immunity to all noise.

### Experiment with a blank circuit

The sandbox has no preset gates. Choose the data register (1–5) and helper register (1–2). Build the computation and shell using ordinary H, S, X, Y, Z, CX, CY, CZ and M. Controlled gates can connect data or ancilla wires; the full-circuit test catches unsupported or disturbing helper interactions. Optional X/Z faults and waiting channels reveal coverage. A multi-wire state is shown on a QSphere, including mixed-state populations rather than invented amplitudes.`,
  5: `### What makes a gate Clifford?

The gates H, S, Sdg, X, Y, Z, CX, CY and CZ are Clifford gates. They map every Pauli product to another signed Pauli product under conjugation: P′ = U P U†. For example, H exchanges X and Z; S sends X to Y, while Sdg sends X to −Y. Composing Clifford gates keeps this property, so Clifford circuits form a group that preserves the Pauli group under conjugation.

![Clifford conjugation examples: H X H = Z and S X Sdg = Y](/tutorial-circuits/clifford.png)

For stabilizer inputs and Pauli measurements, Clifford circuits can be simulated efficiently on a classical computer (Gottesman–Knill). Those ingredients alone therefore do not provide a quantum computational advantage. Non-stabilizer inputs or other resources change that conclusion.

### The non-Clifford frontier

Clifford gates map Pauli products to signed Pauli products. T is different. Its matrix is diag(1, exp(iπ/4)). Conjugating X gives (X+Y)/√2, while conjugating Y gives (Y−X)/√2. These are coherent sums; choosing either X or Y as a closing Pauli does not reproduce the sum.

Tdg is the inverse of T. Tdg X T = (X−Y)/√2 and Tdg Y T = (X+Y)/√2. Both T and Tdg pass only Z/I factors through a Pauli-only check.

Z commutes cleanly: T Z T† = Z. A check supported only by Z at that T location can stay within a Pauli implementation. A T elsewhere on an identity factor does not prove the rest of the check is compatible. Transport depends on the operator actually arriving at each gate. Larger circuits can recombine into a Pauli at the endpoint, but this teaching validator flags any intermediate non-Pauli transport rather than accepting an unsupported Pauli-only path.

![Z-commuting CPC around a T gate](/tutorial-circuits/school-5.png)

### Assemble the seven-slot circuit

Drag H(a0) into the first slot and CZ(a0,q0) into the second. The third contains the locked gold T. Leave the fourth blank or place a test fault. Complete CZ(a0,q0), H(a0), M(a0) in the final three slots. The Z check closes green. Replace the opening and closing with X or Y interactions to inspect the non-Pauli warning and false-alarm behavior.

### Blank T-doped sandbox

Switch to Sandbox for a completely empty circuit. Choose 1–5 data wires and 1–2 helpers. T is gold in the ordinary gate palette. You construct the data workload and shell; no check tile or operator pop-up is involved. Green/red endpoints follow the actual controlled Pauli gates as you move them. The full authored circuit must also preserve every data input in the noiseless limit.

An operator mismatch does not force syndrome one on every run. Input-dependent cancellation can hide a bad check in one histogram; the state-independent identity test prevents that from masquerading as a correct design.`,
  6: `### Build the shell and pay its cost

The short locked workload is X(q0), CX(q0,q1), H(q0), S(q1). The q0–q1 CX region is highlighted because q1 experiences a 70 μs relaxation interval there (T1=100 μs, T2=200 μs), in addition to low background hardware noise. Each extra controlled check interaction also incurs 0.02 two-wire depolarization. These explicit costs make short, focused checks preferable. Exactly one fixed helper is available, but every H, controlled Pauli and M must be placed by you. You decide how many factors to use and where to place them outside the fixed workload. At least one complete valid check is required to qualify.

The hardware controls below the canvas apply independent bit flips, phase flips, depolarization and relaxation to all live wires after every occupied quantum layer. The probabilities are per layer. Blank slots do not introduce extra simulated duration, and measured wires no longer receive channels. This is a transparent teaching model, not a calibration of a particular processor. Check gates and helper wires are noisy too.

![Four-gate capstone workload; the CX interaction is the noise hotspot](/tutorial-circuits/school-6.png)

### Trusted Fidelity and your shot budget

Post-selection retains only runs whose measured helper bits are all zero. Fidelity Fps compares the full retained data state with the noiseless target. Retention Skeep is the exact probability of retaining a run. The finite histogram estimates it as N_kept/N.

Trusted Fidelity rewards how accurate the kept shots are. Keep at least the shot budget Smin = 99% and your score equals Fps. Below that budget, the score is reduced in proportion to how many shots survive: score = Fps · min(1, Skeep / Smin). This explicit budget is a game design choice. The simulator can inspect the full state to compute fidelity; ordinary hardware counts alone cannot supply it.

Compare three strategies: no checks retains everything but misses the noisy crossing; checks everywhere adds noisy interactions and can reject useful shots; a targeted check focuses on the noisy region. A green invariant guarantees correct noiseless construction, not a higher score. In this lesson blanket checking has both poor fidelity and a retention penalty; it does not necessarily discard more than a targeted check.

Qualification requires a complete valid check and Trusted Fidelity ≥ max(0.62, the current unchecked fidelity + 0.01). The default target is 0.62. Some extreme slider settings leave no passing strategy; reset restores the calibrated lesson. If no shots survive, retained fidelity is undefined and score is zero. The research artifacts also record correct-shot yield Fps · Skeep separately, together with both fidelity and retention.

### A reproducible reference, with a stated scope

After qualifying, the backend calls the actual qiskit-paulice package and searches a separate reference family under your current hardware settings. The reference enumerates all 15 nonidentity two-qubit Pauli products in a single-helper, full-workload shell with a fixed tap order. Its best score and exact gate placement are shown beside yours. This is an exact maximum within that family. It is not a proof of the best score over arbitrary time windows, arbitrary helper circuits or two-check strategies. The universal fidelity-yield upper bound is 1.

Paulice supplies a research suggestion and its own gamma cost. Its native gate-depolarization cost model differs from the game's all-wire layer channels, so that cost is displayed separately. A heuristic suggestion cannot honestly be called a certified global theoretical maximum. Review the comparison to unlock missions; retry if the actual research service fails, or use the visible tutorial skip.`,
};
