"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Level, ResearchResult } from "@/lib/types";
import { pct } from "./Visualizers";
export function ResearchLab({ level }: { level: Level }) {
  const [targets, setTargets] = useState("0"),
    [repetitions, setRepetitions] = useState(1),
    [tCount, setTCount] = useState(0),
    [result, setResult] = useState<ResearchResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<ResearchResult>("research", {
          levelId: level.id,
          targets: tCount ? [] : targets.split(",").filter(Boolean).map(Number),
          repetitions,
          tCount,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel research">
      <summary>Research Lab · Paulice, target order & T doping</summary>
      <p className="muted">
        Observable-specific Paulice checks are a separate experiment. Each
        stabilizer measurement may use a different check circuit; these results
        are not a single post-selected state and do not award mission stars.
      </p>
      <div className="research-controls">
        <label>
          Ordered targets
          <select
            value={targets}
            disabled={!!tCount || busy}
            onChange={(e) => {
              setTargets(e.target.value);
              setResult(null);
            }}
          >
            <option value="">None (baseline)</option>
            {Array.from({ length: level.qubits }, (_, q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
            {level.qubits > 1 && (
              <>
                <option value="0,1">0 then 1</option>
                <option value="1,0">1 then 0</option>
              </>
            )}
          </select>
        </label>
        <label>
          Payload repetitions
          <select
            value={repetitions}
            disabled={busy}
            onChange={(e) => {
              setRepetitions(+e.target.value);
              setResult(null);
            }}
          >
            {[1, 2, 3].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {level.id >= 7 && (
          <label>
            T gates per payload
            <select
              value={tCount}
              disabled={busy}
              onChange={(e) => {
                setTCount(+e.target.value);
                setResult(null);
              }}
            >
              {[0, 1, 2, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button className="primary" disabled={busy} onClick={run}>
          {busy ? "Evaluating observables…" : "Run research experiment"}
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <div aria-live="polite">
          <h3>{result.label}</h3>
          <div className="metrics">
            <div>
              <strong>{pct(result.fidelity)}</strong>
              <span>Fidelity estimate</span>
            </div>
            <div>
              <strong>{pct(result.baseline)}</strong>
              <span>Baseline</span>
            </div>
            <div>
              <strong>{pct(result.retention)}</strong>
              <span>Mean retained</span>
            </div>
          </div>
          <p>{result.warning}</p>
          <p>
            Comparable unchecked state fidelity (including idle noise):{" "}
            <b>{pct(result.exactReference)}</b>. Use this value when comparing T
            counts 0, 1, 2, and 4 at the same repetition count and mission.
          </p>
          <p className="muted">
            {result.checks} checks · depth {result.depth} ·{" "}
            {result.addedTwoQubit} added two-qubit gates · {result.settings}{" "}
            measurement settings · {result.shots} shots · {result.metricId}
          </p>
        </div>
      )}
    </details>
  );
}
