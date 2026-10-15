"use client";
import type {
  AdvancedDraft,
  AdvancedValidation,
  Fault,
  Check,
} from "@/lib/advanced-learning/contracts";
import { emptyCheck } from "@/lib/advanced-learning/contracts";
import {
  checkModel,
  gateTools,
  noiseTools,
  checkTools,
  noiseTargets,
} from "@/lib/circuit-workspace/adapters";
import type {
  CanvasActions,
  DropTarget,
  Node,
} from "@/lib/circuit-workspace/model";
import { UnifiedCircuitCanvas } from "./UnifiedCircuitCanvas";
export function CheckCanvas({
  draft,
  validation,
  onChange,
  onError,
  disabled,
  lesson,
}: {
  draft: AdvancedDraft;
  validation: AdvancedValidation | null;
  onChange: (d: AdvancedDraft) => boolean | void;
  onError: (s: string) => void;
  disabled: boolean;
  lesson: 3 | 4 | 5;
}) {
  const model = checkModel(draft, validation);
  if (lesson === 5)
    for (const node of model.nodes) {
      if (node.name !== "t" && node.name !== "tdg") continue;
      const column = model.columns.find((c) => c.key === node.column)?.boundary;
      const steps =
        validation?.checks
          .flatMap((c) => c.steps)
          .filter((s) => s.column === column && s.tCompatible != null) || [];
      if (steps.length) {
        node.tone = steps.some((s) => !s.tCompatible) ? "invalid" : "valid";
        node.detail = steps.map((s) => `${s.label}: ${s.operator}`).join("; ");
      }
    }

  if (lesson === 5 && draft.mode === "guided")
    for (const node of model.nodes)
      if (node.id.startsWith("gate:")) node.owner = "player";
  const tools = [
    ...(draft.mode === "guided" && lesson !== 5
      ? []
      : gateTools(true, lesson === 5).filter(
          (t) => lesson !== 3 || t.name !== "swap",
        )),
    ...checkTools.filter(
      (t) => t.id !== "check" || draft.mode !== "guided" || lesson === 5,
    ),
    ...noiseTools,
    ...(lesson >= 3
      ? [
          {
            id: "pauli_y",
            name: "pauli_y",
            label: "Y error",
            kind: "noise" as const,
          },
        ]
      : []),
  ];
  const commit = (d: AdvancedDraft) => onChange(d);
  function updateCheck(id: string, fn: (c: Check) => Check) {
    commit({
      ...draft,
      checks: draft.checks.map((c) => (c.id === id ? fn(c) : c)),
    });
  }
  function checkFor(target: DropTarget) {
    const c = draft.checks.find((c) => c.id === target.checkId);
    if (!c)
      throw new Error("Drop this stage into an existing check's labeled slot.");
    return c;
  }
  function remove(node: Node, wire?: string) {
    if (node.id.startsWith("fault-group:")) {
      commit({
        ...draft,
        faults: draft.faults.filter((f) => f.id !== node.id.slice(12)),
      });
      return;
    }
    if (node.id.startsWith("gate:")) {
      const region = node.id.startsWith("gate:preparation:")
          ? "preparation"
          : "payload",
        id = node.id.slice(`gate:${region}:`.length);
      commit({ ...draft, [region]: draft[region].filter((g) => g.id !== id) });
      return;
    }
    if (node.id.startsWith("fault:")) {
      const id = node.id.slice(6);
      const faults = draft.faults.flatMap((f) => {
        if (f.id !== id) return [f];
        const targets = f.targets || [
          { kind: "data" as const, index: f.qubit },
        ];
        const remain = targets.filter(
          (t) => `${t.kind === "ancilla" ? "a" : "q"}${t.index}` !== wire,
        );
        return remain.length ? [{ ...f, targets: remain }] : [];
      });
      commit({ ...draft, faults });
      return;
    }
    if (node.id.startsWith("check:")) {
      const c = draft.checks.find((c) => node.id.startsWith(`check:${c.id}:`));
      if (!c) return;
      const part = node.id.slice(`check:${c.id}:`.length);
      if (part === "group") {
        commit({
          ...draft,
          checks:
            draft.mode === "guided"
              ? draft.checks.map((v) =>
                  v.id === c.id
                    ? {
                        ...v,
                        openingHadamard: false,
                        openingTaps: [],
                        closingTaps: [],
                        closingHadamard: false,
                        measure: false,
                        closingSign: 1,
                      }
                    : v,
                )
              : draft.checks.filter((v) => v.id !== c.id),
        });
        return;
      }
      updateCheck(c.id, (prev) =>
        part.startsWith("open:")
          ? {
              ...prev,
              openingTaps: prev.openingTaps.filter(
                (t) => t.qubit !== +part.slice(5),
              ),
            }
          : part.startsWith("close:")
            ? {
                ...prev,
                closingTaps: prev.closingTaps.filter(
                  (t) => t.qubit !== +part.slice(6),
                ),
              }
            : {
                ...prev,
                [{
                  openH: "openingHadamard",
                  finalH: "closingHadamard",
                  measure: "measure",
                }[part] || part]: false,
              },
      );
    }
  }
  const actions: CanvasActions = {
    remove,
    place(tool, target, config, secondWire) {
      if (tool.kind === "gate") {
        if (draft.mode === "guided" && lesson !== 5)
          throw new Error("The guided payload is locked.");
        if (
          target.wire.kind !== "data" ||
          !["prep", "payload"].includes(target.stage)
        )
          throw new Error("Drop a gate on a preparation or payload data slot.");
        const region = target.region;
        commit({
          ...draft,
          [region]: [
            ...draft[region],
            {
              id: `gate-${crypto.randomUUID()}`,
              role: "prepare",
              name: tool.name,
              qubits: secondWire
                ? [target.wire.index, secondWire.index]
                : [target.wire.index],
              column: target.boundary,
            },
          ],
        });
        return;
      }
      if (tool.kind === "noise") {
        if (target.region !== "payload")
          throw new Error("Drop the error at a payload boundary.");
        const selected =
          tool.name === "decoherence"
            ? noiseTargets(
                config,
                target,
                model.wires.filter(
                  (w) =>
                    w.kind === "data" ||
                    draft.checks.some(
                      (c) =>
                        c.ancilla === w.index &&
                        target.boundary <= c.endBoundary,
                    ),
                ),
              )
            : [target.wire];
        const targets = selected.map((w) => ({
          kind: w.kind === "ancilla" ? ("ancilla" as const) : ("data" as const),
          index: w.index,
        }));
        const f: Fault = {
          id: `fault-${crypto.randomUUID()}`,
          name: tool.name as Fault["name"],
          qubit: selected.find((w) => w.kind === "data")?.index || 0,
          boundary: target.boundary,
          order:
            Math.max(
              -1,
              ...draft.faults
                .filter((f) => f.boundary === target.boundary)
                .map((f) => f.order),
            ) + 1,
          targets,
          ...(tool.name === "decoherence"
            ? { timeUs: config.timeUs, t1Us: config.t1Us, t2Us: config.t2Us }
            : {}),
        };
        commit({
          ...draft,
          combineFaults: draft.faults.length > 0 || draft.combineFaults,
          faults: [...draft.faults, f],
        });
        return;
      }
      if (tool.kind === "check") {
        if (draft.mode === "guided" && lesson !== 5)
          throw new Error("The guided helper is fixed.");
        const anc =
          target.wire.kind === "ancilla" ? target.wire.index : config.ancilla;
        if (draft.checks.some((c) => c.ancilla === anc))
          throw new Error(
            "This rail already owns a check. Drag its nodes to edit it.",
          );
        if (target.region !== "payload" || target.boundary > 14)
          throw new Error(
            "Start a check at an eligible payload boundary before 15.",
          );
        commit({
          ...draft,
          checks: [
            ...draft.checks,
            {
              ...emptyCheck(`check-${crypto.randomUUID()}`, anc),
              startBoundary: target.boundary,
              endBoundary: target.boundary + 2,
            },
          ],
        });
        return;
      }
      const c = checkFor(target);
      if (tool.stage === "open" || tool.stage === "close") {
        if (target.stage !== tool.stage || target.wire.kind !== "data")
          throw new Error(
            "Drop P on an opening data slot or P′ on a closing data slot.",
          );
        const field = tool.stage === "open" ? "openingTaps" : "closingTaps";
        if (c[field].some((t) => t.qubit === target.wire.index))
          throw new Error(
            "A factor is already here. Trash or move it before replacing it.",
          );
        updateCheck(c.id, (prev) => ({
          ...prev,
          [field]: [
            ...prev[field],
            { qubit: target.wire.index, pauli: config.pauli },
          ].sort((a, b) => a.qubit - b.qubit),
          ...(field === "closingTaps" ? { closingSign: config.sign } : {}),
        }));
      } else {
        if (
          target.wire.kind !== "ancilla" ||
          target.wire.index !== c.ancilla ||
          target.stage !== tool.stage
        )
          throw new Error(
            "Drop this ancilla stage on its matching H or M slot.",
          );
        updateCheck(c.id, (prev) => ({
          ...prev,
          [tool.stage === "openH"
            ? "openingHadamard"
            : tool.stage === "finalH"
              ? "closingHadamard"
              : "measure"]: true,
        }));
      }
    },
    move(node, target, wire) {
      if (node.id.startsWith("fault-group:")) {
        if (target.region !== "payload")
          throw new Error("Move a wait group within the payload timeline.");
        commit({
          ...draft,
          faults: draft.faults.map((f) =>
            f.id === node.id.slice(12)
              ? { ...f, boundary: target.boundary }
              : f,
          ),
        });
        return;
      }
      if (node.id.startsWith("gate:")) {
        const region = node.id.startsWith("gate:preparation:")
            ? "preparation"
            : "payload",
          id = node.id.slice(`gate:${region}:`.length);
        if (
          target.region !== region ||
          target.wire.kind !== "data" ||
          !["prep", "payload"].includes(target.stage)
        )
          throw new Error(
            "Move this gate within its original region, on a data wire.",
          );
        commit({
          ...draft,
          [region]: draft[region].map((g) =>
            g.id === id
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
        return;
      }
      if (node.id.startsWith("fault:")) {
        if (target.region !== "payload")
          throw new Error("Faults stay at payload boundaries.");
        const id = node.id.slice(6),
          faults = draft.faults.flatMap((f) => {
            if (f.id !== id) return [f];
            const targets = f.targets || [
                { kind: "data" as const, index: f.qubit },
              ],
              remain = targets.filter(
                (t) => `${t.kind === "ancilla" ? "a" : "q"}${t.index}` !== wire,
              ),
              next = {
                ...f,
                id: remain.length ? `fault-${crypto.randomUUID()}` : f.id,
                boundary: target.boundary,
                order:
                  Math.max(
                    -1,
                    ...draft.faults
                      .filter(
                        (v) => v.boundary === target.boundary && v.id !== id,
                      )
                      .map((v) => v.order),
                  ) + 1,
                targets: [
                  {
                    kind:
                      target.wire.kind === "ancilla"
                        ? ("ancilla" as const)
                        : ("data" as const),
                    index: target.wire.index,
                  },
                ],
              };
            return [
              ...(remain.length ? [{ ...f, targets: remain }] : []),
              next,
            ];
          });
        commit({
          ...draft,
          combineFaults: faults.length > 1 || draft.combineFaults,
          faults,
        });
        return;
      }
      const c = draft.checks.find((c) => node.id.startsWith(`check:${c.id}:`));
      if (!c) return;
      const part = node.id.slice(`check:${c.id}:`.length);
      if (part === "group") {
        if (target.region !== "payload")
          throw new Error("Move the loop on the payload timeline.");
        updateCheck(c.id, (prev) => ({
          ...prev,
          startBoundary: target.boundary,
          endBoundary: target.boundary + prev.endBoundary - prev.startBoundary,
        }));
        return;
      }
      if (part.startsWith("open:") || part.startsWith("close:")) {
        if (target.wire.kind !== "data")
          throw new Error("A Pauli factor targets a data wire.");
        const opening = part.startsWith("open:"),
          field = opening ? "openingTaps" : "closingTaps",
          old = +part.split(":")[1];
        if (
          target.region !== "payload" ||
          !["payload", opening ? "open" : "close"].includes(target.stage) ||
          (target.checkId && target.checkId !== c.id)
        )
          throw new Error(
            "Move a factor within its own opening/closing data slots or payload boundary.",
          );
        updateCheck(c.id, (prev) => ({
          ...prev,
          [field]: prev[field].map((t) =>
            t.qubit === old ? { ...t, qubit: target.wire.index } : t,
          ),
          ...(target.stage === "payload"
            ? { [opening ? "startBoundary" : "endBoundary"]: target.boundary }
            : {}),
        }));
        return;
      }
      throw new Error(
        "H/M positions follow their check window. Trash and re-drag a stage to rebuild it.",
      );
    },
  };
  return (
    <UnifiedCircuitCanvas
      model={model}
      tools={tools}
      actions={actions}
      onError={onError}
      disabled={disabled}
    />
  );
}
