import { z } from "zod";
export const gateNames = [
  "h",
  "x",
  "y",
  "z",
  "s",
  "sdg",
  "cx",
  "cy",
  "cz",
  "m",
] as const;
export const operationSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.enum(gateNames),
    qubits: z.array(z.number().int().min(0).max(7)).min(1).max(2),
    boundary: z.number().int().min(0).max(40),
    slot: z.number().int().min(0).max(7),
  })
  .strict();
export const draftSchema = z
  .object({
    version: z.literal(1),
    levelId: z.number().int().min(1).max(10),
    bands: z.record(
      z.string(),
      z
        .number()
        .int()
        .refine((n) => [0, 4, 8].includes(n)),
    ),
    operations: z.array(operationSchema).max(100),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type MissionLevel = {
  id: number;
  title: string;
  overview: string;
  subtitle: string;
  chapter: string;
  qubits: number;
  ancillas: number;
  checkBudget: number;
  fixed: true;
  assisted: boolean;
  targetScore: number;
  allowed: string[];
  protocol: string;
  payload: {
    id: string;
    name: string;
    qubits: number[];
    column: number;
    fixed: true;
  }[];
  noise: {
    hotspotColumn: number;
    qubit: number;
    timeUs: number;
    t1Us: number;
    t2Us: number;
    checkStrength: number;
  };
};
export type RenderGate = {
  id: string;
  name: string;
  qubits: number[];
  rank: number;
  column: string;
  owner: "player" | "fixed-fixture" | "generated-method";
};
export type Validation = {
  valid: boolean;
  hasChecks: boolean;
  status: string;
  generated: RenderGate[];
  operations: RenderGate[];
  checks: {
    id: string;
    ancilla: string;
    opening: string;
    closing: string;
    valid: boolean;
    message: string;
    nonPauli: boolean;
  }[];
};
export type Outcome = {
  levelId: number;
  combinedScore: number;
  passed: boolean;
  target: number;
  status: string;
  configHash: string;
  protocol: string;
};
export function initialDraft(l: MissionLevel): Draft {
  return {
    version: 1,
    levelId: l.id,
    bands: { "0": 4, [String(l.payload.length)]: 8 },
    operations: [],
  };
}
export function generate(d: Draft): string {
  const lines = [
    "# MissionCircuit is an allowlisted editor API backed by Qiskit 2.",
    `qc = MissionCircuit(${d.levelId})`,
  ];
  Object.entries(d.bands)
    .sort((a, b) => +a[0] - +b[0])
    .forEach(([b, count]) => {
      if (count) lines.push(`qc.band(${b}, ${count})`);
    });
  [...d.operations]
    .sort((a, b) => a.boundary - b.boundary || a.slot - b.slot)
    .forEach((g) =>
      lines.push(
        `qc.${g.name}(${g.qubits.join(", ")}, boundary=${g.boundary}, slot=${g.slot})`,
      ),
    );
  return lines.join("\n") + "\n";
}
export function checkDraft(d: Draft, l: MissionLevel): void {
  if (d.levelId !== l.id) throw Error("The draft belongs to another mission.");
  for (const [b, c] of Object.entries(d.bands))
    if (
      !/^\d+$/.test(b) ||
      String(+b) !== b ||
      +b > l.payload.length ||
      ![0, 4, 8].includes(c)
    )
      throw Error("Invalid editable band.");
  const occupied = new Set<string>(),
    ids = new Set<string>(),
    measured = new Set<number>();
  for (const g of [...d.operations].sort(
    (a, b) => a.boundary - b.boundary || a.slot - b.slot,
  )) {
    if (ids.has(g.id) || /^(u|auto-)/.test(g.id))
      throw Error("Duplicate or reserved gate identifier.");
    ids.add(g.id);
    if (
      g.boundary > l.payload.length ||
      g.slot >= (d.bands[String(g.boundary)] || 0)
    )
      throw Error("Insert blank columns at this boundary first.");
    const cp = ["cx", "cy", "cz"].includes(g.name);
    if (
      g.qubits.length !== (cp ? 2 : 1) ||
      new Set(g.qubits).size !== g.qubits.length
    )
      throw Error("Controlled gates require two different wires.");
    if (g.qubits.some((q) => q < 0 || q >= l.qubits + l.ancillas))
      throw Error("The mission register is fixed.");
    if (
      cp
        ? g.qubits[0] < l.qubits || g.qubits[1] >= l.qubits
        : g.qubits[0] < l.qubits
    )
      throw Error(
        "Payload gates are locked. Place controls on ancillas and check targets on data.",
      );
    for (const q of g.qubits) {
      const cell = `${g.boundary}:${g.slot}:${q}`;
      if (occupied.has(cell))
        throw Error("That wire is occupied in this column.");
      if (measured.has(q))
        throw Error("Measurement must be terminal on an ancilla.");
      occupied.add(cell);
    }
    if (g.name === "m") measured.add(g.qubits[0]);
  }
}
