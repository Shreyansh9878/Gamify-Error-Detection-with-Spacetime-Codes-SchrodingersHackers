import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustedFidelityMetrics } from "./TrustedFidelityMetrics";
it("shows fidelity and a labelled kept-shot budget without exposing the old product", () => {
  const html = renderToStaticMarkup(
    <TrustedFidelityMetrics
      fidelity={0.88}
      retention={0.48}
      minimumKept={0.6}
    />,
  );
  expect(html).toContain("Fidelity of kept shots");
  expect(html).toContain("0.880");
  expect(html).toContain("48.0%");
  expect(html).toContain("minimum shot budget 60 percent");
  expect(html).not.toContain("correct_shot_yield");
});
