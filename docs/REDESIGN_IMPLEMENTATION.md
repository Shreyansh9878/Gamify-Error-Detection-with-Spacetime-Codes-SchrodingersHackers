# QED redesign implementation

Implemented against `GAME_REDESIGN_SPECIFICATION.md` and the accompanying user plan. The specification is a design input; numerical examples in it are not substituted for Qiskit results. Engine version: `shield-qed-2.0.0`.

## Gameplay and authority

Every mission is `fixed=True`. Its payload, initial state, noise configuration, and target are server-owned. Clients send the public payload as an integrity check; altered gates, control order, times, missing operations, or rotations are rejected. The UI renders payload cells without editing handlers. Lightning buttons are a separate diagnostic overlay and never modify U.

Missions 1–5 require manual opening and closing taps. Missions 6–10 compute closing products using Qiskit `Pauli.evolve(Clifford(...), frame='s')`, which applies U P U† and retains signs. Propagation is computed at each operation. At T crossings, I/Z commute and X/Y are rejected by this game's Pauli-only check model. The check endpoint sign is implemented with a helper Z correction. Single-wire and multi-wire closing selections are validated as operators, not merely against one input state's probabilities.

The score formula remains the specified fidelity/retention/resource formula. The radar score term now averages only idle data cells, as the specification defines. All-zero ancilla readout is retained; **any** nonzero syndrome is discarded. Multi-helper results must not be labeled as though only the bitstring `1` is rejected.

## API contracts

All simulation requests retain bounded strict Pydantic validation and the existing 16 KiB body cap. `RunRequest` includes optional `shots` in `{256,1024,4096}`; default 1024. Scoring uses exact density-matrix metrics, so changing this sampling budget cannot improve the deterministic score by shot luck.

Manual single-tap check:

```json
{"qubit":0,"pauli":"Z","start":1,"end":4,"closingQubit":0,"closingPauli":"Z"}
```

Manual multi-wire closing product:

```json
{"qubit":0,"pauli":"X","start":1,"end":4,"closingOperators":[{"qubit":0,"pauli":"X"},{"qubit":1,"pauli":"X"}]}
```

Advanced assisted check:

```json
{"qubit":0,"pauli":"Z","start":4,"end":8}
```

Closing terms must use distinct in-bounds wires. Sending both a single-tap closure and a product is rejected. A product cannot be empty. For early missions omitting all closing fields is rejected; later missions calculate them. Explicit closing fields in an assisted request, if supplied, are still checked rather than silently ignored.

`POST /api/validate-checks` accepts the same fixed-payload request as a run. It returns `valid`, per-check expected and selected closure, signed boundary propagation, T-crossing components, leak diagnostics, and a combined-check interference result. The UI debounces this preview and ignores obsolete replies. Invalid checks disable scoring runs; an empty check set remains executable as an unprotected comparison, but cannot earn mission stars.

`POST /api/trace-fault` accepts:

```json
{"levelId":1,"gates":[{"id":"x-0-0","name":"x","qubits":[0],"column":0}],"checks":[{"qubit":0,"pauli":"Z","start":1,"end":4,"closingQubit":0,"closingPauli":"Z"}],"faultQubit":0,"faultColumn":2,"faultPauli":"X"}
```

The fault occurs **after the complete indicated payload column and before checks close at the next boundary**. It is not injected before the gate in that cell. The diagnostic is noiseless apart from that explicit fault, even if the scored circuit uses a noisy channel. This isolates the check mechanism. Qiskit computes the full coherent state and ancilla syndrome probabilities. The forward operator trajectory can contain multiple Pauli terms after a T gate; it is never forced into a single classical Pauli label.

The response reports flag probability, `caught`/`missed`/`probabilistic`, output-state fidelity, whether this input's output changed, and the propagated operator terms. A missed alarm does not automatically imply logical corruption: a fault can act trivially on the selected input. A T-mediated alarm can be probabilistic rather than a deterministic binary verdict.

Run responses add `discardedShots`, `samplingOverhead=1/retention`, and exact expected kept/discarded counts, alongside the existing sampled counts and exact state metrics. The histogram conserves the observed integer budget. Expected overhead uses exact retention, not a noisy estimate from those integer counts.

## Flight school

1. Fixed |+> input under X, Z, and depolarizing channels; |1> under relaxation. Bloch vectors show phase damage hidden from Z-basis probabilities. X noise on |+> is correctly shown as harmless for that eigenstate.
2. Detector filtering, two-scale mitigation extrapolation, and a restricted repetition decoder. The shared state/shot chart is explicitly the QED reference; observable estimates and decoder success have separate labels. A nine-qubit full-QEC footprint is illustrative, not claimed to simulate a complete Shor or fault-tolerant code.
3. Broad versus localized checks on a fixed GHZ cascade. Actual closing weights, added gates, depth, baseline fidelity, retained fidelity, and sampling cost are reported. No hardcoded fidelity gain or historical universal failure is claimed.
4. Manual S-gate loop matching. A wrong closing tap can produce false alarms even without faults; a correct X→Y match produces deterministic zero syndrome, and an injected Z demonstrates phase kickback.
5. Zero, one, or two helper configurations with a selectable integer shot budget, kept/discarded histogram, and expected attempts for 1,000 retained samples. Equal precision comparisons additionally require the same retained observable and variance.
6. Explicit Qiskit operator decomposition through S versus T. X→(X+Y)/√2 and Y→(Y−X)/√2 through T are labeled non-Pauli. Z remains Z. T and RZ(π/4) differ by global phase.

Completion and the visible skip override unlock missions. A new local-storage namespace, `quantum-shield-qed-v2`, prevents comparisons between old state-building scores and redesigned protection scores. Old stored data is left intact. A final-mission badge is derived from the saved result, and the final strategy can be exported.

## Scientific clarifications to the design input

- A Z-type detector sees anticommuting X/Y faults, not commuting Z faults. A Pauli before H/CX is not necessarily the same Pauli at a subsequent T location; the actual propagated component is tested.
- A localized interval is still a two-endpoint coherent-Pauli check. The paper's richer multi-tap, connectivity-aware construction is exposed through the actual Paulice research adapter. This game does not claim to reproduce the full optimization algorithm using two endpoints alone.
- More checks do not guarantee higher fidelity; they introduce faults and discard useful shots. All displayed outcomes are computed.
- Pauli-only closure failure is a restriction on cheap Pauli checks. A general controlled non-Pauli operator is not mathematically impossible; it requires additional resources beyond this gameplay model.
- No calibrated Heron data was supplied. Mission 7 uses a clearly labeled synthetic gate/readout model with the requested example rates. Mission 10 uses Aer thermal channels with T1=100 μs, T2=80 μs, and 50/300 ns gate durations, plus declared gate/readout noise. These are reproducible models, not a claim of hardware calibration.
- Ancilla readout confusion weights **both** the selection probability and the retained density matrix. The ideal-projector expression in the design document must be generalized this way when readout is imperfect.
- The score weights are game-design choices applied to physical outputs, not a universal scientific figure of merit or the organizers' judging formula.

Paulice results remain observable-specific finite-shot estimates. Selected target qubits, syndrome-support wires, and the library's gamma costs are reported per measurement setting. Gamma uses Paulice's gate/readout proxy; it is not the scored simulation's complete channel or the mission score. Cross-T-count comparisons use the separately labeled exact unchecked state fidelity under the common original payload/noise protocol.

Sources: [Martiel and Javadi-Abhari](https://arxiv.org/abs/2504.15725), [Qiskit Pauli evolution](https://qiskit.qotlabs.org/docs/api/qiskit/qiskit.quantum_info.Pauli), the supplied QFF challenge PDF, and the local design specification.
