# Core physics reading guide

Start with tests/test_quantum_core.py. Every public reference function has a small example there. Core modules have no React, levels, progression, canvas endpoints or green/red rendering. Mission/timeline controllers decide which interval to inspect; the core only supplies the physics operations.

| Module / function | What to explain in a demo |
|---|---|
| pauli.opening_factor | Qiskit labels put q0 at the right; make one local X/Y/Z factor without changing that order |
| pauli.gate_operator | Build the actual Qiskit gate matrix and signed Clifford tableau; cache tiny immutable gate data |
| pauli.propagate | Apply U P U†; Clifford tableaus preserve signs, while T/Tdg only admit I/Z at their crossing |
| pauli.single_term | Expand an exact matrix in the Pauli basis; return one signed term, or reject a coherent sum |
| checks.closing_factors | Invert the transported product, emit controlled factors, and compensate its relative phase on the helper |
| noise.channel | Construct a physical Qiskit X/Z stochastic, depolarizing or thermal-relaxation channel |
| noise.hardware_items | Compose independent channels on every supplied live wire; probabilities describe sequential channels, not one categorical distribution |
| noise.instruction | Store a simple operation record used by both teaching and mission schedules |
| scoring.noise_instruction | Cache conversion of a validated channel specification to its Qiskit instruction |
| scoring.exact_density | Run local Aer density-matrix evolution; the final density save is exact and contains no sampled measurement |
| scoring.ideal_reference | Use stabilizer generators for Clifford output projectors, or Statevector for T output |
| scoring.accepted_metrics | Take the all-zero-helper block B; trace gives retention, overlap gives correct_shot_yield, dividing gives conditional fidelity; budgeted callers use trusted_fidelity |
| scoring.trusted_fidelity | Compute F_ps · min(1, S_keep/S_min) once; reject invalid fractions/budgets and return zero for an empty accepted block |
| paulice.optimize_clifford | Reject non-Clifford input before calling the library; translate CY/Y to its supported basis, use a disclosed synthetic model and enforce the helper budget |

For a full check, H prepares the helper |+>. The controlled opening applies P only on its |1> branch. After U, the controlled closing inverse cancels the propagated P, so the final H returns the helper to |0> without disturbing any data input. An anticommuting intervening fault reverses the branch sign and produces syndrome 1. A commuting fault can escape. Relative phases matter: Sdg sends X to −Y, so an unsigned Y closure alone gives a false alarm without compensation.

Dynamic endpoint discovery and combined-input isometry certification remain in backend/missions/service.py and backend/timeline_lab/service.py. Noise placement remains in their schedulers. The shared core provides channel definitions, not a hidden layout rule. A legacy graduation compatibility API retains its original public Paulice monkeypatch hook because existing regression tests exercise tool-failure recovery; active tutorial/main research uses the new core wrapper.

The reference implementations are AI-assisted (PROVENANCE.md). Reading this guide or retaining a Git author name does not establish independent human authorship. Review the short functions, run their tests and explain their assumptions before presenting them.

Trusted Fidelity is a simulation-only full-state game design objective with an explicit shot budget. `accepted_metrics(..., minimum_kept=...)` is budgeted for every main mission; FS6 uses the same scalar function after its existing projection. FS1–5 and legacy compatibility endpoints keep their earlier completion/metric contracts. The unbudgeted matched Clifford/T study retains its original F_ps/S_keep data and reports their product as correct_shot_yield, with Trusted Fidelity N/A. Tests are in tests/test_trusted_fidelity.py; calibration and full paired metrics are in docs/LEVEL_VALIDATION.md.
