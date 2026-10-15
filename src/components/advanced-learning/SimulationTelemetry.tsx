"use client";
import { ShotHistogram } from "../learning/ShotHistogram";
import { JointFrames } from "../state-visualization/JointFrames";
import { useState } from "react";
import type { CheckResult } from "@/lib/learning/contracts";
type SimulationResult = Pick<
  CheckResult,
  | "frames"
  | "states"
  | "observable"
  | "classification"
  | "valid"
  | "resources"
  | "residual"
  | "localOperatorMatch"
  | "scheduleValid"
  | "syndrome"
  | "keptShots"
  | "discardedShots"
  | "shots"
  | "samplingOverhead"
  | "flagProbability"
  | "noiselessFlagProbability"
  | "traceSteps"
>;
import { ResourceSummary } from "../learning/CircuitPreview";
import { StateCard } from "../learning/StateCard";
export function SimulationTelemetry({
  result,
  stale,
  basis,
  view,
  onView,
  n,
  busy,
  onResample,
}: {
  result: SimulationResult | null;
  stale: boolean;
  basis: string;
  view: number;
  onView: (q: number) => void;
  n: number;
  busy: boolean;
  onResample: () => void;
}) {
  const [compare, setCompare] = useState<
    "unprotected" | "unfiltered" | "retained"
  >("retained");
  return (
    <>
      <div className="nw-result-title">
        <div>
          <span className="nw-kicker">VALIDITY ≠ COVERAGE</span>
          <h2>Syndrome & data state</h2>
        </div>
        {result && (
          <span className={stale ? "nw-stale" : "nw-chip"}>
            {stale ? "Previous run — settings changed" : "✓ Qiskit result"}
          </span>
        )}
      </div>
      {!result ? (
        <div className="nw-empty">
          <span>◎</span>
          <h3>Build the H → P → U → P′ → H → M check</h3>
          <p>
            Validate its operator identity, then run. A green construction can
            still flag a fault.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`ql-classification ${result.valid ? "valid" : "invalid"}`}
          >
            <h3>{result.classification}</h3>
            <p>
              {result.valid
                ? "The check construction closes. Fault flagging is shown separately."
                : result.scheduleValid
                  ? "Globally closed, but outside this lesson’s stepwise Pauli transport family. This is not a false-alarm claim."
                  : "Invalid construction: nonzero noiseless syndrome can be a false alarm."}
            </p>
          </div>
          <div className="ql-comparison-metrics">
            <span>
              No-fault flag{" "}
              <b>{(100 * result.noiselessFlagProbability).toFixed(2)}%</b>
            </span>
            <span>
              Experiment flag{" "}
              <b>{(100 * result.flagProbability).toFixed(2)}%</b>
            </span>
            <span>
              Kept / discarded{" "}
              <b>
                {result.keptShots} / {result.discardedShots}
              </b>
            </span>
            <span>
              Sampling overhead{" "}
              <b>{result.samplingOverhead?.toFixed(3) ?? "∞"}×</b>
            </span>
          </div>
          {result.traceSteps && (
            <div
              className="ql-propagation"
              aria-label="Actual fault propagation"
            >
              {result.traceSteps.map((s, i) => (
                <span key={i}>
                  <b>{s.operator}</b>
                  <small>
                    {s.gate} · boundary {s.boundary}
                  </small>
                </span>
              ))}
            </div>
          )}
          <div className="nw-table-scroll">
            <table>
              <caption>
                Joint syndrome · {result.syndrome.ordering} · all-zero accepted
              </caption>
              <thead>
                <tr>
                  <th>Syndrome</th>
                  <th>No-fault P / counts</th>
                  <th>Experiment P / counts</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(result.syndrome.probabilities).map((key) => (
                  <tr key={key}>
                    <th>{key || "— no helper"}</th>
                    <td>
                      {(
                        100 * result.syndrome.noiselessProbabilities[key]
                      ).toFixed(2)}
                      % / {result.syndrome.noiselessCounts[key]}
                    </td>
                    <td>
                      {(100 * result.syndrome.probabilities[key]).toFixed(2)}% /{" "}
                      {result.syndrome.counts[key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nw-boundary">
            N_kept + N_discarded = {result.keptShots + result.discardedShots} /{" "}
            {result.shots}. Zero syndrome means not flagged, not proven clean.
            Counts are finite samples; probabilities are exact simulator
            predictions.
          </p>
          <div className="nw-result-controls">
            <label>
              Compare to ideal
              <select
                aria-label="Data comparison"
                value={compare}
                onChange={(e) => setCompare(e.target.value as typeof compare)}
              >
                <option value="retained">Retained output</option>
                <option value="unfiltered">Checked, before filtering</option>
                <option value="unprotected">Unprotected faulted payload</option>
              </select>
            </label>
            <label>
              Reduced qubit
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
          </div>
          <div className="nw-state-pair">
            <StateCard
              title="Ideal payload"
              state={result.states.ideal}
              qubit={view}
              basis={basis}
            />
            <StateCard
              title={
                compare === "retained"
                  ? "Retained output"
                  : compare === "unfiltered"
                    ? "Checked, before filtering"
                    : "Unprotected faulted payload"
              }
              state={result.states[compare]}
              qubit={view}
              basis={basis}
            />
          </div>
          {!result.states.retained && (
            <p className="nw-notice">
              No surviving state: every shot is flagged. Retained fidelity is
              undefined, not 100%.
            </p>
          )}
          <details>
            <summary>Helper marginals / matrix validation details</summary>
            <p>
              Input-independent isometry residual{" "}
              {result.residual?.toExponential(3)}. Local operator match:{" "}
              {String(result.localOperatorMatch)}; combined schedule valid:{" "}
              {String(result.scheduleValid)}.
            </p>
            {Array.from(
              {
                length: Math.log2(
                  Object.keys(result.syndrome.probabilities).length,
                ),
              },
              (_, a) => (
                <p key={a}>
                  a{a} flag:{" "}
                  {(
                    100 *
                    Object.entries(result.syndrome.probabilities).reduce(
                      (sum, [bits, p]) =>
                        sum + (bits.at(-1 - a) === "1" ? p : 0),
                      0,
                    )
                  ).toFixed(2)}
                  %. Marginals derive from the joint distribution.
                </p>
              ),
            )}
          </details>
          {result.keptShots !== undefined &&
            result.discardedShots !== undefined && (
              <ShotHistogram
                kept={result.keptShots}
                discarded={result.discardedShots}
              />
            )}
          <JointFrames frames={result.frames} />
          <ResourceSummary value={result.resources} />
          <button disabled={stale || busy} onClick={onResample}>
            Resample counts
          </button>
        </>
      )}
    </>
  );
}
