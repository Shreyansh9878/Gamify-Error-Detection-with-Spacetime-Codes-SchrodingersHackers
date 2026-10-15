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
          <span>State fidelity (named experiment)</span>
        </div>
        <div>
          <strong>{pct(r.retention)}</strong>
          <span>Retained fraction</span>
        </div>
        <div>
          <strong>
            {r.samplingOverhead
              ? `${r.samplingOverhead.toFixed(2)}×`
              : r.coherence == null
                ? "—"
                : r.coherence.toFixed(2)}
          </strong>
          <span>
            {r.samplingOverhead
              ? "Sampling overhead"
              : "Single-qubit coherence"}
          </span>
        </div>
      </div>
      {r.bloch && <BlochVectors vectors={r.bloch} />}
      {r.shots != null && r.keptShots != null && (
        <ShotHistogram
          shots={r.shots}
          kept={r.keptShots}
          discarded={r.discardedShots || 0}
          retention={r.retention}
        />
      )}
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
export function BlochVectors({ vectors }: { vectors: number[][] }) {
  return (
    <div className="blochs">
      {vectors.map(([x, y, z], q) => (
        <figure key={q}>
          <svg
            viewBox="0 0 120 110"
            role="img"
            aria-label={`q${q} Bloch vector x ${x.toFixed(2)}, y ${y.toFixed(2)}, z ${z.toFixed(2)}`}
          >
            <circle cx="55" cy="52" r="38" />
            <ellipse cx="55" cy="52" rx="38" ry="12" />
            <path d="M55 9V95M12 52H98M25 70L86 31" />
            <line
              x1="55"
              y1="52"
              x2={55 + 33 * x + 10 * y}
              y2={52 - 33 * z + 10 * y}
            />
            <circle
              className="tip"
              cx={55 + 33 * x + 10 * y}
              cy={52 - 33 * z + 10 * y}
              r="3"
            />
            <text x="101" y="55">
              X
            </text>
            <text x="58" y="9">
              Z
            </text>
            <text x="86" y="28">
              Y
            </text>
          </svg>
          <figcaption>
            q{q} · length {Math.hypot(x, y, z).toFixed(3)}
            <br />({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)})
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
export function ShotHistogram({
  shots,
  kept,
  discarded,
  retention,
}: {
  shots: number;
  kept: number;
  discarded: number;
  retention: number;
}) {
  return (
    <div
      className="shot-histogram"
      role="img"
      aria-label={`${shots} total shots: ${kept} kept, ${discarded} discarded. Expected sampling overhead ${(1 / Math.max(retention, 1e-12)).toFixed(2)} times.`}
    >
      <h3>Shot budget · N = {shots.toLocaleString()}</h3>
      <div className="shot-bar kept">
        <span>Syndrome 0 · kept</span>
        <div>
          <i style={{ width: pct(kept / shots) }} />
        </div>
        <b>{kept.toLocaleString()}</b>
      </div>
      <div className="shot-bar discarded">
        <span>Any syndrome ≠ 0 · discarded</span>
        <div>
          <i style={{ width: pct(discarded / shots) }} />
        </div>
        <b>{discarded.toLocaleString()}</b>
      </div>
      <div className="sample-stream" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            className={i / 24 < retention ? "survives" : "rejected"}
            style={{ animationDelay: `${i * 0.035}s` }}
          />
        ))}
      </div>
      <p className="muted">
        N = N_kept + N_discarded. Counts are sampled; exact p(keep) ={" "}
        {pct(retention)} determines the{" "}
        {(1 / Math.max(retention, 1e-12)).toFixed(2)}× expected attempts per
        retained sample.
      </p>
    </div>
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
        Single-Pauli fault coverage proxy after each payload column; the score
        averages only idle data cells. Brighter = more probe faults detectable.
        This is not the observed error rate; relaxation uses a Pauli
        approximation.
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
