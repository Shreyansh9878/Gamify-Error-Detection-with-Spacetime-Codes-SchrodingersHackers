"use client";
import { useEffect, useRef, useState } from "react";
import { Trash2, Lock } from "lucide-react";
import type {
  CanvasModel,
  CanvasActions,
  Tool,
  DropTarget,
  PaletteConfig,
  Node,
  Wire,
} from "@/lib/circuit-workspace/model";
type Carry = {
  tool?: Tool;
  node?: Node;
  wire?: string;
  config: PaletteConfig;
  endpoint?: boolean;
};
const initial: PaletteConfig = {
  angleRadians: Math.PI / 2,
  timeUs: 50,
  t1Us: 100,
  t2Us: 80,
  scope: "wire",
  targets: [],
  ancilla: 0,
  pauli: "X",
  sign: 1,
};
export function UnifiedCircuitCanvas({
  model,
  tools,
  actions,
  disabled = false,
  onError,
  onSelect,
}: {
  model: CanvasModel;
  tools: Tool[];
  actions: CanvasActions;
  disabled?: boolean;
  onError: (message: string) => void;
  onSelect?: (id: string) => void;
}) {
  const [config, setConfig] = useState(initial),
    [carry, setCarry] = useState<Carry | null>(null),
    [hover, setHover] = useState(""),
    [announce, setAnnounce] = useState(""),
    [ghost, setGhost] = useState<{ x: number; y: number } | null>(null),
    [pending, setPending] = useState<{
      tool: Tool;
      target: DropTarget;
      config: PaletteConfig;
    } | null>(null);
  const root = useRef<HTMLDivElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    carrying = useRef<Carry | null>(null),
    gesture = useRef<{
      x: number;
      y: number;
      time: number;
      item: Carry;
      pointer: number;
      touch: boolean;
      cancelled: boolean;
    } | null>(null),
    hold = useRef<ReturnType<typeof setTimeout> | null>(null),
    last = useRef({ x: 0, y: 0 });
  const lookup = new Map<string, DropTarget>(
    model.columns.flatMap((col) =>
      model.wires.map(
        (wire) => [`${col.key}@${wire.id}`, { ...col, wire }] as const,
      ),
    ),
  );
  function lift(item: Carry) {
    if (disabled) return;
    carrying.current = item;
    setCarry(item);
    setAnnounce(
      `Lifted ${item.tool?.label || item.node?.label || "target endpoint"}. Navigate to a slot or Delete drop target. Escape cancels.`,
    );
  }
  function cancel() {
    carrying.current = null;
    gesture.current = null;
    setCarry(null);
    setGhost(null);
    setHover("");
    if (hold.current) clearTimeout(hold.current);
  }
  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
    },
    [],
  );
  useEffect(() => {
    if (!carry) return;
    const timer = setInterval(() => {
      const el = scroll.current;
      if (!el || !gesture.current) return;
      const pane = root.current?.closest<HTMLElement>(".nw-pane");
      if (pane) {
        const b = pane.getBoundingClientRect();
        if (last.current.y > b.bottom - 40) pane.scrollTop += 16;
        else if (last.current.y < b.top + 40) pane.scrollTop -= 16;
      }
      const box = el.getBoundingClientRect(),
        x = last.current.x,
        y = last.current.y;
      if (y > box.top && y < box.bottom) {
        if (x < box.left + 35) el.scrollLeft -= 20;
        else if (x > box.right - 35) el.scrollLeft += 20;
      }
    }, 40);
    return () => clearInterval(timer);
  }, [carry]);
  function targetAt(x: number, y: number) {
    return (
      document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-canvas-target]")?.dataset.canvasTarget ||
      ""
    );
  }
  function commit(key: string, item = carrying.current) {
    if (!item || disabled) return cancel();
    try {
      if (key === "trash") {
        if (item.node) {
          if (item.node.owner !== "player")
            throw new Error(
              "This operation is locked by the method or fixture.",
            );
          actions.remove(item.node, item.wire);
          setAnnounce(`Deleted ${item.node.label}. Undo restores it.`);
          requestAnimationFrame(() =>
            root.current
              ?.querySelector<HTMLButtonElement>(".uc-trash")
              ?.focus(),
          );
        } else if (item.endpoint) {
          setPending(null);
          setAnnounce("Cancelled the unfinished controlled gate.");
        } else
          throw new Error(
            "The Dustbin removes placed items, not palette tools.",
          );
      } else {
        const target = lookup.get(key);
        if (!target) throw new Error("Drop on a circuit slot or the Dustbin.");
        if (item.endpoint && pending) {
          if (
            target.key !== pending.target.key ||
            target.wire.id === pending.target.wire.id
          )
            throw new Error(
              "Drag the second endpoint to a different wire in the same column.",
            );
          actions.place(
            pending.tool,
            pending.target,
            pending.config,
            target.wire,
          );
          setPending(null);
        } else if (item.tool?.twoWire) {
          if (!["prep", "payload"].includes(target.stage))
            throw new Error(
              "Start a two-wire gate on an editable circuit slot.",
            );
          setPending({ tool: item.tool, target, config: item.config });
          setAnnounce(
            "First endpoint staged. Drag the target endpoint handle to another wire in this column; Escape cancels.",
          );
        } else if (item.tool) actions.place(item.tool, target, item.config);
        else if (item.node) {
          if (item.node.owner !== "player")
            throw new Error("This operation is locked.");
          actions.move(item.node, target, item.wire || item.node.wires[0]);
        }
      }
    } catch (error) {
      onError((error as Error).message);
      setAnnounce((error as Error).message);
    }
    cancel();
  }
  function pointerDown(e: React.PointerEvent, item: Carry) {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const touch = e.pointerType === "touch";
    last.current = { x: e.clientX, y: e.clientY };
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      item,
      pointer: e.pointerId,
      touch,
      cancelled: false,
    };
    if (touch)
      hold.current = setTimeout(() => {
        if (gesture.current && !gesture.current.cancelled) {
          lift(item);
          setGhost({ x: e.clientX, y: e.clientY });
        }
      }, 200);
  }
  function keyboard(e: React.KeyboardEvent, item: Carry) {
    if ((e.key === " " || e.key === "Enter") && !carrying.current) {
      e.preventDefault();
      e.stopPropagation();
      lift(item);
      root.current?.querySelector<HTMLButtonElement>(".uc-slot")?.focus();
    }
  }
  function draggableProps(item: Carry) {
    return {
      onPointerDown: (e: React.PointerEvent) => pointerDown(e, item),
      onKeyDown: (e: React.KeyboardEvent) => keyboard(e, item),
    };
  }
  function onRootKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      cancel();
      setPending(null);
      setAnnounce("Drag cancelled; the physical circuit is unchanged.");
      return;
    }
    if (!carrying.current) return;
    const targets = Array.from(
        root.current?.querySelectorAll<HTMLButtonElement>(
          ".uc-slot,.uc-trash",
        ) || [],
      ),
      index = targets.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const delta =
        e.key === "ArrowLeft"
          ? -model.wires.length
          : e.key === "ArrowRight"
            ? model.wires.length
            : e.key === "ArrowUp"
              ? -1
              : 1;
      targets[
        Math.max(0, Math.min(targets.length - 1, index + delta))
      ]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      commit(
        (document.activeElement as HTMLElement)?.dataset.canvasTarget || "",
      );
    }
  }
  const width = 82 + model.columns.length * 74,
    height = 42 + model.wires.length * 66;
  return (
    <section
      ref={root}
      className={`unified-circuit ${carry ? "uc-carrying" : ""}`}
      aria-label="Unified circuit workspace"
      onKeyDown={onRootKey}
      onPointerMove={(e) => {
        last.current = { x: e.clientX, y: e.clientY };
        const g = gesture.current;
        if (!g) return;
        const distance = Math.hypot(e.clientX - g.x, e.clientY - g.y);
        if (g.touch && !carrying.current && distance > 10) {
          g.cancelled = true;
          if (hold.current) clearTimeout(hold.current);
          if (scroll.current) scroll.current.scrollLeft -= e.movementX;
          return;
        }
        if (!g.touch && !carrying.current && distance > 5) lift(g.item);
        if (carrying.current) {
          setGhost({ x: e.clientX, y: e.clientY });
          setHover(targetAt(e.clientX, e.clientY));
        }
      }}
      onPointerUp={(e) => {
        if (carrying.current) {
          // Touch focus can scroll the captured source into view on release.
          // Preserve the last hovered semantic slot only at the same release point.
          const stableTouch =
            e.pointerType === "touch" &&
            Math.hypot(last.current.x - e.clientX, last.current.y - e.clientY) <
              3;
          commit(targetAt(e.clientX, e.clientY) || (stableTouch ? hover : ""));
        } else cancel();
      }}
      onPointerCancel={cancel}
    >
      <div className="uc-palette" aria-label="Drag circuit tools">
        <p>
          <b>Drag from the palette</b>
          <span>
            Hold to drag on touch · Space to lift/drop with keyboard · Escape
            cancels
          </span>
        </p>
        <div className="uc-tools">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              disabled={disabled}
              className={`uc-draggable ${tool.kind === "noise" ? "uc-error" : ""} ${tool.name === "t" || tool.name === "tdg" ? "al-t-gate" : ""}`}
              aria-label={`Drag ${tool.label}`}
              {...draggableProps({
                tool,
                config: { ...config, targets: [...config.targets] },
              })}
            >
              {tool.label}
            </button>
          ))}
          {pending && (
            <button
              type="button"
              className="uc-draggable uc-endpoint"
              aria-label="Drag controlled gate target endpoint"
              {...draggableProps({ endpoint: true, config: pending.config })}
            >
              ● Drag target for {pending.tool.label} at {pending.target.label}
            </button>
          )}
        </div>
        {tools.some(
          (t) =>
            t.kind === "noise" || ["rx", "ry", "rz"].includes(t.name || ""),
        ) && (
          <details className="uc-palette-settings">
            <summary>
              Palette parameters & noise scope · configure before dragging
            </summary>
            <div className="nw-inspector-fields">
              {tools.some((t) => ["rx", "ry", "rz"].includes(t.name || "")) && (
                <>
                  <label>
                    Rotation angle (rad)
                    <input
                      aria-label="Palette rotation angle"
                      type="number"
                      step="any"
                      min={-2 * Math.PI}
                      max={2 * Math.PI}
                      value={config.angleRadians}
                      onChange={(e) =>
                        setConfig({ ...config, angleRadians: +e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              {tools.some((t) => ["P", "Pprime", "check"].includes(t.id)) && (
                <>
                  <label>
                    Pauli for P / P′
                    <select
                      aria-label="Palette check Pauli"
                      value={config.pauli}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          pauli: e.target.value as "X" | "Y" | "Z",
                        })
                      }
                    >
                      <option>X</option>
                      <option>Y</option>
                      <option>Z</option>
                    </select>
                  </label>
                  <label>
                    Closing sign
                    <select
                      aria-label="Palette closing sign"
                      value={config.sign}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sign: +e.target.value as 1 | -1,
                        })
                      }
                    >
                      <option value="1">+ no compensation</option>
                      <option value="-1">− add ancilla Z</option>
                    </select>
                  </label>
                  <label>
                    Check rail
                    <select
                      aria-label="Palette check rail"
                      value={config.ancilla}
                      onChange={(e) =>
                        setConfig({ ...config, ancilla: +e.target.value })
                      }
                    >
                      <option value="0">a0</option>
                      <option value="1">a1</option>
                    </select>
                  </label>
                </>
              )}
              {tools.some((t) => t.kind === "noise") && (
                <>
                  <label>
                    Wait scope
                    <select
                      aria-label="Decoherence scope"
                      value={config.scope}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          scope: e.target.value as PaletteConfig["scope"],
                        })
                      }
                    >
                      <option value="wire">Dropped wire</option>
                      <option value="selected">Selected wires</option>
                      <option value="all">All eligible wires</option>
                    </select>
                  </label>
                  <label>
                    Elapsed t · {config.timeUs} μs
                    <input
                      aria-label="Palette elapsed waiting time"
                      type="range"
                      min="0"
                      max="200"
                      value={config.timeUs}
                      onChange={(e) =>
                        setConfig({ ...config, timeUs: +e.target.value })
                      }
                    />
                  </label>
                  <label>
                    T1 μs
                    <input
                      aria-label="Palette T1"
                      type="number"
                      min="20"
                      max="200"
                      value={config.t1Us}
                      onChange={(e) =>
                        setConfig({ ...config, t1Us: +e.target.value })
                      }
                    />
                  </label>
                  <label>
                    T2 μs
                    <input
                      aria-label="Palette T2"
                      type="number"
                      min=".01"
                      max="400"
                      step="any"
                      value={config.t2Us}
                      onChange={(e) =>
                        setConfig({ ...config, t2Us: +e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            {tools.some((t) => t.kind === "noise") &&
              config.scope === "selected" && (
                <fieldset>
                  <legend>Independent wait targets</legend>
                  {model.wires.map((w) => (
                    <label key={w.id}>
                      <input
                        type="checkbox"
                        checked={config.targets.includes(w.id)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            targets: e.target.checked
                              ? [...config.targets, w.id]
                              : config.targets.filter((id) => id !== w.id),
                          })
                        }
                      />
                      {w.label}
                    </label>
                  ))}
                </fieldset>
              )}
          </details>
        )}
      </div>
      {model.legendNote && <p className="uc-legend-note">{model.legendNote}</p>}
      <div
        className="uc-scroll"
        ref={scroll}
        tabIndex={0}
        aria-label="Continuous circuit timeline"
      >
        <div className="uc-grid" style={{ width, height }}>
          <div className="uc-ruler">
            <span>WIRE / TIME →</span>
            {model.columns.map((c) => (
              <small key={c.key} aria-hidden="true" />
            ))}
          </div>
          {model.wires.map((w, q) => (
            <div
              className="uc-wire-line"
              key={w.id}
              style={{ top: 42 + q * 66, width }}
            >
              <span className="uc-wire-label">
                {w.label}
                {model.groups
                  ?.filter((g) => g.wire === w.id)
                  .map((g) => (
                    <button
                      key={g.id}
                      className="uc-draggable uc-group"
                      disabled={disabled || g.owner !== "player"}
                      aria-label={`Drag ${g.label} group`}
                      {...draggableProps({
                        node: {
                          id: g.id,
                          label: g.label,
                          wires: [w.id],
                          column: "",
                          owner: g.owner,
                          kind: "check",
                        },
                        config,
                      })}
                    >
                      ⠿
                    </button>
                  ))}
              </span>
            </div>
          ))}
          <div
            className="uc-cells"
            style={{
              left: 82,
              gridTemplateColumns: `repeat(${model.columns.length},74px)`,
            }}
          >
            {model.columns.map((col) => (
              <div key={col.key} className="uc-column">
                {model.wires.map((w) => {
                  const key = `${col.key}@${w.id}`,
                    nodes = model.nodes.filter(
                      (n) => n.column === col.key && n.wires.includes(w.id),
                    ),
                    isPending =
                      pending?.target.key === col.key &&
                      pending.target.wire.id === w.id;
                  return (
                    <div
                      key={w.id}
                      className={`uc-cell ${hover === key ? "uc-drop-hover" : ""}`}
                    >
                      <button
                        type="button"
                        className="uc-slot"
                        data-canvas-target={key}
                        aria-label={`Drop on ${w.label} ${col.label}`}
                        onFocus={() => {
                          if (carrying.current) setHover(key);
                        }}
                        disabled={disabled}
                        tabIndex={carry ? 0 : -1}
                      >
                        {isPending ? "● pending" : "·"}
                      </button>
                      {nodes.map((node, nodeIndex) => (
                        <button
                          type="button"
                          key={`${node.id}-${w.id}`}
                          style={
                            nodes.length > 1
                              ? {
                                  top: 8 + nodeIndex * (50 / nodes.length),
                                  fontSize: nodes.length > 3 ? 8 : 10,
                                  height: 50 / nodes.length - 1,
                                }
                              : undefined
                          }
                          className={`uc-node ${node.owner !== "player" ? "uc-locked" : "uc-draggable"} ${node.kind === "noise" ? "uc-error" : ""} ${node.tone ? `uc-node-${node.tone}` : ""} ${node.name === "t" || node.name === "tdg" ? "al-t-gate" : ""}`}
                          disabled={disabled}
                          aria-label={`${node.owner !== "player" ? "Locked" : "Drag"} ${node.label} on ${w.label} ${col.label}`}
                          title={node.detail || node.label}
                          {...(node.owner === "player"
                            ? draggableProps({ node, wire: w.id, config })
                            : {})}
                          onFocus={() => onSelect?.(node.id)}
                        >
                          {node.wires.length === 2 &&
                          ["cx", "cy", "cz"].includes(node.name || "")
                            ? node.wires[0] === w.id
                              ? "●"
                              : node.name === "cx"
                                ? "⊕"
                                : node.name?.slice(1).toUpperCase()
                            : node.wires.length > 1 && node.wires[0] !== w.id
                              ? node.kind === "noise"
                                ? node.label
                                : node.name === "cx"
                                  ? "⊕"
                                  : node.label
                              : node.label}
                          {node.owner !== "player" && <Lock size={10} />}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <svg
            className="uc-connector-layer"
            width={width}
            height={height}
            aria-label="Live check connectors"
          >
            {model.nodes
              .filter((n) => n.wires.length > 1 && n.kind !== "noise")
              .map((n) => {
                const c = model.columns.findIndex((c) => c.key === n.column),
                  ys = n.wires.map((id) =>
                    model.wires.findIndex((w) => w.id === id),
                  );
                return (
                  <line
                    key={n.id}
                    x1={82 + c * 74 + 37}
                    x2={82 + c * 74 + 37}
                    y1={75 + Math.min(...ys) * 66}
                    y2={75 + Math.max(...ys) * 66}
                    stroke="#7de0c6"
                    strokeWidth="2"
                  />
                );
              })}
            {model.checks?.map((c) => {
              const a = model.columns.findIndex((v) => v.key === c.opening),
                b = model.columns.findIndex((v) => v.key === c.closing),
                row = model.wires.findIndex((w) => w.id === c.ancilla);
              if (a < 0 || b < 0 || row < 0) return null;
              return (
                <g key={c.id}>
                  <title>{c.message}</title>
                  <path
                    d={`M${82 + a * 74 + 37} ${75 + row * 66} V${52 + row * 66} H${82 + b * 74 + 37} V${75 + row * 66}`}
                    fill="none"
                    stroke={
                      c.valid === null
                        ? "#e7be78"
                        : c.valid
                          ? "#8ae6bd"
                          : "#fb8f99"
                    }
                    strokeWidth="3"
                    strokeDasharray={c.valid === null ? "5 4" : undefined}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <footer className="uc-boundary">
        <span>
          {pending
            ? "Controlled gate unfinished — drag its target handle or Escape to cancel."
            : "A click never places a gate. Drag an operation or use supported source."}
        </span>
        <button
          type="button"
          className={`uc-trash ${hover === "trash" ? "uc-drop-hover" : ""}`}
          data-canvas-target="trash"
          aria-label="Delete — drop here"
          onFocus={() => {
            if (carrying.current) setHover("trash");
          }}
        >
          <Trash2 size={22} /> Delete — drop here
        </button>
      </footer>
      {model.checks?.map((c) => (
        <p
          key={c.id}
          className={
            c.valid === null
              ? "uc-incomplete"
              : c.valid
                ? "uc-valid"
                : "uc-invalid"
          }
        >
          {c.valid === null ? "◌" : c.valid ? "✓" : "✕"} {c.message}
        </p>
      ))}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {ghost && carry && (
        <div
          className="uc-drag-ghost"
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          {carry.tool?.label || carry.node?.label || "Target endpoint"}
        </div>
      )}
    </section>
  );
}
