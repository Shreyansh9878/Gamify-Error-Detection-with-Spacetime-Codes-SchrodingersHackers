import { completeAdvancedSchools } from "./unified-helpers";
import { test, expect } from "@playwright/test";
import {
  pane as labPane,
  drop,
  runProtection,
  buildGuided,
  runCheck,
  passCheckQuiz,
} from "./learning-helpers";
test("tutorial, manual invariant, fault injection, scored mission, and persistence", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Understanding Quantum Errors" }),
  ).toBeVisible();
  const pane = async (name: string) => {
    const button = page
      .getByRole("navigation", { name: "Workspace panes" })
      .getByRole("button", { name, exact: true });
    if (await button.isVisible()) await button.click();
  };
  await pane("Experiment");
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await pane("Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
  await pane("Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("B. Always 1.", { exact: true }).check();
  await page
    .getByLabel(
      "C. Their immediate Z probabilities match, but X measurement distinguishes them.",
      { exact: true },
    )
    .check();
  await page
    .getByLabel("A. P(1) decreases and P(0) increases.", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 1 complete",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue to Flight School 2 →", exact: true })
    .click();
  for (const name of ["Correction", "Detection", "Mitigation"]) {
    await labPane(page, "Experiment");
    await page.getByRole("button", { name, exact: true }).click();
    await runProtection(page);
  }
  await labPane(page, "Theory");
  await page
    .getByRole("button", { name: "Continue to Flight School 3 →", exact: true })
    .click();
  await buildGuided(page);
  await labPane(page, "Experiment");
  await drop(page, "Drag Phase flip · Z error", "c3@q0");
  await runCheck(page);
  await passCheckQuiz(page);
  await page
    .getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    })
    .first()
    .click();
  await completeAdvancedSchools(page);
  await page.getByRole("button", { name: /01 MANUAL First contact/ }).click();
  await labPane(page, "Experiment");
  await expect(
    page.getByRole("button", { name: "Insert columns", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run mission", exact: true }).click();
  await labPane(page, "Results");
  await expect(page.getByText("FAIL", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /01 MANUAL First contact/ }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("skip unlocks every main mission", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Skip Tutorial / Unlock All Levels",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: /10 ASSISTED The final invariant/ }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: /08 ASSISTED Golden crossing/ })
    .click();
  await labPane(page, "Experiment");
  await expect(
    page.getByRole("button", { name: "Run mission", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Add helper", exact: true }),
  ).toHaveCount(0);
});
