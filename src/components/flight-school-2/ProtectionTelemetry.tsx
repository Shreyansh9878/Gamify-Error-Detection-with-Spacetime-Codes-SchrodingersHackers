import { ShotHistogram } from "../learning/ShotHistogram";
import { JointFrames } from "../state-visualization/JointFrames";
import { useState } from "react";
import type { ProtectionResult } from "@/lib/learning/contracts";
import { StateCard } from "../learning/StateCard";
import { ResourceSummary } from "../learning/CircuitPreview";
function FitChart({ result }: { result: ProtectionResult }) {
  const points = [
      { scale: 0, value: result.estimate! },
      ...(result.scales || []).map((s) => ({
        scale: s.scale,
        value: s.state.sampledExpectation!,
      })),
    ],
    min = Math.min(
      -1,
      ...points.map((p) => p.value),
      result.interval?.[0] ?? 0,
    ),
    max = Math.max(1, ...points.map((p) => p.value), result.interval?.[1] ?? 0),
    x = (v: number) => 42 + v * 52,
    y = (v: number) => 154 - ((v - min) / (max - min)) * 125;
  const measurements = points.slice(1);
  const fit = (v: number) => {
    const values = measurements.map((p) => p.value);
    if (result.fit === "quadratic")
      return values.reduce(
        (s, val, i) =>
          s +
          val *
            measurements.reduce(
              (p, m, j) =>
                j === i
                  ? p
                  : (p * (v - m.scale)) / (measurements[i].scale - m.scale),
              1,
            ),
        0,
      );
    const slope = (values[2] - values[0]) / 4;
    return result.estimate! + slope * v;
  };
  return (
    <svg
      viewBox="0 0 350 190"
      className="ql-fit"
      role="img"
      aria-label="ZNE measured expectations and zero-noise extrapolation"
    >
      <path d="M42 20V155H320" fill="none" stroke="#607c8d" />
      <line
        x1="42"
        x2="320"
        y1={y(result.ideal.expectation)}
        y2={y(result.ideal.expectation)}
        stroke="#b5c2dc"
        strokeDasharray="4 3"
      />
      <polyline
        points={Array.from(
          { length: 51 },
          (_, i) => `${x(i / 10)},${y(fit(i / 10))}`,
        ).join(" ")}
        fill="none"
        stroke="#f1c98f"
      />
      {points.map((p) => (
        <g key={p.scale}>
          <circle
            cx={x(p.scale)}
            cy={y(p.value)}
            r="4"
            fill={p.scale ? "#9bedd1" : "#f1c98f"}
          />
          <text x={x(p.scale)} y="176" textAnchor="middle">
            {p.scale}×
          </text>
        </g>
      ))}
      <text x="3" y="26">
        {max.toFixed(1)}
      </text>
      <text x="3" y="155">
        {min.toFixed(1)}
      </text>
      <text x="130" y="14">
        ⟨observable⟩ · ideal dashed
      </text>
    </svg>
  );
}
export function ProtectionTelemetry({
  result,
  stale,
  basis,
  observed,
  view,
  onView,
  n,
  busy,
  onResample,
  comparisons,
}: {
  result: ProtectionResult | undefined;
  stale: boolean;
  basis: string;
  observed: number;
  view: number;
  onView: (q: number) => void;
  n: number;
  busy: boolean;
  onResample: () => void;
  comparisons: ProtectionResult[];
}) {
  const [target, setTarget] = useState(1000);
  basis = result?.observable.basis || basis;
  observed = result?.observable.qubit ?? observed;
  return (
    <>
      <div className="nw-result-title">
        <div>
          <span className="nw-kicker">COMPARE THE OUTPUT, THEN THE COST</span>
          <h2>Ideal → noisy → selected method</h2>
        </div>
        {result && (
          <span className={stale ? "nw-stale" : "nw-chip"}>
            {stale ? "Previous run — settings changed" : "✓ Qiskit result"}
          </span>
        )}
      </div>
      <label className="ql-view">
        Reduced state view
        <select
          aria-label="View qubit"
          value={view}
          onChange={(e) => onView(+e.target.value)}
        >
          {Array.from({ length: n }, (_, q) => (
            <option key={q} value={q}>
              q{q}
            </option>
          ))}
        </select>
      </label>
      {!result ? (
        <div className="nw-empty">
          <span>◈</span>
          <h3>Choose a method and run your experiment</h3>
          <p>
            Previewing a transformation does not run it or earn completion.
            Compare actual Qiskit data here.
          </p>
        </div>
      ) : (
        <>
          <p className="nw-boundary">
            Observable q{observed} in {basis} basis · data order q(n−1)…q0.
            Ideal is an exact simulator reference, not a noiseless hardware run.
          </p>
          <div className="ql-three-states">
            <StateCard
              title="Ideal"
              state={result.ideal}
              qubit={view}
              basis={basis}
            />
            <StateCard
              title="Unprotected noisy"
              state={result.baseline}
              qubit={view}
              basis={basis}
            />
            {result.outputKind === "observable_estimate" ? (
              <article className="ql-state-card ql-estimate">
                <h3>Mitigated observable estimate</h3>
                <span className="ql-big">{result.estimate?.toFixed(4)}</span>
                <p>No repaired state — classical observable estimate</p>
                <p>
                  Approx. 95% sampling interval
                  <br />
                  {result.interval?.map((v) => v.toFixed(4)).join(" to ")}
                </p>
                <p>
                  Excludes fit bias. No mitigated Bloch sphere or state fidelity
                  exists.
                </p>
              </article>
            ) : (
              <StateCard
                title={
                  result.outputKind === "retained_state"
                    ? "Retained output"
                    : "Decoded logical output"
                }
                state={result.output}
                qubit={view}
                basis={basis}
              />
            )}
          </div>
          <div className="ql-comparison-metrics">
            <span>
              Baseline |ΔE| <b>{result.baselineError.toFixed(4)}</b>
            </span>
            <span>
              Selected |ΔE|{" "}
              <b>{result.estimationError?.toFixed(4) ?? "Unavailable"}</b>
            </span>
            <span>
              Improvement{" "}
              <b>{result.improvement?.toFixed(4) ?? "Unavailable"}</b>
            </span>
          </div>
          {result.technique === "detection" && (
            <div className="nw-inspector">
              <h3>Post-selection, not repair</h3>
              <div className="ql-shot-bars">
                <span>Kept · s=0: {result.keptShots}</span>
                <div
                  style={{
                    width: `${(100 * (result.keptShots || 0)) / ((result.keptShots || 0) + (result.discardedShots || 0) || 1)}%`,
                  }}
                />
                <span>Discarded · s=1: {result.discardedShots}</span>
              </div>
              <p>
                Exact retention {(100 * (result.retention || 0)).toFixed(2)}% ·
                sampling overhead {result.samplingOverhead?.toFixed(3) ?? "∞"}×.
                Zero syndrome does not prove a clean shot.
              </p>
              <label>
                Target accepted samples
                <select
                  aria-label="Target accepted samples"
                  value={target}
                  onChange={(e) => setTarget(+e.target.value)}
                >
                  {[100, 1000, 10000].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <p>
                Expected attempts:{" "}
                {result.retention
                  ? Math.ceil(target / result.retention).toLocaleString()
                  : "∞ — no surviving state"}
                . This is a prediction, not an automatic sampling loop.
              </p>
            </div>
          )}
          {result.technique === "mitigation" && (
            <div className="nw-inspector">
              <h3>Noise scaling → {result.fit} fit → zero-noise intercept</h3>
              <FitChart result={result} />
              <table>
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Exact E</th>
                    <th>Measured E</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scales?.map((s) => (
                    <tr key={s.scale}>
                      <td>{s.scale}×</td>
                      <td>{s.state.expectation.toFixed(5)}</td>
                      <td>{s.state.sampledExpectation?.toFixed(5)}</td>
                      <td>{s.weight.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details>
                <summary>Raw noisy variants / exact fit details</summary>
                <p>
                  Exact-input intercept: {result.exactFitEstimate?.toFixed(6)}.
                  Variance estimate {result.variance?.toFixed(6)}.
                </p>
                {result.scales?.map((s) => (
                  <StateCard
                    key={s.scale}
                    title={`Factor ${s.scale} · seed ${s.seed}`}
                    state={s.state}
                    qubit={view}
                    basis={basis}
                  />
                ))}
              </details>
            </div>
          )}
          {result.technique === "correction" && (
            <div className="nw-inspector">
              <h3>
                Active syndrome decoder ·{" "}
                {result.correctionFamily?.replaceAll("_", " ")} family
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Register s1s0</th>
                    <th>Tuple (s0,s1)</th>
                    <th>Hypothesis / recovery X</th>
                    <th>Counts</th>
                  </tr>
                </thead>
                <tbody>
                  {result.decoder?.map((d) => (
                    <tr key={d.register}>
                      <td>{d.register}</td>
                      <td>{d.tuple}</td>
                      <td>{d.hypothesis}</td>
                      <td>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                All shots retained. The recovery acts on the conditional quantum
                state before decoding; this is not classical majority voting
                over the final data.
              </p>
            </div>
          )}
          <div className="ql-processing">
            <h3>Post-processing / recovery trace</h3>
            <ol>
              {result.processingSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
          {result.warnings.map((w) => (
            <p className="nw-notice" key={w}>
              {w}
            </p>
          ))}
          {result.keptShots !== undefined &&
            result.discardedShots !== undefined && (
              <ShotHistogram
                postselect={result.technique === "detection"}
                kept={result.keptShots}
                discarded={result.discardedShots}
              />
            )}
          <JointFrames frames={result.frames} />
          <ResourceSummary value={result.resources} />
          <p className="nw-boundary">
            Method {result.resources.methodShots} shots; baseline{" "}
            {result.resources.baselineShots}; reused{" "}
            {result.resources.reusedBaselineShots}; total{" "}
            {result.resources.totalComparisonShots}. Equal shots per variant,
            not equal total budgets.
          </p>
          <button disabled={busy || stale} onClick={onResample}>
            Resample selected method
          </button>
          {comparisons.length > 0 && (
            <details>
              <summary>Matching experiment · tried methods</summary>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Output</th>
                    <th>|ΔE|</th>
                    <th>Comparison shots</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((r) => (
                    <tr key={r.technique}>
                      <td>{r.technique}</td>
                      <td>{r.outputKind}</td>
                      <td>{r.estimationError?.toFixed(4) ?? "None"}</td>
                      <td>{r.resources.totalComparisonShots}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </>
  );
}
