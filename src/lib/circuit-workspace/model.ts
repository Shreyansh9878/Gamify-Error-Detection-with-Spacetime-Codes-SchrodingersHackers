export type Wire = {
  id: string;
  label: string;
  kind: "data" | "ancilla" | "redundancy";
  index: number;
};
export type Stage = "prep" | "payload" | "generated";
export type Column = {
  key: string;
  label: string;
  zone: 1 | 2 | 3 | 4;
  region: "preparation" | "payload";
  boundary: number;
  stage: Stage;
};
export type Node = {
  id: string;
  label: string;
  wires: string[];
  column: string;
  owner: "player" | "generated-method" | "fixed-fixture";
  kind: "gate" | "noise" | "check";
  name?: string;
  angleRadians?: number;
  part?: number;
  detail?: string;
  tone?: "valid" | "invalid" | "hotspot";
};
export type Tool = {
  id: string;
  label: string;
  kind: "gate" | "noise";
  name?: string;
  twoWire?: boolean;
};
export type DropTarget = Column & { wire: Wire };
export type PaletteConfig = {
  angleRadians: number;
  timeUs: number;
  t1Us: number;
  t2Us: number;
  scope: "wire" | "selected" | "all";
  targets: string[];
};
export type CanvasModel = {
  compactChecks?: boolean;
  legendNote?: string;
  wires: Wire[];
  columns: Column[];
  nodes: Node[];
  groups?: { id: string; wire: string; label: string; owner: Node["owner"] }[];
  checks?: {
    id: string;
    valid: boolean | null;
    opening: string;
    closing: string;
    ancilla: string;
    message: string;
  }[];
};
export interface CanvasActions {
  place: (
    tool: Tool,
    target: DropTarget,
    config: PaletteConfig,
    secondWire?: Wire,
  ) => void;
  move: (node: Node, target: DropTarget, wire: string) => void;
  remove: (node: Node, wire?: string) => void;
}
