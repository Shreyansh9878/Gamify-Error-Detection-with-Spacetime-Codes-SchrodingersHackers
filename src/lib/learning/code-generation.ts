import { CheckDraft, Experiment, Gate, Noise } from "./contracts";
const gates = (items: Gate[], prefix = "") =>
  [...items]
    .sort(
      (a, b) =>
        a.column - b.column ||
        a.qubits[0] - b.qubits[0] ||
        a.id.localeCompare(b.id),
    )
    .map(
      (g) =>
        `qc.${prefix}${g.name}(${[...(g.angleRadians !== undefined ? [String(g.angleRadians)] : []), ...g.qubits.map(String), `at=${g.column}`].join(", ")})`,
    )
    .join("\n");
const noiseArgs = (n: Noise) =>
  n.channel === "decoherence"
    ? `time_us=${n.timeUs}, t1_us=${n.t1Us}, t2_us=${n.t2Us}`
    : n.channel === "depolarizing"
      ? `strength=${n.strength}`
      : `probability=${n.probability}`;
export function protectionCode(c: Experiment) {
  if (c.hardware)
    return `# Safely parsed teaching API; native Qiskit export appears below.\nfrom quantum_shield import ProtectionCircuit\nqc = ProtectionCircuit(${c.qubits})\n${gates(c.operations)}\nqc.protect_wire(${c.noise.targetQubit})\nqc.hardware(${Object.entries(
      c.hardware,
    )
      .map(
        ([k, v]) =>
          `${k}=${typeof v === "boolean" ? (v ? "True" : "False") : v}`,
      )
      .join(", ")})\n`;
  return `# App-defined API backed by Qiskit; at/noise are teaching helpers.\nfrom quantum_shield import ProtectionCircuit\n\nqc = ProtectionCircuit(${c.qubits})\n${gates(c.operations)}\nqc.noise("${c.noise.channel}", qubit=${c.noise.targetQubit}${c.noise.targetQubits ? `, targets=[${c.noise.targetQubits.join(", ")}]` : ""}${c.noise.enabled === false ? ", enabled=False" : ""}, ${noiseArgs(c.noise)}, boundary=${c.noise.boundary})\n`;
}
export function checkCode(d: CheckDraft) {
  const taps = (t: { qubit: number; pauli: string }[]) =>
    `[${t.map((x) => `(${x.qubit}, "${x.pauli}")`).join(", ")}]`;
  const bool = (b: boolean) => (b ? "True" : "False");
  return `# App-defined check DSL; generated native Qiskit is shown separately.\nfrom quantum_shield import CheckCircuit\n\nqc = CheckCircuit(${d.dataQubits})\n${gates(d.preparation, "prepare_")}\n${gates(d.payload)}\n${d.checks.map((c) => `qc.check(id=${JSON.stringify(c.id)}, ancilla=${c.ancilla}, start=${c.startBoundary}, end=${c.endBoundary},\n    opening=${taps(c.openingTaps)}, closing=${taps(c.closingTaps)}, closing_sign=${c.closingSign},\n    opening_h=${bool(c.openingHadamard)}, closing_h=${bool(c.closingHadamard)}, measure=${bool(c.measure)})`).join("\n")}\n${d.faults.map((f) => `qc.${f.name}(${f.qubit}, boundary=${f.boundary}, order=${f.order}${f.targets ? `, targets=[${f.targets.map((t) => `("${t.kind}", ${t.index})`).join(", ")}]` : ""}${f.name === "decoherence" ? `, time_us=${f.timeUs}, t1_us=${f.t1Us}, t2_us=${f.t2Us}` : ""})`).join("\n")}\n`;
}
