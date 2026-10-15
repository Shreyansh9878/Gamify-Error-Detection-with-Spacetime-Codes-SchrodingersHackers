"use client";
import { useState } from "react";
import type { StateVisualization } from "@/lib/state-visualization/contracts";
export function QSphere({
  frame,
  amplitudes,
  label,
}: {
  frame: StateVisualization;
  amplitudes?: [number, number][];
  label: string;
}) {
  const [rotation, setRotation] = useState(24),
    [zoom, setZoom] = useState(1),
    [picked, setPicked] = useState<number | null>(null);
  const n = frame.wireOrder.length,
    count = 2 ** n,
    probabilities = amplitudes
      ? amplitudes.map(([r, i]) => r * r + i * i)
      : frame.probabilities;
  const latitudes = Array.from({ length: n + 1 }, (_, weight) =>
    Array.from({ length: count }, (_, i) => i).filter(
      (i) => i.toString(2).replaceAll("0", "").length === weight,
    ),
  );
  const nodes = probabilities
    .map((p, i) => {
      const weight = i.toString(2).replaceAll("0", "").length,
        group = latitudes[weight],
        z = 1 - (2 * weight) / n;
      const theta =
          (2 * Math.PI * group.indexOf(i)) / group.length +
          (rotation * Math.PI) / 180,
        r = Math.sqrt(Math.max(0, 1 - z * z));
      const x = r * Math.cos(theta),
        y = r * Math.sin(theta),
        phase =
          amplitudes && p > 1e-12
            ? Math.atan2(amplitudes[i][1], amplitudes[i][0])
            : null;
      return {
        i,
        p,
        x: 150 + 95 * x,
        y: 127 - 90 * z + 25 * y,
        depth: y,
        phase,
        bits: i.toString(2).padStart(n, "0"),
      };
    })
    .sort((a, b) => a.depth - b.depth);
  return (
    <figure className="qs-figure">
      <svg
        viewBox="0 0 300 270"
        role="img"
        aria-label={`${label}: QSphere, ${n} displayed wires, ${amplitudes ? "relative phases" : "mixed-state populations"}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.dataset.drag = String(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            const last = +(e.currentTarget.dataset.drag || e.clientX);
            setRotation((v) => v + (e.clientX - last));
            e.currentTarget.dataset.drag = String(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <g transform={`translate(150 127) scale(${zoom}) translate(-150 -127)`}>
          <circle
            cx="150"
            cy="127"
            r="96"
            fill="#12242f"
            fillOpacity=".75"
            stroke="#456373"
          />
          {latitudes.map((_, k) => {
            const z = 1 - (2 * k) / n,
              r = 95 * Math.sqrt(Math.max(0, 1 - z * z));
            return (
              <ellipse
                key={k}
                cx="150"
                cy={127 - 90 * z}
                rx={r}
                ry={r * 0.26}
                fill="none"
                stroke="#456373"
                strokeDasharray="3 4"
              />
            );
          })}
          {nodes.map((v) => (
            <g
              key={v.i}
              role="button"
              tabIndex={0}
              aria-label={`Basis ${v.bits}, probability ${v.p.toFixed(6)}${v.phase === null ? ", phase undefined" : `, relative phase ${v.phase.toFixed(5)} radians`}`}
              onFocus={() => setPicked(v.i)}
              onMouseEnter={() => setPicked(v.i)}
            >
              <title>{`|${v.bits}〉 · p=${v.p.toFixed(6)} · ${v.phase === null ? "no phase assigned" : `phase ${v.phase.toFixed(5)} rad`}`}</title>
              <line
                x1="150"
                y1="127"
                x2={v.x}
                y2={v.y}
                stroke="#9cead1"
                opacity={v.p > 0.00001 ? 0.35 : 0}
              />
              <circle
                cx={v.x}
                cy={v.y}
                r={v.p > 1e-12 ? 22 * Math.sqrt(v.p) : 1.5}
                fill={
                  v.phase === null
                    ? "#98abbb"
                    : `hsl(${((((v.phase * 180) / Math.PI) % 360) + 360) % 360} 72% 66%)`
                }
                opacity={v.p > 1e-12 ? 1 : 0.25}
                stroke={picked === v.i ? "white" : "#10222c"}
              />
              {(count <= 8 || v.p > 0.1 || picked === v.i) && (
                <text x={v.x + 5} y={v.y - 9}>
                  |{v.bits}〉
                </text>
              )}
            </g>
          ))}
        </g>
        <text x="150" y="255" textAnchor="middle">
          {frame.wireOrder.join(" ")} · rightmost bit is lowest wire
        </text>
      </svg>
      <figcaption>
        {label} ·{" "}
        {amplitudes
          ? "area = probability · color = relative phase"
          : "population QSphere · no mixed-state phase invented"}
      </figcaption>
      <label>
        Rotate QSphere
        <input
          aria-label={`Rotate ${label} QSphere`}
          type="range"
          min="-180"
          max="180"
          value={rotation}
          onChange={(e) => setRotation(+e.target.value)}
        />
      </label>
      <label>
        Zoom QSphere
        <input
          aria-label={`Zoom ${label} QSphere`}
          type="range"
          min=".5"
          max="1.5"
          step=".05"
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
        />
      </label>
      <button
        onClick={() => {
          setRotation(24);
          setZoom(1);
          setPicked(null);
        }}
      >
        Reset QSphere view
      </button>
      {amplitudes && (
        <div className="qs-phase-legend">
          <span>Phase: 0</span>
          <i />
          <span>2π</span>
        </div>
      )}
      <details>
        <summary>Basis probabilities & amplitudes</summary>
        <div className="nw-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Basis</th>
                <th>Probability</th>
                <th>Amplitude (Re, Im)</th>
              </tr>
            </thead>
            <tbody>
              {[...nodes]
                .sort((a, b) => a.i - b.i)
                .map((v) => (
                  <tr key={v.i}>
                    <th>{v.bits}</th>
                    <td>{v.p.toFixed(7)}</td>
                    <td>
                      {amplitudes
                        ? amplitudes[v.i].map((a) => a.toFixed(6)).join(", ")
                        : "Not a single pure state"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
