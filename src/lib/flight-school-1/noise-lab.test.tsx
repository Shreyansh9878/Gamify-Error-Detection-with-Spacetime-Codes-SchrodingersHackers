import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  block,
  circuitSchema,
  emptyCircuit,
  progressSchema,
  Circuit,
} from "./contracts";
import { examples } from "./content";
import { nativeQiskit, tutorialCode } from "./code-generation";
import { BlochSphere } from "@/components/flight-school-1/ComparisonTelemetry";
import { NoiseKnowledgeCheck } from "@/components/flight-school-1/NoiseKnowledgeCheck";
const python =
  process.env.PYTHON ||
  (existsSync(".venv/Scripts/python.exe")
    ? ".venv/Scripts/python.exe"
    : existsSync(".venv/bin/python")
      ? ".venv/bin/python"
      : "python");

describe("noise lab contracts and state roles", () => {
  it("allows disjoint parallel gates and protects single-error mode", () => {
    const c: Circuit = {
      ...emptyCircuit,
      qubits: 2,
      operations: [block("h", 0, 0, "h"), block("x", 1, 0, "x")],
    };
    expect(circuitSchema.safeParse(c).success).toBe(true);
    expect(
      circuitSchema.safeParse({
        ...c,
        operations: [...c.operations, block("z", 0, 0, "z")],
      }).success,
    ).toBe(false);
    const errors = [
      block("bit_flip", 0, 1, "a"),
      block("phase_flip", 1, 2, "b"),
    ];
    expect(circuitSchema.safeParse({ ...c, operations: errors }).success).toBe(
      false,
    );
    expect(
      circuitSchema.safeParse({ ...c, combineErrors: true, operations: errors })
        .success,
    ).toBe(true);
  });
  it("rejects missing wires, invalid waiting parameters and role laundering", () => {
    for (const operation of [
      { ...block("x", 0, 0, "x"), role: "error" },
      block("x", 1, 0, "x"),
      { ...block("decoherence", 0, 0, "e"), t1Us: 20, t2Us: 80 },
    ]) {
      expect(
        circuitSchema.safeParse({ ...emptyCircuit, operations: [operation] })
          .success,
      ).toBe(false);
    }
  });
  it("requires actual lesson evidence for persisted completion", () => {
    const p = {
      contentVersion: "noise-basics-v1",
      successfulRun: true,
      answers: ["B", "C", "A"],
      submitted: true,
      complete: true,
    };
    expect(progressSchema.safeParse(p).success).toBe(true);
    expect(
      progressSchema.safeParse({ ...p, successfulRun: false }).success,
    ).toBe(false);
  });
  it("labels the zero vector without fabricating a pure state", () => {
    const html = renderToStaticMarkup(
      <BlochSphere vector={[0, 0, 0]} label="Mixed local state" />,
    );
    expect(html).toContain("Zero vector · no defined direction");
    expect(html).toContain("X 0.000, Y 0.000, Z 0.000");
  });
  it("keeps completion local to module one", () => {
    const html = renderToStaticMarkup(
      <NoiseKnowledgeCheck
        answers={["B", "C", "A"]}
        submitted
        successful
        complete
        onAnswers={() => {}}
        onSubmit={() => {}}
        onContinue={() => {}}
        onExperiment={() => {}}
      />,
    );
    expect(html).toContain("Continue to Flight School 2");
    expect(html).not.toContain("Unlock missions");
  });
});

describe("real Python and Qiskit interoperability", () => {
  it("round-trips every preset, parallel gates and parameterized combinations through the server parser", () => {
    const all = [
      ...examples.map((e) => e.circuit),
      {
        ...emptyCircuit,
        qubits: 2,
        combineErrors: true,
        operations: [
          block("h", 0, 0, "a"),
          block("ry", 1, 0, "b"),
          block("phase_flip", 0, 1, "c"),
          block("decoherence", 1, 1, "d"),
        ],
      },
    ];
    const input = all.map((c) => ({ original: c, code: tutorialCode(c) }));
    const source = `import json,sys\nfrom backend.noise_lab.code_parser import parse\nfrom backend.noise_lab.models import Circuit,CompileRequest,LabRunRequest\nfrom backend.noise_lab.simulator import run_lab\nfor case in json.load(sys.stdin):\n c=Circuit(**case['original'])\n p=parse(CompileRequest(code=case['code'],combineErrors=c.combineErrors))\n a=[o.model_dump(exclude={'id'}) for o in sorted(c.operations,key=lambda o:(o.column,o.role=='error',o.qubits,o.id))]\n b=[o.model_dump(exclude={'id'}) for o in p.operations]\n assert a==b,(a,b)\n r=run_lab(LabRunRequest(circuit=c))\n s=run_lab(LabRunRequest(circuit=p))\n def stable(v):\n  if isinstance(v,dict): return {k:stable(x) for k,x in v.items() if k not in ('frameId','visualizationToken')}\n  if isinstance(v,list): return [stable(x) for x in v]\n  return v\n assert stable(r['states'])==stable(s['states'])\nprint('round-trip verified')`;
    const output = execFileSync(python, ["-X", "utf8", "-c", source], {
      input: JSON.stringify(input),
      encoding: "utf8",
    });
    expect(output).toContain("round-trip verified");
  }, 20000);
  it("executes native exports without a teaching wrapper and reproduces density matrices", () => {
    for (const c of [examples[4].circuit, examples[5].circuit]) {
      const source =
        nativeQiskit(c, "final", "e", "X", 256, 2026) +
        `\nimport json,numpy as np\nfrom backend.noise_lab.models import Circuit,LabRunRequest\nfrom backend.noise_lab.simulator import compare\nrequest=LabRunRequest(circuit=Circuit(**json.loads(${JSON.stringify(JSON.stringify(c))})))\nfor exported,expected in zip(states,compare(request)):\n assert np.allclose(exported.data,expected.data)\nprint('export verified')\n`;
      expect(
        execFileSync(python, ["-X", "utf8", "-c", source], {
          encoding: "utf8",
        }),
      ).toContain("export verified");
    }
  }, 20000);
});
