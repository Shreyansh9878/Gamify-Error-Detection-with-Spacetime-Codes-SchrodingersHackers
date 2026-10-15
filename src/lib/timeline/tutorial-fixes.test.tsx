import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import {
  parseAngle,
  AngleInspector,
} from "@/components/circuit-workspace/AngleInspector";
import { McqOption } from "@/components/learning/McqOption";
import { hardwareSchema, initialHardware } from "./hardware";
import { draftCode, initialDraft, draftSchema } from "./contracts";
import { theory } from "./content";

it("parses bounded radian angles without evaluation and provides parameter-only controls", () => {
  expect(parseAngle("pi/2")).toBe(Math.PI / 2);
  expect(parseAngle("-π/4")).toBe(-Math.PI / 4);
  expect(parseAngle("1.25")).toBe(1.25);
  for (const bad of ["", "Infinity", "pi/0", "3*pi", "alert(1)"])
    expect(parseAngle(bad)).toBeNull();
  const html = renderToStaticMarkup(
    <AngleInspector
      name="rz"
      angle={Math.PI / 2}
      onApply={() => {}}
      onClose={() => {}}
      disabled={false}
    />,
  );
  expect(html).toContain("Gate theta radians");
  expect(html).toContain("Apply angle");
  expect(html).not.toContain("Delete");
  expect(html).not.toContain("Add gate");
});
it("wraps radio option text beside the selection dot and accepts the full hardware ranges", () => {
  const html = renderToStaticMarkup(
    <McqOption name="test" checked={false} onChange={() => {}}>
      A long answer that should wrap beside its radio
    </McqOption>,
  );
  expect(html).toMatch(/<input[^>]+\/><span>A long answer/);
  expect(
    hardwareSchema.safeParse({
      ...initialHardware,
      bitFlip: 1,
      phaseFlip: 1,
      depolarizing: 1,
      relaxationTimeUs: 120,
    }).success,
  ).toBe(true);
  expect(
    hardwareSchema.safeParse({ ...initialHardware, bitFlip: 1.1 }).success,
  ).toBe(false);
});
it("exports rotation angles and contains all generated static illustrations", () => {
  const d = {
    ...initialDraft(5, "sandbox"),
    operations: [
      {
        id: "r",
        name: "rz" as const,
        qubits: [0],
        column: 0,
        angleRadians: Math.PI / 4,
      },
    ],
  };
  expect(draftSchema.safeParse(d).success).toBe(true);
  expect(draftCode(d)).toContain(`qc.rz(${Math.PI / 4}, 0, at=0)`);
  const manifest = JSON.parse(
    readFileSync("public/tutorial-circuits/manifest.json", "utf8"),
  );
  for (const name of Object.keys(manifest)) {
    expect(manifest[name].generator).toBe('QuantumCircuit.draw("mpl")');
    expect(existsSync(`public/tutorial-circuits/${name}.png`)).toBe(true);
  }
  expect(theory[3]).toContain("A Y error commutes");
  expect(theory[5]).toContain("Gottesman");
});
