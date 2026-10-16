import type { StateVisualization } from "../state-visualization/contracts";
import { z } from "zod";

export const names = [
  "h",
  "x",
  "y",
  "z",
  "s",
  "sdg",
  "rx",
  "ry",
  "rz",
  "cx",
  "cy",
  "cz",
  "m",
  "bit_flip",
  "phase_flip",
  "decoherence",
] as const;
export type BlockName = (typeof names)[number];
export const operationSchema = z
  .object({
    id: z.string().min(1).max(64),
    role: z.enum(["prepare", "error"]),
    name: z.enum(names),
    qubits: z.array(z.number().int().min(0).max(4)).min(1).max(5),
    column: z.number().int().min(0).max(15),
    angleRadians: z
      .number()
      .min(-2 * Math.PI)
      .max(2 * Math.PI)
      .optional(),
    timeUs: z.number().min(0).max(200).optional(),
    t1Us: z.number().min(20).max(200).optional(),
    t2Us: z.number().positive().max(400).optional(),
  })
  .strict();
export type Operation = z.infer<typeof operationSchema>;
export function isError(name: BlockName) {
  return ["bit_flip", "phase_flip", "decoherence"].includes(name);
}
export const circuitSchema = z
  .object({
    schemaVersion: z.literal(1),
    qubits: z.number().int().min(1).max(5),
    combineErrors: z.boolean(),
    operations: z.array(operationSchema).max(64),
  })
  .strict()
  .superRefine((c, ctx) => {
    const ids = new Set<string>(),
      cells = new Set<string>();
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (
      c.operations.filter((o) => o.role === "error").length >
      (c.combineErrors ? 8 : 1)
    )
      fail("Enable Combine Errors for multiple error blocks (maximum eight).");
    const measured = new Set<number>();
    for (const o of [...c.operations].sort((a, b) => a.column - b.column)) {
      if (o.qubits.some((q) => measured.has(q)))
        fail(
          "Measurement is terminal on its wire. Place M after its last interaction.",
        );
      if (o.name === "m") o.qubits.forEach((q) => measured.add(q));
      if (ids.has(o.id)) fail("Block IDs must be unique.");
      ids.add(o.id);
      if (isError(o.name) !== (o.role === "error"))
        fail("Block role does not match its name.");
      if (
        (o.name !== "decoherence" &&
          o.qubits.length !== (["cx", "cy", "cz"].includes(o.name) ? 2 : 1)) ||
        new Set(o.qubits).size !== o.qubits.length
      )
        fail(
          "CX needs distinct control and target; other blocks need one wire.",
        );
      for (const q of o.qubits) {
        const key = `${o.column}:${q}`;
        if (q >= c.qubits) fail("A block targets a missing wire.");
        if (cells.has(key))
          fail("Blocks sharing a wire cannot share a column.");
        cells.add(key);
      }
      const rotation = ["rx", "ry", "rz"].includes(o.name);
      if (rotation !== (o.angleRadians !== undefined))
        fail("Only rotation gates require an angle.");
      if (o.name === "decoherence") {
        if (
          o.timeUs === undefined ||
          o.t1Us === undefined ||
          o.t2Us === undefined
        )
          fail("Waiting needs elapsed time, T1, and T2.");
        else if (o.t2Us > 2 * o.t1Us) fail("T2 must be at most 2 × T1.");
      } else if (
        o.timeUs !== undefined ||
        o.t1Us !== undefined ||
        o.t2Us !== undefined
      )
        fail("Only waiting blocks accept time parameters.");
    }
  });
export type Circuit = z.infer<typeof circuitSchema>;
export const emptyCircuit: Circuit = {
  schemaVersion: 1,
  qubits: 1,
  combineErrors: false,
  operations: [],
};
export type ComparisonMode = "selected_error" | "final";
export type Basis = "Z" | "X";
export interface LabState {
  visualization?: StateVisualization;
  qubits: { qubit: number; bloch: [number, number, number]; purity: number }[];
  globalPurity: number;
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  marginals: {
    qubit: number;
    probabilities: [number, number];
    counts: [number, number];
  }[];
}
export interface LabResult {
  fingerprint: string;
  engineVersion: string;
  qiskitVersion: string;
  contentVersion: string;
  comparisonMode: ComparisonMode;
  selectedErrorId: string | null;
  labels: [string, string];
  states: [LabState, LabState];
  fidelity: number;
  shots: number;
  basis: Basis;
  sampleSeed: number;
  units: string;
  durationMs: number;
  explanations: string[];
}
export interface Diagnostic {
  line: number;
  column: number;
  message: string;
}
export const ordered = (c: Circuit) =>
  [...c.operations].sort(
    (a, b) =>
      a.column - b.column ||
      Number(a.role === "error") - Number(b.role === "error") ||
      a.qubits[0] - b.qubits[0] ||
      a.id.localeCompare(b.id),
  );
export function block(
  name: BlockName,
  qubit: number,
  column: number,
  id: string,
): Operation {
  return {
    id,
    name,
    role: isError(name) ? "error" : "prepare",
    qubits: name === "cx" ? [qubit, qubit === 0 ? 1 : 0] : [qubit],
    column,
    ...(["rx", "ry", "rz"].includes(name) ? { angleRadians: Math.PI / 2 } : {}),
    ...(name === "decoherence" ? { timeUs: 50, t1Us: 100, t2Us: 80 } : {}),
  };
}
export const DRAFT_KEY = "quantum-shield.flight-school-1.draft.v1";
export const PROGRESS_KEY = "quantum-shield.flight-school-1.progress.v1";
export const CONTENT_VERSION = "noise-basics-v1";
export const draftSchema = z.object({
  circuit: circuitSchema,
  code: z.string().max(8192),
  dirty: z.boolean(),
  editor: z.enum(["Visual circuit", "Code"]).default("Visual circuit"),
  mode: z.enum(["selected_error", "final"]),
  selected: z.string().nullable(),
  basis: z.enum(["Z", "X"]),
  shots: z.union([z.literal(256), z.literal(1024), z.literal(4096)]),
  seed: z.number().int().min(0).max(2147483647),
  qubit: z.number().int().min(0).max(4),
});
export const progressSchema = z
  .object({
    contentVersion: z.literal(CONTENT_VERSION),
    successfulRun: z.boolean(),
    answers: z.array(z.string().max(1)).length(3),
    submitted: z.boolean(),
    complete: z.boolean(),
  })
  .refine(
    (p) =>
      !p.complete ||
      (p.successfulRun && p.submitted && p.answers.join("") === "BCA"),
    "Completion requires a run and correct submitted answers.",
  );
