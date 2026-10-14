export const lessons = [
  {
    title: "The noisy qubit",
    tag: "01 / SIGNAL",
    text: "Think of a qubit as a tiny arrow. Gates turn it on purpose. Noise bumps it by accident. Decoherence fades the delicate relationships that make quantum states useful.",
    task: "Apply X or H, then move the noise slider and run again.",
    actions: [
      ["observe", "Observe |0〉"],
      ["x", "Apply X · flip"],
      ["h", "Apply H · superpose"],
    ],
    required: ["x", "h"],
  },
  {
    title: "Detecting the glitch",
    tag: "02 / DETECT",
    text: "A helper qubit is an alarm. It checks a shared property without reading out all the data. Its measurement is called a syndrome: a clue about an error, not the secret state itself.",
    task: "Inject a bit flip and watch the syndrome change. Try a phase error too.",
    actions: [
      ["clean", "No error"],
      ["bit", "Inject X glitch"],
      ["phase", "Inject Z glitch"],
    ],
    required: ["bit"],
  },
  {
    title: "Three different jobs",
    tag: "03 / UNDERSTAND",
    text: "Detection sounds an alarm. Post-selection discards flagged runs. Mitigation improves an estimate using calibration or extra experiments. Correction uses encoded information and a recovery operation to repair supported errors.",
    task: "Explore all three methods. They solve different problems.",
    actions: [
      ["detection", "Detect & discard"],
      ["mitigation", "Mitigate estimate"],
      ["correction", "Decode repetition code"],
    ],
    required: ["detection", "mitigation", "correction"],
  },
  {
    title: "Low-overhead magic",
    tag: "04 / PROTECT",
    text: "A helper can compare a property before and after several gates. This is a check across space and time. Fewer helpers and added gates can reduce cost—but every extra gate can also introduce noise.",
    task: "Compare a bare circuit with one coherent check. Notice the shots you give up.",
    actions: [
      ["bare", "Run unprotected"],
      ["protect", "Add one helper"],
    ],
    required: ["bare", "protect"],
  },
  {
    title: "Matching the target",
    tag: "05 / BUILD",
    text: "Your target is the quantum state you want. Fidelity measures how close the output is to that state. Matching probabilities alone is not enough: phases matter too.",
    task: "First apply H to q0, then add CX from q0 to q1 to make a Bell pair.",
    actions: [
      ["empty", "Empty circuit"],
      ["h", "1 · Place H"],
      ["bell", "2 · Add CX"],
    ],
    required: ["h", "bell"],
  },
  {
    title: "Final practice run",
    tag: "06 / LAUNCH",
    text: "Prepare the signal, add a check, inspect the result. Your mission score rewards fidelity and retained shots, with a penalty for extra depth and two-qubit gates.",
    task: "Run the prepared |1〉 circuit, then protect it. You are ready to build your own.",
    actions: [
      ["prepare", "Prepare |1〉"],
      ["protect", "Protect & run"],
    ],
    required: ["prepare", "protect"],
  },
] as const;
