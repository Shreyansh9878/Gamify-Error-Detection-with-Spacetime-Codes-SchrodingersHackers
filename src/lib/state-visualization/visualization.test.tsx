import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuantumStateView } from "@/components/state-visualization/QuantumStateView";
import type { StateVisualization } from "./contracts";
const base: StateVisualization = {
  schemaVersion: 2,
  frameId: "test-frame",
  visualizationToken: "test-token",
  experimentWireCount: 1,
  wireOrder: ["q0"],
  scope: "data",
  stage: "before-measurement",
  stateKind: "pure",
  purity: 1,
  probabilities: [1, 0],
  amplitudes: [
    [1, 0],
    [0, 0],
  ],
};
describe("quantum state display semantics", () => {
  it("uses Bloch only for a one-active-wire experiment and labels helper marginals", () => {
    const single = renderToStaticMarkup(
      <QuantumStateView frame={base} bloch={[0, 0, 1]} label="reference" />,
    );
    expect(single).toContain("Bloch vector");
    expect(single).not.toContain("QSphere,");
    const marginal = renderToStaticMarkup(
      <QuantumStateView
        frame={{ ...base, experimentWireCount: 2 }}
        bloch={[0, 0, 1]}
        label="reference"
      />,
    );
    expect(marginal).toContain("QSphere, 1 displayed wires");
    expect(marginal).toContain("Reduced data from 2 active wires");
    expect(marginal).not.toContain("Bloch vector");
  });
  it("shows probabilities with unassigned phases for a mixed state and weighted component choices", () => {
    const { amplitudes: _, ...mixedBase } = base;
    const frame: StateVisualization = {
      ...mixedBase,
      experimentWireCount: 2,
      wireOrder: ["q1", "q0"],
      stateKind: "mixed",
      purity: 0.5,
      probabilities: [0.5, 0, 0, 0.5],
      spectral: { rank: 2, componentCount: 2, omittedWeight: 0 },
      components: [
        {
          index: 0,
          weight: 0.5,
          amplitudes: [
            [1, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
        {
          index: 1,
          weight: 0.5,
          amplitudes: [
            [0, 0],
            [0, 0],
            [0, 0],
            [1, 0],
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <QuantumStateView frame={frame} label="mixture" />,
    );
    expect(html).toContain("mixed-state populations");
    expect(html).toContain("weight 0.500000");
    expect(html).toContain("phase undefined");
    expect(html).toContain("no unique eigenvectors");
    expect(html).not.toContain("color = relative phase");
  });
  it("does not substitute a fictional state when no state survives", () => {
    const html = renderToStaticMarkup(
      <QuantumStateView
        frame={{ ...base, stateKind: "unavailable" }}
        label="retained"
      />,
    );
    expect(html).toContain("No retained state exists");
    expect(html).not.toContain("<svg");
  });
});
