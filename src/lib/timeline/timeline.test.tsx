import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { TimelineCanvas } from "@/components/circuit-workspace/TimelineCanvas";
import { initialDraft, draftCode, draftSchema, type Draft } from "./contracts";
import { protectionCode } from "../learning/code-generation";
import { initialExperiment } from "../learning/contracts";
import { initialHardware } from "./hardware";
import { hardwareProtectionExamples } from "../learning/examples";

describe("ordinary-gate teaching timelines", () => {
  it("starts every custom sandbox blank with independently sized registers", () => {
    for (const number of [3, 4, 5] as const) {
      const d = initialDraft(number, "sandbox");
      expect(d.operations).toEqual([]);
      expect(
        draftSchema.parse({ ...d, dataQubits: 5, ancillas: 2 }).dataQubits,
      ).toBe(5);
    }
  });
  it("renders ordinary CX/CY/CZ/H/M and only locked workload nodes without zones", () => {
    for (const number of [3, 4, 5, 6] as const) {
      const html = renderToStaticMarkup(
        <TimelineCanvas
          draft={initialDraft(number, "guided")}
          onChange={() => {}}
          onError={() => {}}
          validation={null}
        />,
      );
      for (const name of ["H", "M", "CX", "CY", "CZ"])
        expect(html).toContain(`aria-label="Drag ${name}"`);
      for (const name of [
        "State Prep",
        "CPC Opening",
        "CPC Closing",
        "Ancilla H",
        "Opening P",
        "Final H",
        "Gate Inspector",
      ])
        expect(html).not.toContain(name);
      expect(html).not.toContain('aria-label="Circuit zones"');
      if (number === 6) expect(html).not.toContain("Drag Decoherence");
      if (number === 5) expect(html).toContain("al-t-gate");
    }
  });
  it("rejects collisions, modified workload and interactions after M", () => {
    const d = initialDraft(3, "guided");
    expect(
      draftSchema.safeParse({
        ...d,
        operations: [{ id: "overwrite", name: "h", qubits: [0], column: 2 }],
      }).success,
    ).toBe(false);
    expect(
      draftSchema.safeParse({
        ...d,
        operations: [
          { id: "m", name: "m", qubits: [1], column: 0 },
          { id: "h", name: "h", qubits: [1], column: 1 },
        ],
      }).success,
    ).toBe(false);
  });
  it("round-trips all guided and blank models through the actual Python allowlists", () => {
    const drafts: Draft[] = [3, 4, 5, 6].map((n) =>
      initialDraft(n as 3 | 4 | 5 | 6, "guided"),
    );
    drafts[0].operations = [
      { id: "h", name: "h", qubits: [1], column: 0 },
      { id: "x", name: "cx", qubits: [1, 0], column: 1 },
      { id: "y", name: "cy", qubits: [1, 0], column: 4 },
      { id: "h2", name: "h", qubits: [1], column: 5 },
      { id: "m", name: "m", qubits: [1], column: 6 },
    ];
    for (const n of [3, 4, 5] as const)
      drafts.push({
        ...initialDraft(n, "sandbox"),
        dataQubits: 5,
        ancillas: 2,
      });
    const payload = {
      examples: hardwareProtectionExamples.map((e) =>
        protectionCode(e.experiment),
      ),
      sources: drafts.map(draftCode),
      protection: protectionCode({
        ...initialExperiment,
        qubits: 2,
        noise: { ...initialExperiment.noise, targetQubit: 1 },
        hardware: initialHardware,
      }),
    };
    const script = `import sys,json\nfrom backend.timeline_lab.service import compile_source\nfrom backend.timeline_lab.models import CompileRequest\nfrom backend.protection_lab.code_parser import compile_source as protection\nfrom backend.protection_lab.models import CompileRequest as ProtectionCompile\nv=json.load(sys.stdin)\nr=[compile_source(CompileRequest(code=s)) for s in v['sources']]\np=protection(ProtectionCompile(code=v['protection']))\ne=[protection(ProtectionCompile(code=s)) for s in v['examples']]\nprint(json.dumps({'drafts':r,'protection':p,'examples':e}))`;
    const python =
      process.platform === "win32"
        ? ".venv/Scripts/python.exe"
        : ".venv/bin/python";
    const results = JSON.parse(
      execFileSync(python, ["-c", script], {
        input: JSON.stringify(payload),
        encoding: "utf8",
        env: { ...process.env, PYTHONUTF8: "1" },
      }),
    );
    expect(
      results.drafts.every(
        (r: { diagnostics: unknown[] }) => r.diagnostics.length === 0,
      ),
    ).toBe(true);
    expect(
      results.drafts[0].draft.operations.map((g: { name: string }) => g.name),
    ).toEqual(["h", "cx", "cy", "h", "m"]);
    expect(results.protection.diagnostics).toEqual([]);
    expect(results.protection.experiment.noise.targetQubit).toBe(1);
    expect(results.protection.experiment.hardware).toEqual(initialHardware);
    expect(
      results.examples.every(
        (r: { diagnostics: unknown[] }) => r.diagnostics.length === 0,
      ),
    ).toBe(true);
    expect(results.examples[1].experiment.hardware.phaseFlip).toBe(0.04);
    expect(results.examples[5].experiment.hardware.relaxationTimeUs).toBe(10);
  });
});
