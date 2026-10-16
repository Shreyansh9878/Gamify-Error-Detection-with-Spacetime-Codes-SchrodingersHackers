import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShotHistogram } from "./learning/ShotHistogram";
import { BlochSphere } from "./state-visualization/BlochSphere";
import { TimelineCanvas } from "./circuit-workspace/TimelineCanvas";
import { initialDraft } from "../lib/timeline/contracts";
import { Tutorial } from "./Tutorial";

describe("current QED workspace rendering", () => {
  it("renders immutable guided workloads and ordinary controlled gates", () => {
    const html = renderToStaticMarkup(
      <TimelineCanvas
        draft={initialDraft(3, "guided")}
        validation={null}
        onChange={() => {}}
        onError={() => {}}
      />,
    );
    expect(html).toContain("Locked S");
    expect(html).toContain('aria-label="Drag CX"');
    expect(html).toContain('aria-label="Drag CY"');
    expect(html).not.toContain("Helper 1 closing Pauli");
    expect(html).not.toContain("Opening P");
  });
  it("keeps the capstone shell blank without changing its locked payload", () => {
    const html = renderToStaticMarkup(
      <TimelineCanvas
        draft={initialDraft(6, "guided")}
        validation={null}
        onChange={() => {}}
        onError={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Drag H"');
    expect(html).toContain('aria-label="Drag M"');
    expect(html).not.toContain("Locked H on a0");
    expect(html).not.toContain("Locked M on a0");
    expect(html).not.toContain("Insert columns");
  });
  it("labels measured shot conservation and the limits of postselection", () => {
    const html = renderToStaticMarkup(
      <ShotHistogram kept={800} discarded={224} />,
    );
    expect(html).toContain("800 kept, 224 discarded, 1024 total");
    expect(html).toContain("A zero syndrome");
  });
  it("renders a mixed single-qubit Bloch vector without a fabricated phase", () => {
    const html = renderToStaticMarkup(
      <BlochSphere vector={[0.4, 0, 0]} label="q0" />,
    );
    expect(html).toContain("q0: Bloch vector X 0.400, Y 0.000, Z 0.000");
  });
  it("routes all six modules through the same three-pane workspace", () => {
    for (let step = 0; step < 6; step++) {
      const html = renderToStaticMarkup(
        <Tutorial
          start={step}
          onStep={() => {}}
          onFinish={() => {}}
          onSkip={() => {}}
          unlocked
        />,
      );
      expect(html).toContain("noise-workspace");
      expect(html).toContain('aria-label="Experiment pane"');
      expect(html).toContain('aria-label="Results pane"');
    }
  });
});
