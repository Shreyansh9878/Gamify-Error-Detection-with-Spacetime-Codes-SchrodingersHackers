import type { StateVisualization, SpectralComponent } from "./contracts";

export function portablePage(
  frame: StateVisualization,
  cursor: number,
): SpectralComponent[] | null {
  const packet = frame.componentPayload;
  if (!packet) return null;
  if (
    packet.format !== "f64le-base64-v1" ||
    !Number.isInteger(packet.qubits) ||
    packet.qubits < 1 ||
    packet.qubits > 7 ||
    !Number.isInteger(packet.count) ||
    packet.count < 1 ||
    packet.count > 2 ** packet.qubits
  )
    throw new Error("Invalid state frame. Rerun the experiment and retry.");
  const bytes = Uint8Array.from(atob(packet.data), (c) => c.charCodeAt(0));
  const stride = 1 + 2 * 2 ** packet.qubits;
  if (
    bytes.length !== packet.count * stride * 8 ||
    cursor < 0 ||
    !Number.isInteger(cursor)
  )
    throw new Error("Incomplete state frame. Rerun the experiment and retry.");
  const view = new DataView(bytes.buffer);
  const result: SpectralComponent[] = [];
  for (
    let index = cursor;
    index < Math.min(cursor + 4, packet.count);
    index++
  ) {
    const offset = index * stride * 8;
    const amplitudes: [number, number][] = [];
    for (let q = 0; q < 2 ** packet.qubits; q++)
      amplitudes.push([
        view.getFloat64(offset + 8 + q * 16, true),
        view.getFloat64(offset + 16 + q * 16, true),
      ]);
    result.push({ index, weight: view.getFloat64(offset, true), amplitudes });
  }
  return result;
}
