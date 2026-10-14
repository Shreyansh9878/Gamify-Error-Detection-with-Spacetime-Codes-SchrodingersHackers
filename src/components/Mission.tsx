"use client";
import { useState, useRef, useEffect } from "react";
import {
  Play,
  ArrowLeft,
  Star,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Level, Gate, Check, Result } from "@/lib/types";
import { api } from "@/lib/api";
import { CircuitBuilder } from "./CircuitBuilder";
import { StateView, pct } from "./Visualizers";
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
  const [gates, setGates] = useState<Gate[]>(structuredClone(l.starter)),
    [checks, setChecks] = useState<Check[]>([]),
    [noise, setNoise] = useState(1),
    [result, setResult] = useState<Result | null>(null),
    [history, setHistory] = useState<Result[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => dialog.current?.close(), []);
  function changed() {
    setStale(true);
    setError("");
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
      setHistory((h) => [r, ...h].slice(0, 4));
      if (r.eligible) onWin(r);
      if (r.passed) {
        dialog.current?.showModal();
        if (sound) {
          const ctx = new AudioContext(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(523, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            1046,
            ctx.currentTime + 0.2,
          );
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
          osc.onended = () => {
            void ctx.close();
          };
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!result) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { level: l, request: { gates, checks, noiseScale: noise }, result },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `quantum-shield-mission-${l.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section>
      <button className="back ghost" onClick={onBack}>
        <ArrowLeft size={16} /> Mission control
      </button>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            MISSION {String(l.id).padStart(2, "0")} / {l.chapter}
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
          <small>TARGET STATE</small>
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
            gates={gates}
            checks={checks}
            disabled={busy}
            onChange={(g) => {
              setGates(g);
              changed();
            }}
            onChecks={(c) => {
              setChecks(c);
              changed();
            }}
          />
          <div className="panel run-panel">
            <label className="range-label">
              Noise Radar sandbox <b>{Math.round(noise * 100)}%</b>
              <input
                aria-label="Mission noise strength"
                disabled={busy}
                type="range"
                min="0"
                max="1.5"
                step=".1"
                value={noise}
                onChange={(e) => {
                  setNoise(+e.target.value);
                  changed();
                }}
              />
            </label>
            <p className="muted">
              Stars use 100% noise. Other settings are experiments. Base idle
              noise: {pct(l.noise)}.
            </p>
            <button className="primary run" disabled={busy} onClick={run}>
              <Play size={17} />
              {busy ? "Running Qiskit…" : "Run circuit"}
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <details>
              <summary>Need a hint?</summary>
              <p>{l.hint}</p>
              <p className="muted">{l.concept}</p>
            </details>
          </div>
        </div>
        <article className="panel output" aria-live="polite" aria-busy={busy}>
          <div className="panel-title">
            <h2>Signal monitor</h2>
            <span className="chip">
              {stale && result ? "Previous run" : "Qiskit density matrix"}
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
                  <strong>{pct(result.retention)}</strong>
                  <span>Runs kept</span>
                </div>
                <div>
                  <strong>{result.score}</strong>
                  <span>
                    {result.eligible ? "Mission score" : "Sandbox score"}
                  </span>
                </div>
              </div>
              <p className="muted">
                Unprotected: {pct(result.baseline)} · noiseless target match:{" "}
                {pct(result.idealMatch)}
              </p>
              <StateView result={result} />
              <p>{result.feedback.join(" ")}</p>
              <div className="chips">
                <span>Depth {result.depth}</span>
                <span>+{result.addedGates} operations</span>
                <span>+{result.addedTwoQubit} two-qubit gates</span>
                <span>
                  {result.keptShots}/{result.shots} sampled shots kept
                </span>
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
              <h3>Build. Protect. Measure.</h3>
              <p>Your real simulation results will appear here.</p>
            </div>
          )}
        </article>
      </div>
      {history.length > 1 && (
        <article className="panel">
          <h3>Compare recent runs</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Fidelity</th>
                  <th>Kept</th>
                  <th>Depth</th>
                  <th>Extra 2Q</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i}>
                    <td>{i === 0 ? "Latest" : `−${i}`}</td>
                    <td>{pct(r.fidelity)}</td>
                    <td>{pct(r.retention)}</td>
                    <td>{r.depth}</td>
                    <td>{r.addedTwoQubit}</td>
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
      <ResearchLab level={l} />
      <dialog ref={dialog} className="win-dialog">
        <div className="confetti" aria-hidden="true">
          ✦ · ✧ · ✦ · ✧ · ✦
        </div>
        <p className="eyebrow">SIGNAL PROTECTED</p>
        <h2>Mission complete.</h2>
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
        <p>Your personal best is saved on this device.</p>
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
