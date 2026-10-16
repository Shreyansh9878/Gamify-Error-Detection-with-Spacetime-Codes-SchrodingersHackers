import {
  Experiment,
  CheckDraft,
  Gate,
  initialExperiment,
  sandboxInitial,
} from "./contracts";
import { initialHardware } from "../timeline/hardware";
export const gate = (
  name: Gate["name"],
  qubits: number[],
  column: number,
  id: string,
): Gate => ({ id, role: "prepare", name, qubits, column });
export const protectionExamples: {
  title: string;
  description: string;
  experiment: Experiment;
}[] = [
  {
    title: "Default comparison",
    description:
      "Zero with p=0.15 bit-flip noise. Compare costs and outputs; Z observation is informative.",
    experiment: initialExperiment,
  },
  {
    title: "Hidden phase",
    description:
      "Prepare plus, then phase noise. Z probabilities hide the damage; try X measurement and an X check.",
    experiment: {
      ...initialExperiment,
      operations: [gate("h", [0], 0, "h0")],
      noise: {
        channel: "phase_flip",
        targetQubit: 0,
        boundary: 1,
        probability: 0.15,
      },
    },
  },
  {
    title: "Phase becomes an answer",
    description:
      "H, phase noise, H. A later gate converts the phase difference into a Z answer.",
    experiment: {
      ...initialExperiment,
      operations: [gate("h", [0], 0, "h0"), gate("h", [0], 2, "h1")],
      noise: {
        channel: "phase_flip",
        targetQubit: 0,
        boundary: 1,
        probability: 0.15,
      },
    },
  },
  {
    title: "Entangled data",
    description:
      "Bell preparation, noise on q0. A true quantum recovery preserves its entangled partner.",
    experiment: {
      ...initialExperiment,
      qubits: 2,
      operations: [gate("h", [0], 0, "h0"), gate("cx", [0, 1], 1, "cx0")],
      noise: {
        channel: "bit_flip",
        targetQubit: 0,
        boundary: 2,
        probability: 0.15,
      },
    },
  },
  {
    title: "Imperfect correction",
    description:
      "p=0.6: double faults defeat the repetition decoder. Improvement is not guaranteed.",
    experiment: {
      ...initialExperiment,
      noise: {
        channel: "bit_flip",
        targetQubit: 0,
        boundary: 0,
        probability: 0.6,
      },
    },
  },
  {
    title: "Relaxation",
    description:
      "Prepare one and wait for 100 μs. General channels are not magically undone by a repetition code.",
    experiment: {
      ...initialExperiment,
      operations: [gate("x", [0], 0, "x0")],
      noise: {
        channel: "decoherence",
        targetQubit: 0,
        boundary: 1,
        timeUs: 100,
        t1Us: 100,
        t2Us: 80,
      },
    },
  },
];
/** Hardware examples are separate from the retained legacy spatial-channel fixtures. */
export const hardwareProtectionExamples = protectionExamples.map(
  (example, index) => {
    const settings = [
      { bitFlip: 0.025, phaseFlip: 0, depolarizing: 0, relaxationTimeUs: 0 },
      { bitFlip: 0, phaseFlip: 0.04, depolarizing: 0, relaxationTimeUs: 0 },
      { bitFlip: 0, phaseFlip: 0.04, depolarizing: 0, relaxationTimeUs: 0 },
      {
        bitFlip: 0.015,
        phaseFlip: 0.005,
        depolarizing: 0,
        relaxationTimeUs: 0,
      },
      { bitFlip: 0.2, phaseFlip: 0, depolarizing: 0, relaxationTimeUs: 0 },
      { bitFlip: 0, phaseFlip: 0, depolarizing: 0, relaxationTimeUs: 10 },
    ][index];
    const descriptions = [
      "Start in zero with a 0.025 bit-flip probability per occupied layer and storage interval. All live wires, including generated helpers, receive noise.",
      "Prepare plus with 0.04 phase-flip probability per layer on every live wire. Z probabilities hide phase damage; try X measurement and an X check.",
      "Prepare H then H with 0.04 phase-flip probability per layer. Noise after the first H can become a difference in the final Z answer.",
      "Prepare a Bell pair with bit-flip probability 0.015 and phase-flip probability 0.005 per layer on all live wires. Compare joint-state fidelity and helper costs.",
      "Set bit-flip probability to 0.20 per layer. Multiple faults and noisy extraction can defeat the restricted repetition decoder; improvement is not guaranteed.",
      "Prepare one. Every occupied layer and the storage interval adds 10 μs of relaxation (T1=100 μs, T2=80 μs) on all live wires. A repetition code cannot undo general relaxation.",
    ];
    return {
      ...example,
      description: descriptions[index],
      experiment: {
        ...example.experiment,
        noise: {
          ...initialExperiment.noise,
          targetQubit: example.experiment.noise.targetQubit,
        },
        hardware: { ...initialHardware, ...settings, enabled: true },
      },
    };
  },
);
const fullCheck = sandboxInitial.checks[0];
export const checkExamples: {
  title: string;
  description: string;
  draft: CheckDraft;
}[] = [
  {
    title: "S-gate check",
    description:
      "Complete X → S → Y with ideal helper gates. Try X as the closing axis.",
    draft: sandboxInitial,
  },
  {
    title: "Sign matters",
    description:
      "Y → S → −X requires a visible Z on the helper before the final H.",
    draft: {
      ...sandboxInitial,
      checks: [
        {
          ...fullCheck,
          openingTaps: [{ qubit: 0, pauli: "Y" }],
          closingTaps: [{ qubit: 0, pauli: "X" }],
          closingSign: -1,
        },
      ],
    },
  },
  {
    title: "Fault time matters",
    description:
      "X before S commutes with the opening X, but X after S anticommutes with Y.",
    draft: {
      ...sandboxInitial,
      faults: [{ id: "f0", name: "bit_flip", qubit: 0, boundary: 2, order: 0 }],
    },
  },
  {
    title: "Broad check",
    description:
      "X0 spreads through two CX gates to X0X1X2: four controlled taps.",
    draft: {
      schemaVersion: 1,
      mode: "sandbox",
      dataQubits: 3,
      preparation: [gate("h", [0], 0, "h0")],
      payload: [gate("cx", [0, 1], 0, "cx0"), gate("cx", [1, 2], 1, "cx1")],
      checks: [
        {
          ...fullCheck,
          startBoundary: 0,
          endBoundary: 2,
          openingTaps: [{ qubit: 0, pauli: "X" }],
          closingTaps: [
            { qubit: 0, pauli: "X" },
            { qubit: 1, pauli: "X" },
            { qubit: 2, pauli: "X" },
          ],
        },
      ],
      combineFaults: false,
      faults: [],
    },
  },
  {
    title: "Local check",
    description:
      "Z1 across the last CX remains Z1: two taps, but different fault coverage.",
    draft: {
      schemaVersion: 1,
      mode: "sandbox",
      dataQubits: 3,
      preparation: [gate("h", [0], 0, "h0")],
      payload: [gate("cx", [0, 1], 0, "cx0"), gate("cx", [1, 2], 1, "cx1")],
      checks: [
        {
          ...fullCheck,
          startBoundary: 1,
          endBoundary: 2,
          openingTaps: [{ qubit: 1, pauli: "Z" }],
          closingTaps: [{ qubit: 1, pauli: "Z" }],
        },
      ],
      combineFaults: false,
      faults: [],
    },
  },
  {
    title: "Waiting channel",
    description:
      "Thermal noise acts on the actual coherent data/helper circuit. Observe probabilistic flagging.",
    draft: {
      ...sandboxInitial,
      faults: [
        {
          id: "f0",
          name: "decoherence",
          qubit: 0,
          boundary: 3,
          order: 0,
          timeUs: 100,
          t1Us: 100,
          t2Us: 80,
        },
      ],
    },
  },
  {
    title: "Outside the window",
    description:
      "A Z event after closing can affect data without flagging that completed check.",
    draft: {
      ...sandboxInitial,
      faults: [
        { id: "f0", name: "phase_flip", qubit: 0, boundary: 4, order: 0 },
      ],
    },
  },
];
export const checkQuestion = {
  prompt:
    "You attach an opening X check on data qubit q0 before an S gate (U = S). What closing operator P′ must you select after S to prevent false syndrome alarms?",
  options: ["A) P′ = X", "B) P′ = Y", "C) P′ = Z", "D) P′ = I"],
  answer: "B",
  explanation:
    "The invariant requires P′ = U P U†. For S = diag(1,i), S X S† = [[0,−i],[i,0]] = Y. Choosing another closing operator breaks the input-independent invariant and can cause false alarms in a noiseless circuit. A mismatched check does not necessarily give syndrome 1 on every shot.",
};
