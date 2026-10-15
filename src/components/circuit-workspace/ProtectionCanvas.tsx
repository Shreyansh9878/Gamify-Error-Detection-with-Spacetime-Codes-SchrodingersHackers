"use client";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
import { dataWires, gateTools } from "@/lib/circuit-workspace/adapters";
import type { CanvasModel, Tool } from "@/lib/circuit-workspace/model";
import type {
  Experiment,
  TechniquePreview,
  Gate,
} from "@/lib/learning/contracts";
/** The authoring surface contains only the user's base circuit. */
export function ProtectionCanvas({
  experiment: c,
  onChange,
  onError,
  disabled,
}: {
  experiment: Experiment;
  preview: TechniquePreview | null;
  variant: number;
  onChange: (c: Experiment) => boolean | void;
  onError: (s: string) => void;
  disabled: boolean;
}) {
  const tools: Tool[] = [
    ...gateTools(),
    ...["cy", "cz", "m"].map((name) => ({
      id: `gate-${name}`,
      name,
      label: name.toUpperCase(),
      kind: "gate" as const,
      twoWire: name !== "m",
    })),
  ];
  const model: CanvasModel = {
    wires: dataWires(c.qubits),
    columns: Array.from({ length: 16 }, (_, i) => ({
      key: `base${i}`,
      label: `column ${i + 1}`,
      zone: 3,
      region: "payload",
      boundary: i,
      stage: "payload",
    })),
    nodes: c.operations.map((g) => ({
      id: g.id,
      name: g.name,
      label: g.name.toUpperCase(),
      wires: g.qubits.map((q) => `q${q}`),
      column: `base${g.column}`,
      owner: "player",
      kind: "gate",
    })),
  };
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={tools}
      disabled={disabled}
      onError={onError}
      actions={{
        place(tool, target, config, second) {
          const name = tool.name as Gate["name"];
          const g: Gate = {
            id: crypto.randomUUID(),
            role: "prepare",
            name,
            qubits: second
              ? [target.wire.index, second.index]
              : [target.wire.index],
            column: target.boundary,
            ...(["rx", "ry", "rz"].includes(name)
              ? { angleRadians: config.angleRadians }
              : {}),
          };
          onChange({ ...c, operations: [...c.operations, g] });
        },
        remove(node) {
          onChange({
            ...c,
            operations: c.operations.filter((g) => g.id !== node.id),
          });
        },
        move(node, target, wire) {
          const old = +wire.slice(1);
          onChange({
            ...c,
            operations: c.operations.map((g) =>
              g.id === node.id
                ? {
                    ...g,
                    column: target.boundary,
                    qubits: g.qubits.map((q) =>
                      q === old ? target.wire.index : q,
                    ),
                  }
                : g,
            ),
          });
        },
      }}
    />
  );
}
