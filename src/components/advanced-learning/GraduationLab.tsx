"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useWorkbench, useLocalProgress } from "@/lib/learning/useWorkbench";
import {
  strategySchema,
  strategyCode,
  emptyStrategy,
  targetedStrategy,
  twoCheckStrategy,
  graduationProgressSchema,
  initialGraduationProgress,
  Strategy,
  GraduationValidation,
  GraduationResult,
  Benchmark,
  Summary,
} from "@/lib/advanced-learning/graduation";
import { graduationTheory } from "@/lib/advanced-learning/content";
import {
  LabFrame,
  LabFeedback,
  CodeEditor,
  NativeCode,
} from "../learning/LabFrame";
import { LabTheory } from "../learning/LabTheory";
import { ResourceSummary } from "../learning/CircuitPreview";
import { MobilePane } from "../workspace/LearningWorkspace";
import { SimulationTelemetry } from "./SimulationTelemetry";
import { GraduationCanvas } from "../circuit-workspace/GraduationCanvas";
import type { LessonProps } from "./AdvancedLab";
import { faultSchema } from "@/lib/advanced-learning/contracts";
import type { Fault } from "@/lib/advanced-learning/contracts";
import type { Instruction } from "@/lib/learning/contracts";

const progressKey = "quantum-shield.flight-school-6.progress.v1",
  path = "tutorial/graduation-lab";
interface Fixture {
  payload: { name: string; qubits: number[]; column: number }[];
  dataNoise: {
    boundary: number;
    qubit: number;
    channel: string;
    probability: number;
  }[];
  limitations: string;
}
function TradeoffPlot({
  history,
  benchmark,
}: {
  history: Summary[];
  benchmark: Benchmark | null;
}) {
  const pareto = benchmark?.paretoPoints || [];
  return (
    <svg
      viewBox="0 0 400 260"
      className="al-pareto"
      role="img"
      aria-label="Fidelity versus retained-shot probability"
    >
      <path d="M42 20V220H380" fill="none" stroke="#7895a5" />
      <path d="M42 40H380" fill="none" stroke="#efc77c" strokeDasharray="5 4" />
      <text x="50" y="32">
        Optional F = 0.90
      </text>
      {pareto.map((p, i) => (
        <circle
          key={`p-${i}`}
          cx={42 + 330 * p.retention}
          cy={220 - 200 * p.fidelity}
          r="3"
          fill="#f0c67d"
        >
          <title>
            Catalogue Pareto F={p.fidelity.toFixed(5)}, r=
            {p.retention.toFixed(5)}
          </title>
        </circle>
      ))}
      {history.map((p) => (
        <circle
          key={p.fingerprint}
          cx={42 + 330 * p.retention}
          cy={220 - 200 * p.fidelity}
          r="6"
          fill="#97ead2"
          stroke="#12252c"
        >
          <title>
            Your strategy F={p.fidelity.toFixed(5)}, r={p.retention.toFixed(5)},
            score={p.score.toFixed(5)}
          </title>
        </circle>
      ))}
      <text x="120" y="248">
        Exact retention r →
      </text>
      <text x="3" y="18">
        F ↑
      </text>
    </svg>
  );
}
export function GraduationLab({
  onContinue,
  onSkip,
  onBack,
  onLesson,
  previous,
}: LessonProps) {
  const work = useWorkbench(
      "quantum-shield.flight-school-6.draft.v1",
      emptyStrategy,
      strategySchema,
      strategyCode,
      `${path}/compile`,
      "draft",
    ),
    progress = useLocalProgress(
      progressKey,
      graduationProgressSchema,
      initialGraduationProgress,
    ),
    p = progress.value;
  const [mobile, setMobile] = useState<MobilePane>("Theory"),
    [validation, setValidation] = useState<GraduationValidation | null>(null),
    [result, setResult] = useState<GraduationResult | null>(null),
    [accepted, setAccepted] = useState(""),
    [fixture, setFixture] = useState<Fixture | null>(null),
    [benchmark, setBenchmark] = useState<Benchmark | null>(null),
    [loadingBenchmark, setLoadingBenchmark] = useState(false),
    [view, setView] = useState(0),
    [targetK, setTargetK] = useState(1000),
    [graduating, setGraduating] = useState(false),
    [overlay, setOverlay] = useState<Fault[]>([]),
    [overlayUndo, setOverlayUndo] = useState<Fault[][]>([]),
    [overlayRedo, setOverlayRedo] = useState<Fault[][]>([]);
  function changeOverlay(next: Fault[]) {
    if (work.dirty || work.busy) return;
    if (
      next.length > 4 ||
      next.some((f) => !faultSchema.safeParse(f).success)
    ) {
      work.setError(
        "Diagnostic overlay exceeds its four-event budget or contains invalid channel parameters.",
      );
      return;
    }
    setOverlayUndo((prev) => [...prev.slice(-29), overlay]);
    setOverlayRedo([]);
    work.invalidate();
    setOverlay(next);
  }
  function overlayHistory(redo = false) {
    const stack = redo ? overlayRedo : overlayUndo,
      next = stack.at(-1);
    if (!next || work.busy || work.dirty) return;
    if (redo) {
      setOverlayRedo(stack.slice(0, -1));
      setOverlayUndo((prev) => [...prev.slice(-29), overlay]);
    } else {
      setOverlayUndo(stack.slice(0, -1));
      setOverlayRedo((prev) => [...prev.slice(-29), overlay]);
    }
    work.invalidate();
    setOverlay(next);
  }
  const body = (strategy: Strategy, seed = p.seed) => ({
    fixtureVersion: "graduation-fixture-v1",
    strategy,
    observable: { qubit: 0, basis: p.basis },
    shotsPerVariant: p.shots,
    sampleSeed: seed,
  });
  const key = JSON.stringify(body(work.model)),
    stale =
      work.dirty ||
      accepted !==
        (result?.diagnosticOverlay
          ? JSON.stringify({ ...body(work.model), overlay })
          : key),
    complete = !!p.qualified && p.revealAcknowledged;
  useEffect(() => {
    if (progress.ready && p.metricVersion !== "fidelity-yield-v2") {
      progress.setValue((prev) => ({
        ...prev,
        metricVersion: "fidelity-yield-v2",
        qualified: null,
        revealAcknowledged: false,
      }));
      work.setError(
        "This capstone uses revised score-only qualification. Rerun your saved strategy; existing mission access is preserved.",
      );
    }
  }, [progress.ready, p.metricVersion]);
  useEffect(() => {
    let alive = true;
    void api<Fixture>(`${path}/fixture`)
      .then((r) => {
        if (alive) setFixture(r);
      })
      .catch((e) => {
        if (alive) work.setError((e as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    setValidation(null);
  }, [key, work.dirty]);
  useEffect(() => {
    if (!work.ready || work.busy || work.dirty) return;
    let alive = true;
    const token = work.revision.current;
    const timer = setTimeout(
      () =>
        void api<GraduationValidation>(`${path}/validate`, body(work.model))
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
  useEffect(() => {
    if (
      !progress.ready ||
      !p.qualified ||
      p.metricVersion !== "fidelity-yield-v2"
    )
      return;
    let alive = true;
    setLoadingBenchmark(true);
    void api<Benchmark>(`${path}/reveal`, body(p.qualified.strategy))
      .then((r) => {
        if (alive) setBenchmark(r);
      })
      .catch(() => {
        if (alive)
          setBenchmark({
            available: false,
            message:
              "Benchmark unavailable. Your qualification is safe. You can acknowledge this limitation and graduate.",
          });
      })
      .finally(() => {
        if (alive) setLoadingBenchmark(false);
      });
    return () => {
      alive = false;
    };
  }, [progress.ready, p.qualified?.fingerprint]);
  useEffect(() => {
    if (graduating && complete) onContinue();
  }, [graduating, complete, onContinue]);
  function setting(v: Partial<typeof p>) {
    work.invalidate();
    progress.setValue((prev) => ({ ...prev, ...v }));
  }
  function run(seed = p.seed) {
    void work.execute<GraduationResult>(
      `${path}/run`,
      (strategy) => body(strategy, seed),
      (r, current) => {
        setResult(r);
        setValidation(r);
        setAccepted(JSON.stringify(body(current, seed)));
        setMobile("Results");
        if (r.valid && r.fidelityExact !== null) {
          const summary: Summary = {
            fingerprint: r.fingerprint,
            fidelity: r.fidelityExact,
            retention: r.retentionExact,
            score: r.scoreExact,
            strategy: r.canonicalStrategy,
          };
          progress.setValue((prev) => ({
            ...prev,
            comparisons: [
              ...prev.comparisons.filter(
                (s) => s.fingerprint !== summary.fingerprint,
              ),
              summary,
            ].slice(-20),
            qualified: prev.qualified || (r.qualifies ? summary : null),
          }));
        }
      },
    );
  }
  function graduate() {
    if (!p.qualified) return;
    progress.setValue((prev) => ({ ...prev, revealAcknowledged: true }));
    setGraduating(true);
  }
  const benchmarkBest = benchmark?.available
    ? benchmark.bestNonempty
    : undefined;
  const reveal = p.qualified && (
    <section className="al-benchmark">
      <p className="nw-kicker">QUALIFICATION ACHIEVED</p>
      <h2>Best nonempty strategy in the allowed catalogue</h2>
      <p>
        Your qualifying run: fidelity {(100 * p.qualified.fidelity).toFixed(4)}%
        · retention {(100 * p.qualified.retention).toFixed(4)}% · exact score{" "}
        {p.qualified.score.toFixed(8)}.
      </p>
      <div className="al-placement-pair">
        <article>
          <h3>Your accepted placement</h3>
          <pre>{strategyCode(p.qualified.strategy)}</pre>
        </article>
        {benchmarkBest && (
          <article>
            <h3>Certified catalogue placement</h3>
            <pre>{strategyCode(benchmarkBest.canonicalStrategy)}</pre>
          </article>
        )}
      </div>
      {loadingBenchmark ? (
        <p role="status">Loading the versioned benchmark…</p>
      ) : benchmarkBest ? (
        <>
          <div className="ql-comparison-metrics">
            <span>
              Catalogue fidelity
              <b>{(100 * benchmarkBest.fidelity).toFixed(4)}%</b>
            </span>
            <span>
              Exact retention
              <b>{(100 * benchmarkBest.retention).toFixed(4)}%</b>
            </span>
            <span>
              Best nonempty score<b>{benchmarkBest.score.toFixed(8)}</b>
            </span>
            <span>
              Your score gap
              <b>
                {Math.max(0, benchmarkBest.score - p.qualified.score).toFixed(
                  8,
                )}
              </b>
            </span>
          </div>
          <p>
            Certified optimum within this finite catalogue:{" "}
            {benchmark?.evaluatedCandidateCount} valid schedules evaluated from{" "}
            {benchmark?.structuralCandidateCount} structural candidates. This is
            not a global optimum over all quantum error-detection circuits.
          </p>
          <pre className="nw-formula">
            {benchmarkBest.canonicalStrategy.rails
              .filter((r) => r.active)
              .map(
                (r) =>
                  `a${r.ancilla}: boundary ${r.startBoundary} → ${r.endBoundary}; opening ${r.openingTaps.map((t) => `${t.pauli}${t.qubit}`).join(" ")}; closing ${r.closingSign === -1 ? "−" : "+"}${r.closingTaps.map((t) => `${t.pauli}${t.qubit}`).join(" ")}`,
              )
              .join("\n")}
          </pre>
          <p>
            Unconstrained product winner:{" "}
            {benchmark?.bestUnconstrained?.score.toFixed(8)}. It may be the
            unchecked circuit, which cannot satisfy the nonempty check
            objective.
          </p>
          <ResourceSummary value={benchmarkBest.resources} />
          <button
            disabled={work.dirty || work.busy}
            onClick={() => {
              if (work.change(benchmarkBest.canonicalStrategy))
                setMobile("Experiment");
            }}
          >
            Replay benchmark strategy · undoable
          </button>
        </>
      ) : (
        <p className="nw-notice">
          {benchmark?.message ||
            "No matching benchmark artifact. Qualification remains saved; you can acknowledge this limitation."}
        </p>
      )}
      <section>
        <h3>Actual Paulice suggestion · separate research protocol</h3>
        <p>{benchmark?.paulice?.message}</p>
        {benchmark?.paulice?.available && (
          <>
            <p>
              qiskit-paulice {benchmark.paulice.packageVersion} · gamma/windowed
              · seed {benchmark.paulice.seed} ·{" "}
              {benchmark.paulice.cached
                ? "cached actual invocation"
                : "fresh invocation"}
            </p>
            <p>
              Native {benchmark.paulice.costMetric} cost:{" "}
              {benchmark.paulice.nativeCost ?? "unavailable"} (not the game
              score)
            </p>
            <details>
              <summary>Exact research placement and gate schedule</summary>
              <pre>
                {JSON.stringify(
                  {
                    support: benchmark.paulice.checkSupport,
                    instructions: benchmark.paulice.instructions,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        )}
        <button
          disabled={loadingBenchmark}
          onClick={() => {
            if (!p.qualified) return;
            setLoadingBenchmark(true);
            void api<Benchmark>(`${path}/reveal`, body(p.qualified.strategy))
              .then(setBenchmark)
              .catch((e) => work.setError((e as Error).message))
              .finally(() => setLoadingBenchmark(false));
          }}
        >
          Retry Paulice reveal
        </button>
      </section>
      <button
        className="nw-accent"
        disabled={loadingBenchmark || !benchmark}
        onClick={graduate}
      >
        Acknowledge & Graduate →
      </button>
      <button onClick={() => setMobile("Experiment")}>Experiment more</button>
    </section>
  );
  return (
    <LabFrame
      number={6}
      title="Trade-Off Optimization & Score Calculation"
      complete={complete}
      previous={previous}
      onBack={onBack}
      onSkip={onSkip}
      onLesson={onLesson}
      mobile={mobile}
      setMobile={setMobile}
      theory={
        <LabTheory
          number={6}
          title="Trade-Off Optimization & Score Calculation"
          source={graduationTheory}
          examples={
            <>
              {[
                {
                  name: "Unchecked baseline",
                  strategy: emptyStrategy,
                  description:
                    "All shots survive, but retained fidelity is below 0.90.",
                },
                {
                  name: "Target the noisy region",
                  strategy: targetedStrategy,
                  description:
                    "One Z0 check around the noisy region has a feasible qualifying result.",
                },
                {
                  name: "Add the quiet-wire check",
                  strategy: twoCheckStrategy,
                  description:
                    "Higher retained fidelity can have lower yield because additional noisy taps cost shots.",
                },
              ].map((e) => (
                <article className="nw-example" key={e.name}>
                  <h2>{e.name}</h2>
                  <p>{e.description}</p>
                  <button
                    disabled={work.busy || work.dirty}
                    onClick={() => {
                      if (work.change(e.strategy)) setMobile("Experiment");
                    }}
                  >
                    Load strategy: {e.name}
                  </button>
                </article>
              ))}
            </>
          }
          checklist={
            <>
              <b>Graduation requirements</b>
              <span>
                {p.qualified ? "✓" : "○"} Active valid check · exact score≥0.65
              </span>
              <span>
                {p.revealAcknowledged ? "✓" : "○"} Review and acknowledge the
                benchmark
              </span>
              {p.qualified && (
                <button
                  onClick={() => {
                    setMobile("Results");
                    document
                      .getElementById("capstone-reveal")
                      ?.scrollIntoView({ block: "start" });
                  }}
                >
                  Review qualification & benchmark
                </button>
              )}
              {previous >= 5 && !complete && (
                <p>
                  Previously granted mission access is preserved through Skip or
                  the dashboard.
                </p>
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
                  {t === "Visual" ? "Visual strategy" : "Code"}
                </button>
              ))}
            </div>
            <div className="nw-toolbar-actions">
              <button
                aria-label="Undo strategy edit"
                disabled={work.busy || work.dirty || !work.canUndo}
                onClick={() => work.history("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo strategy edit"
                disabled={work.busy || work.dirty || !work.canRedo}
                onClick={() => work.history("redo")}
              >
                ↷
              </button>
              <button
                disabled={work.busy || work.dirty}
                onClick={() => work.change(emptyStrategy)}
              >
                Reset strategy
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
                    ? "Run invalid strategy — diagnostic"
                    : "Run strategy"}
              </button>
            </div>
          </div>
          <LabFeedback
            error={work.error}
            notice={[work.notice, progress.notice].filter(Boolean).join(" ")}
            onErrorPane={() => setMobile("Experiment")}
          />
          <div className="ql-settings">
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
            <span>🔒 3 data wires · fixed input, payload and noise</span>
          </div>
          {work.dirty && work.editor === "Visual" && (
            <div className="nw-notice">
              Unapplied source; resolve it before changing the visual strategy.
              <button onClick={() => void work.applySource()}>
                Apply code
              </button>
              <button onClick={work.discardSource}>Discard code changes</button>
            </div>
          )}
          <div hidden={work.editor !== "Visual"}>
            <GraduationCanvas
              overlay={overlay}
              onOverlay={changeOverlay}
              strategy={work.model}
              validation={validation}
              fixture={fixture}
              onChange={work.change}
              onError={work.setError}
              disabled={work.busy || work.dirty}
            />
          </div>
          <details>
            <summary>Locked workload and noise assumptions</summary>
            <p>{fixture?.limitations}</p>
            <p>
              Two-qubit depolarizing λ=0.005 follows every controlled check tap.
              Payload, noise, input and helper shells cannot be edited.
            </p>
          </details>
          <div hidden={work.editor !== "Code"}>
            <CodeEditor
              source={work.source}
              dirty={work.dirty}
              onChange={work.editSource}
              diagnostics={work.diagnostics}
              busy={work.busy}
              onApply={() => void work.applySource()}
              wrapper="GraduationStrategy"
            />
          </div>
          {validation && (
            <div
              className={`ql-check-schedule ${validation.valid ? "valid" : "invalid"}`}
            >
              <h3>
                {validation.activeCheckCount === 0
                  ? "Unchecked baseline"
                  : validation.valid
                    ? "✓ Invariant closed"
                    : "✕ Invalid / incomplete strategy"}
              </h3>
              <p>{validation.message}</p>
              <ResourceSummary value={validation.resources} />
              <p>
                Added depth {validation.resources.addedDepth}; added entangling
                taps {validation.resources.addedTwoQubitGates}. Logical
                dependency depth is not physical duration.
              </p>
            </div>
          )}
          <section className="nw-notice">
            <b>Diagnostic Overlay — not a qualifying run</b>
            <button
              disabled={work.busy || work.dirty || !overlayUndo.length}
              onClick={() => overlayHistory()}
            >
              Undo diagnostic edit
            </button>
            <button
              disabled={work.busy || work.dirty || !overlayRedo.length}
              onClick={() => overlayHistory(true)}
            >
              Redo diagnostic edit
            </button>
            <p>
              Orange dragged errors are exploratory. Run strategy always uses
              only the immutable fixture; diagnostic results cannot qualify or
              alter the benchmark.
            </p>
            <button
              disabled={
                work.busy ||
                work.dirty ||
                !validation?.structureComplete ||
                !overlay.length
              }
              onClick={() =>
                void work.execute<GraduationResult>(
                  `${path}/diagnostic`,
                  (strategy) => ({ ...body(strategy), overlay }),
                  (r, current) => {
                    setResult(r);
                    setAccepted(JSON.stringify({ ...body(current), overlay }));
                    setMobile("Results");
                  },
                )
              }
            >
              Run diagnostic overlay
            </button>
          </section>
          <NativeCode code={validation?.nativeCode} />
        </>
      }
      results={
        <>
          <section className="al-score">
            <p className="nw-kicker">EXACT FIDELITY-WEIGHTED YIELD</p>
            <h2>Quality × retained shots</h2>
            {result && (
              <div
                className="al-score-gauge"
                role="meter"
                aria-label="Combined exact score"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={result.scoreExact}
              >
                <span style={{ width: `${100 * result.scoreExact}%` }} />
                <i title="Qualification target 0.65" />
                <small>0 · exact F × r · goal 0.65 · 1</small>
              </div>
            )}
            {result ? (
              <>
                <div className="ql-comparison-metrics">
                  <span>
                    Exact state fidelity
                    <b>
                      {result.fidelityExact === null
                        ? "Undefined"
                        : (100 * result.fidelityExact).toFixed(4) + "%"}
                    </b>
                  </span>
                  <span>
                    Exact retention r
                    <b>{(100 * result.retentionExact).toFixed(4)}%</b>
                  </span>
                  <span>
                    Exact score<b>{result.scoreExact.toFixed(8)}</b>
                  </span>
                  <span>
                    Qualification
                    <b>
                      {result.diagnosticOverlay
                        ? "Diagnostic — cannot qualify"
                        : result.qualifies
                          ? "✓ Qualified"
                          : "Goals not met"}
                    </b>
                  </span>
                </div>
                <p>
                  Exact score≥0.65 · nonempty valid strategy. F≥0.90 is an
                  optional quality target. Noisy gates can worsen performance.
                </p>
                <p>
                  Observed retention{" "}
                  {((100 * result.keptShots) / result.shots).toFixed(2)}%;
                  sampled product {result.scoreSampled.toFixed(6)} is
                  informational and cannot earn qualification.
                </p>
                <label>
                  Target accepted samples K
                  <input
                    aria-label="Target accepted samples"
                    type="number"
                    min="1"
                    max="100000"
                    value={targetK}
                    onChange={(e) =>
                      setTargetK(
                        Math.max(1, Math.min(100000, +e.target.value || 1)),
                      )
                    }
                  />
                </label>
                <p>
                  Expected attempts:{" "}
                  {result.retentionExact > 1e-12
                    ? Math.ceil(
                        targetK / result.retentionExact,
                      ).toLocaleString()
                    : "∞"}
                  . This is a mean acquisition cost, not a promise of
                  statistical precision.
                </p>
              </>
            ) : (
              <p>
                Run the baseline, then build a valid check. Exact score and
                acceptance appear here.
              </p>
            )}
            {p.qualified && (
              <div className="nw-complete">
                <h3>✓ Qualification saved</h3>
                <button
                  onClick={() => {
                    setMobile("Results");
                    setTimeout(
                      () =>
                        document
                          .getElementById("capstone-reveal")
                          ?.scrollIntoView({ block: "start" }),
                      0,
                    );
                  }}
                >
                  Review benchmark & graduate
                </button>
              </div>
            )}
          </section>
          <SimulationTelemetry
            result={result}
            stale={stale}
            basis={result?.observable.basis || p.basis}
            n={3}
            view={view}
            onView={setView}
            busy={work.busy}
            onResample={() => {
              const seed = (p.seed + 1) % 2147483647;
              setting({ seed });
              run(seed);
            }}
          />
          <section className="al-history">
            <h3>Your strategies & catalogue Pareto points</h3>
            <TradeoffPlot history={p.comparisons} benchmark={benchmark} />
            <p>
              Mint: your accepted strategies. Gold: catalogue Pareto points
              after qualification. Higher fidelity can have a lower product.
            </p>
            <div className="nw-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Fidelity</th>
                    <th>Retention</th>
                    <th>Exact score</th>
                  </tr>
                </thead>
                <tbody>
                  {p.comparisons.map((r, i) => (
                    <tr key={r.fingerprint}>
                      <td>
                        <button
                          disabled={work.busy || work.dirty}
                          onClick={() => {
                            if (work.change(r.strategy))
                              setMobile("Experiment");
                          }}
                        >
                          Replay {i + 1}
                        </button>
                      </td>
                      <td>{r.fidelity.toFixed(6)}</td>
                      <td>{r.retention.toFixed(6)}</td>
                      <td>{r.score.toFixed(8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div id="capstone-reveal">{reveal}</div>
        </>
      }
    />
  );
}
