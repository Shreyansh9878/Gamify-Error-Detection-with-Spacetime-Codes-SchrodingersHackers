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
    tag: "01 / PREPARE, DISTURB, COMPARE",
    text: "Prepare your own state in the editable noise lab. Compare bit flips, phase flips, and time-dependent decoherence using a single-wire Bloch view or multiwire QSphere and Qiskit measurement counts.",
    task: "Run at least one experiment and answer the three-question knowledge check. This sandbox is separate from the fixed-payload QED missions.",
    actions: [],
    required: [],
  },
  {
    title: "Detect, mitigate, or correct?",
    tag: "02 / THREE DIFFERENT JOBS",
    text: "Detection uses a helper to flag covered faults and discards those runs. Mitigation spends extra experiments and processing to improve an estimate. Correction encodes information, extracts syndromes, and uses a decoder and recovery to protect logical information.",
    task: "Prepare a circuit and noise boundary, then run detection, mitigation and correction in any order. Inspect each physical circuit and processing step; trying all three completes the lesson.",
    actions: [
      ["detection", "Detection filter"],
      ["mitigation", "Mitigation extrapolation"],
      ["correction", "Correction decoder"],
    ],
    required: ["detection", "mitigation", "correction"],
  },
  {
    title: "Coherent Pauli Checks & Spacetime Detection",
    tag: "03 / BUILD A CLOSED CHECK",
    text: "An opening X can spread through entangling gates. A whole-circuit sandwich may need a large closing Pauli product. Local checks can spend fewer noisy gates, at the cost of covering less of the workload. Modern spacetime methods search for useful localized checks.",
    task: "Build H / controlled X / S / controlled Y / H / measurement, run a custom fault experiment, then answer the operator-evolution question. Compare localized protection with a broad sandwich.",
    actions: [
      ["sandwich", "Boundary sandwich"],
      ["localized", "Localized spacetime check"],
    ],
    required: ["sandwich", "localized"],
  },
  {
    title: "Multi-Qubit Pauli Propagation",
    tag: "04 / ONE CHECK, SEVERAL WIRES",
    text: "Across CX(0,1), opening X0 becomes closing X0 X1. Both controlled closing factors belong to the same helper and one syndrome bit.",
    task: "Drag H, X0 opening, X0/X1 closing, final H and measurement around the locked CNOT; run a valid noiseless check and answer both local questions (B and C).",
    actions: [],
    required: ["match", "recap-B", "product-C"],
  },
  {
    title: "The T-Gate Barrier",
    tag: "05 / WHAT REACHES T?",
    text: "T sends X and Y into coherent Pauli expansions while Z passes unchanged. Inspect the factor at the T crossing, not just the opening letter. An exact global closure is distinct from stepwise Pauli transport.",
    task: "Drag T into the editable payload and run a valid Z-supported crossing, then answer C. X/T diagnostics are optional.",
    actions: [],
    required: ["t-Z", "quiz-C"],
  },
  {
    title: "Trade-Off Optimization & Score Calculation",
    tag: "06 / QUALITY × RETAINED SHOTS",
    text: "Design checks around the locked three-qubit workload. Exact retained fidelity times exact acceptance is the game score; added noisy taps can lower it.",
    task: "Run a nonempty valid strategy with exact score at least 0.65, review the actual Paulice research suggestion and finite-catalogue comparison, then acknowledge to graduate. Higher fidelity and extra comparisons remain optional.",
    actions: [],
    required: ["score-065", "benchmark-review"],
  },
];
