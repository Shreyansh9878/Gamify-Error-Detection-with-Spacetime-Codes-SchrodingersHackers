# LEETCODE_WORKSPACE_AND_FLIGHT_SCHOOL_3.md

## 1. Global UI & System Architecture: Flight School 3 Setup

Flight School 3 is integrated into the 3-pane LeetCode workbench architecture[cite: 6]. It focuses on the physical mechanics of **Coherent Parity Checks (CPC)** and **Spacetime Operator Propagation**.

+---------------------------------------------------------------------------------------------------+
|  HEADER: Mission Title | Flight School Track | Level Selector (FS3)    | Engine: shield-qed-2.0.0 |
+------------------------------------+--------------------------------------------------------------+
| LEFT PANEL: BRIEFING & THEORY      | TOP-RIGHT PANEL: INTERACTIVE WORKBENCH                       |
| (Width: ~35% - 40%, Scrollable)    | (Height: ~60%, Resizable Grid)                               |
|                                    |                                                              |
| - Theory: Coherent Parity Checks   | - Mode Switcher: [ 1. Guided S-Gate ] | [ 2. Sandbox Mode ] |
| - Circuit Construction Step-by-Step | - Interactive Spacetime Canvas                              |
| - Mathematical Operator Evolution  | - Drag-and-Drop Check & Noise Palette                        |
| - Interactive Task Progress Checklist | - Visual / Code Mode Toggle                               |
|                                    +--------------------------------------------------------------+
|                                    | BOTTOM-RIGHT PANEL: TELEMETRY & DIAGNOSTICS                  |
|                                    | (Height: ~40%, Resizable)                                    |
|                                    |                                                              |
|                                    | - Operator Evolution Trajectory (X -> S -> Y)                |
|                                    | - Real-Time Ancilla Syndrome Outcome (0 vs. 1)               |
| [ Run Simulation ] [ Reset Canvas] | - Dynamic Fault Injection Diagnostic (Caught vs. Missed)     |
+------------------------------------+--------------------------------------------------------------+

---

## 2. Level Specification: Flight School 3 — Coherent Parity Checks & Spacetime Propagation

### Level Overview
* **ID**: `flight-school-3`
* **Name**: Coherent Parity Checks & Spacetime Code Mechanics[cite: 2, 7]
* **Target Audience**: Students learning how error detection checks are built physically on hardware[cite: 1, 2].
* **Prerequisites**: `flight-school-2` Completed.
* **Objective**: Manually construct a Coherent Parity Check (CPC) circuit, understand how Pauli operators evolve across gates ($P' = U P U^\dagger$), validate checks visually using propagation feedback (Green = Valid, Red = Error), and observe syndrome behavior under injected noise[cite: 2, 7].

---

### Left Panel Content (Rendered Markdown)

```markdown
# Flight School 3: Coherent Parity Checks & Spacetime Codes

In previous levels, error detection was treated as an abstract box. Now, you will build a physical **Coherent Parity Check (CPC)** from scratch using quantum gates and ancilla qubits[cite: 2, 7].

---

## 1. What is a Coherent Parity Check (CPC)?
A Coherent Parity Check measures whether a data qubit has undergone an error without destroying the underlying quantum state. It attaches a temporary **ancilla qubit** ($a_0$) to the data line ($q_0$) over a specific time window[cite: 2, 3].

### Physical Circuit Architecture
A complete CPC consists of five sequential stages[cite: 2, 7]:

q0 (Data):    -------------[ Controlled-P ]---[ Payload U ]---[ Controlled-P' ]------------
|                                   |
a0 (Ancilla): |0> ---[ H ]---------------------------------------------------[ H ]---( M )


1. **Ancilla Preparation**: Initialize ancilla $a_0$ in state $\vert 0 \rangle$ and apply a Hadamard gate ($H$) to place it in equal superposition $\vert + \rangle = \frac{\vert 0 \rangle + \vert 1 \rangle}{\sqrt{2}}$.
2. **Opening Check Tap**: Apply a controlled-Pauli check ($P \in \{X, Y, Z\}$) targeted at the data qubit $q_0$[cite: 2].
3. **Payload Gate Execution**: The data qubit undergoes standard quantum logic gates ($U$)[cite: 2, 7].
4. **Closing Check Tap ($P'$)**: Apply a closing controlled-Pauli check ($P'$) targeted at $q_0$. To maintain zero syndrome in the absence of noise, $P'$ **must match the propagated Pauli operator**:
   $$P' = U P U^\dagger$$
5. **Syndrome Measurement**: Apply a closing Hadamard gate ($H$) to $a_0$ and measure in the computational ($Z$) basis:
   * **Outcome `0`**: No error occurred (or error commuted with check)[cite: 2, 7].
   * **Outcome `1`**: Error detected! Phase kickback flipped the ancilla state to $\vert 1 \rangle$, flagging the shot for discard[cite: 2, 7].

---

## 2. Operator Evolution Example ($S$ Gate)
How does a Pauli operator evolve when passing through a Clifford gate?
Let's trace an opening $X$ check through an $S$ gate:

* **Opening Operator**: $P = X$
* **Payload Gate**: $U = S = \begin{pmatrix} 1 & 0 \\ 0 & i \end{pmatrix}$
* **Propagated Operator**:
  $$P' = S X S^\dagger = \begin{pmatrix} 1 & 0 \\ 0 & i \end{pmatrix} \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix} \begin{pmatrix} 1 & 0 \\ 0 & -i \end{pmatrix} = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix} = Y$$

> **Key Rule**: Because $S X S^\dagger = Y$, placing an opening $X$ check before an $S$ gate **requires a closing $Y$ check** after the $S$ gate. Closing with $X$ will create false alarms even when no physical noise is present!

---

## Guided Exercise Tasks
1. Set up the opening $H$ gate on ancilla $a_0$.
2. Place an opening controlled-$X$ check on $q_0$ at Column 1.
3. Pass through the payload $S$ gate on $q_0$ at Column 2.
4. Place the closing check at Column 3. Select $Y$ to match operator propagation.
5. Place the closing $H$ gate and measurement block $(M)$ on $a_0$.
6. Observe the line turn **GREEN** on correct propagation, or **RED** on incorrect operator selection!

Top-Right Panel: Interactive Workbench ControlsMode 1: Guided $S$-Gate Check ConstructionThe level opens in Guided Mode with a fixed payload circuit ($S$ gate on qubit $q_0$ at Column 2).   Column:       0          1          2          3          4
q0 (Data):  ---------------------[ S Gate ]-----------------------
a0 (Ancilla): [   ]      [   ]                  [   ]      [   ]
Interactive Palette:Gate [ H ] (Ancilla Hadamard)Check Tap [ Ctrl-X ]Check Tap [ Ctrl-Y ]Check Tap [ Ctrl-Z ]Measurement [ M ]Real-Time Validation Engine (POST /api/validate-checks):As gates and check taps are placed, the visual check connector updates dynamically:Incorrect Closure (Red Highlight): If the player selects Closing Check = $X$, the connector line turns RED, and a warning pops up: ❌ Operator Mismatch: S X S† = Y. Closing with X causes false syndrome alarms!   Correct Closure (Green Highlight): If the player selects Closing Check = $Y$, the connector line turns GREEN, displaying: ✅ Operator Matched: S X S† = Y. Syndrome is deterministically 0 under noiseless conditions.   Mode 2: Unlocked Sandbox Mode (Custom Circuits & Fault Injection)Once the player completes the guided exercise, Sandbox Mode unlocks, allowing full experimentation:   Custom Circuit Builder:Add up to 3 Data Qubits ($q_0, q_1, q_2$) and 2 Ancilla Qubits ($a_0, a_1$).   Place payload gates: $H, X, S, CX$[cite: 2, 7].Spacetime Check Placement:Place opening/closing CPC check pairs across any payload section[cite: 2].Real-time propagation validation (Green/Red boundary overlays) continues to validate custom layouts live.   Error Injection Tools:Drag-and-drop error blocks directly onto data lines inside the check window:Block [ Bit Flip (X Error) ][cite: 7]Block [ Phase Flip (Z Error) ][cite: 7]Block [ Thermal Decoherence ][cite: 7]Bottom-Right Panel: Telemetry & Diagnostic ConsoleWhen Run Simulation or Trace Fault is executed, the telemetry console provides exact physical outputs[cite: 7]:+---------------------------------------------------------------------------------------------------+
|  TELEMETRY & OPERATOR TRAJECTORY CONSOLE                                                         |
+----------------------------------+----------------------------------+-----------------------------+
| 1. OPERATOR EVOLUTION            | 2. ANCILLA SYNDROME HISTOGRAM    | 3. FAULT DIAGNOSTIC         |
|                                  |                                  |                             |
| Opening Tap:  X  (Col 1)         | [1024 Shots Simulated]           | Injected Fault: Z on q0     |
| Payload Gate: S  (Col 2)         |                                  | Fault Location: Col 2       |
| Propagated:   Y  (Col 3)         | Syndrome '0': 0 Shots  (0.0%)    |                             |
| Selected:     Y  (Col 3)         | Syndrome '1': 1024 Shots (100%)  | Outcome: CAUGHT!            |
| Status:       MATCHED (GREEN)    | Action: ALL SHOTS DISCARDED      | Flag Probability: 100%      |
+----------------------------------+----------------------------------+-----------------------------+
Operator Evolution Trajectory: Shows step-by-step mathematical evolution of the check operator[cite: 7].Ancilla Syndrome Histogram: Displays outcome distribution on ancilla $a_0$[cite: 7].Noiseless + Matched Check $\rightarrow 100\%$ outcome 0[cite: 7].Injected Anticommuting Error $\rightarrow 100\%$ outcome 1 (Syndrome Flag Triggered!)[cite: 7].Fault Diagnostic Alert (POST /api/trace-fault): Reports whether injected noise was CAUGHT, MISSED, or PROBABILISTIC[cite: 7].Completion & Unlocking RulesGuided Task Completion: Player successfully constructs the $S$-gate CPC check with matched $Y$ closure (turning check connector GREEN)[cite: 7].Sandbox Experimentation: Player executes at least 1 noise injection test in Sandbox Mode and observes syndrome outcome 1[cite: 7].Progression Trigger:Render badge: "Flight School 3 Certified: Spacetime Check Architect"[cite: 7].Save progress under key quantum-shield-qed-v2[cite: 7].Unlock Flight School 4 (Entangling Propagation & Multi-Wire Checks)[cite: 7].