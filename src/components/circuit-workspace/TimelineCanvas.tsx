"use client";
import type { Draft, Operation, Validation } from "@/lib/timeline/contracts";
import { fixedPayload } from "@/lib/timeline/contracts";
import type { CanvasModel, Tool } from "@/lib/circuit-workspace/model";
import { noiseTools, noiseTargets } from "@/lib/circuit-workspace/adapters";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
export function TimelineCanvas({
  draft: d,
  onChange,
  onError,
  validation,
  disabled = false,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onError: (s: string) => void;
  validation: Validation | null;
  disabled?: boolean;
}) {
  const wires: CanvasModel["wires"] = [
    ...Array.from({ length: d.dataQubits }, (_, i) => ({
      id: `q${i}`,
      label: `q${i}`,
      kind: "data" as const,
      index: i,
    })),
    ...Array.from({ length: d.ancillas }, (_, i) => ({
      id: `a${i}`,
      label: `a${i}`,
      kind: "ancilla" as const,
      index: d.dataQubits + i,
    })),
  ];
  const locked = d.mode === "guided" ? fixedPayload(d.lesson) : [];
  const names = [
    "h",
    "x",
    "y",
    "z",
    "s",
    "sdg",
    "rx",
    "ry",
    "rz",
    ...(d.lesson === 5 ? ["t", "tdg"] : []),
    "cx",
    "cy",
    "cz",
    "m",
  ];
  const tools: Tool[] = [
    ...names.map((name) => ({
      id: `gate-${name}`,
      name,
      label: name.toUpperCase(),
      kind: "gate" as const,
      twoWire: ["cx", "cy", "cz"].includes(name),
    })),
    ...(d.lesson === 6 ? [] : noiseTools),
  ];
  const model: CanvasModel = {
    wires,
    columns: Array.from({ length: d.columns }, (_, i) => ({
      key: `c${i}`,
      label: `column ${i + 1}`,
      zone: 3,
      region: "payload",
      boundary: i,
      stage: "payload",
    })),
    nodes: [...d.operations, ...locked].map((g) => ({
      id: g.id,
      name: g.name,
      angleRadians: g.angleRadians,
      label:
        g.name === "m"
          ? "M"
          : g.name === "decoherence"
            ? "wait"
            : g.name === "bit_flip"
              ? "X error"
              : g.name === "phase_flip"
                ? "Z error"
                : g.name.toUpperCase(),
      wires: g.qubits.map((q) => wires[q].id),
      column: `c${g.column}`,
      owner: locked.some((l) => l.id === g.id) ? "fixed-fixture" : "player",
      kind: ["bit_flip", "phase_flip", "decoherence"].includes(g.name)
        ? "noise"
        : "gate",
      detail:
        d.lesson === 6 && g.id === "locked-1"
          ? "High-noise CX region: q1 relaxes for 70 μs after this interaction (T1=100 μs, T2=200 μs)."
          : undefined,
      tone:
        d.lesson === 6 && g.id === "locked-1"
          ? "hotspot"
          : ["t", "tdg", "rx", "ry", "rz"].includes(g.name) &&
              validation?.checks.length
            ? validation.checks.some((c) => c.nonPauli)
              ? "invalid"
              : validation.valid
                ? "valid"
                : undefined
            : undefined,
    })),
    checks: validation?.checks.map((c) => ({
      id: `a${c.ancilla}`,
      ancilla: `a${c.ancilla}`,
      opening: `c${c.openingColumn}`,
      closing: `c${c.closingColumn}`,
      valid: c.valid,
      message: c.message,
    })),
  };
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={tools}
      disabled={disabled}
      onError={onError}
      onEditAngle={(id, angleRadians) =>
        onChange({
          ...d,
          operations: d.operations.map((g) =>
            g.id === id ? { ...g, angleRadians } : g,
          ),
        })
      }
      actions={{
        place(tool, target, config, second) {
          const name = tool.name as Operation["name"];
          const qubits =
            name === "decoherence"
              ? noiseTargets(config, target, wires).map((w) => w.index)
              : second
                ? [target.wire.index, second.index]
                : [target.wire.index];
          const g: Operation = {
            id: crypto.randomUUID(),
            name,
            qubits,
            column: target.boundary,
            ...(["rx", "ry", "rz"].includes(name)
              ? { angleRadians: config.angleRadians }
              : {}),
            ...(name === "decoherence"
              ? { timeUs: config.timeUs, t1Us: config.t1Us, t2Us: config.t2Us }
              : {}),
          };
          onChange({ ...d, operations: [...d.operations, g] });
        },
        move(node, target, wire) {
          const g = d.operations.find((g) => g.id === node.id);
          if (!g) throw new Error("Locked workload.");
          const old = wires.find((w) => w.id === wire)?.index;
          const qubits = g.qubits.map((q) =>
            q === old ? target.wire.index : q,
          );
          onChange({
            ...d,
            operations: d.operations.map((v) =>
              v.id === g.id ? { ...g, column: target.boundary, qubits } : v,
            ),
          });
        },
        remove(node, wire) {
          const g = d.operations.find((g) => g.id === node.id);
          if (!g) throw new Error("Locked workload.");
          const q = wires.find((w) => w.id === wire)?.index;
          onChange({
            ...d,
            operations:
              g.name === "decoherence" && g.qubits.length > 1
                ? d.operations.map((v) =>
                    v.id === g.id
                      ? { ...g, qubits: g.qubits.filter((i) => i !== q) }
                      : v,
                  )
                : d.operations.filter((v) => v.id !== g.id),
          });
        },
      }}
    />
  );
}
