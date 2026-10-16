"use client";
import type {
  Draft,
  MissionLevel,
  Validation,
  Operation,
  RenderGate,
} from "@/lib/missions/contracts";
import { gateNames } from "@/lib/missions/contracts";
import type {
  CanvasModel,
  Tool,
  DropTarget,
} from "@/lib/circuit-workspace/model";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";

export function MissionCanvas({
  draft: d,
  level: l,
  validation,
  onChange,
  onError,
  disabled,
}: {
  draft: Draft;
  level: MissionLevel;
  validation: Validation | null;
  onChange: (d: Draft) => void;
  onError: (s: string) => void;
  disabled: boolean;
}) {
  const wires: CanvasModel["wires"] = [
    ...Array.from({ length: l.qubits }, (_, i) => ({
      id: `q${i}`,
      label: `q${i}`,
      kind: "data" as const,
      index: i,
    })),
    ...Array.from({ length: l.ancillas }, (_, i) => ({
      id: `a${i}`,
      label: `a${i}`,
      kind: "ancilla" as const,
      index: l.qubits + i,
    })),
  ];
  const nodes: RenderGate[] = [
    ...l.payload.map((g) => ({
      id: g.id,
      name: g.name,
      qubits: g.qubits,
      rank: g.column * 32 + 31,
      column: g.id,
      owner: "fixed-fixture" as const,
    })),
    ...d.operations.map((g) => ({
      id: g.id,
      name: g.name,
      qubits: g.qubits,
      rank: g.boundary * 32 + g.slot,
      column: `b${g.boundary}s${g.slot}`,
      owner: "player" as const,
    })),
    ...(validation?.generated || []),
  ];
  const columns: {
    key: string;
    rank: number;
    boundary: number;
    stage: "payload" | "generated";
  }[] = [];
  for (let b = 0; b <= l.payload.length; b++) {
    for (let s = 0; s < (d.bands[String(b)] || 0); s++)
      columns.push({
        key: `b${b}s${s}`,
        rank: b * 32 + s,
        boundary: b,
        stage: "payload",
      });
    if (b < l.payload.length)
      columns.push({
        key: `u${b}`,
        rank: b * 32 + 31,
        boundary: b,
        stage: "payload",
      });
  }
  for (const g of validation?.generated || [])
    columns.push({
      key: g.column,
      rank: g.rank,
      boundary: Math.floor(g.rank / 32),
      stage: "generated",
    });
  columns.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
  const model: CanvasModel = {
    compactChecks: true,
    wires,
    columns: columns.map((c, i) => ({
      ...c,
      label: `column ${i + 1}`,
      zone: 3,
      region: "payload",
    })),
    nodes: nodes.map((g) => ({
      id: g.id,
      name: g.name,
      label: g.name.toUpperCase(),
      wires: g.qubits.map((q) => wires[q].id),
      column: g.column,
      owner: g.owner,
      kind: "gate",
      detail:
        g.id === `u${l.noise.hotspotColumn}`
          ? `Noisy crossing: q${l.noise.qubit} relaxation.`
          : g.owner === "generated-method"
            ? "Automatically propagated closing check; locked."
            : undefined,
      tone:
        g.id === `u${l.noise.hotspotColumn}`
          ? "hotspot"
          : ["t", "tdg"].includes(g.name) &&
              validation?.checks.some((c) => c.nonPauli)
            ? "invalid"
            : undefined,
    })),
    checks: validation?.checks.map((c) => ({
      ...c,
      message: c.valid ? "Closed invariant." : c.message,
    })),
  };
  const tools: Tool[] = gateNames.map((name) => ({
    id: `gate-${name}`,
    name,
    label: name.toUpperCase(),
    kind: "gate",
    twoWire: ["cx", "cy", "cz"].includes(name),
  }));
  function position(target: DropTarget) {
    const match = /^b(\d+)s(\d+)$/.exec(target.key);
    if (!match)
      throw Error(
        "Payload and generated closing columns are locked. Insert an editable column beside them.",
      );
    return { boundary: +match[1], slot: +match[2] };
  }
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={tools}
      disabled={disabled}
      onError={onError}
      actions={{
        place(tool, target, _config, second) {
          const pos = position(target);
          const gate: Operation = {
            id: crypto.randomUUID(),
            name: tool.name as Operation["name"],
            qubits: second
              ? [target.wire.index, second.index]
              : [target.wire.index],
            ...pos,
          };
          onChange({ ...d, operations: [...d.operations, gate] });
        },
        move(node, target, wire) {
          const pos = position(target);
          const old = wires.find((w) => w.id === wire)?.index;
          onChange({
            ...d,
            operations: d.operations.map((g) =>
              g.id === node.id
                ? {
                    ...g,
                    ...pos,
                    qubits: g.qubits.map((q) =>
                      q === old ? target.wire.index : q,
                    ),
                  }
                : g,
            ),
          });
        },
        remove(node) {
          onChange({
            ...d,
            operations: d.operations.filter((g) => g.id !== node.id),
          });
        },
      }}
    />
  );
}
