"use client";
import { ReactNode, useEffect, useRef } from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { LearningWorkspace, MobilePane } from "../workspace/LearningWorkspace";

export function LabFrame({
  number,
  title,
  complete,
  onBack,
  onSkip,
  onLesson,
  previous,
  headerExtra,
  theory,
  experiment,
  results,
  mobile,
  setMobile,
}: {
  number: number;
  title: string;
  complete: boolean;
  onBack: () => void;
  onSkip: () => void;
  onLesson: (step: number) => void;
  previous: number;
  headerExtra?: ReactNode;
  theory: ReactNode;
  experiment: ReactNode;
  results: ReactNode;
  mobile: MobilePane;
  setMobile: (p: MobilePane) => void;
}) {
  return (
    <LearningWorkspace
      mobilePane={mobile}
      onMobilePane={setMobile}
      header={
        <header className="nw-header">
          <button className="nw-back" onClick={onBack}>
            <ArrowLeft size={16} />
            Flight school
          </button>
          <div className="nw-header-title">
            <span className="nw-logo">◈</span>
            <b>QUANTUM SHIELD</b>
            <span className="nw-header-divider">/</span>
            <span>
              {String(number).padStart(2, "0")} · {title}
            </span>
          </div>
          <select
            aria-label="Flight school lesson"
            value={number}
            onChange={(e) => onLesson(+e.target.value - 1)}
          >
            {[
              "Quantum errors",
              "Detection, mitigation, correction",
              "Coherent Pauli checks",
              "Multi-Qubit Pauli Propagation",
              "The T-Gate Barrier",
              "Trade-Off Optimization",
            ].map((name, i) => (
              <option
                key={i}
                value={i + 1}
                disabled={
                  i > Math.max(previous, complete ? number : number - 1)
                }
              >
                {i + 1}. {name}
              </option>
            ))}
          </select>
          {headerExtra}
          {complete && <span className="nw-chip">✓ Complete</span>}
          <button
            aria-label="Workspace help"
            onClick={() => setMobile("Theory")}
          >
            <HelpCircle size={16} />
          </button>
          <button className="nw-skip" onClick={onSkip}>
            Skip Tutorial / Unlock All Levels
          </button>
        </header>
      }
      theory={theory}
      experiment={experiment}
      results={results}
    />
  );
}
export function LabFeedback({
  error,
  notice,
  onErrorPane,
}: {
  error: string;
  notice?: string;
  onErrorPane: () => void;
}) {
  const focus = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) {
      onErrorPane();
      const id = requestAnimationFrame(() => focus.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [error]);
  return (
    <>
      {notice && (
        <p className="nw-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="nw-error" role="alert" tabIndex={-1} ref={focus}>
          {error}
        </p>
      )}
    </>
  );
}
export function CodeEditor({
  source,
  dirty,
  onChange,
  diagnostics,
  busy,
  onApply,
  wrapper,
}: {
  source: string;
  dirty: boolean;
  onChange: (s: string) => void;
  diagnostics: { line: number; column: number; message: string }[];
  busy: boolean;
  onApply: () => void;
  wrapper: string;
}) {
  return (
    <div className="nw-code">
      <div className="nw-code-heading">
        <span>{wrapper} · Qiskit-backed supported source</span>
        <span>{dirty ? "● Unapplied changes" : "✓ Synced"}</span>
        <button onClick={onApply} disabled={!dirty || busy}>
          Apply code
        </button>
      </div>
      <p>
        This app-defined API is parsed safely into your circuit; general Python
        is not executed. The native Qiskit implementation appears separately
        below.
      </p>
      <textarea
        aria-label="Tutorial circuit code"
        spellCheck={false}
        value={source}
        maxLength={8192}
        onChange={(e) => onChange(e.target.value)}
      />
      {diagnostics.length > 0 && (
        <ul role="alert">
          {diagnostics.map((d, i) => (
            <li key={i}>
              Line {d.line}, column {d.column}: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function NativeCode({ code }: { code: string | undefined }) {
  return (
    <details className="ql-native">
      <summary>Native Qiskit / processing · standalone export</summary>
      {code ? (
        <>
          <p>
            Read-only generated implementation. Copy into a Qiskit 2+ / Aer
            environment. This is separate from the editable teaching API.
          </p>
          <textarea aria-label="Native Qiskit export" readOnly value={code} />
        </>
      ) : (
        <p>Validate the current draft to generate its actual implementation.</p>
      )}
    </details>
  );
}
