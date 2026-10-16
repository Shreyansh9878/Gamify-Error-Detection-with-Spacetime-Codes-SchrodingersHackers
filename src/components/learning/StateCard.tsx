import { QuantumStateView } from "../state-visualization/QuantumStateView";
import type { StateStats } from "@/lib/learning/contracts";
export function StateCard({
  title,
  state,
  qubit,
  basis,
}: {
  title: string;
  state: StateStats | null | undefined;
  qubit: number;
  basis: string;
}) {
  const q = state ? Math.min(qubit, state.qubits.length - 1) : 0,
    m = state?.marginals[q];
  return (
    <article className="ql-state-card">
      <h3>{title}</h3>
      {state && m ? (
        <>
          <QuantumStateView
            frame={state.visualization}
            bloch={state.qubits[q].bloch}
            label={`${(state.visualization?.wireOrder.length||1)>1?"Data state":`q${q}`} · ${title}`}
          />
          <div className="nw-vector">
            {["X", "Y", "Z"].map((s, i) => (
              <span key={s}>
                {s} {state.qubits[q].bloch[i].toFixed(3)}
              </span>
            ))}
            <span>Purity {state.qubits[q].purity.toFixed(3)}</span>
          </div>
          {[0, 1].map((bit) => (
            <div key={bit} className="nw-hist-row">
              <span>{basis === "X" ? (bit ? "−" : "+") : bit}</span>
              <div>
                <div
                  className="nw-bar"
                  style={{ width: `${m.probabilities[bit] * 100}%` }}
                />
              </div>
              <b>{(m.probabilities[bit] * 100).toFixed(1)}%</b>
              <span>
                {state.sampleSize ? `${m.counts[bit]} counts` : "Exact"}
              </span>
            </div>
          ))}
          <p className="ql-metric">
            State fidelity <b>{(100 * state.fidelity).toFixed(2)}%</b>
          </p>
          <p>
            Exact ⟨{basis} on q{q}⟩{" "}
            {(m.probabilities[0] - m.probabilities[1]).toFixed(4)}
            <br />
            Sampled{" "}
            {state.sampleSize
              ? ((m.counts[0] - m.counts[1]) / state.sampleSize).toFixed(4)
              : "Unavailable (no samples)"}
          </p>
          <small>
            Σ counts = {state.sampleSize} · q{q} view
          </small>
          <details>
            <summary>Global / joint details</summary>
            <p>
              Global purity {state.globalPurity.toFixed(4)}. Local mixedness can
              reflect entanglement.
            </p>
            <table>
              <thead>
                <tr>
                  <th>q(n−1)…q0</th>
                  <th>Probability</th>
                  <th>Counts</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(state.probabilities).map(([key, p]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{p.toFixed(4)}</td>
                    <td>{state.counts[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="nw-boundary">
          No surviving state / not applicable. No fidelity is fabricated.
        </p>
      )}
    </article>
  );
}
