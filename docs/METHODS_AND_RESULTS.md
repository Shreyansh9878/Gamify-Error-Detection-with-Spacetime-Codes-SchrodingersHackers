# QED methods and reproducible results

## Workload and reference

Every mission payload U is fixed and server-owned. Players choose protection taps, not state-preparation gates. Early missions require a manual closing selection; advanced missions propagate the closing operator with Qiskit Clifford tableaus. These one-to-three-data-qubit examples implement localized two-endpoint coherent-Pauli checks. The actual Paulice adapter supplies the richer spacetime-code research benchmark.

The ideal game state is computed with `Statevector.from_instruction`, including for these small Clifford workloads. The Clifford research estimator uses signed stabilizer generators. Aer density-matrix simulation produces the full noisy data/helper state before measurement. Fidelity is the overlap of the pure ideal target with the retained data density matrix; probability bars alone cannot identify phase errors.

A closing Pauli is valid when P′ = U P U†, including its sign. Negative signs require a helper Z correction. Manual multi-wire products are checked as full operators. At each T crossing, I/Z commute while X/Y leave the permitted Pauli family. Distinct individually valid checks also undergo a combined noiseless preservation test to catch interference.

## Declared noise model

The development channels and parameters are defined in `backend/levels.py`. Missions 1–5 use bit flip, dephasing, or depolarizing examples; the targets and rates follow the redesign's authored progression. Mission 7 uses synthetic one-qubit depolarizing parameter .001, two-qubit parameter .01, and readout confusion .015. This is not calibrated Heron data. Other missions default to .002/.008/.005 gate/readout parameters unless overridden.

Mission 10 uses Aer thermal-relaxation channels with T1=100 μs, T2=80 μs, single-qubit time 50 ns, two-qubit time 300 ns, and idle time 300 ns, composed with the declared active-gate depolarization. Aer depolarizing and phase-damping parameters are channel parameters; they must not all be interpreted as probabilities of one nonidentity Pauli fault.

Unused data cells and active helper intervals have explicit identity markers for idle noise. Helpers outside their active interval have no additional storage channel in this small model. There is no hardware connectivity or routing calibration. Transpilation uses the declared noisy basis, optimization level zero, and seed 2026.

## Post-selection and shots

Let ρ_k be the data block corresponding to true ancilla result k. For reported all-zero syndrome, symmetric readout confusion ε gives weights w_k = (1−ε)^(a−|k|) ε^|k|. The unnormalized retained matrix is σ = Σ_k w_k ρ_k; p_keep = Tr(σ), and ρ_post = σ/p_keep. Both the numerator and selection probability account for readout confusion. Dividing unconditional fidelity by retention is invalid.

Game scores use exact F_post and p_keep. Actual Qiskit measurements generate N sampled bitstrings (default 1024). N_kept + N_discarded = N exactly. Any nonzero helper syndrome is discarded. Sampled counts may differ from the exact expectation. Data readout noise affects displayed measurement counts but not premeasurement state fidelity.

Expected sampling overhead is 1/p_keep attempts per retained sample. Obtaining K retained samples requires K/p_keep attempts in expectation, rather than a guarantee. Comparing statistical precision additionally requires specifying the same retained observable and its variance. No universal overhead scaling law is asserted for all detection, mitigation, or correction methods.

## Game score

```
round(1000 × F_post × sqrt(p_keep) × (0.90 + 0.10 C)
      / (1 + 0.015 A_two + 0.005 max(0, added_depth)))
```

C is an analytic single-Pauli detection-coverage proxy averaged over idle data cells. The radar also visualizes probe locations after active columns; only idle cells enter C. For non-Pauli relaxation it is explicitly an approximation, not the observed error rate. A_two is the number of added two-qubit operations. Weights are game-design choices applied to physical simulation outputs, not the organizers' judging formula.

A pass requires nominal noise, ideal target match, the level fidelity/retention goals, and its minimum helper count. The original one-to-three-star thresholds remain fidelity/retention/resource based. Noise sandbox runs do not earn stars. Old game scores are isolated by engine and local-storage version.

## Reproduced passing strategies

Run `python -m scripts.benchmark` from the root. The JSON artifact contains the full requests, target probabilities, measurements, hashes, versions, and comparisons. All ten strategies below pass; none is claimed to be globally optimal.

| Mission | Opening → closing interval | Bare fidelity | Retained fidelity | Kept | Sampling overhead | Extra 2Q | Score |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Z b1 → Z b4 | 0.7958 | 0.9922 | 0.7876 | 1.27× | 2 | 843 |
| 2 | X b2 → X b5 | 0.9252 | 0.9867 | 0.8537 | 1.17× | 2 | 872 |
| 3 | IZ b1 → IZ b4 | 0.8642 | 0.8671 | 0.8924 | 1.12× | 2 | 726 |
| 4 | IZ b1 → IZ b6 | 0.8607 | 0.8607 | 0.8843 | 1.13× | 2 | 716 |
| 5 | IIZ b1 → IIZ b6 | 0.7554 | 0.7665 | 0.8659 | 1.15× | 2 | 628 |
| 6 | IIZ b0 → XIY b8 | 0.8704 | 0.9395 | 0.8373 | 1.19× | 3 | 762 |
| 7 | IIZ b0 → ZXX b8 | 0.8102 | 0.9081 | 0.7944 | 1.26× | 4 | 715 |
| 8 | IXI b4 → IXI b8 | 0.6011 | 0.6649 | 0.7715 | 1.30× | 2 | 517 |
| 9 | IIZ b4 → IIZ b8 | 0.7745 | 0.7655 | 0.9056 | 1.10× | 2 | 637 |
| 10 | IIZ b4 → IIZ b9 | 0.9356 | 0.9280 | 0.9644 | 1.04× | 2 | 796 |

Notice that a valid check can fail to improve fidelity: added noisy operations and the fault types covered both matter. The T missions do not presume a universal monotonic decline in fidelity with T count.

## Controlled research comparisons

Research compares one, two, and three repetitions of the same Clifford backbone, target orders [], [0], [1], [0,1], [1,0], and T counts 0,1,2,4 under a fixed mission's noise model. A short circuit can yield fewer inserted checks than requested. Gamma costs and selected syndrome supports are reported from the actual library per observable setting.

Paulice uses `cost='gamma'`, `method='windowed'`, a fixed seed, and a gate/readout selection proxy. Explicit idle markers are removed from its supported-gate input. Each signed stabilizer measurement may receive a different check circuit. Selection uses `get_postselection_method()` with classical-bit mapping. Finite-shot stabilizer expectations reconstruct an observable-specific fidelity estimate; this is not the density matrix of one common retained ensemble, and estimates are not silently clipped.

The field `exactReference` instead evaluates the common original payload including its idle noise for every T count. Use it to compare T-family baselines; do not mix this with the Paulice observable-specific estimator.

Three-repetition Clifford comparison:

| Ordered targets | Baseline estimate | Checked estimate | Kept | Helpers |
|---|---:|---:|---:|---:|
| none | 0.8975 | 0.8914 | 1.0000 | 0 |
| [0] | 0.8975 | 0.9370 | 0.9223 | 1 |
| [1] | 0.8975 | 0.9501 | 0.9141 | 1 |
| [0, 1] | 0.8975 | 0.9754 | 0.8585 | 2 |
| [1, 0] | 0.8975 | 0.9594 | 0.8566 | 2 |

In this sampled set the largest F√p utility is 0.9083, for target order [1]. This is a finite-shot exploratory comparison, not a statistically significant global optimum.

Exact unchecked state fidelities under mission 7's common fixed-slot model:

| Repetitions | 0 T per payload | 1 T | 2 T | 4 T |
|---|---:|---:|---:|---:|
| 1 | 0.8102 | 0.8168 | 0.8268 | 0.8439 |
| 2 | 0.6867 | 0.6822 | 0.6956 | 0.7038 |
| 3 | 0.5621 | 0.5635 | 0.5739 | 0.5915 |

T gates replace idle cells and change the ideal output within this model. A higher fidelity in one T-doped example therefore does not establish that T gates improve a physical device. Connectivity, scheduling, different input states, and calibrated noise could change the comparison.

## References, scope, and reproducibility

The tutorial correction example is a restricted single-X repetition decoder; the nine-qubit footprint is illustrative rather than a complete QEC simulation. Pauli-only checks are a deliberate resource restriction, not a proof that non-Pauli controlled checks are impossible. See `REDESIGN_IMPLEMENTATION.md` for the design-input corrections and API contracts.

Sources: [Martiel & Javadi-Abhari](https://arxiv.org/abs/2504.15725), [Qiskit Pauli](https://qiskit.qotlabs.org/docs/api/qiskit/qiskit.quantum_info.Pauli), [Paulice spacetime guide](https://qiskit.github.io/qiskit-paulice/guides/low_overhead_error_detection_using_spacetime_codes.html), the provided QFF PDF, and the repository redesign specification.

Benchmark engine: shield-qed-2.0.0. Packages: qiskit 2.5.2, qiskit-aer 0.17.2, qiskit-paulice 0.2.1.
