"use client";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
import {
  gateTools,
  noiseTools,
  dataWires,
  noiseTargets,
} from "@/lib/circuit-workspace/adapters";
import type { CanvasModel, Column, Node } from "@/lib/circuit-workspace/model";
import type {
  Experiment,
  TechniquePreview,
  Gate,
  Instruction,
} from "@/lib/learning/contracts";
export function ProtectionCanvas({
  experiment: c,
  preview,
  variant,
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
  const items = Object.values(preview?.variants || {})[variant] || [],
    columns: Column[] = [],
    nodes: Node[] = [],
    labels =
      preview?.wireLabels ||
      Array.from({ length: c.qubits }, (_, q) => `q${q}`),
    wires = labels.map((label, i) => ({
      id: i < c.qubits ? `q${i}` : label,
      label,
      kind:
        i < c.qubits
          ? ("data" as const)
          : label.startsWith("r")
            ? ("redundancy" as const)
            : ("ancilla" as const),
      index: i < c.qubits ? i : +label.replace(/\D/g, "") || 0,
    }));
  const generated = items.filter((i) => !i.sourceId || i.sourceId === "noise"),
    limit = Math.max(
      8,
      ...c.operations.map((g) => g.column + 1),
      c.noise.boundary + 1,
    );
  for (let b = 0; b < Math.min(17, limit); b++) {
    if (b === c.noise.boundary)
      for (const [i, item] of generated.entries()) {
        const key = `method${i}`,
          stage = item.stage.toLowerCase();
        columns.push({
          key,
          label: item.stage,
          zone:
            stage.includes("encode") || stage.includes("prepare")
              ? 2
              : stage.includes("syndrome") ||
                  stage.includes("recover") ||
                  stage.includes("decode")
                ? 4
                : 3,
          region: "payload",
          boundary: b,
          stage: "generated",
        });
        if (item.name === "noise" && c.noise.enabled === false) continue;
        const playerNoise =
          item.name === "noise" &&
          item.qubits.length === 1 &&
          item.qubits[0] < c.qubits &&
          generated.findIndex(
            (v) => v.name === "noise" && v.qubits[0] === item.qubits[0],
          ) === i;
        nodes.push({
          id: playerNoise ? `noise:${item.qubits[0]}` : `generated:${i}`,
          label:
            item.name === "noise"
              ? c.noise.channel === "decoherence"
                ? `Wait ${c.noise.timeUs}`
                : "E"
              : item.name.toUpperCase(),
          name: item.name,
          wires: item.qubits.map((q) => wires[q]?.id || `q${q}`),
          column: key,
          owner: playerNoise ? "player" : "generated-method",
          kind: item.name === "noise" ? "noise" : "gate",
          detail: item.stage,
        });
      }
    columns.push({
      key: `base${b}`,
      label: `Base ${b}`,
      zone: b < c.noise.boundary ? 1 : 3,
      region: b < c.noise.boundary ? "preparation" : "payload",
      boundary: b,
      stage: b < c.noise.boundary ? "prep" : "payload",
    });
  }
  for (const g of c.operations)
    nodes.push({
      id: g.id,
      label: g.name.toUpperCase(),
      name: g.name,
      wires: g.qubits.map((q) => `q${q}`),
      column: `base${g.column}`,
      owner: "player",
      kind: "gate",
    });
  const model: CanvasModel = {
    inactiveZones: Object.keys(preview?.variants || {}).some((k) =>
      k.startsWith("Scale"),
    )
      ? [2, 4]
      : undefined,
    legendNote: preview?.variants.Correction
      ? "Correction layer: encoding, parity extraction, conditional recovery and decoding. These are repetition-code operations, not CPC checks."
      : preview?.variants.Detection
        ? "Detection layer: generated H / controlled-P / noise / controlled-P / H / M."
        : "Mitigation compares amplified noise-channel variants; no CPC or repaired output state is fabricated.",
    wires,
    columns,
    nodes,
    groups:
      c.noise.enabled !== false && (c.noise.targetQubits?.length || 0) > 1
        ? [
            {
              id: "noise-group",
              label: "shared channel",
              wire: `q${c.noise.targetQubits![0]}`,
              owner: "player",
            },
          ]
        : [],
  };
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={[
        ...gateTools(),
        ...noiseTools.map((t) => ({
          ...t,
          label:
            t.id === "bit_flip"
              ? "Bit-flip channel"
              : t.id === "phase_flip"
                ? "Phase-flip channel"
                : t.label,
        })),
      ]}
      onError={onError}
      disabled={disabled}
      actions={{
        place(tool, target, config, second) {
          if (target.wire.kind !== "data")
            throw new Error(
              "These method-generated helper operations are locked; edit the base data experiment.",
            );
          if (tool.kind === "gate") {
            if (!target.key.startsWith("base"))
              throw new Error(
                "Drop an intentional gate into a Base slot, not generated method circuitry.",
              );
            const g: Gate = {
              id: `gate-${crypto.randomUUID()}`,
              role: "prepare",
              name: tool.name as Gate["name"],
              qubits: second
                ? [target.wire.index, second.index]
                : [target.wire.index],
              column: target.boundary,
              ...(["rx", "ry", "rz"].includes(tool.name || "")
                ? { angleRadians: config.angleRadians }
                : {}),
            };
            onChange({ ...c, operations: [...c.operations, g] });
          } else {
            const targets = noiseTargets(
                config,
                target,
                dataWires(c.qubits),
              ).map((w) => w.index),
              channel = tool.name as Experiment["noise"]["channel"];
            onChange({
              ...c,
              noise: {
                enabled: true,
                targetQubit: target.wire.index,
                targetQubits:
                  c.noise.enabled !== false &&
                  c.noise.channel === channel &&
                  c.noise.boundary === target.boundary &&
                  config.scope === "wire"
                    ? [
                        ...new Set([
                          ...(c.noise.targetQubits || [c.noise.targetQubit]),
                          ...targets,
                        ]),
                      ]
                    : targets,
                boundary: target.boundary,
                channel,
                ...(channel === "decoherence"
                  ? {
                      timeUs: config.timeUs,
                      t1Us: config.t1Us,
                      t2Us: config.t2Us,
                    }
                  : { probability: 0.15 }),
              },
            });
          }
        },
        remove(node) {
          if (node.id === "noise-group") {
            onChange({ ...c, noise: { ...c.noise, enabled: false } });
            return;
          }
          if (node.id.startsWith("noise:")) {
            const targets = (
              c.noise.targetQubits || [c.noise.targetQubit]
            ).filter((q) => q !== +node.id.slice(6));
            onChange({
              ...c,
              noise: {
                ...c.noise,
                ...(targets.length
                  ? { targetQubits: targets, targetQubit: targets[0] }
                  : { enabled: false }),
              },
            });
          } else
            onChange({
              ...c,
              operations: c.operations.filter((g) => g.id !== node.id),
            });
        },
        move(node, target, wire) {
          if (target.wire.kind !== "data")
            throw new Error("Target an editable base data wire.");
          if (node.id === "noise-group") {
            onChange({
              ...c,
              noise: { ...c.noise, boundary: target.boundary },
            });
            return;
          }
          if (node.id.startsWith("noise:")) {
            if (
              (c.noise.targetQubits?.length || 0) > 1 &&
              target.boundary !== c.noise.boundary
            )
              throw new Error(
                "This method compares one shared noise boundary. Drag its shared-channel group handle to move the whole channel; individual handles retarget one wire at that boundary.",
              );
            const old = +node.id.slice(6),
              targets = (c.noise.targetQubits || [c.noise.targetQubit]).map(
                (q) => (q === old ? target.wire.index : q),
              );
            onChange({
              ...c,
              noise: {
                ...c.noise,
                targetQubit: targets[0],
                targetQubits: targets,
                boundary: target.boundary,
              },
            });
          } else {
            if (!target.key.startsWith("base"))
              throw new Error("Move gates only among Base slots.");
            onChange({
              ...c,
              operations: c.operations.map((g) =>
                g.id === node.id
                  ? {
                      ...g,
                      column: target.boundary,
                      qubits: g.qubits.map((q) =>
                        `q${q}` === wire ? target.wire.index : q,
                      ),
                    }
                  : g,
              ),
            });
          }
        },
      }}
    />
  );
}
