import { AdvancedDraft, sandboxInitial } from "./contracts";
const gate = (
  name: AdvancedDraft["payload"][number]["name"],
  qubits: number[],
  column = 2,
) => ({
  id: `${name}-${column}`,
  role: "prepare" as const,
  name,
  qubits,
  column,
});
export function examples(
  nonClifford: boolean,
): { title: string; description: string; draft: AdvancedDraft }[] {
  const initial = sandboxInitial(nonClifford);
  const preset = (
    title: string,
    description: string,
    edit: (d: AdvancedDraft) => void,
  ) => {
    const d = structuredClone(initial);
    edit(d);
    return { title, description, draft: d };
  };
  if (nonClifford)
    return [
      preset(
        "Z passes T",
        "Compatible transport does not imply universal fault coverage.",
        () => {},
      ),
      preset(
        "X meets T",
        "Actual non-Pauli expansion; run a false-alarm diagnostic.",
        (d) => {
          d.checks[0].openingTaps = [{ qubit: 0, pauli: "X" }];
          d.checks[0].closingTaps = [{ qubit: 0, pauli: "X" }];
        },
      ),
      preset(
        "H changes the question",
        "Opening X reaches T as Z. The local factor at T matters.",
        (d) => {
          d.payload = [gate("h", [0], 1), gate("t", [0], 2)];
          d.checks[0].openingTaps = [{ qubit: 0, pauli: "X" }];
        },
      ),
      preset(
        "Remote T",
        "I on a remote T wire imposes no new constraint.",
        (d) => {
          d.dataQubits = 2;
          d.payload = [gate("t", [1])];
        },
      ),
      preset(
        "Entangling detour",
        "CX spreads opening X0 before T on q1.",
        (d) => {
          d.dataQubits = 2;
          d.payload = [gate("cx", [0, 1], 1), gate("t", [1], 2)];
          d.checks[0].openingTaps = [{ qubit: 0, pauli: "X" }];
          d.checks[0].closingTaps = [
            { qubit: 0, pauli: "X" },
            { qubit: 1, pauli: "X" },
          ];
        },
      ),
      preset(
        "T† reverses phase",
        "Inspect (X−Y)/√2 without approximating it by X.",
        (d) => {
          d.payload = [gate("tdg", [0])];
          d.checks[0].openingTaps = [{ qubit: 0, pauli: "X" }];
          d.checks[0].closingTaps = [{ qubit: 0, pauli: "X" }];
        },
      ),
      preset(
        "Recombination",
        "T then T is S. The global X→Y invariant closes, while the intermediate path leaves Pauli transport.",
        (d) => {
          d.payload = [gate("t", [0], 1), gate("t", [0], 2)];
          d.checks[0].openingTaps = [{ qubit: 0, pauli: "X" }];
          d.checks[0].closingTaps = [{ qubit: 0, pauli: "Y" }];
        },
      ),
      preset(
        "Missed phase fault",
        "A Z fault commutes with a valid Z check.",
        (d) => {
          d.faults = [
            {
              id: "fault",
              name: "phase_flip",
              qubit: 0,
              boundary: 2,
              order: 0,
            },
          ];
        },
      ),
    ];
  return [
    preset("Control X spreads", "One ancilla, two closing factors.", () => {}),
    preset("Target Z spreads", "Opening Z1 becomes Z0 Z1.", (d) => {
      d.checks[0].openingTaps = [{ qubit: 1, pauli: "Z" }];
      d.checks[0].closingTaps = [
        { qubit: 0, pauli: "Z" },
        { qubit: 1, pauli: "Z" },
      ];
    }),
    preset("No spread", "Z on the control passes CX unchanged.", (d) => {
      d.checks[0].openingTaps = [{ qubit: 0, pauli: "Z" }];
      d.checks[0].closingTaps = [{ qubit: 0, pauli: "Z" }];
    }),
    preset("CZ spreads differently", "Opening X0 closes X0 Z1.", (d) => {
      d.payload = [gate("cz", [0, 1])];
      d.checks[0].closingTaps = [
        { qubit: 0, pauli: "X" },
        { qubit: 1, pauli: "Z" },
      ];
    }),
    preset("Moving support", "SWAP moves the factor to q1.", (d) => {
      d.payload = [gate("swap", [0, 1])];
      d.checks[0].closingTaps = [{ qubit: 1, pauli: "X" }];
    }),
    preset(
      "Sign matters",
      "CX sends X0 Z1 to −Y0 Y1. Keep the ancilla Z compensation.",
      (d) => {
        d.checks[0].openingTaps = [
          { qubit: 0, pauli: "X" },
          { qubit: 1, pauli: "Z" },
        ];
        d.checks[0].closingTaps = [
          { qubit: 0, pauli: "Y" },
          { qubit: 1, pauli: "Y" },
        ];
        d.checks[0].closingSign = -1;
      },
    ),
    preset("Three-wire chain", "X0 becomes X0 X1 X2.", (d) => {
      d.dataQubits = 3;
      d.payload = [gate("cx", [0, 1], 1), gate("cx", [1, 2], 2)];
      d.checks[0].closingTaps = [0, 1, 2].map((qubit) => ({
        qubit,
        pauli: "X",
      }));
    }),
  ];
}
export const questions = {
  4: {
    prompt:
      "You place opening X on control q0 before CX(0,1). Which closing configuration matches?",
    options: [
      "A) X on q0 only",
      "B) Z on q1 only",
      "C) X on q0 and X on q1",
      "D) Z on q0 and Z on q1",
    ],
    explanation:
      "CX X0 CX† = X0 X1. Both closing factors are controlled by the same helper and produce one syndrome bit. Validity and fault coverage are separate.",
  },
  5: {
    prompt:
      "Which nonidentity single-qubit Pauli passes a single T gate unchanged in stepwise Pauli transport?",
    options: [
      "A) X, because T X T† = X",
      "B) Y, because T Y T† = Y",
      "C) Z, because T Z T† = Z",
      "D) Both X and Y with an S gate afterward",
    ],
    explanation:
      "T X T† = (X+Y)/√2 and T Y T† = (Y−X)/√2. Z and the trivial local I commute with T. Adding S afterward does not turn that single crossing into a Pauli.",
  },
} as const;
