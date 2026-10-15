import type { AdvancedDraft } from "./contracts";
export function advancedCode(d: AdvancedDraft, nonClifford = false) {
  const wrapper = nonClifford ? "NonCliffordCircuit" : "EntanglingCircuit";
  const taps = (t: { qubit: number; pauli: string }[]) =>
    `[${t.map((v) => `(${v.qubit}, "${v.pauli}")`).join(", ")}]`;
  const gates = (items: AdvancedDraft["payload"], prefix = "") =>
    [...items]
      .sort((a, b) => a.column - b.column || a.qubits[0] - b.qubits[0])
      .map(
        (g) =>
          `qc.${prefix}${g.name}(${[...g.qubits, `at=${g.column}`].join(", ")})`,
      )
      .join("\n");
  const bool = (b: boolean) => (b ? "True" : "False");
  return `# App-defined safe teaching DSL; native Qiskit is exported separately.\nfrom quantum_shield import ${wrapper}\n\nqc = ${wrapper}(${d.dataQubits})\n${gates(d.preparation, "prepare_")}\n${gates(d.payload)}\n${d.checks.map((c) => `qc.check(id=${JSON.stringify(c.id)}, ancilla=${c.ancilla}, start=${c.startBoundary}, end=${c.endBoundary},\n    opening=${taps(c.openingTaps)}, closing=${taps(c.closingTaps)}, closing_sign=${c.closingSign},\n    opening_h=${bool(c.openingHadamard)}, closing_h=${bool(c.closingHadamard)}, measure=${bool(c.measure)})`).join("\n")}\n${d.faults.map((f) => `qc.${f.name}(${f.qubit}, boundary=${f.boundary}, order=${f.order}${f.targets ? `, targets=[${f.targets.map((t) => `("${t.kind}", ${t.index})`).join(", ")}]` : ""}${f.name === "decoherence" ? `, time_us=${f.timeUs}, t1_us=${f.t1Us}, t2_us=${f.t2Us}` : ""})`).join("\n")}\n`;
}
