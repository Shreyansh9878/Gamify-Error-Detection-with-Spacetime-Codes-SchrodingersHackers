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
  await page
    .getByRole("button", { name: /01 FOUNDATIONS The single-wire barrier/ })
    .click();
  await expect(
    page.getByRole("img", { name: "Locked q0 time 0: X", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear circuit", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add helper", exact: true }).click();
  await page
    .getByLabel("Helper 1 closing Pauli", { exact: true })
    .selectOption("X");
  await expect(page.getByText(/Open loop: selected/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run circuit", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Helper 1 closing Pauli", { exact: true })
    .selectOption("Z");
  await expect(
    page.getByText("✓ Invariant closed", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inject Test Fault", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inject X after q0 column 2", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Caught · syndrome ≠ 0" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run circuit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to missions", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: /01 FOUNDATIONS The single-wire barrier/,
    }),
  ).toContainText("Personal best");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("skip unlocks all missions and T crossings are inspected", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Skip Tutorial / Unlock All Levels",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: /10 BEYOND CLIFFORD/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /08 BEYOND CLIFFORD/ }).click();
  await page.getByRole("button", { name: "Add helper", exact: true }).click();
  await page
    .getByLabel("Helper 1 opening Pauli", { exact: true })
    .selectOption("X");
  await expect(page.getByText(/Non-Pauli T barrier at/)).toBeVisible();
  await page
    .getByLabel("Helper 1 opening Pauli", { exact: true })
    .selectOption("Z");
  await expect(
    page.getByText("✓ Invariant closed", { exact: true }),
  ).toBeVisible();
});
