import { describe, it, expect } from "vitest";
import { portablePage } from "./portable";
import type { StateVisualization } from "./contracts";
describe("lossless serverless state pages", () => {
  it("returns four components at a time without a server instance token", () => {
    const bytes = new Uint8Array(8 * 17 * 8),
      view = new DataView(bytes.buffer);
    for (let i = 0; i < 8; i++) {
      view.setFloat64(i * 17 * 8, 1 / 8, true);
      view.setFloat64(i * 17 * 8 + 8 + i * 16, 1, true);
    }
    const frame = {
      componentPayload: {
        format: "f64le-base64-v1",
        qubits: 3,
        count: 8,
        data: Buffer.from(bytes).toString("base64"),
      },
    } as StateVisualization;
    expect(portablePage(frame, 4)).toHaveLength(4);
    expect(portablePage(frame, 4)![0]).toEqual({
      index: 4,
      weight: 1 / 8,
      amplitudes: Array.from({ length: 8 }, (_, i) => [i === 4 ? 1 : 0, 0]),
    });
    expect(portablePage({} as StateVisualization, 0)).toBeNull();
    expect(() =>
      portablePage(
        {
          componentPayload: { ...frame.componentPayload!, data: "" },
        } as StateVisualization,
        0,
      ),
    ).toThrow("Incomplete");
  });
});
