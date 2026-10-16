/** Compact shared readout; the server is authoritative for all scores. */
export function TrustedFidelityMetrics({
  fidelity,
  retention,
  minimumKept,
}: {
  fidelity: number | null;
  retention: number;
  minimumKept: number;
}) {
  return (
    <div className="trusted-metrics">
      <p>
        Fidelity of kept shots{" "}
        <b>
          {fidelity === null
            ? "Undefined (no shots kept)"
            : fidelity.toFixed(3)}
        </b>
      </p>
      <p>
        Shots kept <b>{(retention * 100).toFixed(1)}%</b> · budget{" "}
        <b>{(minimumKept * 100).toFixed(0)}%</b>
      </p>
      <div
        role="img"
        aria-label={`Shots kept ${(retention * 100).toFixed(1)} percent; minimum shot budget ${(minimumKept * 100).toFixed(0)} percent`}
        style={{
          height: 12,
          position: "relative",
          background: "#26324a",
          borderRadius: 6,
          margin: "12px 2px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${retention * 100}%`,
            background: retention >= minimumKept ? "#36d6a4" : "#e5ad55",
            borderRadius: 6,
          }}
        />
        <span
          style={{
            position: "absolute",
            left: `${minimumKept * 100}%`,
            top: -4,
            bottom: -4,
            width: 2,
            background: "#f8fafc",
            transform: "translateX(-1px)",
          }}
        />
      </div>
    </div>
  );
}
