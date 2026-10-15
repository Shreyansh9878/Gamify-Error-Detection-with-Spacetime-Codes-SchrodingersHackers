import { z } from "zod";
import type {
  CheckResult,
  CheckValidation,
  Check,
} from "../learning/contracts";
export type { Check } from "../learning/contracts";
export const gateNames = [
  "h",
  "x",
  "y",
  "z",
  "s",
  "sdg",
  "cx",
  "cz",
  "swap",
  "t",
  "tdg",
] as const;
export const gateSchema = z
  .object({
    id: z.string().min(1).max(64),
    role: z.literal("prepare").default("prepare"),
    name: z.enum(gateNames),
    qubits: z.array(z.number().int().min(0).max(4)).min(1).max(2),
    column: z.number().int().min(0).max(15),
  })
  .strict();
export type Gate = z.infer<typeof gateSchema>;
export type GateName = Gate["name"];
const tap = z
  .object({
    qubit: z.number().int().min(0).max(4),
    pauli: z.enum(["X", "Y", "Z"]),
  })
  .strict();
export const checkSchema = z
  .object({
    id: z.string().min(1).max(64),
    ancilla: z.number().int().min(0).max(1),
    startBoundary: z.number().int().min(0).max(15),
    endBoundary: z.number().int().min(1).max(16),
    openingHadamard: z.boolean(),
    openingTaps: z.array(tap).max(5),
    closingTaps: z.array(tap).max(5),
    closingSign: z.union([z.literal(1), z.literal(-1)]),
    closingHadamard: z.boolean(),
    measure: z.boolean(),
  })
  .strict();
export const faultSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.enum(["bit_flip", "pauli_y", "phase_flip", "decoherence"]),
    qubit: z.number().int().min(0).max(4),
    boundary: z.number().int().min(0).max(16),
    order: z.number().int().min(0).max(3),
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
    timeUs: z.number().min(0).max(200).optional(),
    t1Us: z.number().min(20).max(200).optional(),
    t2Us: z.number().positive().max(400).optional(),
  })
  .strict();
export type Fault = z.infer<typeof faultSchema>;
const draftBase = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.enum(["guided", "sandbox"]),
    dataQubits: z.number().int().min(1).max(5),
    preparation: z.array(gateSchema).max(16),
    payload: z.array(gateSchema).max(64),
    checks: z.array(checkSchema).max(2),
    combineFaults: z.boolean(),
    faults: z.array(faultSchema).max(4),
  })
  .strict();
export type AdvancedDraft = z.infer<typeof draftBase>;
export function draftSchema(nonClifford: boolean) {
  return draftBase.superRefine((d, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (d.dataQubits > (nonClifford ? 5 : 4))
      fail("Too many data wires for this lesson.");
    if (d.preparation.length + d.payload.length > 64)
      fail("Maximum 64 preparation/payload gates.");
    if (
      [...d.preparation, ...d.payload].filter((g) =>
        ["t", "tdg"].includes(g.name),
      ).length > (nonClifford ? 4 : 0)
    )
      fail("T/T† are unavailable here or exceed the four-gate limit.");
    for (const gates of [d.preparation, d.payload]) {
      const occupied = new Set<string>();
      for (const g of gates) {
        if (
          g.qubits.length !== (["cx", "cz", "swap"].includes(g.name) ? 2 : 1) ||
          new Set(g.qubits).size !== g.qubits.length
        )
          fail("Choose distinct endpoints for two-wire gates.");
        for (const q of g.qubits) {
          if (q >= d.dataQubits) fail("Gate targets a missing wire.");
          const key = `${q}:${g.column}`;
          if (occupied.has(key)) fail("Gates cannot share a wire/column.");
          occupied.add(key);
        }
      }
    }
    const ids = [...d.preparation, ...d.payload, ...d.checks, ...d.faults].map(
      (v) => v.id,
    );
    if (new Set(ids).size !== ids.length) fail("All IDs must be unique.");
    if (new Set(d.checks.map((c) => c.ancilla)).size !== d.checks.length)
      fail("Each check owns a distinct helper.");
    for (const c of d.checks) {
      if (c.startBoundary >= c.endBoundary) fail("Open before closing.");
      for (const taps of [c.openingTaps, c.closingTaps]) {
        if (new Set(taps.map((t) => t.qubit)).size !== taps.length)
          fail("One Pauli per wire.");
        if (taps.some((t) => t.qubit >= d.dataQubits))
          fail("Check targets a missing wire.");
      }
    }
    if (d.faults.length > (d.combineFaults ? 4 : 1))
      fail("Enable Combine Faults first.");
    if (
      new Set(d.faults.map((f) => `${f.boundary}:${f.order}`)).size !==
      d.faults.length
    )
      fail("Fault order must be unique at each boundary.");
    for (const f of d.faults) {
      if(f.targets?.some(t=>t.kind==="ancilla"&&d.checks.some(c=>c.ancilla===t.index&&f.boundary>c.endBoundary)))ctx.addIssue({code:"custom",message:"This helper has already been measured. Place helper noise at or before readout."});
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
        fail(
          "Fault targets must be unique existing data or active helper wires.",
        );
      if (f.qubit >= d.dataQubits) fail("Fault targets a missing wire.");
      if (f.name === "decoherence") {
        if (
          f.timeUs === undefined ||
          f.t1Us === undefined ||
          f.t2Us === undefined ||
          f.t2Us > 2 * f.t1Us
        )
          fail("Waiting requires t/T1/T2, with T2 ≤ 2T1.");
      } else if (
        f.timeUs !== undefined ||
        f.t1Us !== undefined ||
        f.t2Us !== undefined
      )
        fail("Only waiting accepts time parameters.");
    }
    if (d.mode === "guided" && !nonClifford) {
      const expected = nonClifford ? "t" : "cx",
        wires = nonClifford ? "0" : "0,1";
      if (
        d.dataQubits !== (nonClifford ? 1 : 2) ||
        d.preparation.length ||
        d.payload.length !== 1 ||
        d.payload[0].name !== expected ||
        d.payload[0].column !== 2 ||
        d.payload[0].qubits.join() !== wires
      )
        fail("The guided zero input and payload are locked.");
      if (
        d.checks.length !== 1 ||
        d.checks.some(
          (c) =>
            c.ancilla !== 0 || c.startBoundary !== 1 || c.endBoundary !== 3,
        )
      )
        fail("Guided a0 has a fixed window 1–3.");
      if (
        nonClifford &&
        d.checks.some(
          (c) => !c.openingHadamard || !c.closingHadamard || !c.measure,
        )
      )
        fail("The guided T shell is fixed.");
    }
  });
}
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
export function guidedInitial(nonClifford: boolean): AdvancedDraft {
  const c = emptyCheck();

  return {
    schemaVersion: 1,
    mode: "guided",
    dataQubits: nonClifford ? 1 : 2,
    preparation: [],
    payload: nonClifford
      ? []
      : [
          {
            id: "payload",
            role: "prepare",
            name: "cx",
            qubits: [0, 1],
            column: 2,
          },
        ],
    checks: [c],
    combineFaults: false,
    faults: [],
  };
}
export function sandboxInitial(nonClifford: boolean): AdvancedDraft {
  const d = guidedInitial(nonClifford);
  d.mode = "sandbox";
  if (nonClifford)
    d.payload = [
      { id: "payload", role: "prepare", name: "t", qubits: [0], column: 2 },
    ];
  const c = d.checks[0];
  Object.assign(c, {
    openingHadamard: true,
    closingHadamard: true,
    measure: true,
    openingTaps: [{ qubit: 0, pauli: nonClifford ? "Z" : "X" }],
    closingTaps: nonClifford
      ? [{ qubit: 0, pauli: "Z" }]
      : [
          { qubit: 0, pauli: "X" },
          { qubit: 1, pauli: "X" },
        ],
  });
  return d;
}
export interface AdvancedValidation extends Omit<CheckValidation, "checks"> {
  transportSupported: boolean;
  endpointOperatorMatch: boolean;
  checks: (Omit<CheckValidation["checks"][number], "steps"> & {
    transportSupported: boolean;
    endpointPauli: boolean;
    steps: (CheckValidation["checks"][number]["steps"][number] & {
      terms: Record<string, number>;
      pauliOnly: boolean;
      tCompatible?: boolean | null;
    })[];
  })[];
}
export interface AdvancedResult
  extends Omit<CheckResult, "draft" | "checks">, AdvancedValidation {
  draft: AdvancedDraft;
  barrierSuccess: boolean;
  compatibleSuccess: boolean;
}
export interface Coverage {
  fingerprint: string;
  probes: {
    boundary: number;
    qubit: number;
    pauli: string;
    flagProbability: number;
    helpers: number[];
    propagated: string;
  }[];
  meaning: string;
  nextCursor: number | null;
  total: number;
}
