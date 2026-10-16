export function ShotHistogram({
  kept,
  discarded,
  postselect = true,
}: {
  kept: number;
  discarded: number;
  postselect?: boolean;
}) {
  const total = kept + discarded;
  return (
    <figure className="ql-shot-histogram">
      <svg
        viewBox="0 0 440 100"
        role="img"
        aria-label={`Sampled shots: ${kept} kept, ${discarded} discarded, ${total} total`}
      >
        <text x="4" y="20">
          {postselect ? "Syndrome 0 · kept" : "All shots · recovered"}
        </text>
        <rect
          x="165"
          y="5"
          width={total ? (235 * kept) / total : 0}
          height="25"
          fill="#92ddbc"
        />
        <text x="410" y="22">
          {kept}
        </text>
        <text x="4" y="65">
          {postselect ? "Flagged · discarded" : "Discarded (none)"}
        </text>
        <rect
          x="165"
          y="50"
          width={total ? (235 * discarded) / total : 0}
          height="25"
          fill="#ee95a1"
        />
        <text x="410" y="67">
          {discarded}
        </text>
      </svg>
      <figcaption>
        Finite sampled counts · N_kept + N_discarded = {total}. A zero syndrome
        does not prove a shot is clean.{" "}
        {postselect
          ? ""
          : "Correction retains all outcomes, including nonzero syndromes."}
      </figcaption>
    </figure>
  );
}
