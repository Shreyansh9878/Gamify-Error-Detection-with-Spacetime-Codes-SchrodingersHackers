"use client";
import { useEffect, useState } from "react";
import type { Noise } from "@/lib/learning/contracts";
export function NoiseControls({
  value,
  n,
  onChange,
  disabled = false,
}: {
  value: Noise;
  n: number;
  onChange: (v: Noise) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const update = (v: Partial<Noise>) => setDraft({ ...draft, ...v });
  return (
    <div className="nw-inspector">
      <div className="nw-inspector-title">
        <b>Explicit local noise boundary · E</b>
        <span className="nw-chip">Preparation / readout ideal</span>
      </div>
      <div className="nw-inspector-fields">
        <label>
          Noise channel
          <select
            aria-label="Noise channel"
            value={draft.channel}
            disabled={disabled}
            onChange={(e) => {
              const channel = e.target.value as Noise["channel"];
              setDraft({
                channel,
                enabled:draft.enabled,
                targetQubits:draft.targetQubits,
                targetQubit: draft.targetQubit,
                boundary: draft.boundary,
                ...(channel === "decoherence"
                  ? { timeUs: 50, t1Us: 100, t2Us: 80 }
                  : channel === "depolarizing"
                    ? { strength: 0.15 }
                    : { probability: 0.15 }),
              });
            }}
          >
            {["bit_flip", "phase_flip", "depolarizing", "decoherence"].map(
              (v) => (
                <option key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Target wire
          <select
            aria-label="Noise target wire"
            value={draft.targetQubit}
            onChange={(e) => update({ targetQubit: +e.target.value, targetQubits:[+e.target.value] })}
          >
            {Array.from({ length: n }, (_, q) => (
              <option key={q} value={q}>
                q{q}
              </option>
            ))}
          </select>
        </label>
        <label>
          Boundary (before column)
          <input
            aria-label="Noise boundary"
            type="number"
            min="0"
            max="16"
            value={draft.boundary}
            onChange={(e) => update({ boundary: +e.target.value })}
          />
        </label>
        {draft.channel === "decoherence" ? (
          <>
            <label className="nw-time-slider">
              Elapsed t: {draft.timeUs} μs
              <input
                aria-label="Elapsed waiting time"
                type="range"
                min="0"
                max="200"
                value={draft.timeUs}
                onChange={(e) => update({ timeUs: +e.target.value })}
              />
            </label>
            <label>
              T1 (μs)
              <input
                aria-label="Relaxation time T1"
                type="number"
                min="20"
                max="200"
                value={draft.t1Us}
                onChange={(e) => update({ t1Us: +e.target.value })}
              />
            </label>
            <label>
              T2 (μs)
              <input
                aria-label="Coherence time T2"
                type="number"
                min=".01"
                max="400"
                step="any"
                value={draft.t2Us}
                onChange={(e) => update({ t2Us: +e.target.value })}
              />
            </label>
          </>
        ) : (
          <label className="nw-time-slider">
            {draft.channel === "depolarizing"
              ? "Depolarizing d"
              : "Fault probability p"}
            : {(draft.probability ?? draft.strength ?? 0).toFixed(2)}
            <input
              aria-label="Noise probability"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={draft.probability ?? draft.strength}
              onChange={(e) =>
                update(
                  draft.channel === "depolarizing"
                    ? { strength: +e.target.value }
                    : { probability: +e.target.value },
                )
              }
            />
          </label>
        )}
        <button
          disabled={disabled}
          className="nw-accent"
          onClick={() => onChange(draft)}
        >
          Apply noise settings
        </button>
      </div>
      <p>
        {draft.channel === "decoherence"
          ? "Local zero-temperature waiting channel. T2 ≤ 2T1; elapsed t is distinct from both constants."
          : draft.channel === "depolarizing"
            ? "Qiskit convention: (1−d)ρ + d I/2 on the named subsystem. Nonidentity Pauli probability is 3d/4."
            : "A stochastic channel, not a forced X/Z event. No implicit idle noise."}{" "}
        A uses columns below the boundary; B uses columns at or above it.
      </p>
    </div>
  );
}
