import { z } from "zod";
import type {
  CheckResult,
  Instruction,
  Resources,
} from "../learning/contracts";
const factor = z
  .object({
    qubit: z.number().int().min(0).max(2),
    pauli: z.enum(["X", "Y", "Z"]),
  })
  .strict();
const activeRail = z
  .object({
    ancilla: z.union([z.literal(0), z.literal(1)]),
    active: z.literal(true),
    startBoundary: z.number().int(),
    endBoundary: z.number().int(),
    openingTaps: z.array(factor).max(1),
    closingTaps: z.array(factor).max(3),
    closingSign: z.union([z.literal(1), z.literal(-1)]),
  })
  .strict();
const inactiveRail = z
  .object({
    ancilla: z.union([z.literal(0), z.literal(1)]),
    active: z.literal(false),
  })
  .strict();
export const windows = [
  [2, 4],
  [1, 7],
  [4, 7],
  [2, 6],
] as const;
export const strategySchema = z
  .object({
    schemaVersion: z.literal(1),
    rails: z
      .array(z.discriminatedUnion("active", [activeRail, inactiveRail]))
      .length(2),
  })
  .strict()
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(s.rails.map((r) => r.ancilla)).size !== 2)
      fail("Exactly one descriptor per rail.");
    const keys: string[] = [];
    for (const r of s.rails)
      if (r.active) {
        if (
          !windows.some(
            ([a, b]) => a === r.startBoundary && b === r.endBoundary,
          )
        )
          fail("Choose a fixed catalogue window.");
        if (
          new Set(r.closingTaps.map((t) => t.qubit)).size !==
          r.closingTaps.length
        )
          fail("One closing factor per wire.");
        if (r.openingTaps.length)
          keys.push(
            `${r.startBoundary}:${r.endBoundary}:${r.openingTaps[0].qubit}:${r.openingTaps[0].pauli}`,
          );
      }
    if (new Set(keys).size !== keys.length)
      fail("Duplicate candidate checks are not allowed.");
  });
export type Strategy = z.infer<typeof strategySchema>;
export type ActiveRail = z.infer<typeof activeRail>;
export const emptyStrategy: Strategy = {
  schemaVersion: 1,
  rails: [
    { ancilla: 0, active: false },
    { ancilla: 1, active: false },
  ],
};
export const targetedStrategy: Strategy = {
  schemaVersion: 1,
  rails: [
    {
      ancilla: 0,
      active: true,
      startBoundary: 2,
      endBoundary: 4,
      openingTaps: [{ qubit: 0, pauli: "Z" }],
      closingTaps: [{ qubit: 0, pauli: "Z" }],
      closingSign: 1,
    },
    { ancilla: 1, active: false },
  ],
};
export const twoCheckStrategy: Strategy = {
  schemaVersion: 1,
  rails: [
    targetedStrategy.rails[0],
    {
      ancilla: 1,
      active: true,
      startBoundary: 2,
      endBoundary: 6,
      openingTaps: [{ qubit: 2, pauli: "X" }],
      closingTaps: [{ qubit: 2, pauli: "Y" }],
      closingSign: 1,
    },
  ],
};
export function strategyCode(s: Strategy) {
  const taps = (v: { qubit: number; pauli: string }[]) =>
    `[${v.map((t) => `(${t.qubit}, "${t.pauli}")`).join(", ")}]`;
  return `# Safe strategy DSL. Payload, noise and H/M shells are authoritative.\nfrom quantum_shield import GraduationStrategy\n\nstrategy = GraduationStrategy("graduation-fixture-v1")\n${s.rails
    .filter((r) => r.active)
    .map(
      (r) =>
        `strategy.check(ancilla=${r.ancilla}, start=${r.startBoundary}, end=${r.endBoundary},\n    opening=${taps(r.openingTaps)}, closing=${taps(r.closingTaps)}, closing_sign=${r.closingSign})`,
    )
    .join("\n")}\n`;
}
export interface GraduationValidation {
  structureComplete: boolean;
  valid: boolean;
  scheduleValid: boolean;
  localOperatorMatch: boolean;
  residual: number | null;
  message: string;
  activeCheckCount: number;
  checks: {
    ancilla: number;
    expected: string;
    expectedTaps: { qubit: number; pauli: "X" | "Y" | "Z" }[];
    sign: 1 | -1;
    match: boolean;
    steps: { label: string; operator: string; column: number }[];
  }[];
  instructions: Instruction[];
  wireLabels: string[];
  nativeCode: string;
  resources: Resources & {
    addedDepth: number;
    addedTwoQubitGates: number;
    cxEquivalent: number;
  };
  fingerprint: string;
  fixtureVersion: string;
  noiseVersion: string;
  schedulerVersion: string;
  metricVersion: string;
}
export interface GraduationResult
  extends
    GraduationValidation,
    Pick<
      CheckResult,
      | "frames"
      | "states"
      | "observable"
      | "syndrome"
      | "keptShots"
      | "discardedShots"
      | "shots"
      | "samplingOverhead"
      | "flagProbability"
      | "noiselessFlagProbability"
      | "classification"
    > {
  diagnosticOverlay?: boolean;
  strategy: Strategy;
  canonicalStrategy: Strategy;
  runId: string;
  settingsFingerprint: string;
  fidelityExact: number | null;
  retentionExact: number;
  retention: number;
  scoreExact: number;
  scoreSampled: number;
  qualityEligible: boolean;
  qualifies: boolean;
  seed: number;
}
export interface BenchmarkRecord {
  id: string;
  canonicalStrategy: Strategy;
  fidelity: number;
  retention: number;
  score: number;
  resources: Resources;
}
export interface Benchmark {
  available: boolean;
  message?: string;
  enumerationComplete?: boolean;
  structuralCandidateCount?: number;
  validCandidateCount?: number;
  evaluatedCandidateCount?: number;
  bestQualityEligible?: BenchmarkRecord;
  bestNonempty?: BenchmarkRecord;
  paulice?: {
    available: boolean;
    packageVersion?: string;
    nativeCost?: number;
    costMetric?: string;
    message: string;
    checkSupport?: unknown;
    instructions?: Instruction[];
    seed?: number;
    cached?: boolean;
  };
  bestUnconstrained?: BenchmarkRecord;
  paretoPoints?: BenchmarkRecord[];
  manifestHash?: string;
}
export const summarySchema = z.object({
  fingerprint: z.string(),
  fidelity: z.number().min(0).max(1),
  retention: z.number().min(0).max(1.000000001),
  score: z.number().min(0).max(1),
  strategy: strategySchema,
});
export type Summary = z.infer<typeof summarySchema>;
export const graduationProgressSchema = z
  .object({
    contentVersion: z.literal("tradeoff-capstone-v1"),
    fixtureVersion: z.literal("graduation-fixture-v1"),
    noiseVersion: z.literal("graduation-noise-v1"),
    schedulerVersion: z.literal("graduation-schedule-v1"),
    metricVersion: z.enum(["fidelity-yield-v1", "fidelity-yield-v2"]),
    comparisons: z.array(summarySchema).max(20),
    qualified: summarySchema.nullable(),
    revealAcknowledged: z.boolean(),
    basis: z.enum(["Z", "X"]),
    shots: z.union([z.literal(256), z.literal(1024), z.literal(4096)]),
    seed: z.number().int().min(0).max(2147483647),
  })
  .refine(
    (p) =>
      !p.qualified ||
      (p.qualified.score >= 0.65 - 1e-10 &&
        p.qualified.strategy.rails.some((r) => r.active)),
    "Saved qualification must satisfy the capstone goals.",
  );
export const initialGraduationProgress: z.infer<
  typeof graduationProgressSchema
> = {
  contentVersion: "tradeoff-capstone-v1",
  fixtureVersion: "graduation-fixture-v1",
  noiseVersion: "graduation-noise-v1",
  schedulerVersion: "graduation-schedule-v1",
  metricVersion: "fidelity-yield-v2",
  comparisons: [],
  qualified: null,
  revealAcknowledged: false,
  basis: "Z",
  shots: 1024,
  seed: 2026,
};
