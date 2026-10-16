import { useState } from "react";
import {
  Basis,
  ComparisonMode,
  LabResult,
} from "@/lib/flight-school-1/contracts";

import { QuantumStateView } from "../state-visualization/QuantumStateView";
export { BlochSphere } from "../state-visualization/BlochSphere";

export function ComparisonTelemetry({
  result,
  stale,
  mode,
  onMode,
  selectedError,
  qubit,
  onQubit,
  qubits,
  basis,
  onBasis,
  shots,
  onShots,
  onResample,
  busy,
}: {
  result: LabResult | null;
  stale: boolean;
  mode: ComparisonMode;
  onMode: (v: ComparisonMode) => void;
  selectedError: boolean;
  qubit: number;
  onQubit: (q: number) => void;
  qubits: number;
  basis: Basis;
  onBasis: (v: Basis) => void;
  shots: number;
  onShots: (n: number) => void;
  onResample: () => void;
  busy: boolean;
}) {
  const [joint, setJoint] = useState(false);
  const actualQ = Math.min(
    qubit,
    (result?.states[0].qubits.length || qubits) - 1,
  );
  return (
    <>
      <div className="nw-result-title">
        <div>
          <span className="nw-kicker">OBSERVE THE DIFFERENCE</span>
          <h2>State & measurement</h2>
        </div>
        {result && (
          <span className={stale ? "nw-stale" : "nw-chip"}>
            {stale ? "Previous run — settings changed" : "✓ Qiskit result"}
          </span>
        )}
      </div>
      <div className="nw-result-controls">
        <label>
          Compare
          <select
            aria-label="State comparison"
            value={mode}
            onChange={(e) => onMode(e.target.value as ComparisonMode)}
          >
            <option value="final">Final: without / with errors</option>
            <option value="selected_error" disabled={!selectedError}>
              Before / after selected error
            </option>
          </select>
        </label>
        <label>
          View qubit
          <select
            aria-label="View qubit"
            value={qubit}
            onChange={(e) => onQubit(+e.target.value)}
          >
            {Array.from({ length: qubits }, (_, q) => (
              <option key={q} value={q}>
                q{q}
              </option>
            ))}
          </select>
        </label>
        <label>
          Measure
          <select
            aria-label="Measurement basis"
            value={basis}
            onChange={(e) => onBasis(e.target.value as Basis)}
          >
            <option>Z</option>
            <option>X</option>
          </select>
        </label>
        <label>
          Shots / state
          <select
            aria-label="Shots per state"
            value={shots}
            onChange={(e) => onShots(+e.target.value)}
          >
            {[256, 1024, 4096].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!result ? (
        <div className="nw-empty">
          <span>◎</span>
          <h3>Your experiment starts here</h3>
          <p>
            Prepare a state, place an error block, and press Run. Both panels
            will show real Qiskit results.
          </p>
        </div>
      ) : (
        <>
          {qubit >= result.states[0].qubits.length && (
            <p className="nw-stale">
              q{qubit} was not in the previous experiment. Showing its previous
              q{actualQ} view until you rerun.
            </p>
          )}
          <p className="nw-boundary">
            {result.comparisonMode === "selected_error"
              ? "Snapshots surround only the selected error. Earlier operations are included; later gates are excluded."
              : "Both branches end at the final boundary. Only error-role blocks are omitted from the reference."}
          </p>
          <div className="nw-state-pair">
            {result.states.map((state, i) => {
              const local = state.qubits[actualQ],
                m = state.marginals[actualQ];
              return (
                <article key={i}>
                  <h3>{result.labels[i]}</h3>
                  <QuantumStateView
                    frame={state.visualization}
                    bloch={local.bloch}
                    label={`${(state.visualization?.wireOrder.length || 1) > 1 ? "Joint data" : `q${actualQ}`} · ${i === 0 ? "before / reference" : "after / affected"}`}
                  />
                  <div className="nw-vector">
                    {["X", "Y", "Z"].map((v, j) => (
                      <span key={v}>
                        {v} <b>{local.bloch[j].toFixed(3)}</b>
                      </span>
                    ))}
                    <span>
                      Purity <b>{local.purity.toFixed(3)}</b>
                    </span>
                  </div>
                  {[0, 1].map((bit) => (
                    <div className="nw-hist-row" key={bit}>
                      <span>
                        {result.basis === "X" ? (bit === 0 ? "+" : "−") : bit}
                      </span>
                      <div>
                        <div
                          className="nw-bar"
                          style={{
                            width: `${Math.max(0, m.probabilities[bit] * 100)}%`,
                          }}
                        />
                      </div>
                      <b>{(m.probabilities[bit] * 100).toFixed(1)}%</b>
                      <span>{m.counts[bit]} counts</span>
                    </div>
                  ))}
                  <small>
                    Σ counts = {m.counts[0] + m.counts[1]} / {result.shots} ·{" "}
                    {result.basis} basis
                  </small>
                </article>
              );
            })}
          </div>
          <div className="nw-interpretation" aria-live="polite">
            {result.explanations.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <div className="nw-result-actions">
            <button onClick={onResample} disabled={busy || stale}>
              Resample counts
            </button>
            <label>
              <input
                type="checkbox"
                checked={joint}
                onChange={(e) => setJoint(e.target.checked)}
              />{" "}
              Joint outcomes
            </label>
          </div>
          {joint && (
            <div className="nw-table-scroll">
              <table>
                <caption>
                  Joint outcomes · q(n−1)…q0
                  {result.basis === "X" ? " · 0=plus, 1=minus" : ""}
                </caption>
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Before P / counts</th>
                    <th>After P / counts</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(result.states[0].probabilities).map((k) => (
                    <tr key={k}>
                      <th>{k}</th>
                      {result.states.map((s, i) => (
                        <td key={i}>
                          {(s.probabilities[k] * 100).toFixed(2)}% /{" "}
                          {s.counts[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary>All-qubit summary & simulator details</summary>
            <div className="nw-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Qubit</th>
                    <th>Before X, Y, Z / purity</th>
                    <th>After X, Y, Z / purity</th>
                  </tr>
                </thead>
                <tbody>
                  {result.states[0].qubits.map((_, i) => (
                    <tr key={i}>
                      <th>q{i}</th>
                      {result.states.map((s, j) => (
                        <td key={j}>
                          {s.qubits[i].bloch
                            .map((v) => v.toFixed(3))
                            .join(", ")}{" "}
                          / {s.qubits[i].purity.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Global purity:{" "}
              {result.states.map((s) => s.globalPurity.toFixed(4)).join(" → ")}{" "}
              · State fidelity: {result.fidelity.toFixed(4)} (simulator metric,
              no score).
            </p>
            <p>
              Same simulator seed {result.sampleSeed} in both panels;{" "}
              {result.shots} shots per state. Marginals come from the same joint
              samples. Counts may fluctuate; use exact probabilities to compare
              phase-sensitive predictions.
            </p>
            <p>
              Qiskit {result.qiskitVersion} · {result.engineVersion} ·{" "}
              {result.durationMs} ms · Times in μs.
            </p>
          </details>
        </>
      )}
    </>
  );
}
