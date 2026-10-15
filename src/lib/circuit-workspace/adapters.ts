import type {
  CanvasModel,
  Column,
  Node,
  Tool,
  DropTarget,
  PaletteConfig,
  Wire,
} from "./model";
import type {
  AdvancedDraft,
  AdvancedValidation,
  Fault,
} from "../advanced-learning/contracts";
import type { Circuit } from "../flight-school-1/contracts";
export const gateTools = (advanced = false, nonClifford = false): Tool[] =>
  [
    "h",
    "x",
    "y",
    "z",
    "s",
    "sdg",
    ...(advanced ? ["cx", "cz", "swap"] : ["rx", "ry", "rz", "cx"]),
    ...(nonClifford ? ["t", "tdg"] : []),
  ].map((name) => ({
    id: `gate-${name}`,
    label: name.toUpperCase(),
    kind: "gate",
    name,
    twoWire: ["cx", "cz", "swap"].includes(name),
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
export const checkTools: Tool[] = [
  { id: "check", label: "Check handle", kind: "check" },
  { id: "P", label: "Opening P", kind: "stage", stage: "open" },
  { id: "Pprime", label: "Closing P′", kind: "stage", stage: "close" },
  { id: "ancillaH", label: "Ancilla H", kind: "stage", stage: "openH" },
  { id: "finalH", label: "Final H", kind: "stage", stage: "finalH" },
  { id: "M", label: "Syndrome M", kind: "stage", stage: "measure" },
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
    inactiveZones: [2, 4],
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
export function checkModel(
  d: AdvancedDraft,
  validation: AdvancedValidation | null,
): CanvasModel {
  const columns: Column[] = [],
    nodes: Node[] = [],
    wires = [
      ...dataWires(d.dataQubits),
      ...[0, 1].map((a) => ({
        id: `a${a}`,
        label: `a${a}${d.checks.some((c) => c.ancilla === a) ? "" : " · inactive"}`,
        kind: "ancilla" as const,
        index: a,
      })),
    ];
  const prep = Math.max(
      3,
      Math.max(-1, ...d.preparation.map((g) => g.column)) + 1,
    ),
    limit = Math.max(
      8,
      ...d.payload.map((g) => g.column + 1),
      ...d.faults.map((f) => f.boundary + 1),
      ...d.checks.map((c) => c.endBoundary + 1),
    );
  for (let b = 0; b < prep; b++)
    columns.push({
      key: `prep${b}`,
      label: `Prep ${b}`,
      zone: 1,
      region: "preparation",
      boundary: b,
      stage: "prep",
    });
  const sorted = [...d.checks].sort((a, b) => a.id.localeCompare(b.id));
  function checkColumn(
    c: AdvancedDraft["checks"][number],
    stage: Column["stage"],
    boundary: number,
  ) {
    const key = `${c.id}:${stage}`;
    columns.push({
      key,
      label: `a${c.ancilla} ${stage} @ ${boundary}`,
      zone: stage === "open" || stage === "openH" ? 2 : 4,
      region: "payload",
      boundary,
      stage,
      checkId: c.id,
      ancilla: c.ancilla,
    });
    return key;
  }
  for (let b = 0; b < Math.min(17, limit); b++) {
    columns.push({
      key: `fault${b}`,
      label: `Fault before ${b}`,
      zone: 3,
      region: "payload",
      boundary: b,
      stage: "fault",
    });
    for (const c of [...sorted].reverse())
      if (c.endBoundary === b) {
        const close = checkColumn(c, "close", b);
        c.closingTaps.forEach((t) =>
          nodes.push({
            id: `check:${c.id}:close:${t.qubit}`,
            label: `P′ ${t.pauli}`,
            wires: [`a${c.ancilla}`, `q${t.qubit}`],
            column: close,
            owner: "player",
            kind: "check",
            checkId: c.id,
          }),
        );
        const h = checkColumn(c, "finalH", b);
        if (c.closingHadamard)
          nodes.push({
            id: `check:${c.id}:finalH`,
            label: c.closingSign === -1 ? "Z → H" : "H",
            wires: [`a${c.ancilla}`],
            column: h,
            owner: "player",
            kind: "check",
            checkId: c.id,
          });
        const m = checkColumn(c, "measure", b);
        if (c.measure)
          nodes.push({
            id: `check:${c.id}:measure`,
            label: "M",
            wires: [`a${c.ancilla}`],
            column: m,
            owner: "player",
            kind: "check",
            checkId: c.id,
          });
      }
    for (const c of sorted)
      if (c.startBoundary === b) {
        const h = checkColumn(c, "openH", b);
        if (c.openingHadamard)
          nodes.push({
            id: `check:${c.id}:openH`,
            label: "H",
            wires: [`a${c.ancilla}`],
            column: h,
            owner: "player",
            kind: "check",
            checkId: c.id,
          });
        const open = checkColumn(c, "open", b);
        c.openingTaps.forEach((t) =>
          nodes.push({
            id: `check:${c.id}:open:${t.qubit}`,
            label: `P ${t.pauli}`,
            wires: [`a${c.ancilla}`, `q${t.qubit}`],
            column: open,
            owner: "player",
            kind: "check",
            checkId: c.id,
          }),
        );
      }
    columns.push({
      key: `payload${b}`,
      label: `Payload ${b}`,
      zone: 3,
      region: "payload",
      boundary: b,
      stage: "payload",
    });
  }
  for (const region of ["preparation", "payload"] as const)
    for (const g of d[region])
      nodes.push({
        id: `gate:${region}:${g.id}`,
        label: g.name.toUpperCase(),
        name: g.name,
        wires: g.qubits.map((q) => `q${q}`),
        column: `${region === "preparation" ? "prep" : "payload"}${g.column}`,
        owner:
          d.mode === "guided" && region === "payload"
            ? "fixed-fixture"
            : "player",
        kind: "gate",
      });
  for (const f of d.faults) {
    const targets = (
      f as Fault & { targets?: { kind: string; index: number }[] }
    ).targets || [{ kind: "data", index: f.qubit }];
    for (const t of targets)
      nodes.push({
        id: `fault:${f.id}`,
        label:
          f.name === "decoherence"
            ? `Wait ${f.timeUs}`
            : f.name === "bit_flip"
              ? "X error"
              : f.name === "pauli_y"
                ? "Y error"
                : "Z error",
        name: f.name,
        wires: [`${t.kind === "ancilla" ? "a" : "q"}${t.index}`],
        column: `fault${f.boundary}`,
        owner: "player",
        kind: "noise",
      });
  }
  return {
    wires,
    columns,
    nodes,
    groups: [
      ...d.checks.map((c) => ({
        id: `check:${c.id}:group`,
        label: `check a${c.ancilla}`,
        wire: `a${c.ancilla}`,
        owner: "player" as const,
      })),
      ...d.faults
        .filter((f) => f.targets && f.targets.length > 1)
        .map((f) => ({
          id: `fault-group:${f.id}`,
          label: "wait group",
          wire: `${f.targets![0].kind === "data" ? "q" : "a"}${f.targets![0].index}`,
          owner: "player" as const,
        })),
    ],
    checks: d.checks.map((c) => {
      const v = validation?.checks.find((v) => v.id === c.id);
      return {
        id: c.id,
        valid: !v?.complete ? null : !!validation?.valid,
        opening: `${c.id}:open`,
        closing: `${c.id}:close`,
        ancilla: `a${c.ancilla}`,
        message: `Check a${c.ancilla}: ${!v?.complete ? "Incomplete physical check" : validation?.valid ? "Invariant closed" : validation?.scheduleValid ? "Globally closed / outside stepwise Pauli mode" : "Mismatch / schedule conflict"} · expected ${v?.expected || "choose opening"}`,
      };
    }),
  };
}

export function resizedFaults(faults: Fault[], n: number): Fault[] {
  return faults.flatMap((f) => {
    if (!f.targets) return f.qubit < n ? [f] : [];
    const targets = f.targets.filter(
      (t) => t.kind === "ancilla" || t.index < n,
    );
    return targets.length
      ? [
          {
            ...f,
            targets,
            qubit: targets.find((t) => t.kind === "data")?.index ?? 0,
          },
        ]
      : [];
  });
}
