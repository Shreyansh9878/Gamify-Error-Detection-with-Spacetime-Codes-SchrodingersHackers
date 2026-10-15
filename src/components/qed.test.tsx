import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CircuitBuilder } from "./CircuitBuilder";
import { BlochVectors, ShotHistogram } from "./Visualizers";
import { lessons } from "../lib/tutorial-data";
import type { Level } from "../lib/types";

const level: Level = {
  id: 1,
  title: "Barrier",
  subtitle: "Fixed workload",
  description: "",
  concept: "",
  hint: "",
  targetLabel: "|1>",
  qubits: 1,
  slots: 4,
  gateBudget: 1,
  checkBudget: 1,
  minChecks: 1,
  allowed: ["x"],
  channel: "bitflip",
  noise: 0.08,
  fidelityGoal: 0.87,
  retentionGoal: 0.4,
  target: [{ id: "x", name: "x", qubits: [0], column: 0 }],
  starter: [{ id: "x", name: "x", qubits: [0], column: 0 }],
  fixed: true,
  checkMode: "manual",
  defaultStart: 1,
  noiseLabel: "Synthetic",
  chapter: "FOUNDATIONS",
};
describe("QED workspace rendering", () => {
  it("renders an immutable payload and explicit manual closing choices", () => {
    const html = renderToStaticMarkup(
      <CircuitBuilder
        level={level}
        checks={[
          {
            qubit: 0,
            pauli: "Z",
            start: 1,
            end: 4,
            closingQubit: 0,
            closingPauli: "X",
          },
        ]}
        onChecks={() => {}}
        disabled={false}
        preview={{
          valid: false,
          error: "",
          mode: "manual",
          checks: [
            { valid: false, error: "Open loop: expected Z", start: 1, end: 4 },
          ],
        }}
        validating={false}
        onFault={() => {}}
        fault={null}
      />,
    );
    expect(html).toContain("Locked q0 time 0: X");
    expect(html).toContain("Helper 1 closing Pauli");
    expect(html).toContain("Open loop: expected Z");
    expect(html).not.toContain("draggable");
    expect(html).not.toContain("Clear circuit");
  });
  it("shows assisted propagation without manual closing selectors in advanced missions", () => {
    const html = renderToStaticMarkup(
      <CircuitBuilder
        level={{ ...level, id: 6, checkMode: "assisted" }}
        checks={[{ qubit: 0, pauli: "Z", start: 1, end: 4 }]}
        onChecks={() => {}}
        disabled={false}
        preview={{
          valid: true,
          error: "",
          mode: "assisted",
          checks: [{ valid: true, closing: "Z", sign: 1, start: 1, end: 4 }],
        }}
        validating={false}
        onFault={() => {}}
        fault={null}
      />,
    );
    expect(html).toContain("Assisted P′");
    expect(html).toContain("Invariant closed");
    expect(html).not.toContain("Helper 1 closing Pauli");
  });
  it("labels measured shot conservation separately from expected sampling cost", () => {
    const html = renderToStaticMarkup(
      <ShotHistogram shots={1024} kept={800} discarded={224} retention={0.8} />,
    );
    expect(html).toContain("1024 total shots: 800 kept, 224 discarded");
    expect(html).toContain("1.25");
    expect(html).toContain("Any syndrome");
  });
  it("renders the mixed-state Bloch vector", () => {
    const html = renderToStaticMarkup(<BlochVectors vectors={[[0.4, 0, 0]]} />);
    expect(html).toContain("q0 Bloch vector x 0.40, y 0.00, z 0.00");
    expect(html).toContain("0.400");
  });
  it("retains six modules with invariant and T-crossing tasks", () => {
    expect(lessons).toHaveLength(6);
    expect(lessons[3].required).toContain("match");
    expect(lessons[5].required).toContain("t-Z");
  });
});
