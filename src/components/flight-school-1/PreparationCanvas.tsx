"use client";
import { useState } from "react";
import {
  BlockName,
  blockLabel,
  Circuit,
  Operation,
} from "@/lib/flight-school-1/contracts";
const palettes: { name: BlockName; label: string }[] = [
  { name: "bit_flip", label: "Bit flip · X error" },
  { name: "phase_flip", label: "Phase flip · Z error" },
  { name: "decoherence", label: "Decoherence · wait" },
];
export function PreparationCanvas({
  circuit,
  selected,
  onSelect,
  onPlace,
  onMove,
  onCombine,
  disabled,
}: {
  circuit: Circuit;
  selected: string | null;
  onSelect: (id: string) => void;
  onPlace: (n: BlockName, q: number, c: number) => void;
  onMove: (op: Operation, q: number, c: number) => void;
  onCombine: (b: boolean) => void;
  disabled: boolean;
}) {
  const [palette, setPalette] = useState<BlockName>("h"),
    [more, setMore] = useState(false),
    [columns, setColumns] = useState(8);
  const visible = Math.max(
    columns,
    Math.min(16, Math.max(0, ...circuit.operations.map((o) => o.column)) + 1),
  );
  function item(name: BlockName, label: string) {
    return (
      <button
        key={name}
        draggable={!disabled}
        disabled={disabled || (name === "cx" && circuit.qubits < 2)}
        aria-pressed={palette === name}
        onClick={() => setPalette(name)}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", `palette:${name}`);
          setPalette(name);
        }}
      >
        {label}
      </button>
    );
  }
  function drop(e: React.DragEvent, q: number, col: number) {
    e.preventDefault();
    if (disabled) return;
    const value = e.dataTransfer.getData("text/plain");
    if (value.startsWith("palette:")) {
      const name = value.slice(8) as BlockName;
      if (
        [
          ...palettes.map((p) => p.name),
          "h",
          "x",
          "y",
          "z",
          "s",
          "sdg",
          "rx",
          "ry",
          "rz",
          "cx",
        ].includes(name)
      )
        onPlace(name, q, col);
    } else if (value.startsWith("move:")) {
      const op = circuit.operations.find((o) => o.id === value.slice(5));
      if (op) onMove(op, q, col);
    }
  }
  return (
    <>
      <div className="nw-palette">
        <div>
          <span className="nw-kicker">PREPARE A STATE</span>
          <div className="nw-gates">
            {(["h", "x", "z", "s", "cx"] as BlockName[]).map((n) =>
              item(n, n.toUpperCase()),
            )}
            <button onClick={() => setMore(!more)} aria-expanded={more}>
              More gates {more ? "−" : "+"}
            </button>
            {more &&
              (["y", "sdg", "rx", "ry", "rz"] as BlockName[]).map((n) =>
                item(n, n === "sdg" ? "S†" : n.toUpperCase()),
              )}
          </div>
        </div>
        <div>
          <span className="nw-kicker">INJECT AN ERROR</span>
          <div className="nw-gates nw-error-palette">
            {palettes.map((p) => item(p.name, p.label))}
          </div>
        </div>
        <label className="nw-combine">
          <input
            type="checkbox"
            checked={circuit.combineErrors}
            disabled={disabled}
            onChange={(e) => onCombine(e.target.checked)}
          />
          {circuit.combineErrors
            ? "Combined experiment · up to 8 ordered errors"
            : "Single error · Combine Errors"}
        </label>
      </div>
      <p className="nw-canvas-help">
        Selected tool: <b>{palette.replaceAll("_", " ").toUpperCase()}</b>. Drag
        onto a wire, or activate an empty cell. Select an existing block to
        inspect it. All wires start in |0〉.
      </p>
      <div
        className="nw-canvas-scroll"
        tabIndex={0}
        aria-label="Scrollable circuit canvas"
      >
        <div className="nw-canvas" style={{ minWidth: 80 + visible * 76 }}>
          <div className="nw-column-labels">
            <span>TIME →</span>
            {Array.from({ length: visible }, (_, col) => (
              <small key={col}>{col}</small>
            ))}
          </div>
          {Array.from({ length: circuit.qubits }, (_, q) => (
            <div className="nw-wire-row" key={q}>
              <div className="nw-wire-label">
                q{q} <small>|0〉</small>
              </div>
              {Array.from({ length: visible }, (_, col) => {
                const op = circuit.operations.find(
                  (o) => o.column === col && o.qubits.includes(q),
                );
                return (
                  <div
                    className="nw-cell"
                    key={col}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => drop(e, q, col)}
                  >
                    {op ? (
                      <button
                        draggable={!disabled}
                        disabled={disabled}
                        className={`nw-block ${op.role === "error" ? "nw-error-block" : ""} ${selected === op.id ? "selected" : ""}`}
                        aria-label={`Select ${blockLabel(op)} on q${q} column ${col}`}
                        aria-pressed={selected === op.id}
                        onClick={() => onSelect(op.id)}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", `move:${op.id}`)
                        }
                      >
                        {op.name === "cx"
                          ? op.qubits[0] === q
                            ? "●"
                            : "⊕"
                          : blockLabel(op)}
                        <small>
                          {op.role === "error"
                            ? "ERROR"
                            : op.name === "cx"
                              ? `q${op.qubits[0]} → q${op.qubits[1]}`
                              : "PREP"}
                        </small>
                      </button>
                    ) : (
                      <button
                        className="nw-empty-cell"
                        disabled={disabled}
                        aria-label={`Place ${palette} on q${q} column ${col}`}
                        onClick={() => onPlace(palette, q, col)}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {circuit.operations
            .filter((o) => o.name === "cx")
            .map((o) => (
              <div
                key={o.id}
                aria-hidden="true"
                className="nw-cx-connector"
                style={{
                  left: 80 + o.column * 76 + 38,
                  top: 36 + Math.min(...o.qubits) * 72 + 35,
                  height: Math.abs(o.qubits[1] - o.qubits[0]) * 72,
                }}
              />
            ))}
        </div>
      </div>
      <div className="nw-canvas-footer">
        <span>
          {circuit.operations.length}/64 blocks ·{" "}
          {circuit.operations.filter((o) => o.role === "error").length}/
          {circuit.combineErrors ? 8 : 1} errors · no implicit waiting
        </span>
        {visible < 16 && (
          <button onClick={() => setColumns(Math.min(16, visible + 4))}>
            + Extend columns
          </button>
        )}
      </div>
    </>
  );
}
