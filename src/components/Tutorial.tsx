"use client";
import { useState } from "react";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { lessons } from "@/lib/tutorial-data";
import { api } from "@/lib/api";
import type { TutorialResult } from "@/lib/types";
import { Metrics } from "./Visualizers";
export function Tutorial({
  start,
  onStep,
  onFinish,
  onSkip,
}: {
  start: number;
  onStep: (s: number) => void;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(start),
    [seen, setSeen] = useState<string[]>([]),
    [result, setResult] = useState<TutorialResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [noise, setNoise] = useState(0.3);
  const data = lessons[step],
    ready =
      step === 0
        ? data.required.some((a) => seen.includes(a))
        : data.required.every((a) => seen.includes(a));
  async function run(action: string) {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<TutorialResult>(`tutorial/${step + 1}`, { action, noise }),
      );
      setSeen((s) => [...new Set([...s, action])]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (step === 5) {
      onFinish();
      return;
    }
    const n = step + 1;
    setStep(n);
    onStep(n);
    setSeen([]);
    setResult(null);
    setError("");
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">FLIGHT SCHOOL</p>
          <h1>Small steps. Quantum leaps.</h1>
          <p className="muted">
            Six hands-on experiments. No physics background required.
          </p>
        </div>
        <button className="ghost" onClick={onSkip}>
          Skip Tutorial / Unlock All Levels <ArrowRight size={16} />
        </button>
      </div>
      <div className="step-track">
        {lessons.map((l, i) => (
          <div
            key={l.title}
            className={i === step ? "active" : i < step ? "done" : ""}
          >
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            <small>{l.title}</small>
          </div>
        ))}
      </div>
      <div className="tutorial-grid">
        <article className="panel lesson-copy">
          <p className="eyebrow">{data.tag}</p>
          <h2>{data.title}</h2>
          <p>{data.text}</p>
          <div className="task">
            <FlaskConical size={20} />
            <p>{data.task}</p>
          </div>
          {step === 0 && (
            <label className="range-label">
              Noise strength <b>{Math.round(noise * 100)}%</b>
              <input
                aria-label="Tutorial noise strength"
                type="range"
                min="0"
                max=".8"
                step=".05"
                value={noise}
                onChange={(e) => setNoise(+e.target.value)}
              />
            </label>
          )}
          <div className="actions">
            {data.actions.map(([id, label]) => (
              <button
                key={id}
                disabled={busy}
                className={seen.includes(id) ? "selected" : ""}
                onClick={() => run(id)}
              >
                {seen.includes(id) && <Check size={15} />} {label}
              </button>
            ))}
          </div>
          <button
            className="primary next"
            disabled={!ready || busy}
            onClick={next}
          >
            {step === 5 ? "Unlock missions" : "Continue"}{" "}
            <ArrowRight size={17} />
          </button>
          <p className="muted">
            {ready
              ? "Experiment complete. Continue when you are ready."
              : "Try each required experiment to continue."}
          </p>
        </article>
        <article
          className="panel experiment"
          aria-live="polite"
          aria-busy={busy}
        >
          <div className="panel-title">
            <span className="eyebrow">QISKIT EXPERIMENT</span>
            <span className="status-dot">
              {busy ? "Computing…" : "Live simulation"}
            </span>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {result ? (
            <>
              <h3>{result.title}</h3>
              <Metrics result={result} />
              <p className="explanation">{result.message}</p>
              {result.comparison?.map((c) => (
                <div className="comparison" key={c.label}>
                  <b>
                    {c.label}: {c.value.toFixed(2)}
                  </b>
                  <small>{c.detail}</small>
                </div>
              ))}
            </>
          ) : (
            <div className="empty">
              <div className="orb">ψ</div>
              <h3>Your quantum experiment starts here</h3>
              <p>Choose an action to run a real Qiskit circuit.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
