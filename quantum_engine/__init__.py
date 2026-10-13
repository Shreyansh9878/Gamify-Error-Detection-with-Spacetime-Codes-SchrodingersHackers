"""
Quantum Engine -- physics core for Quantum Shield: The Spacetime Defender.

Exposes:
  - circuits   : payload circuit builders (Clifford + T-doped)
  - noise_model: reproducible noise model factory
  - spacetime_checks: qiskit-paulice integration + hand-made T-gate checks
  - simulator  : Aer simulation + fidelity calculation
  - scoring    : physics-grounded score formula
"""

