import { block, Circuit } from "./contracts";
export const sections = [
  {
    id: "overview",
    title: "What can go wrong with a qubit?",
    paragraphs: [
      "Before we learn to protect a quantum circuit, let’s learn what can damage its information. A classical bit is measured as 0 or 1. A qubit also gives 0 or 1 in the usual measurement, but it has more structure before you measure. Plus and minus, for example, are distinct superpositions that both give 0 and 1 equally often in Z measurement.",
      "Think of a Bloch vector as a tiny arrow. Gates turn it deliberately. An error is an unwanted change to the state or intended operation. Some errors turn the arrow; interaction with the environment can also shrink it into a statistical mixture rather than one pure state.",
      "Real qubits are physical devices. Stray fields, imperfect control pulses, timing or frequency fluctuations, neighboring qubits, and environmental interactions can disturb them. The mechanism depends on the hardware. Here we isolate simple models, one effect at a time.",
      "Prepare a state, inject an error, and compare. There is no score, countdown, or attempt penalty. Every gate and readout is ideal unless you explicitly place an error block. A column orders operations; it does not secretly add waiting time.",
    ],
  },
  {
    id: "bit-flip",
    title: "Bit flip · X swaps zero and one",
    formula: "X |0〉 = |1〉     X |1〉 = |0〉",
    paragraphs: [
      "If a circuit should leave a qubit in zero but an unwanted X occurs just before measurement, you now measure one. The same error changes one into zero. On the Bloch sphere this is a half-turn about X, exchanging the north and south poles (up to an irrelevant overall phase).",
      "Unwanted excitation, interactions, or control mistakes can cause bit-flip-like behavior. Physical faults may happen unpredictably. Our bit_flip block deliberately applies one known X error; it is not a random-probability X channel.",
      "The input matters: X leaves plus unchanged. It changes minus only by an overall sign, which changes no measurement predictions. The very same error that completely changes zero can leave another state physically unchanged.",
      "Try zero → X error, then prepare one with a preparation X and repeat. Finally prepare plus using H. Preparation X and an X error have the same operator but different roles: the reference omits only error blocks.",
    ],
  },
  {
    id: "phase-flip",
    title: "Phase flip · Z changes a relative sign",
    formula:
      "Z |0〉 = |0〉    Z |1〉 = −|1〉\nZ |+〉 = |−〉    Z |−〉 = |+〉\n|±〉 = (|0〉 ± |1〉) / √2",
    paragraphs: [
      "The minus sign on the complete one state is an overall phase, not a different physical state. The relative minus sign inside the minus superposition changes interference when later gates act.",
      "Unwanted frequency shifts, fluctuating fields, timing mistakes, and environmental interactions can disturb phase. Z models one full phase flip; other disturbances can be partial rotations or gradual dephasing.",
      "The Z-measurement blind spot: plus and minus both give 0 and 1 equally often when measured immediately in Z. Their phase changed, but these immediate probability bars did not. Plus points along +X; minus points along −X. X-basis measurement distinguishes them: plus gives +, minus gives −.",
      "Why it changes a circuit’s answer: H followed by H returns zero to zero. Insert a Z error between them and the final state is one. A phase error is not harmless just because an earlier Z histogram looked unchanged. Load this example and choose the final-circuit comparison.",
      "X and Z are complete operations. A replay of an arrow turning explains the transformation; it is not a statistical mixture slowly becoming a coherent minus state. A gradual phase drift rotates (|0〉 + exp(iφ)|1〉)/√2 around the equator as φ grows from 0 to π. Random phase uncertainty instead shortens the arrow and need not produce a definite minus state.",
    ],
  },
  {
    id: "decoherence",
    title: "Decoherence · information changes while you wait",
    formula:
      "P(1 at time t) = exp(−t / T1)\nx(t) = x(0) exp(−t / T2)\ny(t) = y(0) exp(−t / T2)\nz(t) = 1 + [z(0) − 1] exp(−t / T1)",
    paragraphs: [
      "Qubits interact with their environment while waiting. Decoherence broadly describes losing the information needed to maintain an intended quantum state. Our waiting block includes energy relaxation (T1), where excited one tends toward zero, and loss of phase coherence (T2), where X and Y components decay.",
      "t is how long you wait; T1 and T2 describe how quickly information is lost. They are different controls, all measured in microseconds (μs). This model fixes equilibrium excited-state population to zero. A waiting block affects only its named wire, not every wire in the circuit.",
      "Prepare one. At t=0 it is still one. At t=T1 about 37% of repeated measurements give one and 63% give zero. Every qubit does not flip at exactly T1: the exponential describes probabilities over repeated runs.",
      "Prepare plus. Phase coherence decreases while energy relaxation pulls the arrow toward zero. The state can become mixed, with its arrow inside the sphere. That differs from Z turning plus into minus: a shorter arrow and an oppositely pointing arrow mean different things.",
      "Try the elapsed-time slider after preparing one, then plus. Inspect counts, X, and purity. Zero duration is identity. Only explicit waits add this channel; preparation and readout remain ideal. Physically valid parameters require T2 ≤ 2 × T1.",
    ],
  },
  {
    id: "reading-results",
    title: "Read the evidence, then try your own",
    paragraphs: [
      "Qiskit computes the state and samples repeated measurements. A Bloch sphere is a simulator’s state description: one hardware measurement does not reveal its whole vector. Exact probability is the predicted chance; counts are finite samples that may fluctuate even when probabilities match.",
      "Before/after selected error captures just that block, including earlier operations but excluding later gates. Final comparison runs all preparation gates with and without every error-role block. Choose the comparison that answers your question.",
      "Each panel samples its own N shots. X measurement rotates a copy for measurement; it does not change or repair the canvas. Joint strings are ordered q(n−1)…q0, with q0 at the right. In X measurement, 0 means plus and 1 means minus. Both panels use the same seed for reproducible simulator samples, not independent hardware experiments.",
      "For multiple qubits, the sphere is a reduced state. An entangled pair can have a zero-length local arrow while the full pair is pure. Local mixedness alone is not proof of noise. Compare both branches and inspect joint correlations or global purity.",
      "Start with one error. Combine Errors optionally permits ordered blocks: X–X and Z–Z cancel. Not every reordering changes predictions: X and Z can differ only by global phase, while waiting and other operations generally do not commute. Run as often as you like, then answer three questions. One successful run and three correct answers complete this lesson only.",
    ],
  },
];
const example = (
  title: string,
  description: string,
  n: number,
  operations: ReturnType<typeof block>[],
  final = false,
) => ({
  title,
  description,
  circuit: {
    schemaVersion: 1 as const,
    qubits: n,
    combineErrors: false,
    operations,
  },
  final,
});
export const examples = [
  example(
    "Zero becomes one",
    "A single X error swaps the Z outcome: 0 → 1.",
    1,
    [block("bit_flip", 0, 0, "e")],
  ),
  example(
    "One becomes zero",
    "Preparation X creates one. The error X takes it back to zero.",
    1,
    [block("x", 0, 0, "p"), block("bit_flip", 0, 1, "e")],
  ),
  example(
    "Plus becomes minus",
    "Z reverses the X arrow; immediate Z probabilities stay equal.",
    1,
    [block("h", 0, 0, "p"), block("phase_flip", 0, 1, "e")],
  ),
  example(
    "Minus becomes plus",
    "Prepare minus with H and Z. A Z error returns it to plus.",
    1,
    [
      block("h", 0, 0, "p"),
      block("z", 0, 1, "p2"),
      block("phase_flip", 0, 2, "e"),
    ],
  ),
  example(
    "Phase changes a later answer",
    "H–Z(error)–H yields one; H–H yields zero. Compare final states.",
    1,
    [
      block("h", 0, 0, "p"),
      block("phase_flip", 0, 1, "e"),
      block("h", 0, 2, "p2"),
    ],
    true,
  ),
  example(
    "One relaxes",
    "At t=T1=100 μs, P(1) ≈ 0.3679; this is not a scheduled flip.",
    1,
    [
      block("x", 0, 0, "p"),
      { ...block("decoherence", 0, 1, "e"), timeUs: 100 },
    ],
  ),
  example(
    "Coherence fades",
    "Watch X decay and Z move toward zero’s north pole as waiting grows.",
    1,
    [
      block("h", 0, 0, "p"),
      { ...block("decoherence", 0, 1, "e"), timeUs: 100 },
    ],
  ),
  example(
    "Entanglement is not local noise",
    "A Bell pair has mixed local states and a pure global state. Inspect joint outcomes.",
    2,
    [block("h", 0, 0, "p"), block("cx", 0, 1, "p2")],
    true,
  ),
];
export type Example = {
  title: string;
  description: string;
  circuit: Circuit;
  final: boolean;
};
export const questions = [
  {
    prompt:
      "You prepared zero. One X bit-flip error occurs immediately before a Z measurement. What do you expect?",
    choices: [
      "Always 0.",
      "Always 1.",
      "Equal probability of 0 and 1.",
      "No measurement result.",
    ],
    correct: "B",
    feedback:
      "X swaps zero and one. This deliberate deterministic example has no extra noise or readout error; real faults do not always happen deterministically.",
  },
  {
    prompt: "Z changes plus into minus. Which statement is correct?",
    choices: [
      "They must give opposite deterministic Z outcomes.",
      "They are physically identical in every experiment.",
      "Their immediate Z probabilities match, but X measurement distinguishes them.",
      "Z necessarily changes either state into zero.",
    ],
    correct: "C",
    feedback:
      "Plus and minus have equal Z probabilities but opposite X arrows. A later basis change reveals their relative phase.",
  },
  {
    prompt:
      "Prepare one and increase elapsed time t in this zero-temperature relaxation model. What generally happens?",
    choices: [
      "P(1) decreases and P(0) increases.",
      "Every qubit flips at exactly t=T1.",
      "Waiting is the same as one Z phase flip.",
      "Nothing changes without another preparation gate.",
    ],
    correct: "A",
    feedback:
      "Relaxation changes probabilities exponentially. T1 is a time constant, not a scheduled flip; superpositions also lose phase coherence.",
  },
];
