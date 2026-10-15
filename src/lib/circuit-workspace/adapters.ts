import type {
  CanvasModel,
  Column,
  Tool,
  DropTarget,
  PaletteConfig,
  Wire,
} from "./model";
import type { Circuit } from "../flight-school-1/contracts";
export const gateTools = (): Tool[] =>
  ["h", "x", "y", "z", "s", "sdg", "rx", "ry", "rz", "cx"].map((name) => ({
    id: `gate-${name}`,
    label: name.toUpperCase(),
    kind: "gate",
    name,
    twoWire: name === "cx",
  }));
export const noiseTools: Tool[] = [
  {
    id: "bit_flip",
    name: "bit_flip",
    label: "Bit flip · X error",
    kind: "noise",
  },
  {
    id: "phase_flip",
    name: "phase_flip",
    label: "Phase flip · Z error",
    kind: "noise",
  },
  {
    id: "decoherence",
    name: "decoherence",
    label: "Decoherence · wait",
    kind: "noise",
  },
];
export const dataWires = (n: number): Wire[] =>
  Array.from({ length: n }, (_, q) => ({
    id: `q${q}`,
    label: `q${q}`,
    kind: "data",
    index: q,
  }));
export function noiseTargets(
  config: PaletteConfig,
  target: DropTarget,
  wires: Wire[],
) {
  if (config.scope === "all")
    return wires.filter(
      (w) => w.kind === "data" || !w.label.includes("inactive"),
    );
  if (config.scope === "selected") {
    if (config.targets.some((id) => !wires.some((w) => w.id === id)))
      throw new Error(
        "A selected noise target is inactive, generated, or already measured at this boundary.",
      );
    const chosen = wires.filter((w) => config.targets.includes(w.id));
    if (!chosen.length)
      throw new Error("Choose at least one noise target before dragging.");
    return chosen;
  }
  return [target.wire];
}
export function noiseModel(c: Circuit): CanvasModel {
  const columns: Column[] = Array.from(
    {
      length: Math.max(
        8,
        Math.max(-1, ...c.operations.map((o) => o.column)) + 2,
      ),
    },
    (_, b) => ({
      key: `g${b}`,
      label: `Column ${b}`,
      zone: 1,
      region: "preparation",
      boundary: b,
      stage: "prep",
    }),
  );
  return {
    legendNote:
      "Preparation and explicit noise experiment. CPC stages are inactive; no helper is fabricated.",
    wires: dataWires(c.qubits),
    columns,
    nodes: c.operations
      .flatMap((o) =>
        o.qubits.map((q, i) => ({
          id: o.id,
          label:
            o.name === "decoherence"
              ? `Wait ${o.timeUs}`
              : o.name === "bit_flip"
                ? "X error"
                : o.name === "phase_flip"
                  ? "Z error"
                  : o.name.toUpperCase(),
          wires:
            o.name === "decoherence" ? [`q${q}`] : o.qubits.map((q) => `q${q}`),
          column: `g${o.column}`,
          owner: "player" as const,
          kind: o.role === "error" ? ("noise" as const) : ("gate" as const),
          name: o.name,
          angleRadians: o.angleRadians,
          part: q,
        })),
      )
      .filter(
        (o, i, all) =>
          o.name === "decoherence" || all.findIndex((n) => n.id === o.id) === i,
      ),
    groups: c.operations
      .filter((o) => o.name === "decoherence" && o.qubits.length > 1)
      .map((o) => ({
        id: `noise-group:${o.id}`,
        wire: `q${o.qubits[0]}`,
        label: "wait group",
        owner: "player" as const,
      })),
  };
}
