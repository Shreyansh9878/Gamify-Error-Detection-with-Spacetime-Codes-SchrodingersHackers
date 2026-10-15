import type { Instruction, Resources } from "@/lib/learning/contracts";
export function CircuitPreview({
  items,
  labels,
  title,
}: {
  items: Instruction[];
  labels: string[];
  title: string;
}) {
  const width = Math.max(480, 80 + items.length * 62);
  return (
    <div className="ql-preview">
      <div className="ql-section-title">
        <b>{title}</b>
        <span>Generated · read-only · ancilla controls check taps</span>
      </div>
      <div className="nw-canvas-scroll" tabIndex={0} aria-label={title}>
        <div
          className="ql-preview-grid"
          style={{ width, height: 36 + labels.length * 54 }}
        >
          {labels.map((label, q) => (
            <div
              className="ql-preview-wire"
              key={q}
              style={{ top: 26 + q * 54, width }}
            >
              <span>{label}</span>
            </div>
          ))}
          {items.map((item, i) => {
            const x = 80 + i * 62,
              min = Math.min(...item.qubits),
              max = Math.max(...item.qubits);
            return (
              <div key={i}>
                {item.qubits.length > 1 && (
                  <span
                    className="ql-preview-connector"
                    style={{
                      left: x + 22,
                      top: 26 + min * 54,
                      height: (max - min) * 54,
                    }}
                  />
                )}
                {item.qubits.map((q, j) => (
                  <div
                    key={q}
                    role="img"
                    aria-label={`${item.stage}: ${item.name} on ${labels[q]}`}
                    title={`${item.stage} · ${item.name}${item.boundary !== undefined ? ` · boundary ${item.boundary}` : ""}`}
                    className={`ql-preview-gate ${item.name === "noise" || item.errorRole ? "fault" : ""} ${item.stage.includes("compensation") ? "compensation" : ""}`}
                    style={{ left: x, top: 7 + q * 54 }}
                  >
                    {item.name === "noise"
                      ? "E"
                      : item.name === "measure"
                        ? "M"
                        : item.name === "recovery"
                          ? "IF → X"
                          : item.qubits.length > 1 && j === 0
                            ? "●"
                            : item.name
                                .toUpperCase()
                                .replace(/^C(?=[XYZ])/, "")}
                    <small>
                      {item.name === "recovery"
                        ? `s=${item.condition}`
                        : item.errorRole
                          ? "ERROR"
                          : item.stage.includes("compensation")
                            ? "SIGN"
                            : item.stage.split(":").at(-1)?.slice(0, 9)}
                    </small>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export function ResourceSummary({ value }: { value: Resources }) {
  return (
    <div className="ql-resources">
      <span>
        <b>{value.peakQubits}</b> physical wires (+{value.addedQubits})
      </span>
      <span>
        <b>{value.twoQubitGates}</b> two-qubit gates
      </span>
      <span>
        <b>{value.depth}</b> logical depth
      </span>
      <span>
        <b>{value.totalComparisonShots.toLocaleString()}</b> comparison shots
      </span>
      <small>
        Helpers/readout ideal · channel sites counted separately (
        {value.noiseLocations}) · no hidden idle noise
      </small>
    </div>
  );
}
