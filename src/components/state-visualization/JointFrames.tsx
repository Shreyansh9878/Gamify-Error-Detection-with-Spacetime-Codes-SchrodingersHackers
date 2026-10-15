"use client";
import { useState } from "react";
import type { StateVisualization } from "@/lib/state-visualization/contracts";
import { QuantumStateView } from "./QuantumStateView";
export function JointFrames({
  frames,
}: {
  frames?: Record<string, StateVisualization>;
}) {
  const [choice, setChoice] = useState("joint-before-readout");
  if (!frames || !Object.keys(frames).length) return null;
  const key = frames[choice] ? choice : Object.keys(frames)[0];
  return (
    <details className="qs-joint">
      <summary>Joint data + helper state · measurement stages</summary>
      <label>
        Physical state frame
        <select
          aria-label="Physical state frame"
          value={key}
          onChange={(e) => setChoice(e.target.value)}
        >
          {Object.keys(frames).map((k) => (
            <option key={k} value={k}>
              {k === "joint-before-readout"
                ? "Before deferred readout — coherent joint state"
                : k === "joint-after-readout"
                  ? "After helper measurement — outcomes unconditioned"
                  : "Conditioned on helper-zero acceptance"}
            </option>
          ))}
        </select>
      </label>
      <p>
        Displayed bits follow the physical wire labels. Reduced data comparisons
        above are marginals. These joint simulator frames defer helper readout
        past later operations on other wires; the outcome statistics stay the
        same. In correction, the snapshot is the encoded block before the
        original syndrome measurement, with recovery and decoding shown
        separately in the output comparison. Correction keeps every syndrome
        branch, so it has no helper-zero acceptance frame.
      </p>
      <QuantumStateView
        key={frames[key].frameId}
        frame={frames[key]}
        label="Joint experiment state"
      />
    </details>
  );
}
