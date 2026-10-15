import {
  Circuit,
  ComparisonMode,
  Basis,
  ordered,
  Operation,
} from "./contracts";

function args(o: Operation) {
  const values: string[] = [];
  if (o.angleRadians !== undefined) values.push(String(o.angleRadians));
  values.push(...o.qubits.map(String));
  if (o.name === "decoherence")
    values.push(`time_us=${o.timeUs}`, `t1_us=${o.t1Us}`, `t2_us=${o.t2Us}`);
  values.push(`at=${o.column}`);
  return values.join(", ");
}
export function tutorialCode(c: Circuit) {
  return `# Qiskit-backed tutorial API; error helpers and at are app-defined.\nfrom quantum_shield import TutorialCircuit\n\nqc = TutorialCircuit(${c.qubits})\n${ordered(
    c,
  )
    .map((o) => `qc.${o.name}(${args(o)})`)
    .join("\n")}\n`;
}

export function nativeQiskit(
  c: Circuit,
  mode: ComparisonMode,
  selected: string | null,
  basis: Basis,
  shots: number,
  seed: number,
) {
  const ops = ordered(c),
    index = ops.findIndex((o) => o.id === selected && o.role === "error");
  const branches =
    mode === "selected_error" && index >= 0
      ? [ops.slice(0, index), ops.slice(0, index + 1)]
      : [ops.filter((o) => o.role === "prepare"), ops];
  function branch(name: string, operations: Operation[]) {
    let last = -1;
    const lines = [`${name} = QuantumCircuit(${c.qubits})`];
    for (const o of operations) {
      if (o.column !== last) {
        lines.push(`${name}.barrier()  # column ${o.column}`);
        last = o.column;
      }
      if (o.name === "decoherence")
        lines.push(
          `${name}.append(thermal_relaxation_error(${o.t1Us}, ${o.t2Us}, ${o.timeUs}, excited_state_population=0).to_instruction(), [${o.qubits[0]}])  # all times in microseconds`,
        );
      else
        lines.push(
          `${name}.${o.name === "bit_flip" ? "x" : o.name === "phase_flip" ? "z" : o.name}(${[...(o.angleRadians !== undefined ? [String(o.angleRadians)] : []), ...o.qubits.map(String)].join(", ")})${o.role === "error" ? "  # injected error" : ""}`,
        );
    }
    return lines.join("\n");
  }
  return `# Standalone Qiskit 2+ and qiskit-aer program. No tutorial wrapper required.\n# Comparison: ${mode === "selected_error" ? "immediately before/after selected error; later gates excluded" : "final without/with error-role blocks"}.\n# Joint bit order: q(n-1)...q0; X basis: 0 = plus, 1 = minus.\nfrom qiskit import QuantumCircuit\nfrom qiskit.quantum_info import DensityMatrix\nfrom qiskit_aer.noise import thermal_relaxation_error\n\n${branch("reference", branches[0])}\n\n${branch("affected", branches[1])}\n\nstates = [DensityMatrix.from_instruction(circuit) for circuit in (reference, affected)]\nfor label, state in zip(("before/reference", "after/affected"), states):\n    measurement = QuantumCircuit(${c.qubits})\n${basis === "X" ? `    measurement.h(range(${c.qubits}))` : `    measurement.id(0)  # Z basis; no rotation`}\n    measured = state.evolve(measurement)\n    measured.seed(${seed})  # reproducible simulator samples, same seed for both branches\n    print(label, "probabilities", measured.probabilities_dict())\n    print(label, "counts", measured.sample_counts(${shots}))\n`;
}
