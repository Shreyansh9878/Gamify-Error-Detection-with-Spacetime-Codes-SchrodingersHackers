"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { examples, Example, sections } from "@/lib/flight-school-1/content";
import { BlochSphere } from "../flight-school-1/ComparisonTelemetry";

function Illustration({
  kind,
}: {
  kind: "bit-flip" | "phase-flip" | "decoherence";
}) {
  const [phase, setPhase] = useState(1),
    [playing, setPlaying] = useState(false),
    [drift, setDrift] = useState(0);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const start: [number, number, number] =
    kind === "bit-flip" ? [0, 0, 1] : [1, 0, 0];
  const vector: [number, number, number] =
    kind === "bit-flip"
      ? [0, -Math.sin(phase * Math.PI), Math.cos(phase * Math.PI)]
      : kind === "phase-flip"
        ? [Math.cos(phase * Math.PI), Math.sin(phase * Math.PI), 0]
        : [Math.exp((-phase * 100) / 80), 0, 1 - Math.exp(-phase)];
  function replay() {
    if (playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(1);
      return;
    }
    setPlaying(true);
    const begin = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - begin) / 1400);
      setPhase(t);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    frame.current = requestAnimationFrame(tick);
  }
  return (
    <div className="nw-illustration">
      <div className="nw-bloch-pair">
        <BlochSphere vector={start} label="Before" />
        <BlochSphere
          vector={vector}
          label={
            kind === "decoherence"
              ? `At t = ${Math.round(phase * 100)} μs`
              : "Replay / after"
          }
        />
      </div>
      <p>
        {kind === "bit-flip"
          ? "Zero ↔ one · a full X turn exchanges the poles. Plus is unchanged."
          : kind === "phase-flip"
            ? "Plus ↔ minus · a full Z flip reverses X direction, with equal immediate Z probabilities."
            : "Initial plus · computed intermediate states, T1=100 μs, T2=80 μs. The arrow shrinks and moves toward zero."}
      </p>
      <button onClick={replay} disabled={playing}>
        {playing ? "Replaying…" : "Replay transformation"}
      </button>
      {kind === "phase-flip" && (
        <details>
          <summary>Gradual phase drift — a pure rotation</summary>
          <label>
            Phase φ: {(drift / Math.PI).toFixed(2)}π
            <input
              type="range"
              aria-label="Illustration phase drift"
              min="0"
              max={Math.PI}
              step=".01"
              value={drift}
              onChange={(e) => setDrift(+e.target.value)}
            />
          </label>
          <BlochSphere
            vector={[Math.cos(drift), Math.sin(drift), 0]}
            label="Pure state on the equator"
          />
          <p>
            This rotation is not decoherence. The arrow stays on the surface.
          </p>
        </details>
      )}
    </div>
  );
}

export function TheoryPane({
  tab,
  onTab,
  onLoad,
  quiz,
}: {
  tab: "Description" | "Examples" | "Knowledge Check";
  onTab: (t: "Description" | "Examples" | "Knowledge Check") => void;
  onLoad: (e: Example) => void;
  quiz: ReactNode;
}) {
  return (
    <>
      <div className="nw-pane-heading">
        <span className="nw-kicker">01 / FLIGHT SCHOOL</span>
        <h1>Understanding Quantum Errors</h1>
        <p>Prepare. Disturb. Compare.</p>
      </div>
      <nav className="nw-theory-tabs" aria-label="Lesson sections">
        {(["Description", "Examples", "Knowledge Check"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => onTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <div className="nw-article" hidden={tab !== "Description"}>
        <nav className="nw-jump" aria-label="Error topics">
          {sections
            .filter((s) =>
              ["bit-flip", "phase-flip", "decoherence"].includes(s.id),
            )
            .map((s) => (
              <a key={s.id} href={`#theory-${s.id}`}>
                {s.id.replace("-", " ")}
              </a>
            ))}
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={`theory-${s.id}`}>
            <h2>{s.title}</h2>
            {s.formula && <pre className="nw-formula">{s.formula}</pre>}
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}
            {["bit-flip", "phase-flip", "decoherence"].includes(s.id) && (
              <>
                <Illustration
                  kind={s.id as "bit-flip" | "phase-flip" | "decoherence"}
                />
                <button
                  className="nw-accent"
                  onClick={() =>
                    onLoad(
                      examples[
                        s.id === "bit-flip" ? 0 : s.id === "phase-flip" ? 2 : 5
                      ],
                    )
                  }
                >
                  Load {s.id.replace("-", " ")} example →
                </button>
              </>
            )}
          </section>
        ))}
        <p className="nw-reference">
          This lesson introduces error models for later spacetime-check
          missions.{" "}
          <a
            href="https://arxiv.org/abs/2504.15725"
            target="_blank"
            rel="noreferrer"
          >
            Research background: Martiel & Javadi-Abhari ↗
          </a>
        </p>
      </div>
      <div className="nw-article" hidden={tab !== "Examples"}>
        {examples.map((e) => (
          <article className="nw-example" key={e.title}>
            <h2>{e.title}</h2>
            <p>{e.description}</p>
            <button onClick={() => onLoad(e)}>Load example: {e.title}</button>
          </article>
        ))}
      </div>
      <div className="nw-article" hidden={tab !== "Knowledge Check"}>
        {quiz}
      </div>
      <div className="nw-theory-footer">
        <span>Experiment freely. Then check your understanding.</span>
        <button onClick={() => onTab("Knowledge Check")}>
          Knowledge check →
        </button>
      </div>
    </>
  );
}
