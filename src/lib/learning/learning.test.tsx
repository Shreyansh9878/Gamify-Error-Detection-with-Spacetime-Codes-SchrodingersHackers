import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  checkDraftSchema,
  experimentSchema,
  sandboxInitial,
  guidedInitial,
} from "./contracts";
import { checkCode, protectionCode } from "./code-generation";
import { checkExamples, protectionExamples, checkQuestion } from "./examples";
import { MarkdownLesson } from "@/components/learning/LabTheory";
import { protectionTheory, checkTheory } from "./content";
import { CheckCanvas } from "@/components/circuit-workspace/CheckCanvas";
import type { AdvancedDraft } from "@/lib/advanced-learning/contracts";
import { CircuitPreview } from "@/components/learning/CircuitPreview";
const python =
  process.env.PYTHON ||
  (existsSync(".venv/Scripts/python.exe")
    ? ".venv/Scripts/python.exe"
    : existsSync(".venv/bin/python")
      ? ".venv/bin/python"
      : "python");
describe("new learning lab contracts and presentation", () => {
  it("validates complete presets and guided incomplete drafts without widening mission models", () => {
    for (const e of protectionExamples)
      expect(experimentSchema.safeParse(e.experiment).success).toBe(true);
    for (const e of checkExamples)
      expect(checkDraftSchema.safeParse(e.draft).success).toBe(true);
    expect(checkDraftSchema.safeParse(guidedInitial).success).toBe(true);
    expect(
      checkDraftSchema.safeParse({ ...guidedInitial, payload: [] }).success,
    ).toBe(false);
    expect(
      experimentSchema.safeParse({
        ...protectionExamples[0].experiment,
        qubits: 5,
      }).success,
    ).toBe(false);
  });
  it("rejects reused ancillas and collisions; preserves negative signs", () => {
    expect(
      checkDraftSchema.safeParse({
        ...sandboxInitial,
        checks: [
          sandboxInitial.checks[0],
          { ...sandboxInitial.checks[0], id: "other" },
        ],
      }).success,
    ).toBe(false);
    expect(checkCode(checkExamples[1].draft)).toContain("closing_sign=-1");
  });
  it("renders substantial theory and the exact MCQ answer with the false-alarm qualification", () => {
    const html = renderToStaticMarkup(
      <MarkdownLesson source={protectionTheory + checkTheory} />,
    );
    expect(html).toContain("does not copy an unknown qubit");
    expect(html).toContain("S X S†");
    expect(html).toContain("No single check catches everything");
    expect(html.length).toBeGreaterThan(10000);
    expect(checkQuestion.answer).toBe("B");
    expect(checkQuestion.explanation).toContain(
      "does not necessarily give syndrome 1 on every shot",
    );
  });
  it("renders individual physical assembly actions and read-only generated checks", () => {
    const html = renderToStaticMarkup(
      <CheckCanvas draft={guidedInitial as unknown as AdvancedDraft} validation={null} lesson={3} onChange={()=>{}} disabled={false} onError={()=>{}}/>,
    );
    for (const label of [
      "Drag Ancilla H",
      "Drag Final H",
      "Drag Syndrome M",
      "Drag Opening P",
      "Delete — drop here",
    ])
      expect(html).toContain(label);
    const preview = renderToStaticMarkup(
      <CircuitPreview
        title="Actual circuit"
        labels={["q0", "a0"]}
        items={[
          { name: "cx", qubits: [1, 0], stage: "Opening" },
          { name: "z", qubits: [1], stage: "sign compensation" },
        ]}
      />,
    );
    expect(preview).toContain("read-only");
    expect(preview).toContain("SIGN");
  });
});
describe("visual/source interoperability", () => {
  it("round-trips every teaching preset through both actual safe Python parsers", () => {
    const payload = {
      protection: protectionExamples.map((e) => ({
        source: protectionCode(e.experiment),
        model: e.experiment,
      })),
      checks: checkExamples.map((e) => ({
        source: checkCode(e.draft),
        model: e.draft,
      })),
    };
    const script = `import json,sys\nimport numpy as np\nfrom backend.protection_lab.models import CompileRequest as PC,Experiment,ProtectionRequest\nfrom backend.protection_lab.code_parser import parse as pp\nfrom backend.protection_lab.service import run as pr\nfrom backend.check_lab.models import CompileRequest as CC,Draft,CheckRequest\nfrom backend.check_lab.code_parser import parse as cp\nfrom backend.check_lab.service import run as cr\npayload=json.load(sys.stdin)\nfor case in payload['protection']:\n a=Experiment(**case['model']);b=pp(PC(code=case['source']))\n assert a.noise==b.noise\n for method in ['detection','mitigation','correction']:\n  r=pr(ProtectionRequest(experiment=a,technique=method));s=pr(ProtectionRequest(experiment=b,technique=method))\n  assert np.allclose(list(r['baseline']['probabilities'].values()),list(s['baseline']['probabilities'].values()))\n  if r['output']:\n   assert np.allclose(r['output']['fidelity'],s['output']['fidelity'])\nfor case in payload['checks']:\n a=Draft(**case['model']);b=cp(CC(code=case['source'],mode=a.mode,combineFaults=a.combineFaults))\n r=cr(CheckRequest(draft=a));s=cr(CheckRequest(draft=b))\n assert r['valid']==s['valid']\n assert np.allclose(r['flagProbability'],s['flagProbability'])\nprint('all round trips verified')`;
    expect(
      execFileSync(python, ["-X", "utf8", "-c", script], {
        input: JSON.stringify(payload),
        encoding: "utf8",
      }),
    ).toContain("all round trips verified");
  }, 30000);
});
