import { Page, expect, test } from "@playwright/test";
import { pane, drop } from "./learning-helpers";
export async function assemble(
  page: Page,
  closing: "X" | "Y" | "Z",
  multi = false,
) {
  await pane(page, "Experiment");
  await drop(page, "Drag Ancilla H", "c0:openH@a0");
  await drop(page, "Drag Opening P", "c0:open@q0");
  if (
    !(await page.getByLabel("Palette check Pauli", { exact: true }).isVisible())
  )
    await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption(closing);
  await drop(page, "Drag Closing P′", "c0:close@q0");
  await drop(page, "Drag Final H", "c0:finalH@a0");
  await drop(page, "Drag Syndrome M", "c0:measure@a0");
  if (multi) {
    await expect(page.locator(".uc-invalid")).toContainText("Mismatch");
    await drop(page, "Drag Closing P′", "c0:close@q1");
  }
  await expect(
    page.getByRole("heading", { name: "✓ Invariant closed", exact: true }),
  ).toBeVisible();
}
export async function runAdvanced(page: Page) {
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Run check experiment", exact: true })
    .click();
  await pane(page, "Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
}
export async function completeAdvancedSchools(page: Page) {
  await assemble(page, "X", true);
  await runAdvanced(page);
  await page.screenshot({
    path: `docs/screenshots/unified-school-4-${test.info().project.name}.png`,
  });
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("C) X on q0 and X on q1", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 4 complete",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("B) Y", { exact: true }).check();
  await page
    .getByRole("button", { name: "Check S-gate recap", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to Flight School 5 →", exact: true })
    .first()
    .click();
  await pane(page, "Experiment");
  await drop(page, "Drag T", "payload2@q0");
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption("Z");
  // assemble toggles the parameters section closed after the first drops.
  await assemble(page, "Z");
  await runAdvanced(page);
  await page.screenshot({
    path: `docs/screenshots/unified-school-5-${test.info().project.name}.png`,
  });
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("C) Z, because T Z T† = Z", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue to Flight School 6 →", exact: true })
    .first()
    .click();
  await pane(page, "Experiment");
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption("Z");
  await drop(page, "Drag Opening P", "payload2@q0");
  await drop(page, "Drag Closing P′", "rail-a0:close@q0");
  await expect(
    page.getByRole("heading", { name: "✓ Invariant closed", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run strategy", exact: true }).click();
  await pane(page, "Results");
  await expect(
    page.getByRole("heading", {
      name: "Best nonempty strategy in the allowed catalogue",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/qiskit-paulice 0/)).toBeVisible();
  await page
    .getByRole("heading", {
      name: "Best nonempty strategy in the allowed catalogue",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/screenshots/unified-school-6-${test.info().project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Acknowledge & Graduate →", exact: true })
    .click();
  await expect(
    page.getByText("All missions unlocked", { exact: true }),
  ).toBeVisible();
}
