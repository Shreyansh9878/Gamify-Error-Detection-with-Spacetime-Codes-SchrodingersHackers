"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import {
  CheckDraft,
  CheckResult,
  CheckValidation,
  checkDraftSchema,
  guidedInitial,
  sandboxInitial,
} from "@/lib/learning/contracts";
import { checkCode } from "@/lib/learning/code-generation";
import { checkTheory } from "@/lib/learning/content";
import { checkExamples, checkQuestion } from "@/lib/learning/examples";
import { useLocalProgress, useWorkbench } from "@/lib/learning/useWorkbench";
import { MobilePane } from "../workspace/LearningWorkspace";
import {
  LabFrame,
  LabFeedback,
  CodeEditor,
  NativeCode,
} from "../learning/LabFrame";
import { LabTheory } from "../learning/LabTheory";
import { resizedFaults } from "@/lib/circuit-workspace/adapters";
import { CheckCanvas } from "../circuit-workspace/CheckCanvas";
import type {
  AdvancedDraft,
  AdvancedValidation,
} from "@/lib/advanced-learning/contracts";
import { CircuitPreview } from "../learning/CircuitPreview";

import { CheckTelemetry } from "./CheckTelemetry";
const progressSchema = z
  .object({
    contentVersion: z.literal("spacetime-checks-v1"),
    guided: z.boolean(),
    sandbox: z.boolean(),
    quizPassed: z.boolean(),
    answer: z.enum(["", "A", "B", "C", "D"]),
    submitted: z.boolean(),
    mode: z.enum(["guided", "sandbox"]),
    faultsEnabled: z.boolean(),
    basis: z.enum(["Z", "X"]),
    qubit: z.number().int().min(0).max(2),
    shots: z.union([z.literal(256), z.literal(1024), z.literal(4096)]),
    seed: z.number().int().min(0).max(2147483647),
  })
  .refine(
    (p) => !p.quizPassed || (p.answer === "B" && p.submitted),
    "Quiz completion needs the correct submitted answer.",
  );
const initialProgress: z.infer<typeof progressSchema> = {
  contentVersion: "spacetime-checks-v1",
  guided: false,
  sandbox: false,
  quizPassed: false,
  answer: "",
  submitted: false,
  mode: "guided",
  faultsEnabled: false,
  basis: "Z",
  qubit: 0,
  shots: 1024,
  seed: 2026,
};
const extras = (d: CheckDraft) => ({
  mode: d.mode,
  combineFaults: d.combineFaults,
});
interface Sweep {
  fingerprint: string;
  probes: {
    boundary: number;
    qubit: number;
    pauli: string;
    flagProbability: number;
    helpers: number[];
    propagated: string;
  }[];
  meaning: string;
}
export function CheckLab({
  onContinue,
  onSkip,
  onBack,
  onLesson,
  previous,
}: {
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  onLesson: (step: number) => void;
  previous: number;
}) {
  const guided = useWorkbench(
      "quantum-shield.flight-school-3.draft.v1.guided",
      guidedInitial,
      checkDraftSchema,
      checkCode,
      "tutorial/check-lab/compile",
      "draft",
      extras,
    ),
    sandbox = useWorkbench(
      "quantum-shield.flight-school-3.draft.v1.sandbox",
      sandboxInitial,
      checkDraftSchema,
      checkCode,
      "tutorial/check-lab/compile",
      "draft",
      extras,
    ),
    progress = useLocalProgress(
      "quantum-shield.flight-school-3.progress.v1",
      progressSchema,
      initialProgress,
    );
  const p = progress.value,
    access = p.guided || previous >= 3,
    mode = p.mode === "sandbox" && access ? "sandbox" : "guided",
    work = mode === "guided" ? guided : sandbox,
    d = work.model;
  const [mobile, setMobile] = useState<MobilePane>("Theory"),
    [validation, setValidation] = useState<CheckValidation | null>(null),
    [results, setResults] = useState<{
      guided: CheckResult | null;
      sandbox: CheckResult | null;
    }>({ guided: null, sandbox: null }),
    [accepted, setAccepted] = useState<{ guided: string; sandbox: string }>({
      guided: "",
      sandbox: "",
    }),
    [view, setView] = useState(0),
    [pending, setPending] = useState<CheckDraft | null>(null),
    [sweep, setSweep] = useState<Sweep | null>(null),
    [theoryDemo, setTheoryDemo] = useState<CheckValidation | null>(null);
  const complete = p.guided && p.sandbox && p.quizPassed,
    body = (
      draft: CheckDraft,
      seed = p.seed,
      faultsEnabled = p.faultsEnabled,
    ) => ({
      draft,
      faultsEnabled,
      observable: {
        qubit: Math.min(p.qubit, draft.dataQubits - 1),
        basis: p.basis,
      },
      shotsPerVariant: p.shots,
      sampleSeed: seed,
    }),
    key = JSON.stringify(body(d)),
    result = results[mode],
    stale = work.dirty || accepted[mode] !== key;
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
        void api<CheckValidation>("tutorial/check-lab/validate", body(d))
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
  }, [key, work.ready, work.busy, work.dirty]);
  function setting(v: Partial<typeof p>) {
    work.invalidate();
    progress.setValue((prev) => ({ ...prev, ...v }));
  }
  function switchMode(next: "guided" | "sandbox") {
    if (work.dirty) {
      work.setError(
        "Apply or discard unapplied source before switching modes. Each mode keeps its own draft.",
      );
      return;
    }
    if (next === "sandbox" && !access) return;
    work.invalidate();
    setPending(null);
    setValidation(null);
    setting({ mode: next, faultsEnabled: next === "sandbox" });
  }
  function change(next: CheckDraft) {
    const ok = work.change(next);
    if (ok) setPending(null);
    return ok;
  }
  function run(seed = p.seed) {
    void work.execute<CheckResult>(
      "tutorial/check-lab/run",
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
          guided: prev.guided || r.guidedSuccess,
          sandbox: prev.sandbox || r.sandboxSuccess,
        }));
        setMobile("Results");
      },
    );
  }
  function resize(n: number) {
    const gates = [...d.preparation, ...d.payload].filter((g) =>
        g.qubits.some((q) => q >= n),
      ),
      taps = d.checks.some((c) =>
        [...c.openingTaps, ...c.closingTaps].some((t) => t.qubit >= n),
      ),
      faults = d.faults.some((f) =>
        f.targets
          ? f.targets.some((t) => t.kind === "data" && t.index >= n)
          : f.qubit >= n,
      );
    const next = {
      ...d,
      dataQubits: n,
      preparation: d.preparation.filter((g) => !g.qubits.some((q) => q >= n)),
      payload: d.payload.filter((g) => !g.qubits.some((q) => q >= n)),
      checks: d.checks.map((c) => ({
        ...c,
        openingTaps: c.openingTaps.filter((t) => t.qubit < n),
        closingTaps: c.closingTaps.filter((t) => t.qubit < n),
      })),
      faults: resizedFaults(d.faults, n),
    };
    if (gates.length || taps || faults) setPending(next);
    else change(next);
    setView((q) => Math.min(q, n - 1));
  }
  const quiz = (
    <section className="nw-quiz">
      <p className="nw-kicker">SINGLE-QUBIT OPERATOR EVOLUTION</p>
      <h2>Flight School 3 Knowledge Check</h2>
      <p>{checkQuestion.prompt}</p>
      <fieldset disabled={p.quizPassed}>
        <legend>Select one closing operator</legend>
        {checkQuestion.options.map((option, i) => (
          <label key={option}>
            <input
              type="radio"
              name="closing-operator-answer"
              value={String.fromCharCode(65 + i)}
              checked={p.answer === String.fromCharCode(65 + i)}
              onChange={(e) =>
                progress.setValue((prev) => ({
                  ...prev,
                  answer: e.target.value as "A" | "B" | "C" | "D",
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
            quizPassed: prev.answer === "B",
          }))
        }
      >
        Check answer
      </button>
      {p.submitted && (
        <div
          className={p.quizPassed ? "nw-feedback-correct" : "nw-feedback-wrong"}
          role="status"
        >
          <h3>
            {p.quizPassed
              ? "✓ Correct — P′ = Y"
              : "Try again — evaluate S X S†"}
          </h3>
          <p>{checkQuestion.explanation}</p>
          <pre className="nw-formula">
            {
              "S X S† = [[1,0],[0,i]] [[0,1],[1,0]] [[1,0],[0,−i]]\n       = [[0,−i],[i,0]] = Y"
            }
          </pre>
        </div>
      )}
      <p>
        Completion requires the guided noiseless check, one valid nontrivial
        sandbox fault experiment, and this correct answer. No particular
        syndrome outcome is required.
      </p>
      {complete && (
        <div className="nw-complete">
          <h2>Flight School 3 complete</h2>
          <p>Spacetime Check Architect</p>
          <button className="nw-accent" onClick={onContinue}>
            Continue to Flight School 4 →
          </button>
        </div>
      )}
      <button onClick={() => setMobile("Experiment")}>Experiment more</button>
    </section>
  );
  return (
    <LabFrame
      number={3}
      title="Coherent Pauli Checks & Spacetime Detection"
      complete={complete}
      previous={previous}
      onBack={onBack}
      onSkip={onSkip}
      onLesson={onLesson}
      mobile={mobile}
      setMobile={setMobile}
      theory={
        <LabTheory
          number={3}
          title="Coherent Pauli Checks & Spacetime Detection"
          source={checkTheory}
          knowledge={quiz}
          examples={
            <>
              {checkExamples.map((e) => (
                <article className="nw-example" key={e.title}>
                  <h2>{e.title}</h2>
                  <p>{e.description}</p>
                  <button
                    disabled={!access || work.dirty}
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
              <button
                disabled={work.busy}
                onClick={() =>
                  void api<CheckValidation>("tutorial/check-lab/validate", {
                    ...body(checkExamples[3].draft),
                    faultsEnabled: false,
                  })
                    .then(setTheoryDemo)
                    .catch((e) => work.setError((e as Error).message))
                }
              >
                Trace theory example · X0 through two CX gates
              </button>
              {theoryDemo && (
                <>
                  <div className="ql-propagation">
                    {theoryDemo.checks[0].steps.map((s, i) => (
                      <span key={i}>
                        <b>{s.operator}</b>
                        <small>{s.label}</small>
                      </span>
                    ))}
                  </div>
                  <CircuitPreview
                    title="Theory example — no progression credit"
                    items={theoryDemo.instructions}
                    labels={theoryDemo.wireLabels}
                  />
                </>
              )}
            </>
          }
          checklist={
            <>
              <b>Flight School 3 progress</b>
              <span>
                {p.guided ? "✓" : "○"} Guided X → S → Y, noiseless run
              </span>
              <span>
                {p.sandbox ? "✓" : "○"} Valid sandbox fault experiment
              </span>
              <span>
                {p.quizPassed ? "✓" : "○"} Operator-evolution knowledge check
              </span>
              {complete && (
                <button className="nw-accent" onClick={onContinue}>
                  Continue to Flight School 4 →
                </button>
              )}
              {previous >= 3 && !complete && (
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
                disabled={work.dirty || work.busy || !work.canUndo}
                onClick={() => work.history("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo circuit edit"
                disabled={work.dirty || work.busy || !work.canRedo}
                onClick={() => work.history("redo")}
              >
                ↷
              </button>
              <button
                disabled={work.dirty || work.busy}
                onClick={() =>
                  change(mode === "guided" ? guidedInitial : sandboxInitial)
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
                    ? "Run invalid check — diagnostic"
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
              Guided S-gate
            </button>
            <button
              aria-pressed={mode === "sandbox"}
              disabled={!access}
              onClick={() => switchMode("sandbox")}
            >
              {access
                ? "Custom sandbox"
                : "🔒 Custom sandbox — complete guided check"}
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
                  <option key={q} value={q}>
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
                {[256, 1024, 4096].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          {work.dirty && work.editor === "Visual" && (
            <div className="nw-notice">
              Unapplied source; visual shows the last valid draft.{" "}
              <button onClick={() => void work.applySource()}>
                Apply code
              </button>
              <button onClick={work.discardSource}>Discard code changes</button>
            </div>
          )}
          {pending && (
            <div className="nw-notice" role="alert">
              This removes affected gates/check factors/faults or replaces the
              isolated fault. No retargeting is hidden.{" "}
              <button onClick={() => change(pending)}>
                Confirm undoable change
              </button>
              <button onClick={() => setPending(null)}>Cancel</button>
            </div>
          )}
          <div hidden={work.editor !== "Visual"}>
            <div className="nw-qubits">
              <label>
                Data qubits
                <select
                  aria-label="Number of data qubits"
                  disabled={mode === "guided" || work.busy || work.dirty}
                  value={d.dataQubits}
                  onChange={(e) => resize(+e.target.value)}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <span>
                One timeline · local check boundaries retain their physical
                order
              </span>
            </div>
            <CheckCanvas
              lesson={3}
              draft={d as unknown as AdvancedDraft}
              validation={validation as AdvancedValidation | null}
              onChange={(next) => change(next as unknown as CheckDraft)}
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
              wrapper="CheckCircuit"
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
                    : validation.structureComplete
                      ? "✕ Invalid check / diagnostic"
                      : "◌ Incomplete physical check"}
                </h3>
                <p>{validation.message}</p>
                <p>
                  Combined schedule:{" "}
                  {validation.scheduleValid ? "valid" : "not certified"} ·
                  structural completeness:{" "}
                  {String(validation.structureComplete)}
                </p>
              </div>
            </div>
          )}
          {p.guided && mode === "guided" && (
            <div className="nw-complete">
              <h3>Guided check complete — custom sandbox unlocked</h3>
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
                  void work.execute<Sweep>(
                    "tutorial/check-lab/coverage",
                    (draft) => body(draft),
                    setSweep,
                  )
                }
              >
                Sweep single X/Z fault coverage
              </button>
              {sweep && (
                <details open>
                  <summary>
                    {sweep.probes.length} tested fault locations · not a
                    hardware score
                  </summary>
                  <p>{sweep.meaning}</p>
                  <div className="nw-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Boundary</th>
                          <th>Wire / error</th>
                          <th>Flag</th>
                          <th>Final propagated operator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sweep.probes.map((v, i) => (
                          <tr key={i}>
                            <td>{v.boundary}</td>
                            <td>
                              q{v.qubit} / {v.pauli}
                            </td>
                            <td>
                              {v.flagProbability ? "✓ flagged" : "No flag"}
                            </td>
                            <td>{v.propagated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
          <NativeCode code={validation?.nativeCode} />
        </>
      }
      results={
        <CheckTelemetry
          result={result}
          stale={stale}
          basis={result?.observable.basis || p.basis}
          view={Math.min(view, d.dataQubits - 1)}
          onView={setView}
          n={d.dataQubits}
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
