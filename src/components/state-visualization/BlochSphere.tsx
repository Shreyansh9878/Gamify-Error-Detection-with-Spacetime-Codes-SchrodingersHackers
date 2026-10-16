export function BlochSphere({
  vector,
  label,
}: {
  vector: [number, number, number];
  label: string;
}) {
  const project = ([x, y, z]: [number, number, number]) => [
    90 + 52 * x - 25 * y,
    78 + 17 * x + 25 * y - 56 * z,
  ];
  const tip = project(vector),
    length = Math.hypot(...vector);
  return (
    <figure className="nw-bloch">
      <svg
        viewBox="0 0 180 160"
        role="img"
        aria-label={`${label}: Bloch vector X ${vector[0].toFixed(3)}, Y ${vector[1].toFixed(3)}, Z ${vector[2].toFixed(3)}`}
      >
        <circle
          cx="90"
          cy="78"
          r="57"
          fill="var(--nw-sphere)"
          stroke="var(--nw-grid)"
        />
        <ellipse
          cx="90"
          cy="78"
          rx="57"
          ry="20"
          fill="none"
          stroke="var(--nw-grid)"
          strokeDasharray="3 3"
        />
        <ellipse
          cx="90"
          cy="78"
          rx="22"
          ry="57"
          fill="none"
          stroke="var(--nw-grid)"
        />
        <path
          d="M90 15V140 M30 58L150 98 M54 114L126 42"
          stroke="var(--nw-grid)"
        />
        <text x="94" y="15">
          |0〉 +Z
        </text>
        <text x="94" y="151">
          |1〉 −Z
        </text>
        <text x="150" y="108">
          +X
        </text>
        <text x="38" y="127">
          +Y
        </text>
        {length > 1e-6 ? (
          <>
            <line
              x1="90"
              y1="78"
              x2={tip[0]}
              y2={tip[1]}
              stroke="var(--nw-mint)"
              strokeWidth="3"
            />
            <circle cx={tip[0]} cy={tip[1]} r="4" fill="var(--nw-mint)" />
          </>
        ) : (
          <circle cx="90" cy="78" r="4" fill="var(--nw-mint)" />
        )}
      </svg>
      <figcaption>
        {label}
        {length < 1e-6 && <small>Zero vector · no defined direction</small>}
      </figcaption>
    </figure>
  );
}
