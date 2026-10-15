"use client";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
import {
  checkModel,
  checkTools,
  noiseTools,
  noiseTargets,
} from "@/lib/circuit-workspace/adapters";
import type { Node } from "@/lib/circuit-workspace/model";
import type {
  Strategy,
  GraduationValidation,
  ActiveRail,
} from "@/lib/advanced-learning/graduation";
import { windows } from "@/lib/advanced-learning/graduation";
import type {
  Fault,
  AdvancedDraft,
  AdvancedValidation,
} from "@/lib/advanced-learning/contracts";
export function GraduationCanvas({
  strategy,
  validation,
  fixture,
  onChange,
  onError,
  disabled,
  overlay,
  onOverlay,
}: {
  overlay: Fault[];
  onOverlay: (f: Fault[]) => void;
  strategy: Strategy;
  validation: GraduationValidation | null;
  fixture: {
    payload: { name: string; qubits: number[]; column: number }[];
    dataNoise: {
      boundary: number;
      qubit: number;
      channel: string;
      probability: number;
    }[];
  } | null;
  onChange: (s: Strategy) => boolean | void;
  onError: (s: string) => void;
  disabled: boolean;
}) {
  const draft: AdvancedDraft = {
    schemaVersion: 1,
    mode: "guided",
    dataQubits: 3,
    preparation: [],
    payload: (fixture?.payload || []).map((g, i) => ({
      ...g,
      id: `payload-${i}`,
      role: "prepare",
      name: g.name as AdvancedDraft["payload"][number]["name"],
    })),
    checks: strategy.rails
      .filter((r) => r.active)
      .map((r) => ({
        id: `rail-a${r.ancilla}`,
        ancilla: r.ancilla,
        startBoundary: r.startBoundary,
        endBoundary: r.endBoundary,
        openingTaps: r.openingTaps,
        closingTaps: r.closingTaps,
        closingSign: r.closingSign,
        openingHadamard: true,
        closingHadamard: true,
        measure: true,
      })),
    combineFaults: false,
    faults: overlay,
  };
  const verdict = validation
    ? ({
        ...validation,
        checks: validation.checks.map((c) => ({
          ...c,
          id: `rail-a${c.ancilla}`,
          complete: !!strategy.rails.find(
            (r) =>
              r.ancilla === c.ancilla &&
              r.active &&
              r.openingTaps.length &&
              r.closingTaps.length,
          ),
          missing: [],
        })),
      } as unknown as AdvancedValidation)
    : null;
  const model = checkModel(draft, verdict);
  model.columns = model.columns.filter(
    (c) => !["prep", "openH", "finalH", "measure"].includes(c.stage),
  );
  model.columns.unshift(
    {
      key: "fixed-input",
      label: "Input |000〉",
      zone: 1,
      region: "preparation",
      boundary: 0,
      stage: "generated",
    },
    {
      key: "fixed-H",
      label: "Fixed H @ 0",
      zone: 2,
      region: "payload",
      boundary: 0,
      stage: "generated",
    },
  );
  const initialFault = model.columns.find((c) => c.key === "fault0");
  model.columns = model.columns.filter((c) => c.key !== "fault0");
  if (initialFault) model.columns.splice(1, 0, initialFault);
  model.columns.push({
    key: "fault8",
    label: "Diagnostic before readout @ 8",
    zone: 4,
    region: "payload",
    boundary: 8,
    stage: "fault",
  });
  model.columns.push(
    {
      key: "fixed-finalH",
      label: "Final H @ 8",
      zone: 4,
      region: "payload",
      boundary: 8,
      stage: "generated",
    },
    {
      key: "fixed-M",
      label: "Readout @ 8",
      zone: 4,
      region: "payload",
      boundary: 8,
      stage: "generated",
    },
  );
  model.nodes = model.nodes.filter(
    (n) =>
      !n.id.endsWith(":openH") &&
      !n.id.endsWith(":finalH") &&
      !n.id.endsWith(":measure"),
  );
  for (const rail of strategy.rails) {
    for (const [col, label] of [
      ["fixed-H", "H"],
      ["fixed-finalH", rail.active && rail.closingSign === -1 ? "Z → H" : "H"],
      ["fixed-M", "M"],
    ])
      model.nodes.push({
        id: `fixed:${rail.ancilla}:${col}`,
        label: rail.active ? label : `${label} off`,
        wires: [`a${rail.ancilla}`],
        column: col,
        owner: "fixed-fixture",
        kind: "check",
        detail: rail.active
          ? "Fixed physical shell"
          : "Bypassed rail — no operations executed",
      });
  }
  for (const e of fixture?.dataNoise || [])
    model.nodes.push({
      id: `fixed-noise-${e.qubit}-${e.boundary}`,
      label: `E ${(100 * e.probability).toFixed(1)}%`,
      wires: [`q${e.qubit}`],
      column: `fault${e.boundary}`,
      owner: "fixed-fixture",
      kind: "noise",
      detail: `${e.channel} fixed channel`,
    });
  model.groups = model.groups?.map((g) => ({ ...g, owner: "player" }));
  const getRail = (node: Node) =>
    strategy.rails.find(
      (r) => r.active && node.id.startsWith(`check:rail-a${r.ancilla}:`),
    );
  function update(a: number, fn: (r: ActiveRail) => ActiveRail) {
    onChange({
      ...strategy,
      rails: strategy.rails.map((r) =>
        r.ancilla === a && r.active ? fn(r) : r,
      ),
    });
  }
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={[
        ...checkTools.filter((t) => ["check", "P", "Pprime"].includes(t.id)),
        ...noiseTools,
      ]}
      disabled={disabled}
      onError={onError}
      actions={{
        place(tool, target, config) {
          if (tool.kind === "noise") {
            if (target.region !== "payload" || target.boundary > 8)
              throw new Error(
                "Diagnostic noise belongs at workload boundaries 0–8.",
              );
            if (overlay.length >= 4)
              throw new Error("At most four diagnostic overlay events.");
            const wires = model.wires.filter(
              (w) =>
                w.kind === "data" ||
                strategy.rails.some((r) => r.active && r.ancilla === w.index),
            );
            const targets = (
              tool.name === "decoherence"
                ? noiseTargets(config, target, wires)
                : [target.wire]
            ).map((w) => ({
              kind:
                w.kind === "data" ? ("data" as const) : ("ancilla" as const),
              index: w.index,
            }));
            if (
              targets.some(
                (t) =>
                  t.kind === "ancilla" &&
                  !strategy.rails.some(
                    (r) => r.active && r.ancilla === t.index,
                  ),
              )
            )
              throw new Error(
                "Activate the helper rail before adding diagnostic noise.",
              );
            onOverlay([
              ...overlay,
              {
                id: `overlay-${crypto.randomUUID()}`,
                name: tool.name as Fault["name"],
                qubit: 0,
                boundary: target.boundary,
                order: overlay.length,
                targets,
                ...(tool.name === "decoherence"
                  ? {
                      timeUs: config.timeUs,
                      t1Us: config.t1Us,
                      t2Us: config.t2Us,
                    }
                  : {}),
              },
            ]);
            return;
          }

          if (target.wire.kind !== "data" && tool.id !== "check")
            throw new Error(
              "Check factors target data wires; H/M shells are fixed.",
            );
          if (target.region !== "payload")
            throw new Error("Choose a payload catalogue boundary.");
          const a =
              target.ancilla ??
              (target.wire.kind === "ancilla"
                ? target.wire.index
                : config.ancilla),
            rail = strategy.rails.find((r) => r.ancilla === a);
          if (tool.id === "check" || (tool.id === "P" && !rail?.active)) {
            if (rail?.active)
              throw new Error(
                "This rail is already active. Move its factors or trash its handle.",
              );
            const window = windows.find(([start]) => start === target.boundary);
            if (!window)
              throw new Error("Open at catalogue boundary 1, 2 or 4.");
            onChange({
              ...strategy,
              rails: strategy.rails.map((r) =>
                r.ancilla !== a
                  ? r
                  : {
                      ancilla: r.ancilla,
                      active: true,
                      startBoundary: window[0],
                      endBoundary: window[1],
                      openingTaps:
                        tool.id === "P"
                          ? [{ qubit: target.wire.index, pauli: config.pauli }]
                          : [],
                      closingTaps: [],
                      closingSign: 1,
                    },
              ),
            });
            return;
          }
          if (!rail?.active)
            throw new Error(
              "Drag a check handle/opening P to activate this rail first.",
            );
          const opening = tool.id === "P",
            field = opening ? "openingTaps" : "closingTaps";
          if (
            target.stage !== "payload" &&
            target.stage !== (opening ? "open" : "close")
          )
            throw new Error("Use the matching opening or closing data slot.");
          if (
            target.region !== "payload" ||
            !["payload", opening ? "open" : "close"].includes(target.stage)
          )
            throw new Error(
              "Use a matching check slot or a workload boundary.",
            );
          const start = opening ? target.boundary : rail.startBoundary,
            end = opening ? rail.endBoundary : target.boundary;
          if (!windows.some(([s, e]) => s === start && e === end))
            throw new Error(
              "This opening/closing pair is outside the four catalogue windows.",
            );
          if (
            (opening && rail.openingTaps.length) ||
            (!opening &&
              rail.closingTaps.some((t) => t.qubit === target.wire.index))
          )
            throw new Error(
              "Move or trash the existing factor before replacing it.",
            );
          update(a, (r) => ({
            ...r,
            startBoundary: start,
            endBoundary: end,
            [field]: [
              ...r[field],
              { qubit: target.wire.index, pauli: config.pauli },
            ],
            ...(!opening ? { closingSign: config.sign } : {}),
          }));
        },
        remove(node, wire) {
          if (node.id.startsWith("fault:")) {
            onOverlay(
              overlay.flatMap((f) => {
                if (f.id !== node.id.slice(6)) return [f];
                const targets = (f.targets || []).filter(
                  (t) => `${t.kind === "data" ? "q" : "a"}${t.index}` !== wire,
                );
                return targets.length ? [{ ...f, targets }] : [];
              }),
            );
            return;
          }
          if (node.id.startsWith("fault-group:")) {
            onOverlay(overlay.filter((f) => f.id !== node.id.slice(12)));
            return;
          }

          const rail = getRail(node);
          if (!rail?.active) return;
          const part = node.id.slice(`check:rail-a${rail.ancilla}:`.length);
          if (part === "group")
            onChange({
              ...strategy,
              rails: strategy.rails.map((r) =>
                r.ancilla === rail.ancilla
                  ? { ancilla: r.ancilla, active: false }
                  : r,
              ),
            });
          else
            update(rail.ancilla, (r) =>
              part.startsWith("open:")
                ? { ...r, openingTaps: [] }
                : {
                    ...r,
                    closingTaps: r.closingTaps.filter(
                      (t) => t.qubit !== +part.slice(6),
                    ),
                  },
            );
        },
        move(node, target, wire) {
          if (
            node.id.startsWith("fault:") ||
            node.id.startsWith("fault-group:")
          ) {
            if (target.region !== "payload" || target.boundary > 8)
              throw new Error(
                "Diagnostic overlay stays inside boundaries 0–8.",
              );
            const group = node.id.startsWith("fault-group:"),
              id = node.id.slice(group ? 12 : 6);
            onOverlay(
              overlay.flatMap((f) => {
                if (f.id !== id) return [f];
                if (group) return [{ ...f, boundary: target.boundary }];
                const remain = (f.targets || []).filter(
                  (t) => `${t.kind === "data" ? "q" : "a"}${t.index}` !== wire,
                );
                return [
                  ...(remain.length ? [{ ...f, targets: remain }] : []),
                  {
                    ...f,
                    id: remain.length ? `overlay-${crypto.randomUUID()}` : f.id,
                    boundary: target.boundary,
                    targets: [
                      {
                        kind:
                          target.wire.kind === "data"
                            ? ("data" as const)
                            : ("ancilla" as const),
                        index: target.wire.index,
                      },
                    ],
                  },
                ];
              }),
            );
            return;
          }

          const rail = getRail(node);
          if (!rail?.active || target.wire.kind !== "data")
            throw new Error(
              "Move a player check factor onto an eligible data slot.",
            );
          const part = node.id.slice(`check:rail-a${rail.ancilla}:`.length),
            opening = part.startsWith("open:"),
            field = opening ? "openingTaps" : "closingTaps",
            q = +part.split(":")[1];
          if (part === "group")
            throw new Error(
              "Move the opening/closing factors to choose their catalogue window.",
            );
          if (
            target.region !== "payload" ||
            !["payload", opening ? "open" : "close"].includes(target.stage)
          )
            throw new Error(
              "Use a matching check slot or a workload boundary.",
            );
          const start = opening ? target.boundary : rail.startBoundary,
            end = opening ? rail.endBoundary : target.boundary;
          if (!windows.some(([a, b]) => a === start && b === end))
            throw new Error("Choose one of the four allowed windows.");
          update(rail.ancilla, (r) => ({
            ...r,
            startBoundary: start,
            endBoundary: end,
            [field]: r[field].map((t) =>
              t.qubit === q ? { ...t, qubit: target.wire.index } : t,
            ),
          }));
        },
      }}
    />
  );
}
