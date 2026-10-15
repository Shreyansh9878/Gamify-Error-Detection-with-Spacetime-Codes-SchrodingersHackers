"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import {
  Experiment,
  experimentSchema,
  initialExperiment,
  ProtectionResult,
  Technique,
  TechniquePreview,
} from "@/lib/learning/contracts";
import { protectionCode } from "@/lib/learning/code-generation";
import { protectionTheory } from "@/lib/learning/content";
import { protectionExamples } from "@/lib/learning/examples";
import { useLocalProgress, useWorkbench } from "@/lib/learning/useWorkbench";
import { MobilePane } from "../workspace/LearningWorkspace";
import {
  LabFrame,
  LabFeedback,
  CodeEditor,
  NativeCode,
} from "../learning/LabFrame";
import { LabTheory } from "../learning/LabTheory";
import { ProtectionCanvas } from "../circuit-workspace/ProtectionCanvas";
import { NoiseControls } from "../learning/NoiseControls";
import { ResourceSummary } from "../learning/CircuitPreview";
import { ProtectionTelemetry } from "./ProtectionTelemetry";
const settingsSchema = z.object({
  technique: z.enum(["detection", "mitigation", "correction"]),
  detectionPauli: z.enum(["X", "Y", "Z"]),
  correctionFamily: z.enum(["bit_flip", "phase_flip"]),
  zneFit: z.enum(["linear", "quadratic"]),
  basis: z.enum(["X", "Z"]),
  qubit: z.number().int().min(0).max(2),
  shots: z.union([z.literal(256), z.literal(1024), z.literal(4096)]),
  seed: z.number().int().min(0).max(2147483647),
});
const progressSchema = z.object({
  contentVersion: z.literal("protection-basics-v1"),
  tried: z.object({
    detection: z.boolean(),
    mitigation: z.boolean(),
    correction: z.boolean(),
  }),
  settings: settingsSchema,
});
const initialProgress: z.infer<typeof progressSchema> = {
  contentVersion: "protection-basics-v1",
  tried: { detection: false, mitigation: false, correction: false },
  settings: {
    technique: "detection",
    detectionPauli: "Z",
    correctionFamily: "bit_flip",
    zneFit: "linear",
    basis: "Z",
    qubit: 0,
    shots: 1024,
    seed: 2026,
  },
};
export function ProtectionLab({
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
  const work = useWorkbench(
      "quantum-shield.flight-school-2.draft.v1",
      initialExperiment,
      experimentSchema,
      protectionCode,
      "tutorial/protection-lab/compile",
      "experiment",
    ),
    progress = useLocalProgress(
      "quantum-shield.flight-school-2.progress.v1",
      progressSchema,
      initialProgress,
    );
  const [mobile, setMobile] = useState<MobilePane>("Theory"),
    [preview, setPreview] = useState<TechniquePreview | null>(null),
    [previewKey, setPreviewKey] = useState(""),
    [results, setResults] = useState<
      Partial<Record<Technique, ProtectionResult>>
    >({}),
    [accepted, setAccepted] = useState<Partial<Record<Technique, string>>>({}),
    [variant, setVariant] = useState(0),
    [view, setView] = useState(0),
    [pending, setPending] = useState<Experiment | null>(null);
  const settings = progress.value.settings,
    complete = Object.values(progress.value.tried).every(Boolean),
    c = work.model,
    observed = Math.min(settings.qubit, c.qubits - 1);
  const body = (experiment: Experiment) => ({
    experiment,
    technique: settings.technique,
    detectionPauli: settings.detectionPauli,
    correctionFamily: settings.correctionFamily,
    zneFit: settings.zneFit,
    observable: {
      qubit: Math.min(settings.qubit, experiment.qubits - 1),
      basis: settings.basis,
    },
    shotsPerVariant: settings.shots,
    sampleSeed: settings.seed,
  });
  const key = JSON.stringify(body(c)),
    result = results[settings.technique],
    stale = work.dirty || accepted[settings.technique] !== key;
  useEffect(() => {
    if (!work.ready || work.busy || work.dirty) return;
    const token = work.revision.current;
    let alive = true;
    const timer = setTimeout(
      () =>
        void api<TechniquePreview>("tutorial/protection-lab/preview", body(c))
          .then((r) => {
            if (alive && token === work.revision.current) {
              setPreview(r);
              setPreviewKey(key);
              setVariant(0);
            }
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
  function setting(v: Partial<typeof settings>) {
    work.invalidate();
    progress.setValue((p) => ({ ...p, settings: { ...p.settings, ...v } }));
  }
  function run(sampleSeed = settings.seed) {
    const requestBody = (m: Experiment) => ({ ...body(m), sampleSeed });
    void work.execute<ProtectionResult>(
      "tutorial/protection-lab/run",
      requestBody,
      (r, current) => {
        setResults((v) => ({ ...v, [r.technique]: r }));
        setAccepted((v) => ({
          ...v,
          [r.technique]: JSON.stringify(requestBody(current)),
        }));
        setPreview(r);
        setPreviewKey(JSON.stringify(requestBody(current)));
        progress.setValue((p) => ({
          ...p,
          tried: { ...p.tried, [r.technique]: true },
        }));
        setMobile("Results");
      },
    );
  }
  function resize(n: number) {
    const affected = c.operations.filter((g) => g.qubits.some((q) => q >= n)),
      noiseAffected = (c.noise.targetQubits || [c.noise.targetQubit]).some(
        (q) => q >= n,
      );
    const next = {
      ...c,
      qubits: n,
      operations: c.operations.filter((g) => !affected.includes(g)),
      noise: noiseAffected
        ? {
            ...c.noise,
            targetQubits: (
              c.noise.targetQubits || [c.noise.targetQubit]
            ).filter((q) => q < n).length
              ? (c.noise.targetQubits || [c.noise.targetQubit]).filter(
                  (q) => q < n,
                )
              : undefined,
            targetQubit:
              (c.noise.targetQubits || [c.noise.targetQubit]).find(
                (q) => q < n,
              ) ?? 0,
            enabled:
              (c.noise.targetQubits || [c.noise.targetQubit]).some(
                (q) => q < n,
              ) && c.noise.enabled !== false,
          }
        : c.noise,
    };
    if (affected.length || noiseAffected) setPending(next);
    else work.change(next);
    setView((q) => Math.min(q, n - 1));
  }
  const variants = Object.entries(preview?.variants || {}),
    selected = variants[Math.min(variant, variants.length - 1)];
  return (
    <LabFrame
      number={2}
      title="Detection vs. Mitigation vs. Correction"
      complete={complete}
      previous={previous}
      onBack={onBack}
      onSkip={onSkip}
      onLesson={onLesson}
      mobile={mobile}
      setMobile={setMobile}
      theory={
        <LabTheory
          number={2}
          title="Detection vs. Mitigation vs. Correction"
          source={protectionTheory}
          examples={protectionExamples.map((e) => (
            <article className="nw-example" key={e.title}>
              <h2>{e.title}</h2>
              <p>{e.description}</p>
              <button
                onClick={() => {
                  if (work.change(e.experiment)) setMobile("Experiment");
                }}
              >
                Load example: {e.title}
              </button>
            </article>
          ))}
          checklist={
            <>
              <b>Try each method, in any order</b>
              {(["detection", "mitigation", "correction"] as const).map((t) => (
                <span key={t}>
                  {progress.value.tried[t] ? "✓" : "○"} {t}
                </span>
              ))}
              <p>
                Only completed simulations count. Repeat freely; improvement is
                not required.
              </p>
              {complete ? (
                <>
                  <strong>Flight School 2 complete</strong>
                  <button className="nw-accent" onClick={onContinue}>
                    Continue to Flight School 3 →
                  </button>
                </>
              ) : (
                <button disabled>Try all three methods to continue</button>
              )}
              {previous >= 2 && !complete && (
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
                disabled={!work.canUndo || work.busy || work.dirty}
                onClick={() => work.history("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo circuit edit"
                disabled={!work.canRedo || work.busy || work.dirty}
                onClick={() => work.history("redo")}
              >
                ↷
              </button>
              <button
                disabled={work.busy || work.dirty}
                onClick={() => work.change(initialExperiment)}
              >
                Reset
              </button>
              <button
                className="nw-accent"
                disabled={!work.ready || work.busy}
                onClick={() => run()}
              >
                {work.busy ? "Running…" : "Run selected method"}
              </button>
            </div>
          </div>
          <LabFeedback
            error={work.error}
            notice={[work.notice, progress.notice].filter(Boolean).join(" ")}
            onErrorPane={() => setMobile("Experiment")}
          />
          <div className="ql-techniques" aria-label="Protection technique">
            {(["detection", "mitigation", "correction"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={settings.technique === t}
                onClick={() => setting({ technique: t })}
              >
                {t[0].toUpperCase() + t.slice(1)}{" "}
                {progress.value.tried[t] ? "✓" : ""}
              </button>
            ))}
          </div>
          <div className="ql-settings">
            <label>
              Measure basis
              <select
                aria-label="Measurement basis"
                value={settings.basis}
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
                value={observed}
                onChange={(e) => setting({ qubit: +e.target.value })}
              >
                {Array.from({ length: c.qubits }, (_, q) => (
                  <option key={q} value={q}>
                    q{q}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shots / variant
              <select
                aria-label="Shots per variant"
                value={settings.shots}
                onChange={(e) =>
                  setting({ shots: +e.target.value as 256 | 1024 | 4096 })
                }
              >
                {[256, 1024, 4096].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {settings.technique === "detection" && (
              <label>
                Detection Pauli
                <select
                  aria-label="Detection Pauli"
                  value={settings.detectionPauli}
                  onChange={(e) =>
                    setting({
                      detectionPauli: e.target.value as "X" | "Y" | "Z",
                    })
                  }
                >
                  {["X", "Y", "Z"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            )}
            {settings.technique === "correction" && (
              <label>
                Repetition code
                <select
                  aria-label="Correction family"
                  value={settings.correctionFamily}
                  onChange={(e) =>
                    setting({
                      correctionFamily: e.target.value as
                        "bit_flip" | "phase_flip",
                    })
                  }
                >
                  <option value="bit_flip">Single-X protection</option>
                  <option value="phase_flip">Single-Z protection</option>
                </select>
              </label>
            )}
            {settings.technique === "mitigation" && (
              <label>
                Extrapolator
                <select
                  aria-label="ZNE fit"
                  value={settings.zneFit}
                  onChange={(e) =>
                    setting({
                      zneFit: e.target.value as "linear" | "quadratic",
                    })
                  }
                >
                  <option value="linear">Linear OLS</option>
                  <option value="quadratic">Quadratic Richardson</option>
                </select>
              </label>
            )}
          </div>
          {work.dirty && work.editor === "Visual" && (
            <div className="nw-notice">
              Unapplied code; visual shows the last valid circuit.{" "}
              <button onClick={() => void work.applySource()}>
                Apply code
              </button>
              <button onClick={work.discardSource}>Discard code changes</button>
            </div>
          )}
          {pending && (
            <div className="nw-notice" role="alert">
              Shrinking removes affected gates and moves a missing noise target
              to q0.{" "}
              <button
                onClick={() => {
                  if (work.change(pending)) setPending(null);
                }}
              >
                Remove affected blocks and resize
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
                  value={c.qubits}
                  disabled={work.busy || work.dirty}
                  onChange={(e) => resize(+e.target.value)}
                >
                  {[1, 2, 3].map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </label>
              <span>A → explicit noise at boundary {c.noise.boundary} → B</span>
            </div>
            <ProtectionCanvas
              experiment={c}
              preview={previewKey === key ? preview : null}
              variant={variant}
              onChange={work.change}
              onError={work.setError}
              disabled={work.busy || work.dirty}
            />
            {c.noise.targetQubits && c.noise.targetQubits.length > 1 && (
              <p className="nw-notice">
                This method protects logical q{c.noise.targetQubit}. Additional
                selected data wires receive their declared noise without extra
                protection. Correction applies independent physical noise to the
                encoded block.
              </p>
            )}
            <NoiseControls
              value={c.noise}
              n={c.qubits}
              disabled={work.busy || work.dirty}
              onChange={(noise) => work.change({ ...c, noise })}
            />
          </div>
          <div hidden={work.editor !== "Code"}>
            <CodeEditor
              source={work.source}
              dirty={work.dirty}
              diagnostics={work.diagnostics}
              onChange={work.editSource}
              onApply={() => void work.applySource()}
              busy={work.busy}
              wrapper="ProtectionCircuit"
            />
          </div>
          {preview && (
            <>
              {(work.dirty || previewKey !== key) && (
                <p className="nw-notice">
                  Previous circuit preview — apply source or wait for current
                  settings.
                </p>
              )}
              <div className="ql-preview-heading">
                <h3>Selected method — generated, read-only</h3>
                <p>{preview.processingRecipe}</p>
              </div>
              {variants.length > 1 && (
                <div className="ql-techniques">
                  {variants.map(([label], i) => (
                    <button
                      key={label}
                      aria-pressed={variant === i}
                      onClick={() => setVariant(i)}
                    >
                      {label}× channel
                    </button>
                  ))}
                </div>
              )}
              <ResourceSummary value={preview.resources} />
            </>
          )}
          <NativeCode code={preview?.nativeCode} />
        </>
      }
      results={
        <ProtectionTelemetry
          result={result}
          stale={stale}
          basis={settings.basis}
          observed={observed}
          view={Math.min(view, c.qubits - 1)}
          onView={setView}
          n={c.qubits}
          busy={work.busy}
          onResample={() => {
            const seed = (settings.seed + 1) % 2147483647;
            setting({ seed });
            run(seed);
          }}
          comparisons={
            Object.values(results).filter(
              (r) =>
                r?.experimentFingerprint === preview?.experimentFingerprint &&
                r.observable.basis === settings.basis &&
                r.observable.qubit === observed &&
                r.shotsPerVariant === settings.shots &&
                r.seed === settings.seed,
            ) as ProtectionResult[]
          }
        />
      }
    />
  );
}
