# GAME_REDESIGN_SPECIFICATION.md
# Quantum Shield: Spacetime Code Defender
## Comprehensive Redesign Specification & Architecture Prompt for Autonomous AI Agents

> **Role & Objective**: This document is an authoritative engineering and pedagogical specification for the **Qiskit Fall Fest 2026 Advanced Track Hackathon** project (*Gamifying Error Detection with Spacetime Codes*). An autonomous coding agent (or human engineer) can consume this file directly as an end-to-end design prompt to refactor the game mechanics, levels, UI, tutorial systems, and backend physics.
>
> **Core Constraint**: **Do not make the player build arbitrary quantum states by placing payload gates.** The payload circuit $U$ is **fixed, authoritative, and non-editable**. The player acts strictly as a **Quantum Protection & Spacetime Code Architect**: choosing check ancillas, inserting opening Pauli taps $P$, finding closing operators $P'$, routing spacetime checks across circuit layers, balancing sampling overhead (kept shots $f_{\text{kept}}$) against post-selected fidelity ($F_{\text{post}}$), and navigating the breakdown of Clifford checks when $T$-gates are injected.

---

## TABLE OF CONTENTS
1. [Core Physics Foundations & Pedagogical Philosophy](#1-core-physics-foundations--pedagogical-philosophy)
2. [Flight School: 6 Interactive Tutorial Lessons](#2-flight-school-6-interactive-tutorial-lessons)
   - [Lesson 1: What is Quantum Noise? (Bit Flips vs. Phase Flips vs. Relaxation)](#lesson-1-what-is-quantum-noise)
   - [Lesson 2: Detection vs. Mitigation vs. Correction](#lesson-2-detection-vs-mitigation-vs-correction)
   - [Lesson 3: Why Old QED Codes Failed (The High-Overhead Trap of Sandwiches)](#lesson-3-why-old-qed-codes-failed)
   - [Lesson 4: Spacetime Codes (Low-Overhead Coherent Pauli Checks)](#lesson-4-spacetime-codes)
   - [Lesson 5: Understanding Shots, Syndromes & Sampling Overhead](#lesson-5-understanding-shots-syndromes--sampling-overhead)
   - [Lesson 6: The Non-Clifford Frontier (Why T-Gates Break Pauli Invariants)](#lesson-6-the-non-clifford-frontier)
3. [Main Expedition: 10 Authoritative Spacetime Missions](#3-main-expedition-10-authoritative-spacetime-missions)
   - [Progression Mechanics (Manual $P/P'$ Matching $\to$ Automated Propagation $\to$ Multi-Check Routing)](#progression-mechanics)
   - [Mission 1: The Single-Wire Barrier (1-Qubit $X$-Noise Invariant)](#mission-1-the-single-wire-barrier)
   - [Mission 2: Phase Interceptor (1-Qubit Superposition & Phase Drift)](#mission-2-phase-interceptor)
   - [Mission 3: Crossing the Bridge (Entangling Gates & Pauli Conjugation)](#mission-3-crossing-the-bridge)
   - [Mission 4: The Closed Loop Puzzle (Manual $P \to P'$ Search on a Bell Pair)](#mission-4-the-closed-loop-puzzle)
   - [Mission 5: GHZ Entangled Fortress (Spatial Spread vs. Noise Overhead)](#mission-5-ghz-entangled-fortress)
   - [Mission 6: Deep Clifford Highway (Assisted Auto-Closing $P' = U P U^\dagger$)](#mission-6-deep-clifford-highway)
   - [Mission 7: The Paulice Automaton (Algorithmic Greedy Search & $\gamma$-Cost)](#mission-7-the-paulice-automaton)
   - [Mission 8: The Diagonal Gate (First Contact with $T=1$: Commuting $Z$ vs. Broken $X$)](#mission-8-the-diagonal-gate)
   - [Mission 9: Magic State Minefield ($T=2$: Narrow Passages & Local Sub-Checks)](#mission-9-magic-state-minefield)
   - [Mission 10: The Master Spacetime Architect ($T=4$: The Extreme Trade-off)](#mission-10-the-master-spacetime-architect)
4. [Mathematical & Algorithmic Specifications](#4-mathematical--algorithmic-specifications)
   - [Spacetime Pauli Invariant Condition](#spacetime-pauli-invariant-condition)
   - [Post-Selection & Conditional Density Matrix Formulation](#post-selection--conditional-density-matrix-formulation)
   - [Exact Scoring Function (Physics-Grounded, Non-Arbitrary)](#exact-scoring-function)
   - [T-Gate Commutation & Projection Rules](#t-gate-commutation--projection-rules)
5. [UX / UI Architecture & Interactive Visualizers](#5-ux--ui-architecture--interactive-visualizers)
   - [Interactive Check Builder UI](#interactive-check-builder-ui)
   - [Visual Error Injection & Pauli Propagation Tracer](#visual-error-injection--pauli-propagation-tracer)
   - [Shot Distribution & Syndrome Histogram View](#shot-distribution--syndrome-histogram-view)
   - [T-Gate Commutation Glow / Barrier Visualizer](#t-gate-commutation-glow--barrier-visualizer)
6. [Implementation Prompt for Autonomous Agent Execution](#6-implementation-prompt-for-autonomous-agent-execution)

---

## 1. CORE PHYSICS FOUNDATIONS & PEDAGOGICAL PHILOSOPHY

### 1.1 The Golden Rule of the Game
**Players do not construct the payload circuits.** In real quantum cloud hardware (IBM Quantum / Qiskit), an algorithm engineer or application developer has a critical target workload $U$ (e.g., an entangling Clifford backbone, a variational ansatz layer, or a stabilizer state preparation). The user’s algorithmic mission is to **protect $U$ against physical device noise** using minimal ancilla qubits, minimal added 2-qubit gates, and maximal kept-shot throughput.

### 1.2 The Physics of Spacetime Codes (Martiel & Javadi-Abhari, arXiv:2504.15725)
1. **Conventional Stabilizer Codes**: Measure spatial multi-qubit Pauli operators at specific time slices (e.g., surface codes, $[[4,2,2]]$ codes). On planar devices with restricted nearest-neighbor connectivity, measuring high-weight operators requires deep SWAP networks and ancilla routing that inject more noise than they detect.
2. **Coherent Pauli Check (CPC) Sandwiches**: Put an ancilla in $|+\rangle$, apply controlled-$P$ at the very beginning of the circuit, run the entire circuit $U$, and apply controlled-$P'$ at the end where $P' = U P U^\dagger$. While theoretically sound, for deep circuits $P'$ spreads over many qubits, requiring high-weight entangling circuits at the readout layer.
3. **Spacetime Codes**: Generalize stabilizers across **space and time simultaneously**. An ancilla interacts with intermediate wires of the circuit via controlled-Pauli gates at different times. If the back-propagators along those wires satisfy:
   $$\prod_{w \in \text{check}} B(P_w, w) = I \quad (\text{or} \in \mathcal{S}_{\text{input}})$$
   then the circuit without noise preserves the ancilla state in $|+\rangle$. A final measurement of the ancilla in the $X$-basis yields a deterministic $0$ (trivial syndrome). Any physical fault occurring in the spacetime volume spanned by the check that anti-commutes with the check's back-cumulant flips the ancilla to $|-\rangle$, yielding syndrome bit $1$.
4. **Post-Selection**: Shots with syndrome $1$ are discarded. The remaining shots are purified, yielding a significantly higher post-selected fidelity $F_{\text{post}}$.
5. **The Fundamental Trade-Off**: 
   - Adding checks catches more errors $\implies F_{\text{post}} \uparrow$.
   - Adding checks adds noisy entangling gates and flags more noisy runs $\implies f_{\text{kept}} \downarrow$.
   - If $f_{\text{kept}}$ drops too low (e.g., $1\%$), you need $100\times$ more machine time/shots to sample the answer. The game score must reflect the Pareto optimum!

---

## 2. FLIGHT SCHOOL: 6 INTERACTIVE TUTORIAL LESSONS

The Flight School replaces passive text reading with **hands-on visual sandbox micro-experiments**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLIGHT SCHOOL SYLLABUS                          │
├─────────┬───────────────────────────────┬──────────────────────────────┤
│ Lesson  │ Topic                         │ Interactive Mechanics        │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 01      │ What is Quantum Noise?        │ Bloch vector shrinkage &     │
│         │ Bit-flip, Phase, Relaxation   │ real-time noise slider       │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 02      │ Detection vs Mitigation vs    │ 3-way interactive outcome    │
│         │ Correction                    │ comparison on the same state │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 03      │ Why Old QED Codes Failed      │ High-weight sandwich vs      │
│         │ (The High-Overhead Trap)      │ localized spacetime check    │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 04      │ Spacetime Checks in Action    │ Hooking an ancilla to 2 wires│
│         │ (Coherent Pauli Invariants)   │ & observing the syndrome     │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 05      │ Understanding Shots &         │ Live shot counts histogram   │
│         │ Sampling Overhead             │ & throughput penalty         │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ 06      │ The Non-Clifford T Frontier   │ Commutation visualizer:      │
│         │ Why T breaks X/Y checks       │ Z passes, X/Y turns non-Pauli│
└─────────┴───────────────────────────────┴──────────────────────────────┘
```

---

### Lesson 1: What is Quantum Noise?
* **Physics Covered**:
  - Qubits are physical quantum systems (transmons, trapped ions) subject to environmental decoherence.
  - **Bit-flip noise ($X$)**: Swaps $|0\rangle \leftrightarrow |1\rangle$.
  - **Phase-flip / dephasing noise ($Z$)**: Randomizes relative phase between $|0\rangle$ and $|1\rangle$, destroying superpositions like $|+\rangle = \frac{|0\rangle+|1\rangle}{\sqrt{2}}$ into an incoherent statistical mixture without changing measurement probabilities in the $Z$-basis!
  - **Thermal Relaxation ($T_1$)**: Physical energy decay $|1\rangle \to |0\rangle$.
* **Interactive UI & Player Task**:
  - A single qubit in state $|+\rangle$.
  - The player toggles noise types: `Pure Bit-Flip (X)` vs. `Pure Phase-Flip (Z)`.
  - **The Aha! Moment**: Under Phase Noise, the output probability bar stays exactly $50\% / 50\%$, tricking a novice into thinking nothing is wrong! But the **Bloch Sphere Vector shrinks from length 1.0 to 0.2**, and Fidelity drops from $100\%$ to $55\%$.
  - **Action Required**: The player must adjust the noise slider and observe both the probability bars and the Bloch vector to understand that **probabilities alone do not detect quantum phase errors**.

---

### Lesson 2: Detection vs. Mitigation vs. Correction
* **Physics Covered**:
  - **Quantum Error Detection (QED - Our Game)**: Flags whether an error occurred using ancilla checks and discards bad shots (post-selection). Produces purified single-shot states. Sampling overhead: $\Omega(1/F)$. Qubit overhead: Small constant (1-3 ancillas).
  - **Quantum Error Mitigation (QEM)**: Runs extra noisy circuits (e.g., scaling noise up to extrapolate back to zero: Zero-Noise Extrapolation, or probabilistic error cancellation). Reconstructs *expectation values* $\langle O \rangle$ in classical post-processing. **Does not produce purified quantum states**; single-shot sampling is impossible. Sampling overhead: $\Omega(1/F^2)$. Qubit overhead: 0.
  - **Quantum Error Correction (QEC)**: Encodes 1 logical qubit into multiple physical qubits (e.g., 9-qubit Shor, 17-qubit surface code). Measures stabilizer operators periodically, decodes syndromes, and applies active feedback gates during the algorithm. Sampling overhead: $\Omega(1)$. Qubit overhead: 10× to 1000× physical qubits.
* **Interactive UI & Player Task**:
  - A fixed noisy 3-qubit circuit with depolarizing noise.
  - Player clicks three tabs: `[Detection]`, `[Mitigation]`, `[Correction]`.
  - The UI visually renders:
    1. **Detection**: Shows shots entering a filter; 15% are rejected, but the surviving 85% have 96% state fidelity.
    2. **Mitigation**: Shows expectation value curve $\langle Z \rangle$ extrapolating to the noise-free intercept. Explains: *"Expectation value restored, but you have no purified statevector!"*
    3. **Correction**: Shows an active decoder tile with 9 physical qubits and 8 syndrome measurements. Shows the huge hardware footprint.
  - **Task**: Player selects which technique is best when you need **purified single-shot outputs** with **fewer than 5 total qubits**.

---

### Lesson 3: Why Old QED Codes Failed (The High-Overhead Trap)
* **Physics Covered**:
  - In early coherent Pauli check schemes, a check was placed before gate layer 0 ($P$) and after the last layer ($P' = U P U^\dagger$).
  - If $U$ contains entangling gates (CX, CZ), a single-qubit operator $P = X_0$ propagates:
    $$X_0 \xrightarrow{\text{CX}_{0,1}} X_0 X_1 \xrightarrow{\text{CX}_{1,2}} X_0 X_1 X_2$$
  - To measure $P'$ at the end, the ancilla must execute multi-qubit entangling gates across $q_0, q_1, q_2$.
  - **The Catch**: On real hardware, multi-qubit entangling gates are noisy (10× noisier than 1-qubit gates). Adding a high-weight check introduces more physical faults than it catches!
* **Interactive UI & Player Task**:
  - A 3-qubit circuit with a cascade of 2 CX gates.
  - The player places a traditional "Boundary Sandwich": $X$ on $q_0$ at the start, requiring a 3-qubit entangling operation $X_0 X_1 X_2$ at the end.
  - Live Aer simulation shows: Baseline fidelity without check = $84\%$. With the heavy check sandwich = $78\%$! (The check made things **worse**).
  - Next, the player activates a **Localized Spacetime Check** that checks an intermediate invariant inside the circuit using only nearest-neighbor gates: Fidelity jumps to $94\%$.
  - **Core Lesson**: Low-overhead error detection requires **spacetime localization**, not brute-force boundary sandwiches.

---

### Lesson 4: Spacetime Codes (Coherent Pauli Invariants)
* **Physics Covered**:
  - How an ancilla measures an invariant across time:
    1. Ancilla $a$ prepared in $|+\rangle = H |0\rangle$.
    2. Controlled-$P$ applied at wire $w_{\text{start}}$ (early time).
    3. Payload gates execute.
    4. Controlled-$P'$ applied at wire $w_{\text{end}}$ (later time).
    5. Ancilla measured in $X$-basis ($H$ then measure).
  - Condition for deterministic $0$ outcome (no false alarms):
    $$P' = U_{\text{segment}} P U_{\text{segment}}^\dagger$$
  - When a Pauli error $E$ occurs in the middle:
    - If $E$ anti-commutes with the propagated check ($E P_{\text{mid}} = - P_{\text{mid}} E$), it injects a phase flip onto the ancilla: $|+\rangle \to |-\rangle$.
    - The final $H$ gate turns $|-\rangle \to |1\rangle$. The measurement reads $1$ (Error flagged!).
* **Interactive UI & Player Task**:
  - Wire $q_0$ has an $S$ gate ($S Z S^\dagger = Z$, but $S X S^\dagger = Y$).
  - The player chooses the closing Pauli $P'$ to match opening $P = X$:
    - If player picks $P' = X \implies$ Ancilla reads random 50/50 noise even without errors (False alarm! Circuit broken).
    - If player picks $P' = Y \implies$ Ancilla reads deterministic $0$!
  - Player injects a $Z$ glitch in between $\implies$ Ancilla flips to $1$ and catches the glitch!

---

### Lesson 5: Understanding Shots, Syndromes & Sampling Overhead
* **Physics Covered**:
  - Quantum computers do not output statevectors; they output **discrete measurement bitstrings** across $N$ shots (e.g., $1024$ shots).
  - Total shots $N = N_{\text{kept}} + N_{\text{discarded}}$.
  - Kept-shot fraction: $f_{\text{kept}} = \frac{N_{\text{kept}}}{N}$.
  - Post-selected fidelity: $F_{\text{post}} = \text{Fidelity of state reconstructed from kept shots}$.
  - **Sampling Cost**: If $f_{\text{kept}} = 0.10$, you must run 10× more shots to get the same number of valid data samples. If $f_{\text{kept}} = 0.01$, you need 100× more shots!
* **Interactive UI & Player Task**:
  - A noisy circuit simulated with $N=1024$ shots.
  - A live visual histogram shows the distribution of shots:
    - Column 0 (Syndrome `0`): Green bars (kept).
    - Column 1 (Syndrome `1`): Red bars (discarded errors).
  - The player increases check sensitivity:
    - Check catches all errors: $F_{\text{post}}$ reaches $99\%$, but $f_{\text{kept}}$ drops to $0.05$ ($51$ shots survive).
    - Player inspects the Sampling Overhead meter: $1/f_{\text{kept}} = 20\times$.
  - **Lesson**: The best strategy balances high fidelity with a healthy kept fraction ($f_{\text{kept}} \ge 0.40$).

---

### Lesson 6: The Non-Clifford Frontier (Why T-Gates Break Pauli Invariants)
* **Physics Covered**:
  - Clifford gates map Paulis to Paulis: $U P U^\dagger \in \{ \pm I, \pm X, \pm Y, \pm Z \}$.
  - $T = \begin{pmatrix} 1 & 0 \\ 0 & e^{i\pi/4} \end{pmatrix} = R_z(\pi/4)$ is non-Clifford.
  - Conjugating $X$ by $T$:
    $$T X T^\dagger = \frac{X + Y}{\sqrt{2}}$$
    This is an equal superposition of $X$ and $Y$—**not a Pauli operator!**
  - A controlled-$(T X T^\dagger)$ gate cannot be implemented as a simple Clifford ancilla check; it entangles the ancilla non-trivially and destroys the computation.
  - Conjugating $Z$ by $T$:
    $$T Z T^\dagger = Z$$
    Because $T$ is diagonal, it **commutes with $Z$**!
  - **The Law of T-Crossings**: A spacetime check can cross a $T$-gate wire **if and only if** its Pauli operator on that wire is $I$ or $Z$.
* **Interactive UI & Player Task**:
  - A wire with an authoritative, unmovable $T$ gate in the center.
  - The player tests placing an $X$ check vs. a $Z$ check across the $T$ gate.
  - The UI displays the Operator Equation:
    - When $X$ hits $T$: Red warning badge: *"Operator transformed to $(X+Y)/\sqrt{2}$ (Non-Pauli!). Check invalid."*
    - When $Z$ hits $T$: Green glow: *"Operator commutes! $TZT^\dagger = Z$. Check remains a valid Pauli."*

---

## 3. MAIN EXPEDITION: 10 AUTHORITATIVE SPACETIME MISSIONS

### Progression Mechanics
In all 10 missions:
1. **The payload circuit $U$ is FIXED and authoritatively locked.** (No placing $H$, $X$, $CX$ to build states).
2. The player's workspace is the **Spacetime Check Console**:
   - In **Missions 1–5 (Foundations)**: The player manually selects the opening wire & Pauli $P$, and must manually deduce and select the matching closing wire & Pauli $P'$ at the exit boundary to close the spacetime loop.
   - In **Missions 6–7 (Deep Clifford)**: The system provides **Assisted Propagation** (Qiskit automatically computes $P' = U_{\text{seg}} P U_{\text{seg}}^\dagger$), and the player's challenge shifts to **Placement Optimization**: which wires to tap, what time intervals, and choosing target ordering to maximize score under a strict ancilla budget.
   - In **Missions 8–10 (T-Doped Family)**: The player faces the $T$-gate barrier. Checks that accidentally cross a $T$ gate with $X$ or $Y$ are rejected by physics. The player must find valid commuting $Z$-paths, short localized checks that bypass $T$-gates, or prioritize Clifford subgraphs.

---

### Mission 1: The Single-Wire Barrier
* **Chapter**: Foundations
* **Payload Circuit (Fixed)**: 1 Qubit. Length = 4 slots. $U = X - \text{Idle} - \text{Idle} - \text{Idle}$. Target state: $|1\rangle$.
* **Noise Channel**: Heavy Bit-Flip Noise ($p_{\text{error}} = 0.08$).
* **Ancilla Budget**: 1 helper.
* **Player Task**:
  - The circuit suffers frequent bit flips ($X$) during the 3 idle slots.
  - To detect $X$ errors, the check operator must anti-commute with $X \implies$ Must be $Z$ or $Y$.
  - Player places Opening tap $P$ on wire $q_0$ at boundary $t=1$.
  - Player must choose Closing tap $P'$ on wire $q_0$ at boundary $t=4$.
  - Since identity separates them, $P' = P = Z$.
* **Scoring & Insight**:
  - Bare Fidelity: $\approx 78\%$.
  - With $Z$ check: $F_{\text{post}} \approx 98\%$, $f_{\text{kept}} \approx 82\%$. Score: $\mathbf{880+}$.
  - If player mistakenly picks $X$ check: Commutes with $X$ errors $\implies$ Detects nothing! Score stays low.

---

### Mission 2: Phase Interceptor
* **Chapter**: Foundations
* **Payload Circuit (Fixed)**: 1 Qubit. Length = 5 slots. $U = H - S - \text{Idle} - \text{Idle} - \text{Idle}$. Target state: $\frac{|0\rangle + i|1\rangle}{\sqrt{2}}$.
* **Noise Channel**: Phase Damping / Dephasing ($p_{\text{error}} = 0.10$).
* **Ancilla Budget**: 1 helper.
* **Player Task**:
  - Dephasing injects $Z$ errors. To catch $Z$ errors, the check operator must anti-commute with $Z \implies$ Must have $X$ or $Y$ component.
  - Player places check opening after the $S$ gate ($t=2$) to $t=5$.
  - If placed across the $S$ gate ($t=0$ to $t=5$), the player must calculate: What does $X$ conjugate to under $H$ and $S$?
    $$X \xrightarrow{H} Z \xrightarrow{S} Z$$
  - The player discovers how Clifford gates rotate the error basis!

---

### Mission 3: Crossing the Bridge (Entangling Gates)
* **Chapter**: Foundations
* **Payload Circuit (Fixed)**: 2 Qubits. Length = 4 slots.
  - $q_0: H - \bullet - \text{Idle}$
  - $q_1: \text{Idle} - \oplus - \text{Idle}$
  - (A standard Bell pair preparation $\frac{|00\rangle+|11\rangle}{\sqrt{2}}$).
* **Noise Channel**: Depolarizing ($p_{\text{error}} = 0.04$).
* **Ancilla Budget**: 1 helper.
* **Player Task**:
  - The check opens on $q_0$ at $t=0$ with Pauli $Z$.
  - It crosses the CX control at $t=1$.
  - Physics rule: A $Z$ on control of CX propagates as $Z \otimes I$ (it commutes with control!).
  - Closing tap at $t=3$ on $q_0$ must be $Z$.
  - Now player tests opening with $X$ on $q_0$:
    $$X \otimes I \xrightarrow{\text{CX}} X \otimes X$$
  - Closing a single-wire check on $q_0$ with $X$ **fails** because the operator spread to $q_1$!
  - To close an $X$ check, the player must place a 2-qubit closing tap $X_0 X_1$.

---

### Mission 4: The Closed Loop Puzzle
* **Chapter**: Foundations
* **Payload Circuit (Fixed)**: 2 Qubits. Length = 6 slots.
  - $q_0: H - \bullet - S - \text{Idle}$
  - $q_1: \text{Idle} - \oplus - \text{Idle} - \text{Idle}$
* **Noise Channel**: Mixed Depolarizing + Readout Noise.
* **Ancilla Budget**: 1 helper.
* **Player Task**:
  - Complete manual check configuration: The player must choose `[Opening Wire, Opening Pauli, Start Time]` AND `[Closing Wire, Closing Pauli, End Time]`.
  - The UI live-evaluates the commutator: $\Delta = P' \cdot (U P U^\dagger)$.
  - If $\Delta \neq I$, the UI highlights the uncancelled Pauli leak on the circuit in red.
  - When the player finds the exact closed loop, the circuit turns green, enabling the simulation run.

---

### Mission 5: GHZ Entangled Fortress
* **Chapter**: Foundations
* **Payload Circuit (Fixed)**: 3 Qubits. Length = 6 slots.
  - $q_0: H - \bullet - \text{Idle} - \text{Idle}$
  - $q_1: \text{Idle} - \oplus - \bullet - \text{Idle}$
  - $q_2: \text{Idle} - \text{Idle} - \oplus - \text{Idle}$
  - Target: 3-qubit GHZ state $\frac{|000\rangle+|111\rangle}{\sqrt{2}}$.
* **Noise Channel**: Depolarizing ($p_{\text{error}} = 0.03$).
* **Ancilla Budget**: 2 helpers.
* **Player Task**:
  - Errors on $q_0$ cascade down to $q_1$ and $q_2$.
  - Player can place up to 2 spacetime checks.
  - **The Dilemma**: 
    - Check 1 on $q_0$ (Z-type) catches early phase errors before the cascade.
    - Check 2 on $q_2$ catches bit flips introduced by the final CX.
    - If the player tries to make both checks span all 6 slots, the 2-qubit gate overhead penalty in the score increases ($A = 4$ added gates), reducing the score.
    - The winning strategy uses **compact, staggered spacetime intervals**.

---

### Mission 6: Deep Clifford Highway (Auto-Propagation Unlocked)
* **Chapter**: Spacetime
* **Payload Circuit (Fixed)**: 3 Qubits. Length = 8 slots. Dense randomized Clifford circuit (alternating CX, CZ, H, S layers).
* **Noise Channel**: Depolarizing ($p_{\text{error}} = 0.02$).
* **Ancilla Budget**: 2 helpers.
* **Feature Unlocked**: **Assisted Pauli Propagation**. When the player picks an opening wire, Pauli $P$, and interval $[t_{\text{start}}, t_{\text{end}}]$, Qiskit automatically computes the valid closing Pauli operator $P'$.
* **Player Task**:
  - The circuit is deep; many checks expand into multi-qubit operators at the closing boundary.
  - If an opening Pauli branches into weight-3 closing operator (e.g., $X \otimes Y \otimes Z$), the ancilla requires 3 entangling gates to close $\implies$ heavy noise penalty!
  - The player's objective: **Search for "quiet" spacetime intervals where the closing Pauli stays localized (weight-1 or weight-2).**

---

### Mission 7: The Paulice Automaton
* **Chapter**: Spacetime
* **Payload Circuit (Fixed)**: 3 Qubits. 8 slots. Fixed Clifford benchmark backbone (matches QFF prompt and Martiel paper Fig. 1).
* **Noise Channel**: Realistic Heron Noise Model ($p_1=0.001, p_2=0.01$, readout=0.015).
* **Ancilla Budget**: 2 helpers.
* **Feature Unlocked**: **Paulice Compare Mode**.
  - Player can design their manual spacetime checks.
  - Player can click **"Run Paulice Synthesizer"**: The `qiskit-paulice.add_pauli_checks` engine runs its greedy windowed linear decoding algorithm, displaying its selected checks and $\gamma$-cost metric.
* **Player Task**:
  - Can the player match or beat Paulice's score?
  - Player experiments with target ordering: Does checking $q_0$ first yield better retention than checking $q_1$ first?
  - Explains the greedy nature of linear code syndrome decoding.

---

### Mission 8: A Little Magic ($T = 1$)
* **Chapter**: Beyond Clifford
* **Payload Circuit (Fixed)**: 3 Qubits. Length = 8 slots. Fixed Clifford backbone with **1 non-Clifford $T$ gate** injected on $q_0$ at $t=4$.
* **Noise Channel**: Phase Noise ($p_{\text{error}} = 0.035$).
* **Ancilla Budget**: 2 helpers.
* **Physics Challenge**:
  - Player tries to place a check across slot 4 on $q_0$:
    - If opening Pauli is $X$ or $Y$: The check hits the $T$ gate $\implies$ The UI displays the red **Non-Clifford Barrier**:
      $$T X T^\dagger = \frac{X+Y}{\sqrt{2}} \quad (\text{Invalid check rejected by Qiskit})$$
    - If opening Pauli is $Z$: The check passes through smoothly ($T Z T^\dagger = Z$).
* **Goal**: Protect the circuit without violating the $T$-commutation law.

---

### Mission 9: Narrow Passage ($T = 2$)
* **Chapter**: Beyond Clifford
* **Payload Circuit (Fixed)**: 3 Qubits. Length = 8 slots. Backbone with **2 non-Clifford $T$ gates** ($q_0$ at $t=4$, $q_1$ at $t=5$).
* **Noise Channel**: Depolarizing ($p_{\text{error}} = 0.025$).
* **Ancilla Budget**: 2 helpers.
* **Physics Challenge**:
  - Two qubits now carry $T$ gates. Any multi-qubit check that entangles $q_0$ and $q_1$ will almost certainly hit non-commuting components ($X$ or $Y$) on at least one wire.
  - The space of valid spacetime checks shrinks drastically (as proven in Martiel Supp. Sec. V).
  - Player must find the **"Narrow Passage"**:
    - Strategy A: Pure $Z$-checks that commute with both $T$ gates.
    - Strategy B: Short-duration checks that close *before* $t=4$, protecting the initial Clifford entangling stage only.

---

### Mission 10: The Master Spacetime Architect ($T = 4$)
* **Chapter**: Beyond Clifford
* **Payload Circuit (Fixed)**: 3 Qubits. Length = 9 slots. Backbone with **4 non-Clifford $T$ gates** spread across all qubits.
* **Noise Channel**: Thermal Relaxation ($T_1=100\mu s, T_2=80\mu s$, gate times $50\text{ns}/300\text{ns}$).
* **Ancilla Budget**: 2 helpers.
* **The Ultimate Boss Level**:
  - The circuit is saturated with non-Clifford rotations.
  - `qiskit-paulice` cannot run here at all.
  - Adding too many checks introduces entangling gates that degrade the already fragile $T$-doped state.
  - The player must analyze the trade-off table across all attempts:
    - Attempt 1: 0 checks (Bare baseline: $F \approx 72\%$).
    - Attempt 2: 2 heavy checks ($F_{\text{post}} \approx 89\%$, but $f_{\text{kept}} = 18\% \implies$ Low score!).
    - Attempt 3: 1 precision localized $Z$-check on the most critical wire ($F_{\text{post}} \approx 84\%$, $f_{\text{kept}} = 86\% \implies$ **Optimal Master Score!**).
  - Unlocks the **"Master Spacetime Architect"** certification badge and final summary report.

---

## 4. MATHEMATICAL & ALGORITHMIC SPECIFICATIONS

### 4.1 Spacetime Pauli Invariant Condition
Let the circuit interval between check start $t_{\text{start}}$ and end $t_{\text{end}}$ be unitary $U_{\text{interval}}$.
A spacetime check with opening Pauli $P_{\text{open}}$ and closing Pauli $P_{\text{close}}$ is valid if and only if:
$$P_{\text{close}} = U_{\text{interval}} P_{\text{open}} U_{\text{interval}}^\dagger$$
up to a global sign $s \in \{+1, -1\}$. If $s = -1$, a phase correction gate $Z$ is added to the ancilla qubit.

### 4.2 Exact Conditional Density Matrix & Post-Selection
To prevent sampling noise from corrupting scoring or allowing players to "game" scores with random seeds, the game uses **exact density matrix conditioning**:
1. Noisy circuit density matrix $\rho_{\text{total}}$ of size $2^{n+a} \times 2^{n+a}$ ($n$ data qubits, $a$ ancilla qubits) is simulated via `AerSimulator(method='density_matrix')`.
2. Projection onto trivial syndrome ($a$ ancillas in $|0\rangle$ in the computational measurement basis):
   $$\Pi_0 = I_n \otimes |0\dots 0\rangle\langle 0\dots 0|_a$$
3. Accounting for ancilla readout error probability $\epsilon_{\text{readout}}$:
   $$P(\text{reported } 0) = \sum_{k=0}^{2^a-1} w(k) \text{Tr}\left[ \left(I_n \otimes |k\rangle\langle k|\right) \rho_{\text{total}} \right]$$
   where $w(k) = (1-\epsilon_{\text{readout}})^{a - |k|} \epsilon_{\text{readout}}^{|k|}$.
4. Retained data state:
   $$\rho_{\text{post}} = \frac{\text{Tr}_a\left[\Pi_0 \rho_{\text{total}} \Pi_0\right]}{\text{Tr}\left[\Pi_0 \rho_{\text{total}} \Pi_0\right]}$$
5. Kept fraction: $f_{\text{kept}} = \text{Tr}\left[\Pi_0 \rho_{\text{total}} \Pi_0\right]$.
6. Post-selected fidelity:
   $$F_{\text{post}} = \langle \psi_{\text{target}} | \rho_{\text{post}} | \psi_{\text{target}} \rangle$$

### 4.3 Exact Scoring Function
The score is computed strictly from Qiskit simulation outputs (no arbitrary hand-set numbers):
$$\text{Score} = \text{round}\left( 1000 \times F_{\text{post}} \times \sqrt{f_{\text{kept}}} \times \frac{0.90 + 0.10 \cdot C_{\text{radar}}}{1 + 0.015 A_{\text{two}} + 0.005 \max(0, \Delta D)} \right)$$
where:
- $F_{\text{post}} \in [0, 1]$: Post-selected state fidelity.
- $f_{\text{kept}} \in [0, 1]$: Fraction of shots passing syndrome checks.
- $C_{\text{radar}} \in [0, 1]$: Single-fault anticommutation coverage ratio across idle wires.
- $A_{\text{two}}$: Count of extra 2-qubit entangling gates introduced by the check ancillas.
- $\Delta D$: Extra circuit depth added by check routing.

---

## 5. UX / UI ARCHITECTURE & INTERACTIVE VISUALIZERS

```
┌────────────────────────────────────────────────────────────────────────┐
│               UPGRADED MISSION SCREEN LAYOUT                           │
├────────────────────────────────────────────────────────────────────────┤
│ [◄ Mission Control]  MISSION 04: The Closed Loop Puzzle   [Sound: ON]  │
├────────────────────────────────────────────────────────────────────────┤
│ TARGET: (|00> + |11>)/√2  │ FIDELITY GOAL: ≥ 85% │ KEEP SHOTS: ≥ 60%  │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. AUTHORITATIVE PAYLOAD (LOCKED) │ 2. SIGNAL & FIDELITY MONITOR       │
│                                   │                                    │
│  q0 ──[H]──●────[S]─────────────  │ Retained Fidelity: 94.2%  (+12.4%) │
│            │                      │ Kept Shots:        78.5%  (804/1024│
│  q1 ───────⊕────────────────────  │ Game Score:        842    [★★★]    │
│                                   │                                    │
│ ───────────────────────────────── │ Probabilities vs Target:           │
│ 2. SPACETIME CHECK DESIGNER       │ |00>: [██████████░░] 48.1% (50.0%) │
│ Ancilla Budget: 1 helper          │ |11>: [██████████░░] 47.9% (50.0%) │
│                                   │                                    │
│ [Helper 1]                        │ 3. LIVE SHOT HISTOGRAM             │
│ Opening: Wire [q0▼] Pauli [Z▼] @t1│ 804 Kept [████████░░░░] Syndrome 0 │
│ Closing: Wire [q0▼] Pauli [Z▼] @t3│ 220 Lost [██░░░░░░░░░░] Syndrome 1 │
│ Loop Status: [✓ CLOSED INVARIANT] │                                    │
│                                   │ 4. INTERACTIVE ERROR TESTER        │
│ [▶ Run Aer Simulation]            │ [Click any wire to inject X/Z fault│
│                                   │  and watch syndrome flip!]         │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Key UI Components to Implement
1. **Locked Payload Canvas**: Payload gates ($H, CX, S, T$) are visually locked with a discreet "padlock" styling. The player cannot move or delete them.
2. **Spacetime Anchor Pins**: Players place check connections by clicking **Anchor Pins** between gate columns on the data wires.
3. **Loop Closure Indicator**:
   - If the player's selected closing operator matches $U P U^\dagger$, an animated glowing green path links the opening and closing gates: `"Invariant Closed"`.
   - If it doesn't match, the path is dashed red with a tooltip: `"Leaked Error: Uncancelled Y on q1"`.
4. **Interactive Fault Injector**:
   - A toggle: `[Inject Test Glitch]`.
   - Player clicks any wire between gates to drop an $X$ or $Z$ error.
   - The UI traces the fault: If it hits the check ancilla, an alarm badge pulses: `"CAUGHT: Syndrome 1"`. If it misses, it highlights: `"LEAKED: Logical Corruption"`.
5. **Shot & Throughput Gauge**:
   - Visually renders the cost of post-selection: an animated particle beam where clean shots pass through into the data buffer and bad shots get diverted into the "error bin".