"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  HelpCircle,
  Play,
  RotateCcw,
  Undo2,
  Redo2,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Basis,
  BlockName,
  Circuit,
  ComparisonMode,
  CONTENT_VERSION,
  Diagnostic,
  DRAFT_KEY,
  draftSchema,
  emptyCircuit,
  LabResult,
  Operation,
  PROGRESS_KEY,
  progressSchema,
  block,
  circuitSchema,
  isError,
} from "@/lib/flight-school-1/contracts";
import { Example } from "@/lib/flight-school-1/content";
import {
  nativeQiskit,
  tutorialCode,
} from "@/lib/flight-school-1/code-generation";
import { LearningWorkspace, MobilePane } from "../workspace/LearningWorkspace";
import { TheoryPane } from "../workspace/TheoryPane";
import { PreparationCanvas } from "./PreparationCanvas";
import { ErrorBlockInspector } from "./ErrorBlockInspector";
import { TutorialCodeEditor } from "./TutorialCodeEditor";
import { ComparisonTelemetry } from "./ComparisonTelemetry";
import { NoiseKnowledgeCheck } from "./NoiseKnowledgeCheck";

export function NoiseLab({
  onContinue,
  onSkip,
  onBack,
  unlocked = false,
}: {
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  unlocked?: boolean;
}) {
  const [circuit, setCircuit] = useState<Circuit>(emptyCircuit),
    [selected, setSelected] = useState<string | null>(null),
    [editor, setEditor] = useState<"Visual circuit" | "Code">("Visual circuit"),
    [theory, setTheory] = useState<
      "Description" | "Examples" | "Knowledge Check"
    >("Description"),
    [mobile, setMobile] = useState<MobilePane>("Theory");
  const [code, setCode] = useState(tutorialCode(emptyCircuit)),
    [dirty, setDirty] = useState(false),
    [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]),
    [mode, setMode] = useState<ComparisonMode>("final"),
    [qubit, setQubit] = useState(0),
    [basis, setBasis] = useState<Basis>("Z"),
    [shots, setShots] = useState(1024),
    [seed, setSeed] = useState(2026);
  const [result, setResult] = useState<LabResult | null>(null),
    [stale, setStale] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [initialized, setInitialized] = useState(false),
    [undo, setUndo] = useState<Circuit[]>([]),
    [redo, setRedo] = useState<Circuit[]>([]);
  const [answers, setAnswers] = useState(["", "", ""]),
    [submitted, setSubmitted] = useState(false),
    [successful, setSuccessful] = useState(false),
    [complete, setComplete] = useState(false),
    [help, setHelp] = useState(false),
    [exported, setExported] = useState(false),
    [pending, setPending] = useState<{
      message: string;
      draft: Circuit;
      selection?: string;
    } | null>(null);
  const errorFocus = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error) return;
    setMobile("Experiment");
    const frame = requestAnimationFrame(() => errorFocus.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [error]);
  const revision = useRef(0),
    mounted = useRef(true),
    selectedOp = circuit.operations.find((o) => o.id === selected) || null;
  const selectedError = selectedOp?.role === "error";
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = draftSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          const d = parsed.data;
          setCircuit(d.circuit);
          setCode(d.code);
          setDirty(d.dirty);
          setEditor(d.editor);
          const valid = d.circuit.operations.find((o) => o.id === d.selected);
          setSelected(valid?.id || null);
          setMode(
            d.mode === "selected_error" && valid?.role !== "error"
              ? "final"
              : d.mode,
          );
          setQubit(Math.min(d.qubit, d.circuit.qubits - 1));
          setBasis(d.basis);
          setShots(d.shots);
          setSeed(d.seed);
        } else
          setNotice(
            "Saved experiment was invalid; only this sandbox draft was reset. Mission progress is safe.",
          );
      }
    } catch {
      setNotice(
        "The saved sandbox could not be read. Your other progress is unchanged.",
      );
    }
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const p = progressSchema.safeParse(JSON.parse(raw));
        if (p.success) {
          setAnswers(p.data.answers);
          setSubmitted(p.data.submitted);
          setSuccessful(p.data.successfulRun);
          setComplete(p.data.complete);
        }
      }
    } catch {
      setNotice(
        "Progress storage is unavailable. Continue experimenting in this session.",
      );
    }
    setInitialized(true);
    return () => {
      mounted.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          circuit,
          code,
          dirty,
          editor,
          mode,
          selected,
          basis,
          shots,
          seed,
          qubit,
        }),
      );
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          contentVersion: CONTENT_VERSION,
          successfulRun: successful,
          answers,
          submitted,
          complete,
        }),
      );
    } catch {
      setNotice(
        "Local storage is unavailable or full. Keep this tab open to retain your session.",
      );
    }
  }, [
    initialized,
    circuit,
    code,
    dirty,
    editor,
    mode,
    selected,
    basis,
    shots,
    seed,
    qubit,
    successful,
    answers,
    submitted,
    complete,
  ]);
  function invalidate() {
    revision.current++;
    setStale(true);
    setBusy(false);
    setExported(false);
  }
  function applyDraft(
    next: Circuit,
    selection?: string | null,
    fromCode = false,
  ) {
    if (dirty && !fromCode) {
      setError(
        "Apply or discard unapplied code before editing the visual circuit.",
      );
      return false;
    }
    const validation = circuitSchema.safeParse(next);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return false;
    }
    setUndo((h) => [...h.slice(-29), circuit]);
    setRedo([]);
    setCircuit(validation.data);
    setCode(tutorialCode(validation.data));
    setDirty(false);
    setDiagnostics([]);
    setError("");
    setPending(null);
    setQuibitSafe(validation.data.qubits);
    const id = selection === undefined ? selected : selection,
      op = validation.data.operations.find((o) => o.id === id),
      fallback = validation.data.operations.find((o) => o.role === "error");
    setSelected(op?.id || fallback?.id || null);
    if (op?.role === "prepare") setMode("final");
    else if (!op) setMode(fallback ? "selected_error" : "final");
    invalidate();
    return true;
  }
  function setQuibitSafe(n: number) {
    setQubit((q) => Math.min(q, n - 1));
  }
  function history(direction: "undo" | "redo") {
    if (dirty) {
      setError("Apply or discard code before using history.");
      return;
    }
    const stack = direction === "undo" ? undo : redo,
      next = stack.at(-1);
    if (!next) return;
    if (direction === "undo") {
      setUndo(undo.slice(0, -1));
      setRedo([...redo.slice(-29), circuit]);
    } else {
      setRedo(redo.slice(0, -1));
      setUndo([...undo.slice(-29), circuit]);
    }
    setCircuit(next);
    setCode(tutorialCode(next));
    setSelected(null);
    setMode("final");
    setQuibitSafe(next.qubits);
    setError("");
    invalidate();
  }
  function place(name: BlockName, q: number, column: number) {
    const op = block(name, q, column, `block-${crypto.randomUUID()}`);
    const errors = circuit.operations.filter((o) => o.role === "error");
    if (isError(name) && !circuit.combineErrors && errors.length) {
      const next = {
        ...circuit,
        operations: [
          ...circuit.operations.filter((o) => o.id !== errors[0].id),
          op,
        ],
      };
      setPending({
        message: `Replace the existing ${errors[0].name.replaceAll("_", " ")} with ${name.replaceAll("_", " ")} at q${q}, column ${column}? This is one undoable edit.`,
        draft: next,
        selection: op.id,
      });
      return;
    }
    if (
      applyDraft(
        { ...circuit, operations: [...circuit.operations, op] },
        op.id,
      ) &&
      op.role === "error"
    )
      setMode("selected_error");
  }
  function remove() {
    if (selectedOp)
      applyDraft(
        {
          ...circuit,
          operations: circuit.operations.filter((o) => o.id !== selectedOp.id),
        },
        null,
      );
  }
  function resize(n: number) {
    const affected = circuit.operations.filter((o) =>
      o.qubits.some((q) => q >= n),
    );
    const next = {
      ...circuit,
      qubits: n,
      operations: circuit.operations.filter((o) => !affected.includes(o)),
    };
    if (affected.length)
      setPending({
        message: `Shrinking to ${n} wires removes ${affected.length} affected block(s): ${affected.map((o) => o.name).join(", ")}. Remove affected blocks and resize?`,
        draft: next,
      });
    else applyDraft(next);
  }
  async function compile() {
    const token = revision.current;
    const r = await api<{ circuit: Circuit | null; diagnostics: Diagnostic[] }>(
      "tutorial/noise-lab/compile",
      { code, combineErrors: circuit.combineErrors },
    );
    if (!mounted.current || token !== revision.current) return null;
    setDiagnostics(r.diagnostics);
    if (!r.circuit) {
      setError("Code was not applied. Fix the highlighted source diagnostics.");
      setMobile("Experiment");
      return null;
    }
    const errorOp = r.circuit.operations.find((o) => o.role === "error");
    if (applyDraft(r.circuit, errorOp?.id || null, true)) return r.circuit;
    return null;
  }
  async function applyCode() {
    const token = revision.current;
    setBusy(true);
    setError("");
    try {
      await compile();
    } catch (e) {
      if (mounted.current && token === revision.current)
        setError((e as Error).message);
    } finally {
      if (mounted.current && token === revision.current) setBusy(false);
    }
  }
  async function run(resample = false) {
    let token = revision.current;
    setBusy(true);
    setError("");
    try {
      let current = circuit,
        currentSelected = selectedError ? selected : null,
        currentMode = mode;
      if (editor === "Code" && dirty) {
        const parsed = await compile();
        if (!parsed) return;
        current = parsed;
        currentSelected =
          parsed.operations.find((o) => o.role === "error")?.id || null;
        currentMode = currentSelected ? mode : "final";
      }
      if (dirty && editor === "Visual circuit") {
        setError("Apply or discard code before running the visual circuit.");
        return;
      }
      const nextSeed = resample ? (seed + 1) % 2147483647 : seed;
      if (resample) setSeed(nextSeed);
      token = ++revision.current;
      setBusy(true);
      const r = await api<LabResult>("tutorial/noise-lab/run", {
        circuit: current,
        comparisonMode: currentMode,
        selectedErrorId: currentSelected,
        basis,
        shots,
        sampleSeed: nextSeed,
      });
      if (!mounted.current || token !== revision.current) return;
      setResult(r);
      setStale(false);
      setSuccessful(true);
      setMobile("Results");
      if (submitted && answers.join("") === "BCA") setComplete(true);
    } catch (e) {
      if (mounted.current && token === revision.current)
        setError((e as Error).message);
    } finally {
      if (mounted.current && token === revision.current) setBusy(false);
    }
  }
  function load(e: Example) {
    if (
      applyDraft(
        e.circuit,
        e.circuit.operations.find((o) => o.role === "error")?.id || null,
      )
    ) {
      setMode(e.final ? "final" : "selected_error");
      setMobile("Experiment");
    }
  }
  function setting(action: () => void) {
    invalidate();
    action();
  }
  const quiz = (
    <NoiseKnowledgeCheck
      answers={answers}
      submitted={submitted}
      successful={successful}
      complete={complete}
      onAnswers={(a) => {
        setAnswers(a);
        setSubmitted(false);
      }}
      onSubmit={() => {
        setSubmitted(true);
        if (successful && answers.join("") === "BCA") setComplete(true);
      }}
      onContinue={onContinue}
      onExperiment={() => {
        setMobile("Experiment");
        setTheory("Description");
      }}
    />
  );
  return (
    <LearningWorkspace
      mobilePane={mobile}
      onMobilePane={setMobile}
      header={
        <header className="nw-header">
          <button className="nw-back" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Flight school</span>
          </button>
          <div className="nw-header-title">
            <span className="nw-logo">◈</span>
            <b>QUANTUM SHIELD</b>
            <span className="nw-header-divider">/</span>
            <span>01 · Understanding Quantum Errors</span>
          </div>
          <select
            aria-label="Flight school lesson"
            value="1"
            onChange={(e) => {
              if (e.target.value === "2") onContinue();
            }}
          >
            <option value="1">01 · Quantum errors</option>
            <option value="2" disabled={!complete && !unlocked}>
              02 · Detection, mitigation, correction
            </option>
          </select>
          <span className="nw-engine">
            {result ? "● Engine connected" : "○ Ready to experiment"}
          </span>
          {complete && (
            <span className="nw-chip">
              <ShieldCheck size={14} />
              Complete
            </span>
          )}
          <button aria-label="Workspace help" onClick={() => setHelp(!help)}>
            <HelpCircle size={17} />
          </button>
          <button className="nw-skip" onClick={onSkip}>
            Skip Tutorial / Unlock All Levels
          </button>
        </header>
      }
      theory={
        <TheoryPane tab={theory} onTab={setTheory} onLoad={load} quiz={quiz} />
      }
      experiment={
        <div
          onKeyDown={(e) => {
            const target = e.target as HTMLElement;
            if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
              return;
            if (e.key === "Delete" || e.key === "Backspace") {
              e.preventDefault();
              remove();
            }
          }}
        >
          <div className="nw-experiment-toolbar">
            <div className="nw-editor-tabs">
              {(["Visual circuit", "Code"] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={editor === t}
                  onClick={() => setEditor(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="nw-toolbar-actions">
              <button
                aria-label="Undo circuit edit"
                disabled={busy || dirty || !undo.length}
                onClick={() => history("undo")}
              >
                <Undo2 size={16} />
              </button>
              <button
                aria-label="Redo circuit edit"
                disabled={busy || dirty || !redo.length}
                onClick={() => history("redo")}
              >
                <Redo2 size={16} />
              </button>
              <button
                title="Reset to one empty wire, preserving quiz progress"
                disabled={dirty || busy}
                onClick={() => applyDraft(emptyCircuit, null)}
              >
                <RotateCcw size={15} />
                Reset
              </button>
              <button
                className="nw-accent"
                disabled={busy || !initialized}
                onClick={() => void run()}
              >
                <Play size={15} />
                {busy ? "Running…" : "Run experiment"}
              </button>
            </div>
          </div>
          {notice && (
            <p className="nw-notice" role="status">
              {notice}
            </p>
          )}
          {help && (
            <div className="nw-notice">
              <b>Your lab guide</b>
              <p>
                Read the theory or load an example. Prepare with gates, insert a
                distinct error block, then Run. Compare the same state in Z and
                X measurement. Select blocks to inspect; drag or use palette +
                cell. Sliders commit with Apply block changes. Finish with the
                three-question knowledge check. On desktop, drag or use arrow
                keys on pane dividers.
              </p>
            </div>
          )}
          {error && (
            <p className="nw-error" role="alert" tabIndex={-1} ref={errorFocus}>
              {error}
            </p>
          )}
          {pending && (
            <div className="nw-notice" role="alert">
              <p>{pending.message}</p>
              <button
                onClick={() => {
                  if (applyDraft(pending.draft, pending.selection))
                    setPending(null);
                }}
              >
                Confirm undoable change
              </button>
              <button onClick={() => setPending(null)}>Cancel</button>
            </div>
          )}
          {dirty && editor === "Visual circuit" && (
            <div className="nw-notice">
              Unapplied code changes. Visual shows your last valid circuit.{" "}
              <button onClick={() => void applyCode()} disabled={busy}>
                Apply code
              </button>
              <button
                onClick={() => {
                  setCode(tutorialCode(circuit));
                  setDirty(false);
                  setDiagnostics([]);
                  setError("");
                  invalidate();
                }}
              >
                Discard code changes
              </button>
            </div>
          )}
          <div hidden={editor !== "Visual circuit"}>
            <div className="nw-qubits">
              <label>
                Data qubits
                <select
                  aria-label="Number of data qubits"
                  value={circuit.qubits}
                  disabled={dirty || busy}
                  onChange={(e) => resize(+e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                Editable sandbox · fixed mission payloads stay protected
              </span>
            </div>
            <PreparationCanvas
              circuit={circuit}
              selected={selected}
              disabled={dirty || busy}
              onSelect={(id) => {
                setSelected(id);
                const o = circuit.operations.find((o) => o.id === id);
                if (o?.role === "error")
                  setting(() => setMode("selected_error"));
                else if (mode === "selected_error")
                  setting(() => setMode("final"));
              }}
              onPlace={place}
              onMove={(o, q, col) =>
                applyDraft({
                  ...circuit,
                  operations: circuit.operations.map((v) =>
                    v.id === o.id
                      ? {
                          ...v,
                          qubits: o.name === "cx" ? [q, o.qubits[1]] : [q],
                          column: col,
                        }
                      : v,
                  ),
                })
              }
              onCombine={(b) => {
                if (
                  !b &&
                  circuit.operations.filter((o) => o.role === "error").length >
                    1
                ) {
                  setError(
                    "Remove extra error blocks before leaving Combine Errors mode. No blocks were discarded.",
                  );
                  return;
                }
                applyDraft({ ...circuit, combineErrors: b });
              }}
            />
            <ErrorBlockInspector
              operation={selectedOp}
              qubits={circuit.qubits}
              disabled={dirty || busy}
              onUpdate={(o) =>
                applyDraft({
                  ...circuit,
                  operations: circuit.operations.map((v) =>
                    v.id === o.id ? o : v,
                  ),
                })
              }
              onDelete={remove}
            />
          </div>
          <div hidden={editor !== "Code"}>
            <TutorialCodeEditor
              code={code}
              dirty={dirty}
              diagnostics={diagnostics}
              busy={busy}
              onCode={(s) => {
                setCode(s);
                setDirty(true);
                setDiagnostics([]);
                invalidate();
              }}
              onApply={() => void applyCode()}
            />
          </div>
          <div className="nw-export">
            <button disabled={dirty} onClick={() => setExported(!exported)}>
              {exported ? "Close export" : "Export native Qiskit"}
            </button>
            <span>Standalone Qiskit 2+ · separate from the teaching API</span>
          </div>
          {exported && (
            <textarea
              aria-label="Native Qiskit export"
              readOnly
              value={nativeQiskit(circuit, mode, selected, basis, shots, seed)}
              className="nw-native-export"
            />
          )}
        </div>
      }
      results={
        <ComparisonTelemetry
          result={result}
          stale={stale}
          mode={mode}
          onMode={(v) => setting(() => setMode(v))}
          selectedError={selectedError}
          qubit={qubit}
          onQubit={setQubit}
          qubits={circuit.qubits}
          basis={basis}
          onBasis={(v) => setting(() => setBasis(v))}
          shots={shots}
          onShots={(v) => setting(() => setShots(v))}
          onResample={() => void run(true)}
          busy={busy}
        />
      }
    />
  );
}
