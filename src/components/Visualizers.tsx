import type { Result, TutorialResult } from "@/lib/types";
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export function Probabilities({
  ideal,
  noisy,
}: {
  ideal: number[];
  noisy: number[];
}) {
  return (
    <div className="probabilities">
      <div className="legend">
        <span>● Target</span>
        <span>● Noisy / retained</span>
      </div>
      {ideal.map((p, i) => (
        <div className="prob-row" key={i}>
          <code>|{i.toString(2).padStart(Math.log2(ideal.length), "0")}〉</code>
          <div className="tracks">
            <div style={{ width: pct(p) }} />
            <div style={{ width: pct(noisy[i] || 0) }} />
          </div>
          <small>{pct(noisy[i] || 0)}</small>
        </div>
      ))}
    </div>
  );
}
export function Metrics({ result: r }: { result: TutorialResult }) {
  return (
    <>
      <Probabilities ideal={r.ideal} noisy={r.noisy} />
      <div className="metrics">
        <div>
          <strong>{pct(r.fidelity)}</strong>
          <span>Target fidelity</span>
        </div>
        <div>
          <strong>{pct(r.retention)}</strong>
          <span>Runs kept</span>
        </div>
        <div>
          <strong>{r.coherence.toFixed(2)}</strong>
          <span>Coherence*</span>
        </div>
      </div>
      <p className="muted">
        *Coherence is shown for the single-qubit noise experiment.
      </p>
      <div className="chips">
        {Object.entries(r.syndrome).map(([s, p]) => (
          <span key={s}>
            Syndrome {s}: {pct(p)}
          </span>
        ))}
      </div>
    </>
  );
}
export function StateView({ result: r }: { result: Result }) {
  return (
    <>
      <Probabilities ideal={r.ideal} noisy={r.noisy} />
      <details>
        <summary>Target amplitudes & retained Bloch vectors</summary>
        <p className="muted">
          Mixed noisy states have no single state vector. Amplitudes below
          describe the pure target; Bloch vectors describe each retained qubit.
          Bit strings read q(n−1)…q0.
        </p>
        <div className="chips">
          {r.amplitudes.map((a, i) => (
            <code key={i}>
              {i.toString(2).padStart(Math.log2(r.ideal.length), "0")}:{" "}
              {a.re.toFixed(2)} {a.im < 0 ? "−" : "+"}{" "}
              {Math.abs(a.im).toFixed(2)}i
            </code>
          ))}
        </div>
        <div className="blochs">
          {r.bloch.map(([x, y, z], q) => (
            <figure key={q}>
              <svg
                viewBox="0 0 100 100"
                aria-label={`q${q} Bloch vector x ${x.toFixed(2)}, y ${y.toFixed(2)}, z ${z.toFixed(2)}`}
                role="img"
              >
                <circle cx="50" cy="50" r="40" />
                <ellipse cx="50" cy="50" rx="40" ry="12" />
                <path d="M50 10V90M10 50H90" />
                <line
                  x1="50"
                  y1="50"
                  x2={50 + 35 * x + 10 * y}
                  y2={50 - 35 * z + 10 * y}
                />
                <circle
                  className="tip"
                  cx={50 + 35 * x + 10 * y}
                  cy={50 - 35 * z + 10 * y}
                  r="3"
                />
              </svg>
              <figcaption>
                q{q} · ({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)})
              </figcaption>
            </figure>
          ))}
        </div>
      </details>
      <h3>Noise radar</h3>
      <p className="muted">
        Single-Pauli fault coverage proxy per idle interval. Brighter = more
        probe faults detectable. This is not the observed error rate; relaxation
        uses a Pauli approximation.
      </p>
      {r.heatmap.map((row, q) => (
        <div className="heat-row" key={q}>
          <code>q{q}</code>
          {row.map((v, i) => (
            <span
              key={i}
              title={`q${q}, interval ${i}: ${pct(v)} probe coverage`}
              style={{ background: `rgba(110,231,183,${0.08 + 0.85 * v})` }}
            >
              {Math.round(v * 100)}
            </span>
          ))}
        </div>
      ))}
      <div className="chips">
        {Object.entries(r.syndromes).map(([s, p]) => (
          <span key={s}>
            syndrome {s} · {pct(p)}
          </span>
        ))}
      </div>
    </>
  );
}
