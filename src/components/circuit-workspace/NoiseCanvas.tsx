"use client";
import type {
  Circuit,
  Operation,
  BlockName,
} from "@/lib/flight-school-1/contracts";
import {
  noiseModel,
  gateTools,
  noiseTools,
  noiseTargets,
} from "@/lib/circuit-workspace/adapters";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
export function NoiseCanvas({
  circuit,
  onChange,
  onError,
  onSelect,
  disabled,
}: {
  circuit: Circuit;
  onChange: (c: Circuit, selected?: string | null) => boolean | void;
  onError: (s: string) => void;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const model = noiseModel(circuit);
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={[
        ...gateTools(),
        ...["cy", "cz", "m"].map((name) => ({
          id: `gate-${name}`,
          name,
          label: name.toUpperCase(),
          kind: "gate" as const,
          twoWire: name !== "m",
        })),
        ...noiseTools,
      ]}
      onError={onError}
      disabled={disabled}
      onSelect={onSelect}
      onEditAngle={(id, angleRadians) =>
        onChange(
          {
            ...circuit,
            operations: circuit.operations.map((g) =>
              g.id === id ? { ...g, angleRadians } : g,
            ),
          },
          id,
        )
      }
      actions={{
        place(tool, target, config, secondWire) {
          if (target.wire.kind !== "data")
            throw new Error("This experiment has data wires only.");
          const name = tool.name as BlockName,
            id = `block-${crypto.randomUUID()}`;
          const qubits =
            name === "decoherence"
              ? noiseTargets(config, target, model.wires).map((w) => w.index)
              : secondWire
                ? [target.wire.index, secondWire.index]
                : [target.wire.index];
          const op: Operation = {
            id,
            name,
            role: tool.kind === "noise" ? "error" : "prepare",
            qubits,
            column: target.boundary,
            ...(["rx", "ry", "rz"].includes(name)
              ? { angleRadians: config.angleRadians }
              : {}),
            ...(name === "decoherence"
              ? { timeUs: config.timeUs, t1Us: config.t1Us, t2Us: config.t2Us }
              : {}),
          };
          onChange(
            {
              ...circuit,
              combineErrors:
                circuit.combineErrors ||
                (op.role === "error" &&
                  circuit.operations.some((o) => o.role === "error")),
              operations: [...circuit.operations, op],
            },
            id,
          );
        },
        remove(node, wire) {
          const group = node.id.startsWith("noise-group:"),
            id = group ? node.id.slice(12) : node.id;
          onChange(
            {
              ...circuit,
              operations: circuit.operations.flatMap((o) => {
                if (o.id !== id) return [o];
                if (!group && o.name === "decoherence" && o.qubits.length > 1) {
                  const qubits = o.qubits.filter((q) => `q${q}` !== wire);
                  return qubits.length ? [{ ...o, qubits }] : [];
                }
                return [];
              }),
            },
            null,
          );
        },
        move(node, target, wire) {
          onChange({
            ...circuit,
            combineErrors:
              circuit.combineErrors ||
              circuit.operations.some(
                (o) =>
                  o.id === node.id &&
                  o.name === "decoherence" &&
                  o.qubits.length > 1,
              ),
            operations: circuit.operations.flatMap((o) => {
              if (node.id === `noise-group:${o.id}`)
                return [{ ...o, column: target.boundary }];
              if (o.id !== node.id) return [o];
              if (o.name === "decoherence" && o.qubits.length > 1) {
                const remain = o.qubits.filter((q) => `q${q}` !== wire);
                return [
                  ...(remain.length ? [{ ...o, qubits: remain }] : []),
                  {
                    ...o,
                    id: `block-${crypto.randomUUID()}`,
                    qubits: [target.wire.index],
                    column: target.boundary,
                  },
                ];
              }
              return [
                {
                  ...o,
                  column: target.boundary,
                  qubits: o.qubits.map((q) =>
                    `q${q}` === wire ? target.wire.index : q,
                  ),
                },
              ];
            }),
          });
        },
      }}
    />
  );
}
