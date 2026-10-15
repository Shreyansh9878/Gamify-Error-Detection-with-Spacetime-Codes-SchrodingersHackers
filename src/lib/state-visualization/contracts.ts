export interface StateVisualization {
  schemaVersion: 2;
  experimentWireCount: number;
  frameId: string;
  visualizationToken: string;
  scope: "joint" | "data" | "conditional-joint";
  stage: string;
  wireOrder: string[];
  stateKind: "pure" | "mixed" | "unavailable";
  purity: number | null;
  probabilities: number[];
  amplitudes?: [number, number][];
  spectral?: { rank: number; componentCount: number; omittedWeight: number };
  components?: SpectralComponent[];
  coherences?: { row: string; column: string; value: [number, number] }[];
  coherenceCount?: number;
}
export interface SpectralComponent {
  index: number;
  weight: number;
  amplitudes: [number, number][];
}
