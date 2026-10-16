import { Diagnostic } from "@/lib/flight-school-1/contracts";
export function TutorialCodeEditor({
  code,
  dirty,
  diagnostics,
  onCode,
  onApply,
  busy,
}: {
  code: string;
  dirty: boolean;
  diagnostics: Diagnostic[];
  onCode: (s: string) => void;
  onApply: () => void;
  busy: boolean;
}) {
  return (
    <div className="nw-code">
      <div className="nw-code-heading">
        <span>TutorialCircuit · supported Python subset</span>
        <span>
          {dirty ? "● Unapplied changes" : "✓ Synced with visual circuit"}
        </span>
        <button onClick={onApply} disabled={busy || !dirty}>
          Apply code
        </button>
      </div>
      <p>
        Qiskit-backed teaching API: error helpers and <code>at=</code> are
        app-defined, not native QuantumCircuit methods. No arbitrary Python
        execution. Use numeric arithmetic; optionally import pi from math.
      </p>
      <textarea
        spellCheck={false}
        aria-label="Tutorial circuit code"
        value={code}
        onChange={(e) => onCode(e.target.value)}
        maxLength={8192}
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
