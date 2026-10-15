import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MissionCanvas } from "@/components/circuit-workspace/MissionCanvas";
import { Mission } from "@/components/Mission";
import {
  checkDraft,
  generate,
  initialDraft,
  type MissionLevel,
  type Validation,
} from "./contracts";
const level: MissionLevel = {
  id: 4,
  title: "Interior access",
  overview: "Protect the crossing. You have 2 ancillas; reach 0.60.",
  subtitle: "",
  chapter: "ASSISTED",
  qubits: 3,
  ancillas: 2,
  checkBudget: 2,
  fixed: true,
  assisted: true,
  targetScore: 0.6,
  allowed: ["h", "cx"],
  protocol: "main-missions-v1",
  payload: [
    { id: "u0", name: "cx", qubits: [0, 1], column: 0, fixed: true },
    { id: "u1", name: "s", qubits: [1], column: 1, fixed: true },
  ],
  noise: {
    hotspotColumn: 0,
    qubit: 1,
    timeUs: 80,
    t1Us: 100,
    t2Us: 200,
    background: 0.0005,
    checkStrength: 0.025,
  },
};
describe("shared main mission workspace", () => {
  it("reuses the workspace with compact results and insertion controls only in missions", () => {
    const html = renderToStaticMarkup(
      <Mission
        level={level}
        onBack={() => {}}
        onWin={() => {}}
        sound={false}
        onSound={() => {}}
      />,
    );
    expect(html).toContain("noise-workspace");
    expect(html).toContain("Insert columns");
    expect(html).toContain("Delete — drop here");
    for (const forbidden of [
      "Add helper",
      "Operator trajectory",
      "Shot histogram",
      "Noise Radar",
      "Circuit zones",
    ])
      expect(html).not.toContain(forbidden);
  });
  it("renders fixed ancillas, locked payload and generated closure on the actual shared renderer", () => {
    const draft = initialDraft(level);
    draft.operations = [
      { id: "g0", name: "cx", qubits: [3, 0], boundary: 0, slot: 1 },
    ];
    const validation: Validation = {
      valid: true,
      hasChecks: true,
      status: "Ready",
      operations: [],
      generated: [
        {
          id: "auto-0-0",
          name: "cx",
          qubits: [3, 1],
          rank: 65,
          column: "auto-0-0",
          owner: "generated-method",
        },
      ],
      checks: [
        {
          id: "a0",
          ancilla: "a0",
          opening: "b0s1",
          closing: "auto-0-0",
          valid: true,
          message: "Hidden detailed explanation",
          nonPauli: false,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <MissionCanvas
        level={level}
        draft={draft}
        validation={validation}
        onChange={() => {}}
        onError={() => {}}
        disabled={false}
      />,
    );
    expect(html).toContain("Locked CX");
    expect(html).toContain("auto-0-0");
    expect(html).toContain("a1");
    expect(html).not.toContain("a2");
    expect(html).toContain('stroke="#8ae6bd"');
    expect(html).not.toContain("Hidden detailed explanation");
  });
  it("rejects locked payload edits, register expansion, collisions and removes bands safely", () => {
    const draft = initialDraft(level);
    expect(() =>
      checkDraft(
        {
          ...draft,
          operations: [
            { id: "g0", name: "h", qubits: [0], boundary: 0, slot: 0 },
          ],
        },
        level,
      ),
    ).toThrow(/locked/);
    expect(() =>
      checkDraft(
        {
          ...draft,
          operations: [
            { id: "g0", name: "h", qubits: [5], boundary: 0, slot: 0 },
          ],
        },
        level,
      ),
    ).toThrow(/fixed/);
    expect(() =>
      checkDraft(
        {
          ...draft,
          operations: [
            { id: "g0", name: "h", qubits: [3], boundary: 1, slot: 0 },
          ],
        },
        level,
      ),
    ).toThrow(/Insert/);
    expect(generate(draft)).toContain("qc = MissionCircuit(4)");
  });
});
