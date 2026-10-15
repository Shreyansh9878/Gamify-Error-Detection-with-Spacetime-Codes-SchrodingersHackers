"use client";
import { useState } from "react";
import { ArrowRight, Check as CheckIcon, FlaskConical } from "lucide-react";
import { lessons } from "@/lib/tutorial-data";
import { api } from "@/lib/api";
import type { Check, TutorialResult } from "@/lib/types";
import { Metrics, pct } from "./Visualizers";
import { NoiseLab } from "./flight-school-1/NoiseLab";
export function Tutorial({
  start,
  onStep,
  onFinish,
  onSkip,
  onBack = () => {},
  unlocked = false,
}: {
  start: number;
  onStep: (s: number) => void;
  onFinish: () => void;
  onSkip: () => void;
  onBack?: () => void;
  unlocked?: boolean;
}) {
  const [step, setStep] = useState(start),
    [seen, setSeen] = useState<string[]>([]),
    [result, setResult] = useState<TutorialResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [noise, setNoise] = useState(0.3),
    [pauli, setPauli] = useState<Check["pauli"]>("X"),
    [closing, setClosing] = useState<Check["pauli"]>("X"),
    [shots, setShots] = useState(1024),
    [answer, setAnswer] = useState(""),
    [stale, setStale] = useState(false);
  const data = lessons[step],
    ready =
      data.required.every((a) => seen.includes(a)) &&
      (step !== 1 || answer === "detection");
  async function run(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await api<TutorialResult>(`tutorial/${step + 1}`, {
        action,
        noise,
        pauli,
        closingPauli: closing,
        shots,
      });
      setResult(r);
      setStale(false);
      if (step !== 3 || r.loopValid)
        setSeen((s) => [
          ...new Set([...s, step === 5 ? `${action}-${pauli}` : action]),
        ]);
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
    setPauli("X");
    setClosing("X");
    setStale(false);
  }
  if (step === 0)
    return (
      <NoiseLab
        onContinue={next}
        onSkip={onSkip}
        onBack={onBack}
        unlocked={unlocked}
      />
    );
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">FLIGHT SCHOOL / SPACETIME CODE DEFENDER</p>
          <h1>Protect a fixed quantum workload.</h1>
          <p className="muted">
            Six visual experiments in noise, invariants, and the cost of keeping
            good shots.
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
            <span>{i < step ? <CheckIcon size={16} /> : i + 1}</span>
            <small>{l.title}</small>
          </div>
        ))}
      </div>
      <button
        className="ghost"
        onClick={() => {
          setStep(0);
          onStep(0);
          setSeen([]);
          setResult(null);
          setError("");
        }}
      >
        Revisit Flight School 1 · Quantum errors
      </button>
      <div className="tutorial-grid">
        <article className="panel lesson-copy">
          <p className="eyebrow">{data.tag}</p>
          <h2>{data.title}</h2>
          <p>{data.text}</p>
          <div className="task">
            <FlaskConical size={20} />
            <p>{data.task}</p>
          </div>
          <fieldset className="tutorial-controls" disabled={busy}>
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
                  onChange={(e) => {
                    setNoise(+e.target.value);
                    setStale(true);
                  }}
                />
              </label>
            )}
            {(step === 3 || step === 5) && (
              <div className="tap-controls">
                <label>
                  Opening Pauli P
                  <select
                    aria-label="Tutorial opening Pauli"
                    value={pauli}
                    onChange={(e) => {
                      setPauli(e.target.value as Check["pauli"]);
                      setStale(true);
                    }}
                  >
                    {["X", "Y", "Z"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                {step === 3 && (
                  <label>
                    Manual closing Pauli P′
                    <select
                      aria-label="Tutorial closing Pauli"
                      value={closing}
                      onChange={(e) => {
                        setClosing(e.target.value as Check["pauli"]);
                        setStale(true);
                      }}
                    >
                      {["X", "Y", "Z"].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {step === 4 && (
              <label>
                Total shots N
                <select
                  aria-label="Tutorial total shots"
                  value={shots}
                  onChange={(e) => {
                    setShots(+e.target.value);
                    setStale(true);
                  }}
                >
                  {[256, 1024, 4096].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="actions">
              {data.actions.map(([id, label]) => (
                <button
                  key={id}
                  className={
                    seen.includes(step === 5 ? `${id}-${pauli}` : id)
                      ? "selected"
                      : ""
                  }
                  onClick={() => run(id)}
                >
                  {seen.includes(step === 5 ? `${id}-${pauli}` : id) && (
                    <CheckIcon size={15} />
                  )}{" "}
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {step === 1 && (
            <div className="concept-quiz">
              <p>
                Which method targets retained state outputs with very few
                additional qubits?
              </p>
              <div className="actions">
                {["detection", "mitigation", "correction"].map((a) => (
                  <button
                    key={a}
                    aria-pressed={answer === a}
                    className={answer === a ? "selected" : ""}
                    onClick={() => setAnswer(a)}
                  >
                    {a === "detection"
                      ? "QED"
                      : a === "mitigation"
                        ? "QEM"
                        : "QEC"}
                  </button>
                ))}
              </div>
              {answer && (
                <p role="status">
                  {answer === "detection"
                    ? "Yes. QED filters covered faults, and you pay for discarded runs."
                    : "Try again: consider which method filters runs without a full logical encoding."}
                </p>
              )}
            </div>
          )}
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
              ? "Experiment complete. Continue when ready."
              : step === 3
                ? "Close a valid loop and inject a test fault to continue."
                : step === 5
                  ? "Required: X through S, X through T, and Z through T."
                  : "Explore the required experiments to continue."}
          </p>
        </article>
        <article
          className="panel experiment"
          aria-live="polite"
          aria-busy={busy}
        >
          <div className="panel-title">
            <span className="eyebrow">FIXED-PAYLOAD QISKIT EXPERIMENT</span>
            <span className="status-dot">
              {busy
                ? "Computing…"
                : stale
                  ? "Settings changed · rerun"
                  : "Live simulation"}
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
              {(step === 3 || step === 5) && (
                <div
                  className={`operator-inspector ${result.loopValid ? "closed-loop" : "open-loop"}`}
                >
                  <div className="operator-rail">
                    <b>P = {result.opening}</b>
                    <span>→ [ U = {step === 3 ? "S" : result.gate} ] →</span>
                    <b>
                      P′{" "}
                      {result.expectedClosing
                        ? `= ${result.expectedClosing}`
                        : ""}
                    </b>
                  </div>
                  {result.terms && (
                    <p className="operator-equation">
                      {result.gate}
                      {result.opening}
                      {result.gate}† ={" "}
                      {result.terms
                        .map(
                          (t) =>
                            `${t.coefficient < 0 ? "−" : "+"}${Math.abs(t.coefficient).toFixed(3)}${t.pauli}`,
                        )
                        .join(" ")}
                    </p>
                  )}
                  <strong>
                    {result.loopValid
                      ? "✓ Pauli invariant can close"
                      : "✕ Open loop / non-Pauli closure"}
                  </strong>
                  {result.selectedClosing && (
                    <p>
                      Selected P′ = {result.selectedClosing} ·{" "}
                      {result.injected
                        ? "Z fault injected"
                        : "No fault injected"}
                    </p>
                  )}
                </div>
              )}
              {step === 1 && (
                <p className="muted">
                  State chart and shot counts: the common QED reference.
                  Mitigation and decoder quantities are reported separately
                  below; the illustrative QEC footprint is not a simulated full
                  code.
                </p>
              )}
              {step === 5 && (
                <p className="muted">
                  State bars show the untouched reference workload. The operator
                  equation above determines whether a Pauli-only check can
                  close.
                </p>
              )}
              <Metrics result={result} />
              {result.baseline != null && (
                <p>
                  Unprotected fidelity: {pct(result.baseline)} · added two-qubit
                  gates: {result.addedTwoQubit} · depth: {result.depth}
                </p>
              )}
              {result.checkDetails?.map((c, i) => (
                <p className="auto-closing" key={i}>
                  Helper {i + 1}: {c.opening} @ b{c.start} → {c.closing} @ b
                  {c.end}
                </p>
              ))}
              {result.requiredShots && (
                <p className="notice">
                  Expected attempts for 1,000 retained samples:{" "}
                  {result.requiredShots.toLocaleString()}. This is a throughput
                  calculation, not a universal precision guarantee.
                </p>
              )}
              {result.resources && (
                <div className="resource-demo">
                  <p className="eyebrow">
                    {result.resources.illustrative
                      ? "ILLUSTRATIVE FULL-QEC FOOTPRINT"
                      : "METHOD RESOURCE VIEW"}
                  </p>
                  <div
                    className="resource-qubits"
                    aria-label={`${result.resources.data} data qubits, ${result.resources.helpers} helpers`}
                  >
                    {Array.from({ length: result.resources.data }, (_, i) => (
                      <span key={i}>q{i}</span>
                    ))}
                    {Array.from(
                      { length: result.resources.helpers },
                      (_, i) => (
                        <span className="ancilla" key={`a${i}`}>
                          a{i}
                        </span>
                      ),
                    )}
                  </div>
                  <p className="muted">
                    {result.resources.settings} experimental setting(s).{" "}
                    {result.resources.illustrative
                      ? "A nine-qubit code illustrates hardware cost; the decoded result below is the restricted repetition-code example."
                      : ""}
                  </p>
                </div>
              )}
              {result.extrapolation && (
                <div className="extrapolation">
                  <h3>Mitigation: extrapolate an observable</h3>
                  <svg
                    viewBox="0 0 280 130"
                    role="img"
                    aria-label="Observable estimate at noise scales zero, one, and two"
                  >
                    <path d="M30 10V110H260" />
                    {result.extrapolation.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={40 + p.scale * 90}
                          cy={100 - 70 * p.value}
                          r="4"
                        />
                        <text x={35 + p.scale * 90} y="127">
                          λ={p.scale}
                        </text>
                        <text x={45 + p.scale * 90} y={95 - 70 * p.value}>
                          {p.value.toFixed(2)}
                        </text>
                      </g>
                    ))}
                    <path
                      className="fit"
                      d={`M40 ${100 - 70 * result.extrapolation[2].value} L220 ${100 - 70 * result.extrapolation[1].value}`}
                    />
                  </svg>
                </div>
              )}
              <p className="explanation">{result.message}</p>
              {result.comparison?.map((c) => (
                <div className="comparison" key={c.label}>
                  <b>
                    {c.label}: {c.value.toFixed(3)}
                  </b>
                  <small>{c.detail}</small>
                </div>
              ))}
            </>
          ) : (
            <div className="empty">
              <div className="orb">ψ</div>
              <h3>Inspect the fixed workload</h3>
              <p>
                Choose an experiment to see the quantum state, check behavior,
                and resource cost.
              </p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
