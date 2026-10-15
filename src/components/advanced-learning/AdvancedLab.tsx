"use client";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { useWorkbench, useLocalProgress } from "@/lib/learning/useWorkbench";
import {
  AdvancedDraft,
  AdvancedValidation,
  AdvancedResult,
  Coverage,
  draftSchema,
  guidedInitial,
  sandboxInitial,
} from "@/lib/advanced-learning/contracts";
import { advancedCode } from "@/lib/advanced-learning/code-generation";
import {
  entanglingTheory,
  nonCliffordTheory,
} from "@/lib/advanced-learning/content";
import { examples, questions } from "@/lib/advanced-learning/examples";
import {
  LabFrame,
  LabFeedback,
  CodeEditor,
  NativeCode,
} from "../learning/LabFrame";
import { LabTheory } from "../learning/LabTheory";
import { CircuitPreview, ResourceSummary } from "../learning/CircuitPreview";
import { MobilePane } from "../workspace/LearningWorkspace";
import { resizedFaults } from "@/lib/circuit-workspace/adapters";
import { CheckCanvas } from "../circuit-workspace/CheckCanvas";

import { SimulationTelemetry } from "./SimulationTelemetry";

const progressSchema = z
  .object({
    contentVersion: z.literal(1),
    guided: z.boolean(),
    barrier: z.boolean(),
    compatible: z.boolean(),
    sandbox: z.boolean(),
    quizPassed: z.boolean(),
    recapPassed: z.boolean().default(false),
    recapAnswer: z.enum(["", "A", "B", "C", "D"]).default(""),
    answer: z.enum(["", "A", "B", "C", "D"]),
    submitted: z.boolean(),
    mode: z.enum(["guided", "sandbox"]),
    faultsEnabled: z.boolean(),
    basis: z.enum(["Z", "X"]),
    qubit: z.number().int().min(0).max(4),
    shots: z.union([z.literal(256), z.literal(1024), z.literal(4096)]),
    seed: z.number().int().min(0).max(2147483647),
  })
  .refine((p) => !p.recapPassed || p.recapAnswer === "B")
  .refine((p) => !p.quizPassed || (p.answer === "C" && p.submitted));
const initialProgress: z.infer<typeof progressSchema> = {
  contentVersion: 1,
  guided: false,
  barrier: false,
  compatible: false,
  sandbox: false,
  quizPassed: false,
  recapPassed: false,
  recapAnswer: "",
  answer: "",
  submitted: false,
  mode: "guided",
  faultsEnabled: false,
  basis: "Z",
  qubit: 0,
  shots: 1024,
  seed: 2026,
};
const extras = (d: AdvancedDraft) => ({
  mode: d.mode,
  combineFaults: d.combineFaults,
});
export interface LessonProps {
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  onLesson: (n: number) => void;
  previous: number;
}

export function AdvancedLab({
  number,
  onContinue,
  onSkip,
  onBack,
  onLesson,
  previous,
}: LessonProps & { number: 4 | 5 }) {
  const nc = number === 5,
    path = `tutorial/${nc ? "non-clifford-lab" : "entangling-lab"}`,
    title = nc
      ? "The T-Gate Barrier & Commutation Rules"
      : "Multi-Qubit Pauli Propagation & Entangling Checks";
  const schema = useMemo(() => draftSchema(nc), [nc]);
  const generate = (d: AdvancedDraft) => advancedCode(d, nc);
  const guided = useWorkbench(
    `quantum-shield.flight-school-${number}.draft.v1.guided`,
    guidedInitial(nc),
    schema,
    generate,
    `${path}/compile`,
    "draft",
    extras,
  );
  const sandbox = useWorkbench(
    `quantum-shield.flight-school-${number}.draft.v1.sandbox`,
    sandboxInitial(nc),
    schema,
    generate,
    `${path}/compile`,
    "draft",
    extras,
  );
  const progress = useLocalProgress(
      `quantum-shield.flight-school-${number}.progress.v1`,
      progressSchema,
      initialProgress,
    ),
    p = progress.value;
  const access = (nc ? p.compatible : p.guided) || previous >= number,
    mode = p.mode === "sandbox" && access ? "sandbox" : "guided",
    work = mode === "guided" ? guided : sandbox,
    d = work.model;
  const [mobile, setMobile] = useState<MobilePane>("Theory"),
    [validation, setValidation] = useState<AdvancedValidation | null>(null),
    [results, setResults] = useState<{
      guided: AdvancedResult | null;
      sandbox: AdvancedResult | null;
    }>({ guided: null, sandbox: null }),
    [accepted, setAccepted] = useState({ guided: "", sandbox: "" }),
    [view, setView] = useState(0),
    [pending, setPending] = useState<AdvancedDraft | null>(null),
    [sweep, setSweep] = useState<Coverage | null>(null),
    [demo, setDemo] = useState<AdvancedValidation | null>(null);
  const body = (draft: AdvancedDraft, seed = p.seed) => ({
    draft,
    faultsEnabled: p.faultsEnabled,
    observable: {
      qubit: Math.min(p.qubit, draft.dataQubits - 1),
      basis: p.basis,
    },
    shotsPerVariant: p.shots,
    sampleSeed: seed,
  });
  const key = JSON.stringify(body(d)),
    result = results[mode],
    stale = work.dirty || accepted[mode] !== key,
    complete = (nc ? p.compatible : p.guided && p.recapPassed) && p.quizPassed;
  useEffect(() => {
    setValidation(null);
    setSweep(null);
  }, [key, work.dirty]);
  useEffect(() => {
    if (!work.ready || work.busy || work.dirty) return;
    let alive = true;
    const token = work.revision.current;
    const timer = setTimeout(
      () =>
        void api<AdvancedValidation>(`${path}/validate`, body(d))
          .then((r) => {
            if (alive && token === work.revision.current) setValidation(r);
          })
          .catch((e) => {
            if (alive && token === work.revision.current)
              work.setError((e as Error).message);
          }),
      300,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [key, work.ready, work.busy, work.dirty, path]);
  function setting(v: Partial<typeof p>) {
    work.invalidate();
    progress.setValue((prev) => ({ ...prev, ...v }));
  }
  function change(next: AdvancedDraft) {
    const ok = work.change(next);
    if (ok) setPending(null);
    return ok;
  }
  function switchMode(next: "guided" | "sandbox") {
    if (work.dirty) {
      work.setError("Apply or discard source before switching modes.");
      return;
    }
    if (next === "sandbox" && !access) return;
    work.invalidate();
    setValidation(null);
    setPending(null);
    setting({ mode: next, faultsEnabled: next === "sandbox" });
  }
  function run(seed = p.seed) {
    void work.execute<AdvancedResult>(
      `${path}/run`,
      (draft) => body(draft, seed),
      (r, current) => {
        setResults((prev) => ({ ...prev, [mode]: r }));
        setAccepted((prev) => ({
          ...prev,
          [mode]: JSON.stringify(body(current, seed)),
        }));
        setValidation(r);
        progress.setValue((prev) => ({
          ...prev,
          barrier: prev.barrier || r.barrierSuccess,
          compatible: prev.compatible || r.compatibleSuccess,
          guided:
            prev.guided ||
            r.guidedSuccess ||
            ((prev.barrier || r.barrierSuccess) &&
              (prev.compatible || r.compatibleSuccess)),
          sandbox: prev.sandbox || r.sandboxSuccess,
        }));
        setMobile("Results");
      },
    );
  }
  function resize(n: number) {
    const removed = [...d.preparation, ...d.payload].filter((g) =>
      g.qubits.some((q) => q >= n),
    );
    const affected =
      removed.length ||
      d.checks.some((c) =>
        [...c.openingTaps, ...c.closingTaps].some((t) => t.qubit >= n),
      ) ||
      d.faults.some((f) =>
        f.targets
          ? f.targets.some((t) => t.kind === "data" && t.index >= n)
          : f.qubit >= n,
      );
    const next = {
      ...d,
      dataQubits: n,
      preparation: d.preparation.filter((g) => g.qubits.every((q) => q < n)),
      payload: d.payload.filter((g) => g.qubits.every((q) => q < n)),
      checks: d.checks.map((c) => ({
        ...c,
        openingTaps: c.openingTaps.filter((t) => t.qubit < n),
        closingTaps: c.closingTaps.filter((t) => t.qubit < n),
      })),
      faults: resizedFaults(d.faults, n),
    };
    if (affected) setPending(next);
    else change(next);
    setView((q) => Math.min(q, n - 1));
  }
  const question = questions[number],
    quiz = (
      <section className="nw-quiz">
        <p className="nw-kicker">OPERATOR EVOLUTION</p>
        <h2>Flight School {number} Knowledge Check</h2>
        <p>{question.prompt}</p>
        <fieldset disabled={p.quizPassed}>
          <legend>Select one answer</legend>
          {question.options.map((option, i) => (
            <label key={option}>
              <input
                type="radio"
                name={`quiz-${number}`}
                checked={p.answer === String.fromCharCode(65 + i)}
                onChange={() =>
                  progress.setValue((prev) => ({
                    ...prev,
                    answer: String.fromCharCode(65 + i) as
                      "A" | "B" | "C" | "D",
                    submitted: false,
                  }))
                }
              />
              {option}
            </label>
          ))}
        </fieldset>
        <button
          className="nw-accent"
          disabled={!p.answer}
          onClick={() =>
            progress.setValue((prev) => ({
              ...prev,
              submitted: true,
              quizPassed: prev.answer === "C",
            }))
          }
        >
          Check answer
        </button>
        {p.submitted && (
          <div
            role="status"
            className={
              p.quizPassed ? "nw-feedback-correct" : "nw-feedback-wrong"
            }
          >
            <h3>
              {p.quizPassed ? "✓ Correct" : "Try again — follow the operator"}
            </h3>
            <p>{question.explanation}</p>
          </div>
        )}
        <p>
          {nc
            ? "Run a valid Z-supported T crossing and answer C correctly."
            : "Run the guided noiseless multiwire check and answer both local questions."}{" "}
          No particular random syndrome sample is required.
        </p>
        {!nc && (
          <fieldset disabled={p.recapPassed}>
            <legend>Recap: opening X before S. Which closing operator?</legend>
            {["A) X", "B) Y", "C) Z", "D) I"].map((text, i) => (
              <label key={text}>
                <input
                  type="radio"
                  name="fs4-recap"
                  checked={p.recapAnswer === String.fromCharCode(65 + i)}
                  onChange={() =>
                    progress.setValue((prev) => ({
                      ...prev,
                      recapAnswer: String.fromCharCode(65 + i) as
                        "A" | "B" | "C" | "D",
                    }))
                  }
                />
                {text}
              </label>
            ))}
            <button
              disabled={!p.recapAnswer}
              onClick={() =>
                progress.setValue((prev) => ({
                  ...prev,
                  recapPassed: prev.recapAnswer === "B",
                }))
              }
            >
              Check S-gate recap
            </button>
            <p>
              {p.recapPassed
                ? "✓ Correct: S X S† = Y"
                : "Choose Y: an incorrect closing can cause false alarms."}
            </p>
          </fieldset>
        )}
        {complete && (
          <div className="nw-complete">
            <h2>Flight School {number} complete</h2>
            <p>
              {nc ? "Non-Clifford Navigator" : "Entangling Spacetime Architect"}
            </p>
            <button className="nw-accent" onClick={onContinue}>
              Continue to Flight School {number + 1} →
            </button>
          </div>
        )}
      </section>
    );
  return (
    <LabFrame
      number={number}
      title={title}
      complete={complete}
      previous={previous}
      onBack={onBack}
      onSkip={onSkip}
      onLesson={onLesson}
      mobile={mobile}
      setMobile={setMobile}
      theory={
        <LabTheory
          number={number}
          title={title}
          source={nc ? nonCliffordTheory : entanglingTheory}
          knowledge={quiz}
          examples={
            <>
              {examples(nc).map((e) => (
                <article className="nw-example" key={e.title}>
                  <h2>{e.title}</h2>
                  <p>{e.description}</p>
                  <button
                    disabled={work.busy}
                    onClick={() =>
                      void api<AdvancedValidation>(`${path}/validate`, {
                        ...body(e.draft),
                        faultsEnabled: false,
                      })
                        .then(setDemo)
                        .catch((e) => work.setError((e as Error).message))
                    }
                  >
                    Preview theory: {e.title}
                  </button>
                  <button
                    disabled={!access || work.dirty || work.busy}
                    onClick={() => {
                      if (sandbox.change(e.draft)) {
                        setting({
                          mode: "sandbox",
                          faultsEnabled: !!e.draft.faults.length,
                        });
                        setMobile("Experiment");
                      }
                    }}
                  >
                    Load example: {e.title}
                  </button>
                </article>
              ))}
              {demo && (
                <>
                  <p>{demo.message}</p>
                  <CircuitPreview
                    title="Theory example — no completion evidence"
                    items={demo.instructions}
                    labels={demo.wireLabels}
                  />
                </>
              )}
            </>
          }
          checklist={
            <>
              <b>Flight School {number} progress</b>
              {nc ? (
                <>
                  <span>{p.barrier ? "✓" : "○"} Optional X/T diagnostic</span>
                  <span>
                    {p.compatible ? "✓" : "○"} Z → T → Z compatible run
                  </span>
                </>
              ) : (
                <>
                  <span>{p.guided ? "✓" : "○"} Guided X0 → CX → X0 X1</span>
                  <span>{p.recapPassed ? "✓" : "○"} S-gate recap (B)</span>
                </>
              )}
              <span>{p.quizPassed ? "✓" : "○"} Knowledge check</span>
              {complete && (
                <button className="nw-accent" onClick={onContinue}>
                  Continue to Flight School {number + 1} →
                </button>
              )}
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
              {(["Visual", "Code"] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={work.editor === t}
                  onClick={() => work.setEditor(t)}
                >
                  {t === "Visual" ? "Visual circuit" : "Code"}
                </button>
              ))}
            </div>
            <div className="nw-toolbar-actions">
              <button
                aria-label="Undo circuit edit"
                disabled={work.busy || work.dirty || !work.canUndo}
                onClick={() => work.history("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo circuit edit"
                disabled={work.busy || work.dirty || !work.canRedo}
                onClick={() => work.history("redo")}
              >
                ↷
              </button>
              <button
                disabled={work.busy || work.dirty}
                onClick={() =>
                  change(
                    mode === "guided" ? guidedInitial(nc) : sandboxInitial(nc),
                  )
                }
              >
                Reset {mode}
              </button>
              <button
                className="nw-accent"
                disabled={
                  !work.ready ||
                  work.busy ||
                  (!work.dirty && !validation?.structureComplete)
                }
                onClick={() => run()}
              >
                {work.busy
                  ? "Running…"
                  : validation?.structureComplete && !validation.valid
                    ? "Run diagnostic experiment"
                    : "Run check experiment"}
              </button>
            </div>
          </div>
          <LabFeedback
            error={work.error}
            notice={[work.notice, progress.notice].filter(Boolean).join(" ")}
            onErrorPane={() => setMobile("Experiment")}
          />
          <div className="ql-techniques">
            <button
              aria-pressed={mode === "guided"}
              onClick={() => switchMode("guided")}
            >
              {nc ? "Guided T comparison" : "Guided CX assembly"}
            </button>
            <button
              aria-pressed={mode === "sandbox"}
              disabled={!access}
              onClick={() => switchMode("sandbox")}
            >
              {access
                ? "Custom sandbox"
                : "🔒 Custom sandbox — finish guided runs"}
            </button>
          </div>
          <div className="ql-settings">
            <label className="nw-combine">
              <input
                type="checkbox"
                aria-label="Enable explicit faults"
                checked={p.faultsEnabled}
                onChange={(e) => setting({ faultsEnabled: e.target.checked })}
              />
              Enable explicit faults
            </label>
            <label>
              Measurement basis
              <select
                aria-label="Measurement basis"
                value={p.basis}
                onChange={(e) =>
                  setting({ basis: e.target.value as "X" | "Z" })
                }
              >
                <option>Z</option>
                <option>X</option>
              </select>
            </label>
            <label>
              Observable wire
              <select
                aria-label="Observable wire"
                value={Math.min(p.qubit, d.dataQubits - 1)}
                onChange={(e) => setting({ qubit: +e.target.value })}
              >
                {Array.from({ length: d.dataQubits }, (_, q) => (
                  <option value={q} key={q}>
                    q{q}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shots
              <select
                aria-label="Shots per variant"
                value={p.shots}
                onChange={(e) =>
                  setting({ shots: +e.target.value as 256 | 1024 | 4096 })
                }
              >
                {[256, 1024, 4096].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {pending && (
            <div className="nw-notice" role="alert">
              This removes affected out-of-range operations/factors, or replaces
              the isolated fault. No targets move silently.
              <button onClick={() => change(pending)}>
                Confirm undoable change
              </button>
              <button onClick={() => setPending(null)}>Cancel</button>
            </div>
          )}
          {work.dirty && work.editor === "Visual" && (
            <div className="nw-notice">
              Unapplied source; visual shows the last valid draft.
              <button onClick={() => void work.applySource()}>
                Apply code
              </button>
              <button onClick={work.discardSource}>Discard code changes</button>
            </div>
          )}
          <div hidden={work.editor !== "Visual"}>
            <div className="nw-qubits">
              <label>
                Data qubits
                <select
                  aria-label="Number of data qubits"
                  value={d.dataQubits}
                  disabled={
                    (!nc && mode === "guided") || work.busy || work.dirty
                  }
                  onChange={(e) => resize(+e.target.value)}
                >
                  {Array.from({ length: nc ? 5 : 4 }, (_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </label>
              <span>
                Single continuous circuit · drag gates, check stages and errors
              </span>
            </div>
            <CheckCanvas
              lesson={number}
              draft={d}
              validation={validation}
              onChange={change}
              disabled={work.busy || work.dirty}
              onError={work.setError}
            />
          </div>
          <div hidden={work.editor !== "Code"}>
            <CodeEditor
              source={work.source}
              dirty={work.dirty}
              onChange={work.editSource}
              diagnostics={work.diagnostics}
              busy={work.busy}
              onApply={() => void work.applySource()}
              wrapper={nc ? "NonCliffordCircuit" : "EntanglingCircuit"}
            />
          </div>
          {validation && (
            <div
              className={`ql-check-schedule ${validation.valid ? "valid" : validation.structureComplete ? "invalid" : "incomplete"}`}
            >
              <div className="ql-classification">
                <h3>
                  {validation.valid
                    ? "✓ Invariant closed"
                    : !validation.structureComplete
                      ? "◌ Incomplete physical check"
                      : validation.scheduleValid
                        ? "Globally closed / outside stepwise Pauli mode"
                        : "✕ Invalid check / diagnostic"}
                </h3>
                <p>{validation.message}</p>
                {nc && (
                  <p>
                    Stepwise transport:{" "}
                    {validation.transportSupported
                      ? "supported"
                      : "unsupported"}{" "}
                    · endpoint match: {String(validation.endpointOperatorMatch)}{" "}
                    · global schedule: {String(validation.scheduleValid)}
                  </p>
                )}
              </div>
              {nc && (
                <section className="al-expansions">
                  <h3>T-gate commutation inspector</h3>
                  {validation.checks.flatMap((c) =>
                    c.steps
                      .filter(
                        (s) =>
                          s.tCompatible !== null && s.tCompatible !== undefined,
                      )
                      .map((s, i) => (
                        <article
                          key={`${c.id}-${i}`}
                          className={s.tCompatible ? "valid" : "invalid"}
                        >
                          <b>
                            {s.label} · column {s.column}:{" "}
                            {s.tCompatible
                              ? "✓ I/Z compatible"
                              : "✕ X/Y leaves Pauli axes"}
                          </b>
                          <code>{s.operator}</code>
                          <small>
                            Coherent operator expansion, not a state or random
                            Pauli mixture.
                          </small>
                        </article>
                      )),
                  )}
                </section>
              )}
              <ResourceSummary value={validation.resources} />
            </div>
          )}
          {p.guided && mode === "guided" && (
            <div className="nw-complete">
              <h3>Guided comparison complete — sandbox unlocked</h3>
              <button
                className="nw-accent"
                onClick={() => switchMode("sandbox")}
              >
                Open custom sandbox →
              </button>
            </div>
          )}
          {mode === "sandbox" && (
            <div className="ql-coverage">
              <button
                disabled={work.busy || work.dirty || !validation?.valid}
                onClick={() =>
                  void work.execute<Coverage>(
                    `${path}/coverage`,
                    (draft) => ({
                      ...body(draft),
                      ...(nc ? { cursor: 0 } : {}),
                    }),
                    setSweep,
                  )
                }
              >
                Sweep X/Y/Z fault coverage
              </button>
              {sweep && (
                <details open>
                  <summary>
                    {sweep.probes.length} / {sweep.total} tested fault locations
                  </summary>
                  <p>{sweep.meaning}</p>
                  <div className="nw-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Boundary</th>
                          <th>Fault</th>
                          <th>Flag probability</th>
                          <th>Propagation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sweep.probes.map((v, i) => (
                          <tr key={i}>
                            <td>{v.boundary}</td>
                            <td>
                              {v.pauli} on q{v.qubit}
                            </td>
                            <td>{(100 * v.flagProbability).toFixed(2)}%</td>
                            <td>{v.propagated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sweep.nextCursor !== null && (
                    <button
                      disabled={work.busy}
                      onClick={() =>
                        void work.execute<Coverage>(
                          `${path}/coverage`,
                          (draft) => ({
                            ...body(draft),
                            cursor: sweep.nextCursor,
                          }),
                          (r) =>
                            setSweep((old) =>
                              old
                                ? { ...r, probes: [...old.probes, ...r.probes] }
                                : r,
                            ),
                        )
                      }
                    >
                      Load next probe page
                    </button>
                  )}
                </details>
              )}
            </div>
          )}
          <NativeCode code={validation?.nativeCode} />
        </>
      }
      results={
        <SimulationTelemetry
          result={result}
          stale={stale}
          basis={result?.observable.basis || p.basis}
          n={result?.draft.dataQubits || d.dataQubits}
          view={Math.min(view, (result?.draft.dataQubits || d.dataQubits) - 1)}
          onView={setView}
          busy={work.busy}
          onResample={() => {
            const seed = (p.seed + 1) % 2147483647;
            setting({ seed });
            run(seed);
          }}
        />
      }
    />
  );
}
