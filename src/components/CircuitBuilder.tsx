"use client";
import { useState } from "react";
import { Plus, Trash2, Undo2 } from "lucide-react";
import type { Gate, GateName, Check, Level } from "@/lib/types";
export function CircuitBuilder({
  level: l,
  gates,
  checks,
  onChange,
  onChecks,
  disabled,
}: {
  level: Level;
  gates: Gate[];
  checks: Check[];
  onChange: (g: Gate[]) => void;
  onChecks: (c: Check[]) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<GateName>(l.allowed[0]),
    [control, setControl] = useState<{ q: number; c: number } | null>(null),
    [message, setMessage] = useState(""),
    [history, setHistory] = useState<Gate[][]>([]);
  function change(next: Gate[]) {
    setHistory((h) => [...h.slice(-19), gates]);
    onChange(next);
    setControl(null);
  }
  function place(q: number, c: number, name = selected) {
    if (disabled || l.fixed) return;
    setMessage("");
    const existing = gates.find((g) => g.column === c && g.qubits.includes(q));
    if (existing) {
      change(gates.filter((g) => g.id !== existing.id));
      return;
    }
    if (gates.length >= l.gateBudget) {
      setMessage("Gate budget reached. Remove a gate first.");
      return;
    }
    const two = name === "cx" || name === "cz";
    if (two && (!control || control.c !== c)) {
      setControl({ q, c });
      setSelected(name);
      setMessage("Now choose the other qubit in the same column.");
      return;
    }
    const qubits = two ? [control!.q, q] : [q];
    if (new Set(qubits).size !== qubits.length) return;
    change([
      ...gates,
      { id: crypto.randomUUID(), name, qubits, column: c, quarterTurns: 1 },
    ]);
  }
  function update(i: number, patch: Partial<Check>) {
    onChecks(checks.map((c, j) => (i === j ? { ...c, ...patch } : c)));
  }
  return (
    <article className="panel builder">
      <div className="panel-title">
        <h2>Circuit studio</h2>
        <span className="chip">
          {gates.length}/{l.gateBudget} payload gates
        </span>
      </div>
      <p className="muted">
        {l.fixed
          ? "Reference payload is fixed. Design the checks below."
          : "Choose a gate, then click a wire cell. Click a placed gate to remove it. For CX/CZ, select control then target in the same column. Dragging is optional."}
      </p>
      <div className="gate-palette">
        {l.allowed.map((name) => (
          <button
            title={
              name === "h"
                ? "Hadamard: create or undo superposition"
                : name === "cx"
                  ? "Controlled X: first wire controls the second"
                  : `${name.toUpperCase()} gate`
            }
            className={selected === name ? "selected" : ""}
            disabled={disabled || l.fixed}
            draggable={!disabled && !l.fixed}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", name);
              setSelected(name);
              setControl(null);
            }}
            onClick={() => {
              setSelected(name);
              setControl(null);
            }}
            key={name}
          >
            {name.toUpperCase()}
          </button>
        ))}
        <button
          aria-label="Undo circuit edit"
          disabled={disabled || !history.length}
          onClick={() => {
            onChange(history[history.length - 1]);
            setHistory((h) => h.slice(0, -1));
            setControl(null);
          }}
        >
          <Undo2 size={17} />
        </button>
        <button
          aria-label="Clear circuit"
          disabled={disabled || l.fixed || !gates.length}
          onClick={() => change([])}
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div className="circuit-scroll">
        <div
          className="circuit"
          style={{
            gridTemplateColumns: `48px repeat(${l.slots}, minmax(48px,1fr))`,
          }}
        >
          <span />
          {gates
            .filter((g) => g.qubits.length === 2)
            .map((g) => (
              <div
                aria-hidden="true"
                className="gate-bridge"
                key={`bridge-${g.id}`}
                style={{
                  left: `calc(58px + (100% - 68px) / ${l.slots} * ${g.column + 0.5})`,
                  top: 37 + Math.min(...g.qubits) * 56 + 28,
                  height: Math.abs(g.qubits[0] - g.qubits[1]) * 56,
                }}
              />
            ))}
          {Array.from({ length: l.slots }, (_, c) => (
            <small className="column-label" key={c}>
              t{c}
            </small>
          ))}
          {Array.from({ length: l.qubits }, (_, q) => (
            <div className="wire-row" key={q}>
              <code>
                q{q} <small>|0〉</small>
              </code>
              {Array.from({ length: l.slots }, (_, c) => {
                const gate = gates.find(
                  (g) => g.column === c && g.qubits.includes(q),
                );
                return (
                  <button
                    key={c}
                    disabled={disabled || l.fixed}
                    className={`wire-cell ${gate ? "occupied" : ""} ${control?.q === q && control.c === c ? "pending" : ""}`}
                    aria-label={`q${q} time ${c}${gate ? ` ${gate.name} ${gate.qubits.join(" to ")}` : ""}`}
                    onClick={() => place(q, c)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const name = e.dataTransfer.getData(
                        "text/plain",
                      ) as GateName;
                      if (l.allowed.includes(name)) place(q, c, name);
                    }}
                  >
                    {gate ? (
                      <span>
                        {gate.qubits.length === 2
                          ? gate.qubits[0] === q
                            ? "●"
                            : gate.name === "cx"
                              ? "⊕"
                              : "Z"
                          : gate.name.toUpperCase()}
                      </span>
                    ) : control?.q === q && control.c === c ? (
                      <span>●</span>
                    ) : (
                      <i />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p role="status" className="muted">
        {message ||
          "Time flows left → right. Every column includes idle exposure."}
      </p>
      {gates
        .filter((g) => g.name === "rz")
        .map((g) => (
          <label className="inline-label" key={g.id}>
            RZ on q{g.qubits[0]} at t{g.column}
            <select
              disabled={disabled}
              value={g.quarterTurns ?? 1}
              onChange={(e) =>
                change(
                  gates.map((x) =>
                    x.id === g.id ? { ...x, quarterTurns: +e.target.value } : x,
                  ),
                )
              }
            >
              {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
                <option key={v} value={v}>
                  {v} × π/2
                </option>
              ))}
            </select>
          </label>
        ))}
      <div className="panel-title">
        <h3>Spacetime checks</h3>
        <button
          disabled={disabled || checks.length >= l.checkBudget}
          onClick={() =>
            onChecks([
              ...checks,
              { qubit: 0, pauli: "Z", start: l.id >= 8 ? 3 : 0, end: l.slots },
            ])
          }
        >
          <Plus size={15} /> Add helper
        </button>
      </div>
      <p className="muted">
        {l.checkBudget
          ? `Up to ${l.checkBudget} helpers · at least ${l.minChecks} required. Boundaries surround time columns. Closing checks are computed by Qiskit.`
          : "This mission focuses on state preparation. Helpers arrive in later missions."}
      </p>
      {checks.map((check, i) => (
        <fieldset className="check-row" key={i} disabled={disabled}>
          <legend>Helper {i + 1}</legend>
          <label>
            Data wire
            <select
              value={check.qubit}
              onChange={(e) => update(i, { qubit: +e.target.value })}
            >
              {Array.from({ length: l.qubits }, (_, q) => (
                <option key={q} value={q}>
                  q{q}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pauli
            <select
              value={check.pauli}
              onChange={(e) =>
                update(i, { pauli: e.target.value as Check["pauli"] })
              }
            >
              {["X", "Y", "Z"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Start
            <select
              value={check.start}
              onChange={(e) => update(i, { start: +e.target.value })}
            >
              {Array.from({ length: check.end }, (_, v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            End
            <select
              value={check.end}
              onChange={(e) => update(i, { end: +e.target.value })}
            >
              {Array.from(
                { length: l.slots - check.start },
                (_, v) => v + check.start + 1,
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button
            aria-label={`Remove helper ${i + 1}`}
            onClick={() => onChecks(checks.filter((_, j) => i !== j))}
          >
            <Trash2 size={16} />
          </button>
        </fieldset>
      ))}
    </article>
  );
}
