"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import {
  draftSchema,
  draftCode,
  initialDraft,
  type Draft,
  type Validation,
  type Result,
  type Reveal,
} from "@/lib/timeline/contracts";
import { titles, theory } from "@/lib/timeline/content";
import { useWorkbench, useLocalProgress } from "@/lib/learning/useWorkbench";
import { LabFrame, LabFeedback, CodeEditor, NativeCode } from "./LabFrame";
import { CircuitFigure } from "./CircuitFigure";
import { McqOption } from "./McqOption";
import { LabTheory } from "./LabTheory";
import { HardwareNoiseControls } from "./HardwareNoiseControls";
import { TimelineCanvas } from "../circuit-workspace/TimelineCanvas";
import { StateCard } from "./StateCard";
import { ShotHistogram } from "./ShotHistogram";
import { QuantumStateView } from "../state-visualization/QuantumStateView";
import type { MobilePane } from "../workspace/LearningWorkspace";
type Number = 3 | 4 | 5 | 6;
interface Props {
  number: Number;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  onLesson: (n: number) => void;
  previous: number;
}
const evidenceSchema = z.object({
  version: z.literal(2),
  guided: z.boolean(),
  answers: z.record(z.string(), z.string()),
  reviewed: z.boolean(),
});
export function TimelineLab(props: Props) {
  const [mode, setMode] = useState<"guided" | "sandbox">("guided");
  const [mobile, setMobile] = useState<MobilePane>("Theory");
  return (
    <TimelineSession
      key={`${props.number}-${mode}`}
      {...props}
      mode={mode}
      onMode={setMode}
      mobile={mobile}
      setMobile={setMobile}
    />
  );
}
function TimelineSession({
  number,
  mode,
  onMode,
  onContinue,
  onSkip,
  onBack,
  onLesson,
  previous,
  mobile,
  setMobile,
}: Props & {
  mode: "guided" | "sandbox";
  onMode: (m: "guided" | "sandbox") => void;
  mobile: MobilePane;
  setMobile: (m: MobilePane) => void;
}) {
  const schema = draftSchema.refine(
    (d) => d.lesson === number && d.mode === mode,
    "Keep the current lesson and mode; change them using the workspace controls.",
  );
  const work = useWorkbench(
    `quantum-shield.timeline.${number}.${mode}.${number === 6 ? "v4" : "v2"}`,
    initialDraft(number, mode),
    schema,
    draftCode,
    "tutorial/timeline/compile",
    "draft",
  );
  const progress = useLocalProgress(
    `quantum-shield.timeline.${number}.evidence.${number === 6 ? "v4" : "v2"}`,
    evidenceSchema,
    { version: 2 as const, guided: false, answers: {}, reviewed: false },
  );
  const [validation, setValidation] = useState<Validation | null>(null),
    [validated, setValidated] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [accepted, setAccepted] = useState(""),
    [reveal, setReveal] = useState<Reveal | null>(null),
    [revealing, setRevealing] = useState(false),
    [revealError, setRevealError] = useState(""),
    [retry, setRetry] = useState(0),
    [showHint, setShowHint] = useState(false);
  const d = work.model,
    key = JSON.stringify(d),
    stale = work.dirty || accepted !== key;
  const questions =
    number === 3
      ? [
          {
            id: "s",
            text: "Opening X before S: which closing operator prevents false alarms?",
            options: ["X", "Y", "Z", "I"],
            correct: "Y",
            explanation:
              "S X S† = Y. A different operator breaks the identity; false alarms can be input-dependent.",
          },
        ]
      : number === 4
        ? [
            {
              id: "cx",
              text: "Across CNOT alone, X on its control becomes…",
              options: ["X on control", "X on both wires", "Z on target"],
              correct: "X on both wires",
              explanation: "CX (X⊗I) CX† = X⊗X; close the entire product.",
            },
            {
              id: "hcx",
              text: "Across our H(q0) then CX payload, Z0 becomes…",
              options: ["Z0", "X0 X1", "Y1"],
              correct: "X0 X1",
              explanation:
                "H Z H = X, then the CNOT spreads X from control to target.",
            },
          ]
        : number === 5
          ? [
              {
                id: "t",
                text: "Which Pauli passes cleanly through one T gate?",
                options: ["X", "Y", "Z"],
                correct: "Z",
                explanation:
                  "T Z T† = Z. X/Y generally become non-Pauli coherent sums.",
              },
            ]
          : [];
  const complete =
    number === 6
      ? progress.value.reviewed
      : progress.value.guided &&
        questions.every((q) => progress.value.answers[q.id] === q.correct);
  useEffect(() => {
    if (!work.ready || work.busy || work.dirty || revealing) return;
    let alive = true;
    const token = work.revision.current;
    const timer = setTimeout(
      () =>
        void api<Validation>("tutorial/timeline/validate", { draft: d })
          .then((v) => {
            if (alive && token === work.revision.current) {
              setValidation(v);
              setValidated(key);
            }
          })
          .catch((e) => {
            if (alive && token === work.revision.current)
              work.setError((e as Error).message);
          }),
      250,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [key, work.ready, work.busy, work.dirty, revealing]);
  useEffect(() => {
    if (
      number !== 6 ||
      !result ||
      stale ||
      !result.validation.valid ||
      result.score < (result.qualificationThreshold ?? 0.6)
    ) {
      setRevealing(false);
      return;
    }
    let alive = true;
    const token = work.revision.current;
    setRevealing(true);
    setRevealError("");
    void api<Reveal>("tutorial/timeline/reveal", { draft: d })
      .then((r) => {
        if (alive && token === work.revision.current) setReveal(r);
      })
      .catch((e) => {
        if (alive && token === work.revision.current)
          setRevealError((e as Error).message);
      })
      .finally(() => {
        if (alive) setRevealing(false);
      });
    return () => {
      alive = false;
    };
  }, [result, retry, key, work.dirty]);
  const currentValidation =
    !work.dirty && validated === key ? validation : null;
  function run() {
    void work.execute<Result>(
      "tutorial/timeline/run",
      (m) => ({ draft: m }),
      (r, m) => {
        setResult(r);
        setAccepted(JSON.stringify(m));
        setValidation(r.validation);
        setValidated(JSON.stringify(m));
        setReveal(null);
        if (mode === "guided" && r.validation.valid) {
          const check = r.validation.checks[0];
          const goal =
            number === 3
              ? check?.opening?.includes("X") && check.expected?.includes("Y")
              : number === 5
                ? check?.opening?.includes("Z") && !check.nonPauli
                : true;
          if (goal) progress.setValue((p) => ({ ...p, guided: true }));
        }
        setMobile("Results");
      },
    );
  }
  function resize(n: number, k: number) {
    const remap = (q: number) => (q < d.dataQubits ? q : n + q - d.dataQubits);
    const removed = d.operations.filter((g) =>
      g.qubits.some((q) => (q < d.dataQubits ? q >= n : q - d.dataQubits >= k)),
    );
    if (
      removed.length &&
      !window.confirm(
        `Resizing removes ${removed.length} operation(s) on removed wires. Continue?`,
      )
    )
      return;
    work.change({
      ...d,
      dataQubits: n,
      ancillas: k,
      operations: d.operations
        .filter((g) => !removed.includes(g))
        .map((g) => ({ ...g, qubits: g.qubits.map(remap) })),
    });
  }
  return (
    <LabFrame
      number={number}
      title={titles[number]}
      previous={previous}
      complete={complete}
      onBack={onBack}
      onSkip={onSkip}
      onLesson={onLesson}
      mobile={mobile}
      setMobile={setMobile}
      theory={
        <LabTheory
          number={number}
          title={titles[number]}
          source={theory[number]}
          aside={
            number === 6 ? (
              <div className="capstone-hint">
                <b>Focus on the highlighted CX block</b>
                <p>
                  q1 relaxes most strongly just after CX(q0,q1). Short checks
                  are cheaper.
                </p>
                <button onClick={() => setShowHint((v) => !v)}>
                  {showHint ? "Hide hint" : "Show hint"}
                </button>
                {showHint && (
                  <p>
                    Use H(a0), then CX(a0,q1) before the workload. X1 passes
                    CNOT and becomes Y1 through S, so close with CY(a0,q1), then
                    H(a0) and M(a0). Only a0 is available.
                  </p>
                )}
              </div>
            ) : undefined
          }
          examples={
            <>
              <p>
                Drag ordinary gates, with control first and target second. The
                green/red arc moves with the closest actual check interactions
                around the workload. Locked workload gates cannot be moved or
                deleted.
              </p>
              <CircuitFigure
                name={`school-${number}`}
                caption={
                  number === 3
                    ? "S-gate CPC: H, controlled X, S, controlled Y, H, then syndrome measurement."
                    : number === 4
                      ? "A Z opening evolves through H and CNOT into a two-wire X closing product."
                      : number === 5
                        ? "Z checks close across T; X/Y checks require non-Pauli transport."
                        : "Short two-qubit workload with a high-noise CX interaction on q0–q1."
                }
              />

              <p>
                Test deterministic X/Z faults separately from probabilistic
                hardware channels. Neither a quiet syndrome nor a matching
                output histogram proves the operator identity.
              </p>
            </>
          }
          knowledge={
            questions.length > 0 ? (
              <>
                {questions.map((q) => (
                  <fieldset key={q.id}>
                    <legend>{q.text}</legend>
                    {q.options.map((o) => (
                      <McqOption
                        key={o}
                        name={q.id}
                        checked={progress.value.answers[q.id] === o}
                        onChange={() =>
                          progress.setValue((p) => ({
                            ...p,
                            answers: { ...p.answers, [q.id]: o },
                          }))
                        }
                      >
                        {o}
                      </McqOption>
                    ))}
                    {progress.value.answers[q.id] && (
                      <p role="status">
                        {progress.value.answers[q.id] === q.correct
                          ? "✓ Correct. "
                          : "Try again. "}
                        {q.explanation}
                      </p>
                    )}
                  </fieldset>
                ))}
              </>
            ) : undefined
          }
          checklist={
            <>
              <p>
                {progress.value.guided ? "✓" : "○"}{" "}
                {number === 6
                  ? "Experiment with a complete shell"
                  : "Run the guided check with a green closure"}
              </p>
              {number !== 6 && (
                <p>
                  {questions.every(
                    (q) => progress.value.answers[q.id] === q.correct,
                  )
                    ? "✓"
                    : "○"}{" "}
                  Answer the knowledge check
                </p>
              )}
              <button
                className="nw-accent"
                disabled={!complete}
                onClick={onContinue}
              >
                {number === 6
                  ? "Start Main Mission 1"
                  : "Continue to next Flight School →"}
              </button>
              {previous >= number && !complete && (
                <button onClick={onContinue}>
                  Continue with existing access →
                </button>
              )}
            </>
          }
        />
      }
      experiment={
        <>
          <div className="nw-experiment-toolbar">
            <div className="nw-editor-tabs">
              {(["Visual", "Code"] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={work.editor === v}
                  onClick={() => work.setEditor(v)}
                >
                  {v === "Visual" ? "Visual circuit" : "Code"}
                </button>
              ))}
            </div>
            <div className="nw-toolbar-actions">
              <button
                aria-label="Undo circuit edit"
                disabled={!work.canUndo || work.busy || revealing || work.dirty}
                onClick={() => work.history("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo circuit edit"
                disabled={!work.canRedo || work.busy || revealing || work.dirty}
                onClick={() => work.history("redo")}
              >
                ↷
              </button>
              <button
                disabled={work.busy || revealing || work.dirty}
                onClick={() => work.change(initialDraft(number, mode))}
              >
                Reset {mode}
              </button>
              <button
                className="nw-accent"
                disabled={!work.ready || work.busy || revealing}
                onClick={run}
              >
                {work.busy ? "Running…" : "Run circuit"}
              </button>
            </div>
          </div>
          <LabFeedback
            error={work.error}
            notice={[work.notice, progress.notice].filter(Boolean).join(" ")}
            onErrorPane={() => setMobile("Experiment")}
          />
          {number !== 6 && (
            <nav className="ql-techniques" aria-label="Circuit mode">
              {(["guided", "sandbox"] as const).map((m) => (
                <button
                  disabled={revealing || work.busy}
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => onMode(m)}
                >
                  {m === "guided" ? "Guided assembly" : "Blank sandbox"}
                </button>
              ))}
            </nav>
          )}
          <p>
            {mode === "guided"
              ? "Only the data workload is pre-placed. Assemble the helper shell yourself."
              : "Blank canvas. Place your computation and checks in time; no zones or generated shell."}{" "}
            M is terminal on its wire.
          </p>
          {mode === "sandbox" && (
            <div className="nw-qubits">
              <label>
                Data qubits
                <select
                  aria-label="Number of data qubits"
                  value={d.dataQubits}
                  disabled={work.busy || work.dirty}
                  onChange={(e) => resize(+e.target.value, d.ancillas)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Ancillas
                <select
                  aria-label="Number of ancillas"
                  value={d.ancillas}
                  disabled={work.busy || work.dirty}
                  onChange={(e) => resize(d.dataQubits, +e.target.value)}
                >
                  {[1, 2].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Timeline slots
                <select
                  aria-label="Timeline slots"
                  value={d.columns}
                  onChange={(e) =>
                    work.change({ ...d, columns: +e.target.value })
                  }
                >
                  {[12, 16, 20, 24].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {work.dirty && work.editor === "Visual" && (
            <p className="nw-notice">
              Unapplied source.{" "}
              <button onClick={() => void work.applySource()}>
                Apply code
              </button>{" "}
              <button onClick={work.discardSource}>Discard code changes</button>
            </p>
          )}
          <div hidden={work.editor !== "Visual"}>
            <TimelineCanvas
              draft={d}
              onChange={work.change}
              onError={work.setError}
              disabled={work.busy || work.dirty || revealing}
              validation={currentValidation}
            />
          </div>
          <div hidden={work.editor !== "Code"}>
            <CodeEditor
              source={work.source}
              dirty={work.dirty}
              onChange={work.editSource}
              diagnostics={work.diagnostics}
              busy={work.busy || revealing}
              onApply={() => void work.applySource()}
              wrapper="FlightCircuit"
            />
          </div>
          {number === 6 && (
            <HardwareNoiseControls
              value={d.hardware}
              disabled={work.busy || work.dirty || revealing}
              onChange={(hardware) => work.change({ ...d, hardware })}
            />
          )}
          <NativeCode code={!stale ? result?.nativeCode : undefined} />
        </>
      }
      results={
        <>
          <div className="nw-pane-heading">
            <span className="nw-kicker">LIVE VALIDATION & EXECUTION</span>
            <h2>Follow the check</h2>
          </div>
          {currentValidation?.checks.map((c) => (
            <article
              key={c.ancilla}
              className={c.valid ? "uc-valid" : "uc-invalid"}
            >
              <b>
                a{c.ancilla}: {c.valid ? "Closed" : "Incomplete / mismatch"}
              </b>
              <p>{c.message}</p>
              <code>
                {c.opening} → {c.expected}; closing {c.closing}
              </code>
            </article>
          ))}
          {!result ? (
            <p>
              Assemble gates and run to see joint-state probabilities, syndrome
              counts and fidelity. No simulation is fabricated while the engine
              is offline.
            </p>
          ) : (
            <>
              {stale && (
                <p className="nw-notice">
                  Previous run — circuit or noise settings changed. Run again
                  for current results.
                </p>
              )}
              <div className="ql-settings">
                <p>
                  Fidelity{" "}
                  <b>
                    {result.fidelity === null
                      ? "undefined"
                      : result.fidelity.toFixed(5)}
                  </b>
                </p>
                <p>
                  Kept fraction <b>{result.retention.toFixed(5)}</b>
                </p>
                <p>
                  Sampling overhead{" "}
                  <b>{result.samplingOverhead?.toFixed(3) ?? "∞"}×</b>
                </p>
                <p>
                  Combined score <b>{result.score.toFixed(5)}</b>{" "}
                  {number === 6
                    ? `/ target ${result.qualificationThreshold?.toFixed(3) ?? "0.620"}`
                    : ""}
                </p>
              </div>
              {number === 6 && (
                <p>
                  Unchecked score: {result.baselineScore.toFixed(5)}.
                  Qualification needs max(0.62, unchecked score + 0.01).{" "}
                  {result.qualificationThreshold! > 1
                    ? "These noise settings leave no qualification headroom; reset the guided circuit to restore the calibrated lesson."
                    : ""}
                </p>
              )}
              <ShotHistogram
                kept={result.keptShots}
                discarded={result.discardedShots}
              />
              <p>
                Exact score uses exact retention. Counts fluctuate from{" "}
                {result.totalShots} seeded shots.
              </p>
              <div className="ql-settings">
                {Object.entries(result.syndromeCounts).map(([s, n]) => (
                  <span key={s}>
                    Syndrome {s}: {n}{" "}
                  </span>
                ))}
              </div>
              {result.warnings.map((w) => (
                <p className="nw-notice" key={w}>
                  {w}
                </p>
              ))}
              <QuantumStateView
                frame={result.joint}
                label="Joint data and ancilla state"
              />
              <div className="ql-state-grid">
                <StateCard
                  title="Ideal data output"
                  state={result.ideal}
                  qubit={0}
                  basis="Z"
                />
                <StateCard
                  title="Unprotected noisy data"
                  state={result.baseline}
                  qubit={0}
                  basis="Z"
                />
                <StateCard
                  title="Post-selected data"
                  state={result.output}
                  qubit={0}
                  basis="Z"
                />
              </div>
            </>
          )}
          {number === 6 && !stale && (
            <>
              {revealing && (
                <p role="status">
                  Running the actual Paulice search and enumerating 15 reference
                  shells under your hardware settings…
                </p>
              )}
              {revealError && (
                <p role="alert">
                  {revealError}{" "}
                  <button onClick={() => setRetry((v) => v + 1)}>
                    Retry comparison
                  </button>
                </p>
              )}
              {reveal && (
                <section aria-label="Qualification comparison">
                  <h2>Your result and optimal reference shell</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th>Fps</th>
                        <th>Kept fraction</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Your shell", reveal.player],
                        ["Best reference shell", reveal.reference.best],
                      ].map(([label, r]) => {
                        const v = r as Reveal["player"];
                        return (
                          <tr key={label as string}>
                            <td>{label as string}</td>
                            <td>{v.fidelity?.toFixed(5)}</td>
                            <td>{v.retention.toFixed(5)}</td>
                            <td>{v.score.toFixed(5)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p>{reveal.reference.scope}</p>
                  <p>
                    General upper bound: {reveal.reference.globalUpperBound}.
                    Reference opening Pauli:{" "}
                    {reveal.reference.best.openingPauli}.
                  </p>
                  <details>
                    <summary>Exact reference placement</summary>
                    <pre>{draftCode(reveal.reference.best.draft)}</pre>
                  </details>
                  <h3>Actual qiskit-paulice research result</h3>
                  <p>{reveal.paulice.message}</p>
                  {reveal.paulice.available ? (
                    <>
                      <p>
                        Package {reveal.paulice.packageVersion} · native gamma
                        cost {reveal.paulice.nativeCost ?? "unavailable"}
                      </p>
                      <details>
                        <summary>Paulice circuit and supports</summary>
                        <pre>
                          {JSON.stringify(
                            {
                              support: reveal.paulice.checkSupport,
                              circuit: reveal.paulice.instructions,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                      <button
                        className="nw-accent"
                        onClick={() =>
                          progress.setValue((p) => ({ ...p, reviewed: true }))
                        }
                      >
                        I reviewed the comparison
                      </button>
                      {progress.value.reviewed && (
                        <button className="nw-accent" onClick={onContinue}>
                          Start Main Mission 1
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setRetry((v) => v + 1)}>
                      Retry actual Paulice search
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </>
      }
    />
  );
}
