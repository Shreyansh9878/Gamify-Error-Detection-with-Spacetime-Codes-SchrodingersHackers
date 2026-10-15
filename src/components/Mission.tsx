"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Play,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  Check,
  CheckPreview,
  FaultResult,
  Level,
  Result,
} from "@/lib/types";
import { api } from "@/lib/api";
import { CircuitBuilder } from "./CircuitBuilder";
import { pct, ShotHistogram, StateView } from "./Visualizers";
import { ResearchLab } from "./ResearchLab";

export function Mission({
  level: l,
  onBack,
  onWin,
  sound,
  onSound,
}: {
  level: Level;
  onBack: () => void;
  onWin: (r: Result) => void;
  sound: boolean;
  onSound: () => void;
}) {
  const gates = l.target;
  const [checks, setChecks] = useState<Check[]>([]),
    [preview, setPreview] = useState<CheckPreview | null>(null),
    [validating, setValidating] = useState(false),
    [noise, setNoise] = useState(1),
    [result, setResult] = useState<Result | null>(null),
    [history, setHistory] = useState<Result[]>([]),
    [fault, setFault] = useState<FaultResult | null>(null),
    [faultBusy, setFaultBusy] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [validationError, setValidationError] = useState(""),
    [stale, setStale] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let current = true;
    setPreview(null);
    setValidationError("");
    if (!checks.length) {
      setValidating(false);
      return;
    }
    setValidating(true);
    const timer = setTimeout(() => {
      api<CheckPreview>("validate-checks", { levelId: l.id, gates, checks })
        .then((data) => {
          if (current) setPreview(data);
        })
        .catch((e) => {
          if (current) setValidationError((e as Error).message);
        })
        .finally(() => {
          if (current) setValidating(false);
        });
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [checks, gates, l.id]);
  function change(next: Check[]) {
    setChecks(next);
    setStale(true);
    setError("");
    setFault(null);
  }
  async function run() {
    setBusy(true);
    setError("");
    try {
      const r = await api<Result>("run-circuit", {
        levelId: l.id,
        gates,
        checks,
        noiseScale: noise,
      });
      setResult(r);
      setStale(false);
      setHistory((h) => [r, ...h].slice(0, 10));
      if (r.eligible) onWin(r);
      if (r.passed) {
        dialog.current?.showModal();
        if (sound) {
          try {
            const ctx = new AudioContext(),
              o = ctx.createOscillator(),
              g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.setValueAtTime(523, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(
              1046,
              ctx.currentTime + 0.2,
            );
            g.gain.setValueAtTime(0.08, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            o.start();
            o.stop(ctx.currentTime + 0.4);
            o.onended = () => {
              void ctx.close();
            };
          } catch {
            /* Audio availability does not affect scientific results. */
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function inject(qubit: number, column: number, pauli: "X" | "Y" | "Z") {
    setFaultBusy(true);
    setError("");
    setFault(null);
    try {
      setFault(
        await api<FaultResult>("trace-fault", {
          levelId: l.id,
          gates,
          checks,
          faultQubit: qubit,
          faultColumn: column,
          faultPauli: pauli,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFaultBusy(false);
    }
  }
  function download() {
    if (!result || stale) return;
    const blob = new Blob(
        [
          JSON.stringify(
            {
              level: l,
              request: { levelId: l.id, gates, checks, noiseScale: noise },
              result,
              faultDiagnostic: fault,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `quantum-shield-mission-${l.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const canRun =
    !busy && !faultBusy && !validating && (!checks.length || !!preview?.valid);
  return (
    <section>
      <button className="back ghost" onClick={onBack}>
        <ArrowLeft size={16} /> Mission control
      </button>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            MISSION {String(l.id).padStart(2, "0")} / {l.chapter} /{" "}
            {l.checkMode.toUpperCase()} CHECKS
          </p>
          <h1>{l.title}</h1>
          <p className="muted">{l.description}</p>
        </div>
        <button
          className="ghost"
          aria-label={sound ? "Mute sound" : "Enable sound"}
          onClick={onSound}
        >
          {sound ? <Volume2 /> : <VolumeX />}
        </button>
      </div>
      <div className="goal-strip">
        <div>
          <small>FIXED PAYLOAD TARGET</small>
          <b>{l.targetLabel}</b>
        </div>
        <div>
          <small>FIDELITY GOAL</small>
          <b>≥ {pct(l.fidelityGoal)}</b>
        </div>
        <div>
          <small>KEEP AT LEAST</small>
          <b>{pct(l.retentionGoal)}</b>
        </div>
        <div>
          <small>NOISE CHANNEL</small>
          <b>{l.channel}</b>
        </div>
      </div>
      <div className="lab-grid">
        <div>
          <CircuitBuilder
            level={l}
            checks={checks}
            onChecks={change}
            disabled={busy || faultBusy}
            preview={preview}
            validating={validating}
            onFault={inject}
            fault={fault}
          />
          <div className="panel run-panel">
            <label className="range-label">
              Noise sandbox <b>{Math.round(noise * 100)}%</b>
              <input
                aria-label="Mission noise strength"
                disabled={busy || faultBusy}
                type="range"
                min="0"
                max="1.5"
                step=".1"
                value={noise}
                onChange={(e) => {
                  setNoise(+e.target.value);
                  setStale(true);
                }}
              />
            </label>
            <p className="muted">
              {l.noiseLabel}. Stars use 100% noise. Run with no helpers to
              measure the unprotected baseline.
            </p>
            <button className="primary run" disabled={!canRun} onClick={run}>
              <Play size={17} />
              {busy
                ? "Running Qiskit…"
                : validating
                  ? "Validating invariant…"
                  : "Run circuit"}
            </button>
            {(error || validationError) && (
              <p role="alert" className="error">
                {error || validationError}
              </p>
            )}
            <details>
              <summary>Need a hint?</summary>
              <p>{l.hint}</p>
              <p className="muted">{l.concept}</p>
            </details>
          </div>
          {fault && (
            <article
              className={`panel fault-result ${fault.outcome}`}
              aria-live="polite"
            >
              <p className="eyebrow">IDEAL SINGLE-FAULT DIAGNOSTIC</p>
              <h3>
                {fault.outcome === "caught"
                  ? "Caught · syndrome ≠ 0"
                  : fault.outcome === "probabilistic"
                    ? "Probabilistic alarm"
                    : "No alarm"}
              </h3>
              <p>
                {fault.faultPauli} after q{fault.faultQubit}, column{" "}
                {fault.faultColumn}: flag probability{" "}
                {pct(fault.flagProbability)}.{" "}
                {fault.outputChanged
                  ? "The unfiltered output differs from this target state."
                  : "This fault leaves this target state unchanged."}
              </p>
              <p className="muted">
                A missed alarm is not automatically logical corruption.{" "}
                {fault.protocol}
              </p>
              <div className="chips">
                {Object.entries(fault.syndromeProbabilities).map(([s, p]) => (
                  <span key={s}>
                    Syndrome {s}: {pct(p)}
                  </span>
                ))}
              </div>
              <h3>Forward fault propagation</h3>
              <div className="fault-trajectory">
                {fault.trajectory.map((t) => (
                  <div key={t.boundary}>
                    <small>Boundary {t.boundary}</small>
                    <code>
                      {t.terms
                        .map((v) => `${v.re.toFixed(3)} ${v.pauli}`)
                        .join(" + ")}
                    </code>
                  </div>
                ))}
              </div>
            </article>
          )}
          {faultBusy && (
            <p role="status">Tracing the injected fault in Qiskit…</p>
          )}
        </div>
        <article className="panel output" aria-live="polite" aria-busy={busy}>
          <div className="panel-title">
            <h2>Signal & throughput monitor</h2>
            <span className="chip">
              {stale && result
                ? "Previous run · draft changed"
                : "Qiskit density matrix"}
            </span>
          </div>
          {result ? (
            <>
              <div className="metrics">
                <div>
                  <strong>{pct(result.fidelity)}</strong>
                  <span>Retained fidelity</span>
                </div>
                <div>
                  <strong>{result.samplingOverhead.toFixed(2)}×</strong>
                  <span>Sampling overhead 1/p(keep)</span>
                </div>
                <div>
                  <strong>{result.score}</strong>
                  <span>
                    {result.eligible ? "Mission score" : "Sandbox score"}
                  </span>
                </div>
              </div>
              <p className="muted">
                Unprotected fidelity {pct(result.baseline)} · exact retained
                fraction {pct(result.retention)}
              </p>
              <ShotHistogram
                shots={result.shots}
                kept={result.keptShots}
                discarded={result.discardedShots}
                retention={result.retention}
              />
              <StateView result={result} />
              <p>{result.feedback.join(" ")}</p>
              <div className="chips">
                <span>Depth {result.depth}</span>
                <span>+{result.addedGates} operations</span>
                <span>+{result.addedTwoQubit} two-qubit gates</span>
                <span>{result.ancillas} helpers</span>
              </div>
              {result.checkDetails.map((c, i) => (
                <p className="muted" key={i}>
                  Helper {i + 1}: {c.opening} → {c.closing}, boundaries{" "}
                  {c.start}–{c.end}
                </p>
              ))}
              <button disabled={stale} onClick={download}>
                <Download size={16} /> Export this experiment
              </button>
            </>
          ) : (
            <div className="empty">
              <div className="orb">ψ</div>
              <h3>Open. Propagate. Close.</h3>
              <p>
                Choose Pauli taps around the locked payload, then compare
                fidelity and shot cost.
              </p>
            </div>
          )}
        </article>
      </div>
      {history.length > 1 && (
        <article className="panel">
          <h3>Compare protection strategies</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Fidelity</th>
                  <th>Kept</th>
                  <th>Overhead</th>
                  <th>Depth</th>
                  <th>Helpers / extra 2Q</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i}>
                    <td>{i === 0 ? "Latest" : `−${i}`}</td>
                    <td>{pct(r.fidelity)}</td>
                    <td>{pct(r.retention)}</td>
                    <td>{r.samplingOverhead.toFixed(2)}×</td>
                    <td>{r.depth}</td>
                    <td>
                      {r.ancillas} / {r.addedTwoQubit}
                    </td>
                    <td>
                      {r.score}
                      {!r.eligible ? " sandbox" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
      {l.id >= 6 && <ResearchLab level={l} />}
      <dialog ref={dialog} className="win-dialog">
        <div className="confetti" aria-hidden="true">
          ✦ · ✧ · ✦ · ✧ · ✦
        </div>
        <p className="eyebrow">INVARIANT PROTECTED</p>
        <h2>
          {l.id === 10 ? "Master Spacetime Architect" : "Mission complete."}
        </h2>
        <div className="stars">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              fill={s <= (result?.stars || 0) ? "currentColor" : "none"}
            />
          ))}
        </div>
        <p>
          {result?.score} points · {pct(result?.fidelity || 0)} fidelity
        </p>
        <p>
          {result?.samplingOverhead.toFixed(2)}× sampling overhead. Personal
          best saved on this device.
        </p>
        {l.id === 10 && (
          <button onClick={download}>Download final strategy report</button>
        )}
        <button className="primary" onClick={() => dialog.current?.close()}>
          Keep experimenting
        </button>
        <button
          className="ghost"
          onClick={() => {
            dialog.current?.close();
            onBack();
          }}
        >
          Return to missions
        </button>
      </dialog>
    </section>
  );
}
