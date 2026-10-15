import { z } from "zod";
import type { StateStats } from "../learning/contracts";
import type { StateVisualization } from "../state-visualization/contracts";
import { hardwareSchema, initialHardware } from "./hardware";
export { hardwareSchema, initialHardware } from "./hardware";
export type { Hardware } from "./hardware";
export const operationSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.enum([
      "h",
      "x",
      "y",
      "z",
      "s",
      "sdg",
      "t",
      "tdg",
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
    ]),
    qubits: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    column: z.number().int().min(0).max(23),
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
export const draftSchema = z
  .object({
    version: z.literal(2),
    lesson: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    mode: z.enum(["guided", "sandbox"]),
    dataQubits: z.number().int().min(1).max(5),
    ancillas: z.number().int().min(1).max(2),
    columns: z.number().int().min(7).max(24),
    operations: z.array(operationSchema).max(96),
    hardware: hardwareSchema,
  })
  .strict()
  .superRefine((d, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const cells = new Set<string>(),
      ids = new Set<string>(),
      measured = new Set<number>();
    const all = [
      ...d.operations,
      ...(d.mode === "guided" ? fixedPayload(d.lesson) : []),
    ].sort((a, b) => a.column - b.column);
    for (const g of all) {
      if (ids.has(g.id)) fail("Operation IDs must be unique.");
      ids.add(g.id);
      if (
        new Set(g.qubits).size !== g.qubits.length ||
        (g.name !== "decoherence" &&
          g.qubits.length !== (["cx", "cy", "cz"].includes(g.name) ? 2 : 1))
      )
        fail("Controlled gates require distinct control and target.");
      if (
        ["rx", "ry", "rz"].includes(g.name) !==
        (g.angleRadians !== undefined)
      )
        fail("Only RX/RY/RZ require an angle in radians.");
      if (g.column >= d.columns) fail("Gate is outside the timeline.");
      if (g.name === "decoherence" && (g.t2Us ?? 80) > 2 * (g.t1Us ?? 100))
        fail("T2 must be at most 2T1.");
      for (const q of g.qubits) {
        const key = `${q}:${g.column}`;
        if (q >= d.dataQubits + d.ancillas || cells.has(key))
          fail("Missing wire or occupied slot (including a locked gate).");
        if (measured.has(q))
          fail(
            "M is terminal on its wire. Move it after the last interaction.",
          );
        cells.add(key);
        if (g.name === "m") measured.add(q);
      }
    }
    if (
      d.mode === "guided" &&
      d.dataQubits !== { 3: 1, 4: 2, 5: 1, 6: 3 }[d.lesson]
    )
      fail("Change the register in the sandbox.");
    if (d.lesson !== 5 && all.some((g) => ["t", "tdg"].includes(g.name)))
      fail("T gates belong to Flight School 5.");
    if (d.lesson !== 6 && d.hardware.enabled)
      fail(
        "Hardware channels are enabled in Flight School 6; use spatial test faults here.",
      );
    if (all.filter((g) => g.name === "t" || g.name === "tdg").length > 6)
      fail("Use at most six T gates in this bounded sandbox.");
    if (d.lesson === 6) {
      if (d.mode !== "guided" || d.ancillas !== 2)
        fail("The capstone has two fixed helper wires.");
      for (const g of d.operations)
        if (
          (g.column >= 4 && g.column <= 8) ||
          !(
            g.qubits[0] >= 3 &&
            ((g.qubits.length === 1 &&
              ["h", "x", "y", "z", "s", "sdg", "rx", "ry", "rz", "m"].includes(
                g.name,
              )) ||
              (g.qubits.length === 2 &&
                ["cx", "cy", "cz"].includes(g.name) &&
                g.qubits[1] < 3))
          )
        )
          fail(
            "Keep ancilla controls and ancilla-to-data checks outside the locked workload.",
          );
    }
  });
export type Draft = z.infer<typeof draftSchema>;
export function fixedPayload(lesson: number): Operation[] {
  const rows: Record<number, [Operation["name"], number[], number][]> = {
    3: [["s", [0], 2]],
    4: [
      ["h", [0], 3],
      ["cx", [0, 1], 4],
    ],
    5: [["t", [0], 2]],
    6: [
      ["x", [0], 4],
      ["cx", [0, 1], 5],
      ["h", [2], 6],
      ["s", [1], 7],
    ],
  };
  return rows[lesson].map(([name, qubits, column], i) => ({
    id: `locked-${i}`,
    name,
    qubits,
    column,
  }));
}
export function initialDraft(
  lesson: 3 | 4 | 5 | 6,
  mode: "guided" | "sandbox",
): Draft {
  return {
    version: 2,
    lesson,
    mode,
    dataQubits: mode === "sandbox" ? 1 : { 3: 1, 4: 2, 5: 1, 6: 3 }[lesson],
    ancillas: lesson === 6 ? 2 : 1,
    columns:
      mode === "sandbox" ? 12 : lesson === 4 ? 10 : lesson === 6 ? 15 : 7,
    operations: [],
    hardware: {
      ...initialHardware,
      ...(lesson === 6 ? { bitFlip: 0.001, phaseFlip: 0.001 } : {}),
      enabled: lesson === 6,
    },
  };
}
export function draftCode(d: Draft) {
  const args = (g: Operation) =>
    [
      ...(g.angleRadians !== undefined ? [String(g.angleRadians)] : []),
      ...g.qubits.map(String),
      `at=${g.column}`,
      ...(g.name === "decoherence"
        ? [
            `time_us=${g.timeUs ?? 30}`,
            `t1_us=${g.t1Us ?? 100}`,
            `t2_us=${g.t2Us ?? 80}`,
          ]
        : []),
    ].join(", ");
  return `# App-defined, safely parsed Python. Native Qiskit export appears below.\nfrom quantum_shield import FlightCircuit\nqc = FlightCircuit(${d.dataQubits})\nqc.context(lesson=${d.lesson}, mode="${d.mode}", ancillas=${d.ancillas}, columns=${d.columns})\nqc.hardware(${Object.entries(
    d.hardware,
  )
    .map(
      ([k, v]) => `${k}=${typeof v === "boolean" ? (v ? "True" : "False") : v}`,
    )
    .join(", ")})\n${[...d.operations]
    .sort((a, b) => a.column - b.column)
    .map((g) => `qc.${g.name}(${args(g)})`)
    .join("\n")}\n`;
}
export interface Loop {
  ancilla: number;
  openingColumn: number;
  closingColumn: number;
  valid: boolean;
  opening: string | null;
  expected: string | null;
  closing: string | null;
  nonPauli: boolean;
  message: string;
}
export interface Validation {
  checks: Loop[];
  valid: boolean;
  payloadStart: number;
  payloadEnd: number;
  wholeCircuitIdentity: boolean;
}
export interface Result {
  baselineScore: number;
  qualificationThreshold: number | null;
  validation: Validation;
  fidelity: number | null;
  retention: number;
  score: number;
  samplingOverhead: number | null;
  keptShots: number;
  discardedShots: number;
  totalShots: number;
  syndromeCounts: Record<string, number>;
  ideal: StateStats;
  baseline: StateStats;
  output: StateStats | null;
  joint: StateVisualization;
  nativeCode: string;
  warnings: string[];
  fingerprint: string;
}
export interface Reveal {
  player: Pick<Result, "fidelity" | "retention" | "score" | "fingerprint">;
  reference: {
    best: Pick<Result, "fidelity" | "retention" | "score"> & {
      draft: Draft;
      openingPauli: string;
    };
    candidates: number;
    scope: string;
    globalUpperBound: number;
    physicsKey: string;
    protocol: string;
  };
  paulice: {
    available: boolean;
    packageVersion?: string;
    nativeCost?: number | null;
    message: string;
    instructions?: { name: string; qubits: number[] }[];
    checkSupport?: number[][];
  };
}
