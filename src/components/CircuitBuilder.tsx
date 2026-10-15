"use client";
import { useState } from "react";
import { LockKeyhole, Plus, Trash2, ShieldCheck } from "lucide-react";
import type { Check, CheckPreview, FaultResult, Level } from "@/lib/types";

type Pauli = Check["pauli"];
export function CircuitBuilder({
  level: l,
  checks,
  onChecks,
  disabled,
  preview,
  validating,
  onFault,
  fault,
}: {
  level: Level;
  checks: Check[];
  onChecks: (checks: Check[]) => void;
  disabled: boolean;
  preview: CheckPreview | null;
  validating: boolean;
  onFault: (qubit: number, column: number, pauli: Pauli) => void;
  fault: FaultResult | null;
}) {
  const [tool, setTool] = useState<"open" | "close" | "fault">("open"),
    [active, setActive] = useState(0),
    [faultPauli, setFaultPauli] = useState<Pauli>("X");
  const manual = l.checkMode === "manual";
  const activeIndex = Math.min(active, Math.max(0, checks.length - 1));
  function update(index: number, patch: Partial<Check>) {
    onChecks(checks.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function add() {
    onChecks([
      ...checks,
      {
        qubit: 0,
        pauli: "Z",
        start: l.defaultStart,
        end: l.slots,
        ...(manual ? { closingQubit: 0, closingPauli: "Z" as const } : {}),
      },
    ]);
    setActive(checks.length);
  }
  function anchor(q: number, b: number) {
    if (!checks.length) return;
    const c = checks[activeIndex];
    if (tool === "open" && b < l.slots)
      update(activeIndex, { qubit: q, start: b, end: Math.max(c.end, b + 1) });
    if (tool === "close" && b > 0)
      update(activeIndex, {
        end: b,
        start: Math.min(c.start, b - 1),
        ...(manual
          ? {
              closingQubit: q,
              closingPauli: c.closingPauli || "Z",
              closingOperators: undefined,
            }
          : {}),
      });
  }
  function single(index: number, c: Check, patch: Partial<Check>) {
    update(index, {
      closingQubit: c.closingQubit ?? 0,
      closingPauli: c.closingPauli ?? "Z",
      closingOperators: undefined,
      ...patch,
    });
  }
  return (
    <article className="panel builder qed-builder">
      <div className="panel-title">
        <h2>
          <LockKeyhole size={19} /> Authoritative payload U
        </h2>
        <span className="chip">READ ONLY</span>
      </div>
      <p className="muted">
        The workload is fixed. Design protection around it. {l.qubits} data
        qubits · {l.slots} time columns · {l.target.length} payload gates.
      </p>
      <div className="circuit-scroll">
        <div
          className="circuit locked-circuit"
          style={{
            gridTemplateColumns: `48px repeat(${l.slots}, minmax(48px,1fr))`,
          }}
        >
          <span />
          {l.target
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
                const g = l.target.find(
                  (g) => g.column === c && g.qubits.includes(q),
                );
                const crossings =
                  preview?.checks
                    .flatMap((p) => p.tCrossings || [])
                    .filter((x) => x.qubit === q && x.column === c) || [];
                const tState = crossings.some((x) => !x.valid)
                  ? "barrier"
                  : crossings.length
                    ? "commutes"
                    : "";
                const injected =
                  fault?.faultQubit === q && fault.faultColumn === c;
                return (
                  <div
                    key={c}
                    className={`wire-cell payload-cell ${g ? "occupied" : ""} ${g?.name === "t" ? `t-gate ${tState}` : ""} ${injected ? "fault-location" : ""}`}
                    role={tool === "fault" ? "group" : "img"}
                    aria-label={`Locked q${q} time ${c}: ${g ? g.name.toUpperCase() : "idle"}${g?.name === "t" && tState ? `, ${tState}` : ""}`}
                    title={
                      g?.name === "t"
                        ? `${tState === "barrier" ? "Non-Pauli crossing" : tState === "commutes" ? "Propagated I/Z commutes with T" : "T gate: inspect a crossing check"}`
                        : "Fixed payload; place a check using boundary pins below"
                    }
                  >
                    {g ? (
                      <span>
                        {g.qubits.length === 2
                          ? g.qubits[0] === q
                            ? "●"
                            : g.name === "cx"
                              ? "⊕"
                              : "Z"
                          : g.name.toUpperCase()}
                      </span>
                    ) : (
                      <i />
                    )}
                    {tool === "fault" && (
                      <button
                        className="fault-pin"
                        disabled={disabled}
                        aria-label={`Inject ${faultPauli} after q${q} column ${c}`}
                        onClick={() => onFault(q, c, faultPauli)}
                      >
                        ⚡
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="designer-toolbar" aria-label="Placement tools">
        {(["open", "close", "fault"] as const).map((t) => (
          <button
            key={t}
            className={tool === t ? "selected" : ""}
            disabled={disabled}
            aria-pressed={tool === t}
            onClick={() => setTool(t)}
          >
            {t === "open"
              ? "Opening anchor"
              : t === "close"
                ? "Closing anchor"
                : "Inject Test Fault"}
          </button>
        ))}
        {tool === "fault" && (
          <label>
            Test error
            <select
              aria-label="Test fault Pauli"
              value={faultPauli}
              onChange={(e) => setFaultPauli(e.target.value as Pauli)}
            >
              {["X", "Y", "Z"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {tool !== "fault" && (
        <div className="anchor-scroll">
          <div
            className="anchor-grid"
            style={{
              gridTemplateColumns: `40px repeat(${l.slots + 1},minmax(34px,1fr))`,
            }}
          >
            <small />{" "}
            {Array.from({ length: l.slots + 1 }, (_, b) => (
              <small key={b}>b{b}</small>
            ))}
            {Array.from({ length: l.qubits }, (_, q) => (
              <div className="wire-row" key={q}>
                <code>q{q}</code>
                {Array.from({ length: l.slots + 1 }, (_, b) => (
                  <button
                    key={b}
                    className="anchor-pin"
                    disabled={
                      disabled ||
                      !checks.length ||
                      (tool === "open" ? b === l.slots : b === 0)
                    }
                    aria-label={`Place ${tool === "open" ? "opening" : "closing"} anchor on q${q} boundary ${b}`}
                    onClick={() => anchor(q, b)}
                  >
                    ◇
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="muted">
        {tool === "fault"
          ? "Click a lightning pin to inject a Pauli immediately after that payload column. This diagnostic has no background noise and does not change your scored circuit."
          : `Pins set the ${tool === "open" ? "opening" : "closing"} boundary of helper ${activeIndex + 1}. Checks surround columns [start, end).`}
      </p>
      <div className="panel-title">
        <h3>Spacetime check designer</h3>
        <button
          disabled={disabled || checks.length >= l.checkBudget}
          onClick={add}
        >
          <Plus size={15} /> Add helper
        </button>
      </div>
      <p className="muted">
        {manual
          ? "Manual mode: choose P and every component of P′."
          : "Assisted mode: Qiskit Clifford tableaus compute P′; T crossings must remain Pauli."}{" "}
        Up to {l.checkBudget} helpers · {l.minChecks} required for stars.
      </p>
      {checks.map((c, i) => {
        const p = preview?.checks[i];
        return (
          <fieldset
            key={i}
            className={`check-console ${p ? (p.valid ? "closed-loop" : "open-loop") : ""}`}
            disabled={disabled}
          >
            <legend>Helper {i + 1}</legend>
            <div className="check-toolbar">
              <button
                className={activeIndex === i ? "selected" : ""}
                onClick={() => setActive(i)}
                type="button"
              >
                Place pins for helper {i + 1}
              </button>
              <button
                aria-label={`Remove helper ${i + 1}`}
                onClick={() => onChecks(checks.filter((_, j) => i !== j))}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="tap-controls">
              <label>
                Opening qubit
                <select
                  aria-label={`Helper ${i + 1} opening qubit`}
                  value={c.qubit}
                  onChange={(e) => update(i, { qubit: +e.target.value })}
                >
                  {Array.from({ length: l.qubits }, (_, q) => (
                    <option value={q} key={q}>
                      q{q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Opening Pauli P
                <select
                  aria-label={`Helper ${i + 1} opening Pauli`}
                  value={c.pauli}
                  onChange={(e) =>
                    update(i, { pauli: e.target.value as Pauli })
                  }
                >
                  {["X", "Y", "Z"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Start boundary
                <select
                  aria-label={`Helper ${i + 1} start boundary`}
                  value={c.start}
                  onChange={(e) => update(i, { start: +e.target.value })}
                >
                  {Array.from({ length: c.end }, (_, b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label>
                End boundary
                <select
                  aria-label={`Helper ${i + 1} end boundary`}
                  value={c.end}
                  onChange={(e) => update(i, { end: +e.target.value })}
                >
                  {Array.from(
                    { length: l.slots - c.start },
                    (_, v) => c.start + v + 1,
                  ).map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            </div>
            {manual ? (
              <>
                <div className="tap-controls">
                  <label hidden={!!c.closingOperators}>
                    Closing qubit
                    <select
                      aria-label={`Helper ${i + 1} closing qubit`}
                      disabled={!!c.closingOperators}
                      value={c.closingQubit ?? 0}
                      onChange={(e) =>
                        single(i, c, { closingQubit: +e.target.value })
                      }
                    >
                      {Array.from({ length: l.qubits }, (_, q) => (
                        <option key={q} value={q}>
                          q{q}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label hidden={!!c.closingOperators}>
                    Closing Pauli P′
                    <select
                      aria-label={`Helper ${i + 1} closing Pauli`}
                      disabled={!!c.closingOperators}
                      value={c.closingPauli ?? "Z"}
                      onChange={(e) =>
                        single(i, c, { closingPauli: e.target.value as Pauli })
                      }
                    >
                      {["X", "Y", "Z"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  {l.qubits > 1 && (
                    <button
                      onClick={() =>
                        c.closingOperators
                          ? single(i, c, {})
                          : update(i, {
                              closingQubit: undefined,
                              closingPauli: undefined,
                              closingOperators: [{ qubit: 0, pauli: "X" }],
                            })
                      }
                    >
                      {c.closingOperators
                        ? "Use single tap"
                        : "Use multi-wire product"}
                    </button>
                  )}
                </div>
                {c.closingOperators && (
                  <div className="tap-controls">
                    {Array.from({ length: l.qubits }, (_, q) => (
                      <label key={q}>
                        Closing q{q}
                        <select
                          aria-label={`Helper ${i + 1} product on q${q}`}
                          value={
                            c.closingOperators?.find((t) => t.qubit === q)
                              ?.pauli || "I"
                          }
                          onChange={(e) => {
                            const taps = c.closingOperators!.filter(
                              (t) => t.qubit !== q,
                            );
                            if (e.target.value !== "I")
                              taps.push({
                                qubit: q,
                                pauli: e.target.value as Pauli,
                              });
                            if (taps.length)
                              update(i, { closingOperators: taps });
                          }}
                        >
                          {["I", "X", "Y", "Z"].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="auto-closing">
                <ShieldCheck size={16} /> Assisted P′:{" "}
                <code>
                  {p?.closing
                    ? `${p.sign === -1 ? "−" : ""}${p.closing}`
                    : "waiting for valid propagation"}
                </code>
              </p>
            )}
            <div
              className={`loop-path ${p?.valid ? "valid" : "invalid"}`}
              role="status"
            >
              <span>
                ○ {c.pauli}q{c.qubit} @ b{c.start}
              </span>
              <span className="loop-line" />
              <span>
                {validating
                  ? "Validating…"
                  : p?.valid
                    ? "✓ Invariant closed"
                    : p?.error || "Awaiting Qiskit validation"}
              </span>
              <span className="loop-line" />
              <span>b{c.end} ○</span>
            </div>
            {p?.sign === -1 && (
              <p className="muted">
                Negative propagated sign: the engine adds Z on the helper to
                close the signed invariant.
              </p>
            )}
            {p?.boundaries && (
              <details>
                <summary>Follow P through the payload</summary>
                <div className="chips">
                  {p.boundaries.map((x) => (
                    <code key={x.boundary}>
                      b{x.boundary}: {x.pauli}
                    </code>
                  ))}
                </div>
              </details>
            )}
          </fieldset>
        );
      })}
      {preview?.error && (
        <p role="alert" className="error">
          {preview.error}
        </p>
      )}
    </article>
  );
}
