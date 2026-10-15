"use client";
import { useEffect, useState } from "react";
import { Operation, blockLabel } from "@/lib/flight-school-1/contracts";
export function ErrorBlockInspector({
  operation,
  qubits,
  disabled,
  onUpdate,
  onDelete,
}: {
  operation: Operation | null;
  qubits: number;
  disabled: boolean;
  onUpdate: (o: Operation) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(operation);
  useEffect(() => setDraft(operation), [operation]);
  if (!draft || !operation)
    return (
      <div className="nw-inspector nw-inspector-empty">
        <b>Block inspector</b>
        <span>
          Select a preparation or error block to move it or edit parameters.
        </span>
      </div>
    );
  const change = (values: Partial<Operation>) =>
    setDraft({ ...draft, ...values });
  return (
    <div className="nw-inspector">
      <div className="nw-inspector-title">
        <b>
          {blockLabel(operation)}{" "}
          <span className="nw-chip">
            {operation.role === "error"
              ? "Injected error"
              : "State preparation"}
          </span>
        </b>
        <button disabled={disabled} onClick={onDelete}>
          Delete selected block
        </button>
      </div>
      <div className="nw-inspector-fields">
        <label>
          {draft.name === "cx" ? "Control wire" : "Target wire"}
          <select
            aria-label="Block target wire"
            value={draft.qubits[0]}
            onChange={(e) =>
              change({ qubits: [+e.target.value, ...draft.qubits.slice(1)] })
            }
          >
            {Array.from({ length: qubits }, (_, q) => (
              <option key={q} value={q}>
                q{q}
              </option>
            ))}
          </select>
        </label>
        {draft.name === "cx" && (
          <label>
            Target wire
            <select
              aria-label="CX target wire"
              value={draft.qubits[1]}
              onChange={(e) =>
                change({ qubits: [draft.qubits[0], +e.target.value] })
              }
            >
              {Array.from({ length: qubits }, (_, q) => (
                <option key={q} value={q}>
                  q{q}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Column
          <input
            aria-label="Block column"
            type="number"
            min="0"
            max="15"
            value={draft.column}
            onChange={(e) => change({ column: +e.target.value })}
          />
        </label>
        {draft.angleRadians !== undefined && (
          <>
            <label>
              Angle (radians)
              <input
                type="number"
                aria-label="Rotation angle"
                min={-2 * Math.PI}
                max={2 * Math.PI}
                step="any"
                value={draft.angleRadians}
                onChange={(e) => change({ angleRadians: +e.target.value })}
              />
            </label>
            <label>
              Angle preset
              <select
                aria-label="Rotation preset"
                value=""
                onChange={(e) => change({ angleRadians: +e.target.value })}
              >
                <option value="">Choose…</option>
                {[
                  0,
                  -Math.PI / 4,
                  Math.PI / 4,
                  -Math.PI / 2,
                  Math.PI / 2,
                  Math.PI,
                ].map((v, i) => (
                  <option key={v} value={v}>
                    {["0", "−π/4", "π/4", "−π/2", "π/2", "π"][i]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {draft.name === "decoherence" && (
          <>
            <label className="nw-time-slider">
              Elapsed time t · {draft.timeUs} μs
              <input
                aria-label="Elapsed waiting time"
                type="range"
                min="0"
                max="200"
                step="1"
                value={draft.timeUs}
                onChange={(e) => change({ timeUs: +e.target.value })}
              />
            </label>
            <details>
              <summary>Advanced · T1 / T2</summary>
              <div className="nw-inspector-fields">
                <label>
                  T1 (μs)
                  <input
                    aria-label="Relaxation time T1"
                    type="number"
                    min="20"
                    max="200"
                    value={draft.t1Us}
                    onChange={(e) => change({ t1Us: +e.target.value })}
                  />
                </label>
                <label>
                  T2 (μs)
                  <input
                    aria-label="Coherence time T2"
                    type="number"
                    min=".01"
                    max={Math.min(400, 2 * (draft.t1Us || 100))}
                    step="any"
                    value={draft.t2Us}
                    onChange={(e) => change({ t2Us: +e.target.value })}
                  />
                </label>
              </div>
            </details>
          </>
        )}
        <button
          className="nw-accent"
          disabled={disabled}
          onClick={() => onUpdate(draft)}
        >
          Apply block changes
        </button>
      </div>
      {draft.name === "decoherence" && (
        <p>
          One local zero-temperature waiting channel. t is elapsed time; T1 and
          T2 are time constants, in μs. Require T2 ≤ 2T1. Commit with Apply,
          then rerun.
        </p>
      )}
    </div>
  );
}
