"use client";
import { useEffect, useRef, useState } from "react";
import type {
  StateVisualization,
  SpectralComponent,
} from "@/lib/state-visualization/contracts";
import { api } from "@/lib/api";
import { portablePage } from "@/lib/state-visualization/portable";
import { QSphere } from "./QSphere";
import { BlochSphere } from "./BlochSphere";
export function QuantumStateView({
  frame,
  bloch,
  label,
}: {
  frame?: StateVisualization;
  bloch?: [number, number, number];
  label: string;
}) {
  const [components, setComponents] = useState<SpectralComponent[]>(
      frame?.components || [],
    ),
    [loadedFor, setLoadedFor] = useState(frame?.frameId),
    [component, setComponent] = useState(-1),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const current = useRef(frame?.frameId);
  current.current = frame?.frameId;
  useEffect(() => {
    setLoadedFor(frame?.frameId);
    setLoading(false);
    setComponents(frame?.components || []);
    setComponent(-1);
    setError("");
  }, [frame?.frameId]);
  if (!frame)
    return (
      <p role="status">
        State visualization unavailable for this saved result. Rerun for a
        Qiskit state frame.
      </p>
    );
  if (frame.stateKind === "unavailable")
    return <p>No retained state exists.</p>;
  if (frame.experimentWireCount === 1 && frame.wireOrder.length === 1 && bloch)
    return <BlochSphere vector={bloch} label={label} />;
  const visibleComponents =
      loadedFor === frame.frameId ? components : frame.components || [],
    visibleComponent = loadedFor === frame.frameId ? component : -1;
  const amplitudes =
    frame.stateKind === "pure"
      ? frame.amplitudes
      : visibleComponents.find((c) => c.index === visibleComponent)?.amplitudes;
  return (
    <section className="qs-state">
      <p className="qs-state-kind">
        {frame.stateKind === "mixed"
          ? `Mixed state · rank ${frame.spectral?.rank} · purity ${frame.purity?.toFixed(5)}`
          : "Pure state"}{" "}
        ·{" "}
        {frame.experimentWireCount > frame.wireOrder.length
          ? `Reduced data from ${frame.experimentWireCount} active wires`
          : frame.scope}{" "}
        · {frame.stage}
      </p>
      {frame.stateKind === "mixed" && (
        <>
          <label>
            Spectral component
            <select
              aria-label={`${label} spectral component`}
              value={visibleComponent}
              onChange={(e) => setComponent(+e.target.value)}
            >
              <option value="-1">Full populations — phases unassigned</option>
              {visibleComponents.map((c) => (
                <option key={c.index} value={c.index}>
                  Component {c.index + 1} · weight {c.weight.toFixed(6)}
                </option>
              ))}
            </select>
          </label>
          <p>
            ρ = Σ λⱼ |vⱼ〉〈vⱼ|. Components are a mathematical decomposition,
            not individual error histories. Degenerate eigenspaces have no
            unique eigenvectors.
          </p>
          {components.length < (frame.spectral?.componentCount || 0) && (
            <button
              disabled={loading}
              onClick={() => {
                const id = frame.frameId;
                setLoading(true);
                void Promise.resolve()
                  .then(() => {
                    const local = portablePage(frame, components.length);
                    return local
                      ? { components: local }
                      : api<{ components: SpectralComponent[] }>(
                          "tutorial/state-visualization",
                          {
                            visualizationToken: frame.visualizationToken,
                            cursor: components.length,
                          },
                        );
                  })
                  .then((r) => {
                    if (id === current.current)
                      setComponents((prev) => [...prev, ...r.components]);
                  })
                  .catch((e) => {
                    if (id === current.current) setError((e as Error).message);
                  })
                  .finally(() => {
                    if (id === current.current) setLoading(false);
                  });
              }}
            >
              Load next spectral components
            </button>
          )}
          <small>
            Omitted numerical weight{" "}
            {frame.spectral?.omittedWeight.toExponential(2)}
          </small>
        </>
      )}
      <QSphere frame={frame} amplitudes={amplitudes} label={label} />
      {error && (
        <p className="nw-error" role="alert">
          {error}
        </p>
      )}
      {frame.coherences && (
        <details>
          <summary>
            Coherences · {frame.coherences.length} largest of{" "}
            {frame.coherenceCount}
          </summary>
          <p>
            Off-diagonal density-matrix elements; populations alone do not show
            all quantum information.
          </p>
          <div className="nw-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Column</th>
                  <th>Re, Im</th>
                </tr>
              </thead>
              <tbody>
                {frame.coherences.map((c) => (
                  <tr key={c.row + c.column}>
                    <td>{c.row}</td>
                    <td>{c.column}</td>
                    <td>{c.value.map((v) => v.toFixed(6)).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
