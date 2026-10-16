/** Assets are generated offline by scripts/generate_tutorial_circuits.py. */
export function CircuitFigure({
  name,
  caption,
}: {
  name: string;
  caption: string;
}) {
  return (
    <figure className="tutorial-circuit-figure">
      <img
        src={`/tutorial-circuits/${name}.png`}
        alt={caption}
        loading="lazy"
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
