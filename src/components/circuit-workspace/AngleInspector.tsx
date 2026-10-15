"use client";
import { useEffect, useState } from "react";
export function parseAngle(source: string): number | null {
  const s = source.trim().toLowerCase().replace(/π/g, "pi").replace(/\s/g, "");
  let v = Number(s);
  if (!s) return null;
  const match = s.match(
    /^([+-]?(?:\d+(?:\.\d+)?\*?)?)pi(?:\/([0-9]+(?:\.[0-9]+)?))?$/,
  );
  if (match) {
    const coefficient = match[1].replace("*", "");
    v =
      ((coefficient === "" || coefficient === "+"
        ? 1
        : coefficient === "-"
          ? -1
          : Number(coefficient)) *
        Math.PI) /
      (match[2] ? Number(match[2]) : 1);
  }
  return Number.isFinite(v) && Math.abs(v) <= 2 * Math.PI ? v : null;
}
export function AngleInspector({
  name,
  angle,
  onApply,
  onClose,
  disabled,
}: {
  name: string;
  angle: number;
  onApply: (a: number) => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const [source, setSource] = useState(String(angle)),
    [error, setError] = useState("");
  useEffect(() => setSource(String(angle)), [angle]);
  return (
    <section
      className="uc-angle-inspector"
      aria-label="Gate parameter inspector"
    >
      <h3>Gate Inspector · {name.toUpperCase()} angle</h3>
      <p>
        Edit θ in radians. Placement uses drag-and-drop; removal uses the
        Dustbin.
      </p>
      <label>
        θ (radians)
        <input
          autoFocus
          aria-label="Gate theta radians"
          value={source}
          disabled={disabled}
          onChange={(e) => setSource(e.target.value)}
        />
      </label>
      <div>
        {["pi/2", "pi/4", "pi"].map((p) => (
          <button key={p} disabled={disabled} onClick={() => setSource(p)}>
            {p}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={disabled}
        onClick={() => {
          const theta = parseAngle(source);
          if (theta === null)
            setError(
              "Use a finite angle between −2π and 2π, such as pi/4 or 1.2.",
            );
          else {
            setError("");
            onApply(theta);
          }
        }}
      >
        Apply angle
      </button>
      <button onClick={onClose}>Close inspector</button>
    </section>
  );
}
