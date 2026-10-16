import type { StateVisualization } from "../state-visualization/contracts";
import { z } from "zod";
import { hardwareSchema } from "../timeline/hardware";
import type { LabState } from "../flight-school-1/contracts";
export const gateNames = [
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
] as const;
export const gateSchema = z
  .object({
    id: z.string().min(1).max(64),
    role: z.literal("prepare").default("prepare"),
    name: z.enum(gateNames),
    qubits: z.array(z.number().int().min(0).max(2)).min(1).max(2),
    column: z.number().int().min(0).max(15),
    angleRadians: z
      .number()
      .min(-2 * Math.PI)
      .max(2 * Math.PI)
      .optional(),
  })
  .strict();
export type Gate = z.infer<typeof gateSchema>;
export type GateName = Gate["name"];
const gates = z.array(gateSchema).max(64);
function validateGates(
  values: Gate[],
  n: number,
  ctx: z.RefinementCtx,
  clifford = false,
) {
  const ids = new Set(),
    cells = new Set();
  for (const g of values) {
    if (ids.has(g.id))
      ctx.addIssue({ code: "custom", message: "Gate IDs must be unique." });
    ids.add(g.id);
    if (
      g.qubits.length !== (["cx", "cy", "cz"].includes(g.name) ? 2 : 1) ||
      new Set(g.qubits).size !== g.qubits.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Controlled gates need distinct control and target.",
      });
    if (["rx", "ry", "rz"].includes(g.name) !== (g.angleRadians !== undefined))
      ctx.addIssue({
        code: "custom",
        message: "Only rotations require an angle.",
      });
    if (clifford && ["rx", "ry", "rz", "m"].includes(g.name))
      ctx.addIssue({
        code: "custom",
        message:
          "This lab supports Clifford gates; arbitrary rotations need non-Pauli checks.",
      });
    for (const q of g.qubits) {
      const key = `${q}:${g.column}`;
      if (q >= n || cells.has(key))
        ctx.addIssue({
          code: "custom",
          message: "Missing wire or shared-wire column collision.",
        });
      cells.add(key);
    }
  }
}
export const noiseSchema = z
  .object({
    enabled: z.boolean().optional(),
    targetQubits: z
      .array(z.number().int().min(0).max(2))
      .min(1)
      .max(3)
      .optional(),
    channel: z.enum(["bit_flip", "phase_flip", "depolarizing", "decoherence"]),
    targetQubit: z.number().int().min(0).max(2),
    boundary: z.number().int().min(0).max(16),
    probability: z.number().min(0).max(1).optional(),
    strength: z.number().min(0).max(1).optional(),
    timeUs: z.number().min(0).max(200).optional(),
    t1Us: z.number().min(20).max(200).optional(),
    t2Us: z.number().positive().max(400).optional(),
  })
  .strict();
export type Noise = z.infer<typeof noiseSchema>;
function physical(
  v: { timeUs?: number; t1Us?: number; t2Us?: number },
  ctx: z.RefinementCtx,
) {
  if (
    v.timeUs === undefined ||
    v.t1Us === undefined ||
    v.t2Us === undefined ||
    v.t2Us > 2 * v.t1Us
  )
    ctx.addIssue({
      code: "custom",
      message: "Waiting needs t, T1 and T2 in μs, with T2 ≤ 2T1.",
    });
}
export const experimentSchema = z
  .object({
    schemaVersion: z.literal(1),
    qubits: z.number().int().min(1).max(3),
    operations: gates,
    noise: noiseSchema,
    hardware: hardwareSchema.optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    validateGates(c.operations, c.qubits, ctx);
    const measured = new Set<number>();
    for (const g of [...c.operations].sort((a, b) => a.column - b.column)) {
      if (g.qubits.some((q) => measured.has(q)))
        ctx.addIssue({ code: "custom", message: "M is terminal on its wire." });
      if (g.name === "m") g.qubits.forEach((q) => measured.add(q));
    }
    if (c.noise.targetQubit >= c.qubits)
      ctx.addIssue({
        code: "custom",
        message: "Noise targets a missing wire.",
      });
    const e = c.noise;
    if (
      e.targetQubits &&
      (new Set(e.targetQubits).size !== e.targetQubits.length ||
        e.targetQubits.some((q) => q >= c.qubits))
    )
      ctx.addIssue({
        code: "custom",
        message: "Noise targets must be unique existing data wires.",
      });
    if (e.channel === "decoherence") physical(e, ctx);
    else if (
      e.channel === "depolarizing"
        ? e.strength === undefined
        : e.probability === undefined
    )
      ctx.addIssue({
        code: "custom",
        message: "Set a channel strength in [0,1].",
      });
  });
export type Experiment = z.infer<typeof experimentSchema>;
export const initialExperiment: Experiment = {
  schemaVersion: 1,
  qubits: 1,
  operations: [],
  noise: {
    channel: "bit_flip",
    targetQubit: 0,
    boundary: 0,
    probability: 0.15,
  },
};
export const tapSchema = z
  .object({
    qubit: z.number().int().min(0).max(2),
    pauli: z.enum(["X", "Y", "Z"]),
  })
  .strict();
export type Tap = z.infer<typeof tapSchema>;
export const checkSchema = z
  .object({
    id: z.string().min(1).max(64),
    ancilla: z.number().int().min(0).max(1),
    startBoundary: z.number().int().min(0).max(15),
    endBoundary: z.number().int().min(1).max(16),
    openingHadamard: z.boolean(),
    openingTaps: z.array(tapSchema).max(3),
    closingTaps: z.array(tapSchema).max(3),
    closingSign: z.union([z.literal(1), z.literal(-1)]),
    closingHadamard: z.boolean(),
    measure: z.boolean(),
  })
  .strict();
export type Check = z.infer<typeof checkSchema>;
export const faultSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.enum(["bit_flip", "pauli_y", "phase_flip", "decoherence"]),
    targets: z
      .array(
        z
          .object({
            kind: z.enum(["data", "ancilla"]),
            index: z.number().int().min(0).max(4),
          })
          .strict(),
      )
      .min(1)
      .max(7)
      .optional(),
    qubit: z.number().int().min(0).max(2),
    boundary: z.number().int().min(0).max(16),
    order: z.number().int().min(0).max(3),
    timeUs: z.number().min(0).max(200).optional(),
    t1Us: z.number().min(20).max(200).optional(),
    t2Us: z.number().positive().max(400).optional(),
  })
  .strict();
export type Fault = z.infer<typeof faultSchema>;
export const checkDraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.enum(["guided", "sandbox"]),
    dataQubits: z.number().int().min(1).max(3),
    preparation: z.array(gateSchema).max(16),
    payload: gates,
    checks: z.array(checkSchema).max(2),
    combineFaults: z.boolean(),
    faults: z.array(faultSchema).max(4),
  })
  .strict()
  .superRefine((d, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    validateGates(d.preparation, d.dataQubits, ctx, true);
    validateGates(d.payload, d.dataQubits, ctx, true);
    if (d.preparation.length + d.payload.length > 64)
      fail("Maximum 64 preparation/payload gates.");
    const all = [...d.preparation, ...d.payload, ...d.checks, ...d.faults];
    if (new Set(all.map((v) => v.id)).size !== all.length)
      fail("All IDs must be unique.");
    if (new Set(d.checks.map((c) => c.ancilla)).size !== d.checks.length)
      fail("Each check needs a distinct ancilla.");
    for (const c of d.checks) {
      if (c.startBoundary >= c.endBoundary)
        fail("Opening boundary must precede closing.");
      for (const taps of [c.openingTaps, c.closingTaps]) {
        if (new Set(taps.map((t) => t.qubit)).size !== taps.length)
          fail("One Pauli factor per wire.");
        if (taps.some((t) => t.qubit >= d.dataQubits))
          fail("Check targets a missing wire.");
      }
    }
    if (d.faults.length > (d.combineFaults ? 4 : 1))
      fail("Enable Combine Faults for multiple events.");
    if (
      new Set(d.faults.map((f) => `${f.boundary}:${f.order}`)).size !==
      d.faults.length
    )
      fail("Fault order at a boundary must be unique.");
    for (const f of d.faults) {
      if (
        f.targets?.some(
          (t) =>
            t.kind === "ancilla" &&
            d.checks.some(
              (c) => c.ancilla === t.index && f.boundary > c.endBoundary,
            ),
        )
      )
        ctx.addIssue({
          code: "custom",
          message:
            "This helper has already been measured. Place helper noise at or before readout.",
        });
      if (
        f.targets &&
        (new Set(f.targets.map((t) => `${t.kind}:${t.index}`)).size !==
          f.targets.length ||
          f.targets.some((t) =>
            t.kind === "data"
              ? t.index >= d.dataQubits
              : !d.checks.some((c) => c.ancilla === t.index),
          ))
      )
        fail("Fault targets must be unique existing data/active helper wires.");
      if (f.qubit >= d.dataQubits) fail("Fault targets a missing wire.");
      if (f.name === "decoherence") physical(f, ctx);
      else if (
        f.timeUs !== undefined ||
        f.t1Us !== undefined ||
        f.t2Us !== undefined
      )
        fail("Only waiting accepts time parameters.");
    }
    if (
      d.mode === "guided" &&
      (d.dataQubits !== 1 ||
        d.preparation.length ||
        d.payload.length !== 1 ||
        d.payload[0].name !== "s" ||
        d.payload[0].column !== 2 ||
        d.payload[0].qubits.join() !== "0" ||
        d.checks.length > 1 ||
        d.checks.some(
          (c) =>
            c.ancilla !== 0 || c.startBoundary !== 1 || c.endBoundary !== 3,
        ))
    )
      fail("Guided mode locks the S payload and check window.");
  });
export type CheckDraft = z.infer<typeof checkDraftSchema>;
export const emptyCheck = (id = "c0", ancilla = 0): Check => ({
  id,
  ancilla,
  startBoundary: 1,
  endBoundary: 3,
  openingHadamard: false,
  openingTaps: [],
  closingTaps: [],
  closingSign: 1,
  closingHadamard: false,
  measure: false,
});
export const guidedInitial: CheckDraft = {
  schemaVersion: 1,
  mode: "guided",
  dataQubits: 1,
  preparation: [],
  payload: [{ id: "s0", role: "prepare", name: "s", qubits: [0], column: 2 }],
  checks: [emptyCheck()],
  combineFaults: false,
  faults: [],
};
export const sandboxInitial: CheckDraft = {
  ...guidedInitial,
  mode: "sandbox",
  checks: [
    {
      ...emptyCheck(),
      openingHadamard: true,
      openingTaps: [{ qubit: 0, pauli: "X" }],
      closingTaps: [{ qubit: 0, pauli: "Y" }],
      closingHadamard: true,
      measure: true,
    },
  ],
};
export interface StateStats extends LabState {
  expectation: number;
  sampledExpectation: number | null;
  sampleSize: number;
  fidelity: number;
}
export interface Instruction {
  sourceId?: string;
  name: string;
  qubits: number[];
  stage: string;
  column?: number;
  boundary?: number;
  angleRadians?: number;
  noise?: Noise;
  condition?: number;
  errorRole?: boolean;
  bit?: number;
}
export interface Resources {
  peakQubits: number;
  addedQubits: number;
  oneQubitGates: number;
  twoQubitGates: number;
  addedTwoQubitGates?: number;
  depth: number;
  noiseLocations: number;
  methodShots: number;
  baselineShots: number;
  reusedBaselineShots: number;
  totalComparisonShots: number;
  variantCount?: number;
}
export interface TechniquePreview {
  variants: Record<string, Instruction[]>;
  wireLabels: string[];
  resources: Resources;
  processingRecipe: string;
  nativeCode: string;
  experimentFingerprint: string;
}
export type Technique = "detection" | "mitigation" | "correction";
export interface ProtectionResult extends TechniquePreview {
  frames?: Record<string, StateVisualization>;
  seed: number;
  shotsPerVariant: number;
  experiment: Experiment;
  correctionFamily?: string;
  observable: { qubit: number; basis: "X" | "Z" };
  runId: string;
  contentVersion: string;
  settingsFingerprint: string;
  technique: Technique;
  ideal: StateStats;
  baseline: StateStats;
  output: StateStats | null;
  outputKind: string;
  unfiltered?: StateStats;
  estimate?: number;
  exactFitEstimate?: number;
  variance?: number;
  interval?: [number, number];
  scales?: { scale: number; weight: number; state: StateStats; seed: number }[];
  fit?: string;
  retention?: number;
  keptShots?: number;
  discardedShots?: number;
  samplingOverhead?: number | null;
  syndrome?: {
    probabilities: Record<string, number>;
    counts: Record<string, number>;
    ordering: string;
  };
  decoder?: {
    register: string;
    tuple: string;
    hypothesis: string;
    count: number;
  }[];
  processingSteps: string[];
  warnings: string[];
  estimationError: number | null;
  baselineError: number;
  improvement: number | null;
  durationMs: number;
}
export interface CheckValidation {
  structureComplete: boolean;
  localOperatorMatch: boolean;
  scheduleValid: boolean;
  valid: boolean;
  residual: number | null;
  classification: string;
  message: string;
  checks: {
    id: string;
    missing: string[];
    complete: boolean;
    expected: string | null;
    expectedTaps: Tap[];
    sign: 1 | -1;
    match: boolean;
    steps: { label: string; operator: string; column: number }[];
  }[];
  instructions: Instruction[];
  nativeCode: string;
  wireLabels: string[];
  resources: Resources;
  fingerprint: string;
}
export interface CheckResult extends CheckValidation {
  frames?: Record<string, StateVisualization>;
  draft: CheckDraft;
  observable: { qubit: number; basis: "X" | "Z" };
  traceSteps?: { boundary: number; operator: string; gate: string }[];
  runId: string;
  settingsFingerprint: string;
  flagProbability: number;
  noiselessFlagProbability: number;
  retention: number;
  samplingOverhead: number | null;
  keptShots: number;
  discardedShots: number;
  shots: number;
  guidedSuccess: boolean;
  sandboxSuccess: boolean;
  states: {
    ideal: StateStats;
    unprotected: StateStats;
    unfiltered: StateStats;
    retained: StateStats | null;
  };
  syndrome: {
    probabilities: Record<string, number>;
    counts: Record<string, number>;
    noiselessProbabilities: Record<string, number>;
    noiselessCounts: Record<string, number>;
    ordering: string;
  };
  durationMs: number;
}
