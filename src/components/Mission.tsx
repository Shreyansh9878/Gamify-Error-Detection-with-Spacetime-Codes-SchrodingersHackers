"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Play, Volume2, VolumeX } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkbench } from "@/lib/learning/useWorkbench";
import {
  checkDraft,
  draftSchema,
  generate,
  initialDraft,
  type Draft,
  type MissionLevel,
  type Outcome,
  type Validation,
} from "@/lib/missions/contracts";
import {
  LearningWorkspace,
  type MobilePane,
} from "./workspace/LearningWorkspace";
import { CodeEditor, LabFeedback } from "./learning/LabFrame";
import { MissionCanvas } from "./circuit-workspace/MissionCanvas";
import { TrustedFidelityMetrics } from "./TrustedFidelityMetrics";

export function Mission({
  level: l,
  onBack,
  onWin,
  sound,
  onSound,
}: {
  level: MissionLevel;
  onBack: () => void;
  onWin: (r: Outcome) => void;
  sound: boolean;
  onSound: () => void;
}) {
  const [mobile, setMobile] = useState<MobilePane>("Theory"),
    [validation, setValidation] = useState<Validation | null>(null),
    [outcome, setOutcome] = useState<Outcome | null>(null),
    [gap, setGap] = useState(1),
    [validating, setValidating] = useState(false);
  const schema = useMemo(
    () =>
      draftSchema.superRefine((d, ctx) => {
        try {
          checkDraft(d, l);
        } catch (e) {
          ctx.addIssue({ code: "custom", message: (e as Error).message });
        }
      }),
    [l],
  );
  const b = useWorkbench<Draft>(
    `quantum-shield.mission.v1.${l.id}`,
    initialDraft(l),
    schema,
    generate,
    "missions/compile",
    "draft",
    () => ({ levelId: l.id }),
  );
  useEffect(() => {
    let cancelled = false;
    setValidation(null);
    if (!b.ready || b.dirty) {
      setValidating(false);
      return;
    }
    setValidating(true);
    const timer = setTimeout(() => {
      void api<Validation>("missions/validate", { draft: b.model })
        .then((v) => {
          if (!cancelled) setValidation(v);
        })
        .catch((e) => {
          if (!cancelled) b.setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setValidating(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [b.model, b.ready, b.dirty]);
  function change(d: Draft) {
    b.change(d);
  }
  function resize(delta: number) {
    const count = b.model.bands[String(gap)] || 0,
      next = count + delta;
    if (next < 0 || next > 8) return;
    if (b.model.operations.some((g) => g.boundary === gap && g.slot >= next)) {
      b.setError("Move gates to the Dustbin before removing their columns.");
      return;
    }
    change({ ...b.model, bands: { ...b.model.bands, [String(gap)]: next } });
  }
  async function run() {
    await b.execute<Outcome>(
      "missions/run",
      (d) => ({ draft: d }),
      (r) => {
        setOutcome(r);
        setMobile("Results");
        if (r.passed) {
          onWin(r);
          if (sound) {
            try {
              const audio = new AudioContext();
              const oscillator = audio.createOscillator();
              const gain = audio.createGain();
              oscillator.connect(gain);
              gain.connect(audio.destination);
              gain.gain.value = 0.025;
              oscillator.frequency.value = 660;
              oscillator.start();
              oscillator.stop(audio.currentTime + 0.15);
              oscillator.onended = () => {
                void audio.close();
              };
            } catch {
              /* Sound is optional. */
            }
          }
        }
      },
    );
  }
  const invalid = validation?.hasChecks && !validation.valid;
  return (
    <LearningWorkspace
      mobilePane={mobile}
      onMobilePane={setMobile}
      header={
        <header className="nw-header">
          <button className="nw-back" onClick={onBack}>
            <ArrowLeft size={16} />
            Mission control
          </button>
          <div className="nw-header-title">
            <b>QUANTUM SHIELD</b>
            <span>/</span>
            <span>
              {String(l.id).padStart(2, "0")} · {l.title}
            </span>
          </div>
          <button
            onClick={onSound}
            aria-label={sound ? "Mute sound" : "Enable sound"}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </header>
      }
      theory={
        <div className="nw-theory mission-briefing">
          <p className="eyebrow">MAIN MISSION {l.id}</p>
          <h1>{l.title}</h1>
          <p>{l.overview}</p>
          <h2>Objective</h2>
          <p>
            Reach Trusted Fidelity {l.targetScore.toFixed(2)} with a{" "}
            {(l.minimumKept * 100).toFixed(0)}% shot budget. Close the green
            invariant loop; falling below the budget reduces your score.
          </p>
          {l.id === 1 && (
            <p>
              Use “Insert columns” to open space between locked payload gates.
              Place checks there to protect a smaller, noisier region without
              wrapping the entire circuit.
            </p>
          )}
          <p>
            Drag H, controlled Pauli checks, final H and M from the palette. The
            orange crossing is noisier. Preserve fidelity while keeping enough
            shots.
          </p>
          <p>
            {l.assisted
              ? "Your final H chooses the end of each check window. Every closing operator and its phase correction appears locked immediately before it."
              : "Place the closing controlled Pauli product yourself, followed by H and M on the ancilla."}
          </p>
        </div>
      }
      experiment={
        <div className="mission-experiment">
          <LabFeedback
            error={b.error}
            notice={b.notice}
            onErrorPane={() => setMobile("Experiment")}
          />
          <div
            className="nw-toolbar"
            role="toolbar"
            aria-label="Mission editor"
          >
            {(["Visual", "Code"] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={b.editor === mode}
                onClick={() => b.setEditor(mode)}
              >
                {mode}
              </button>
            ))}
            <button
              disabled={!b.canUndo || b.busy}
              onClick={() => b.history("undo")}
            >
              Undo
            </button>
            <button
              disabled={!b.canRedo || b.busy}
              onClick={() => b.history("redo")}
            >
              Redo
            </button>
            <button
              disabled={b.busy || b.dirty}
              onClick={() => change(initialDraft(l))}
            >
              Reset checks
            </button>
            <button
              className="primary"
              disabled={
                b.busy ||
                !b.ready ||
                (!b.dirty && (validating || !validation || !!invalid))
              }
              onClick={() => void run()}
            >
              <Play size={14} />
              {b.busy ? "Running…" : "Run mission"}
            </button>
          </div>
          {b.dirty && (
            <p className="nw-notice">
              Apply code or{" "}
              <button onClick={b.discardSource}>discard changes</button> before
              visual editing.
            </p>
          )}
          {b.editor === "Visual" ? (
            <>
              <div className="mission-columns">
                <label>
                  Insert between payload gates{" "}
                  <select
                    aria-label="Payload insertion boundary"
                    value={gap}
                    onChange={(e) => setGap(+e.target.value)}
                  >
                    {Array.from({ length: l.payload.length + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0
                          ? "Before payload"
                          : i === l.payload.length
                            ? "After payload"
                            : `After gate ${i}`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={
                    b.busy || b.dirty || (b.model.bands[String(gap)] || 0) >= 8
                  }
                  onClick={() => resize(4)}
                >
                  Insert columns
                </button>
                <button
                  disabled={
                    b.busy || b.dirty || !(b.model.bands[String(gap)] || 0)
                  }
                  onClick={() => resize(-4)}
                >
                  Remove columns
                </button>
              </div>
              <MissionCanvas
                level={l}
                draft={b.model}
                validation={validation}
                onChange={change}
                onError={b.setError}
                disabled={b.busy || b.dirty}
              />
              <p className="mission-validation" role="status">
                {validating
                  ? "Checking invariant…"
                  : invalid
                    ? validation?.checks.find((c) => !c.valid)?.message
                    : validation?.valid
                      ? "✓ Closed invariant"
                      : "Build a check around the noisy crossing."}
              </p>
            </>
          ) : (
            <>
              <CodeEditor
                source={b.source}
                dirty={b.dirty}
                onChange={b.editSource}
                diagnostics={b.diagnostics}
                busy={b.busy}
                onApply={() => void b.applySource()}
                wrapper="MissionCircuit"
                label="Mission circuit code"
              />
              <details>
                <summary>Read-only Qiskit circuit</summary>
                <pre>
                  {[
                    "from qiskit import QuantumCircuit",
                    `qc = QuantumCircuit(${l.qubits + l.ancillas}, ${l.ancillas})`,
                    "# Trusted Fidelity and the shot budget use the authoritative mission model.",
                    ...(validation?.operations || []).map((g) =>
                      g.name === "m"
                        ? `qc.measure(${g.qubits[0]}, ${g.qubits[0] - l.qubits})`
                        : `qc.${g.name}(${g.qubits.join(", ")})`,
                    ),
                  ].join("\n")}
                </pre>
              </details>
            </>
          )}
        </div>
      }
      results={
        <div className="mission-outcome" aria-live="polite">
          <h2>Outcome</h2>
          {!outcome || b.stale ? (
            <p>
              {outcome
                ? "Circuit changed. Run again."
                : "Run your circuit to see its outcome."}
            </p>
          ) : (
            <>
              <strong className="mission-combined" data-testid="combined-score">
                {outcome.combinedScore.toFixed(4)}
              </strong>
              <span>Trusted Fidelity</span>
              <span
                className={outcome.passed ? "mission-pass" : "mission-fail"}
              >
                {outcome.passed ? "PASS" : "FAIL"}
              </span>
              <p>{outcome.status}</p>
              <TrustedFidelityMetrics
                fidelity={outcome.fidelity}
                retention={outcome.retention}
                minimumKept={outcome.minimumKept}
              />
            </>
          )}
        </div>
      }
    />
  );
}
