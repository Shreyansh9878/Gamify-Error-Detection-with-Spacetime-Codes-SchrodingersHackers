export type TutorialLesson = {
  title: string;
  tag: string;
  text: string;
  task: string;
  actions: readonly (readonly [string, string])[];
  required: readonly string[];
};
export const lessons: readonly TutorialLesson[] = [
  {
    title: "Understanding Quantum Errors",
    tag: "01 / THE BLOCH ARROW",
    text: "Prepare your own state in the editable noise lab. Compare bit flips, phase flips, and time-dependent decoherence using paired Bloch vectors and Qiskit measurement counts.",
    task: "Run at least one experiment and answer the three-question knowledge check. This sandbox is separate from the fixed-payload QED missions.",
    actions: [],
    required: [],
  },
  {
    title: "Detect, mitigate, or correct?",
    tag: "02 / THREE DIFFERENT JOBS",
    text: "Detection uses a helper to flag covered faults and discards those runs. Mitigation spends extra experiments and processing to improve an estimate. Correction encodes information, extracts syndromes, and uses a decoder and recovery to protect logical information.",
    task: "Explore all three methods, then choose the approach for retained quantum outputs with very few extra qubits.",
    actions: [
      ["detection", "Detection filter"],
      ["mitigation", "Mitigation extrapolation"],
      ["correction", "Correction decoder"],
    ],
    required: ["detection", "mitigation", "correction"],
  },
  {
    title: "The overhead trap",
    tag: "03 / LOCALIZE YOUR PROTECTION",
    text: "An opening X can spread through entangling gates. A whole-circuit sandwich may need a large closing Pauli product. Local checks can spend fewer noisy gates, at the cost of covering less of the workload. Modern spacetime methods search for useful localized checks.",
    task: "Compare a broad sandwich with a localized interval. Read the measured cost and fidelity; neither strategy wins in every circuit or noise model.",
    actions: [
      ["sandwich", "Boundary sandwich"],
      ["localized", "Localized spacetime check"],
    ],
    required: ["sandwich", "localized"],
  },
  {
    title: "Close the invariant",
    tag: "04 / P → P′",
    text: "Prepare a helper in |+>, apply controlled P, let the fixed workload U run, apply controlled P′, then read the helper in the X basis. A closed loop obeys P′ U = U P. Across S, an opening X becomes Y.",
    task: "Choose opening X and try closing X. Then choose closing Y and test again. Inject Z into the closed loop to see the syndrome flip.",
    actions: [
      ["match", "Test invariant"],
      ["inject", "Inject Z into loop"],
    ],
    required: ["match", "inject"],
  },
  {
    title: "Shots have a cost",
    tag: "05 / KEEP OR DISCARD",
    text: "A shot is one execution and readout. Keep the all-zero syndrome; discard any nonzero syndrome. A clean syndrome can still hide an undetected error. Fewer retained shots mean more attempts to collect your useful sample.",
    task: "Compare zero, one, and two helpers. Change the total shot count and inspect N_kept + N_discarded = N, retained fidelity, and expected attempts per kept sample.",
    actions: [
      ["bare", "No helpers"],
      ["one", "One helper"],
      ["two", "Two helpers"],
    ],
    required: ["bare", "one", "two"],
  },
  {
    title: "The non-Clifford frontier",
    tag: "06 / THE T BARRIER",
    text: "Clifford gates send each Pauli to another signed Pauli. T keeps Z unchanged but turns X and Y into combinations. Such a crossing needs more than a simple Pauli closing tap; this game restricts checks to the Pauli family.",
    task: "Test X through S and T. Then test Z through T. The propagated operator at the T location decides whether a Pauli check can cross.",
    actions: [
      ["clifford", "Propagate through S"],
      ["t", "Propagate through T"],
    ],
    required: ["clifford-X", "t-X", "t-Z"],
  },
];
