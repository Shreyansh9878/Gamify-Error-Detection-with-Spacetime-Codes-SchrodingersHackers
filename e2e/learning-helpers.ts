import { Page, expect } from "@playwright/test";
export async function pane(
  page: Page,
  name: "Theory" | "Experiment" | "Results",
) {
  await page.locator(".noise-workspace").waitFor();
  const button = page
    .getByRole("navigation", { name: "Workspace panes" })
    .getByRole("button", { name, exact: true });
  if (await button.isVisible()) await button.click();
}
export async function runProtection(page: Page) {
  await pane(page, "Experiment");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/tutorial/protection-lab/run") &&
        r.request().method() === "POST",
    ),
    page
      .getByRole("button", { name: "Run selected method", exact: true })
      .click(),
  ]);
  await pane(page, "Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
}
export async function runCheck(page: Page, invalid = false) {
  await pane(page, "Experiment");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/tutorial/check-lab/run") &&
        r.request().method() === "POST",
    ),
    page
      .getByRole("button", {
        name: invalid
          ? "Run invalid check — diagnostic"
          : "Run check experiment",
        exact: true,
      })
      .click(),
  ]);
  await pane(page, "Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
}
export async function drop(page: Page, name: string, target: string) {
  const item = page.getByRole("button", { name, exact: true });
  await item.press("Space");
  await page.locator(`[data-canvas-target="${target}"]`).press("Space");
}
export async function buildGuided(page: Page) {
  await pane(page, "Experiment");
  await drop(page, "Drag Ancilla H", "c0:openH@a0");
  await drop(page, "Drag Opening P", "c0:open@q0");
  await drop(page, "Drag Closing P′", "c0:close@q0");
  await drop(page, "Drag Final H", "c0:finalH@a0");
  await drop(page, "Drag Syndrome M", "c0:measure@a0");
  await expect(
    page.getByRole("heading", {
      name: "✕ Invalid check / diagnostic",
      exact: true,
    }),
  ).toBeVisible();
  await drop(page, "Drag P′ X on q0 a0 close @ 3", "trash");
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption("Y");
  await drop(page, "Drag Closing P′", "c0:close@q0");
  await expect(
    page.getByRole("heading", { name: "✓ Invariant closed", exact: true }),
  ).toBeVisible();
  await runCheck(page);
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Open custom sandbox →", exact: true })
    .click();
}
export async function passCheckQuiz(page: Page) {
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("B) P′ = Y", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 3 complete",
      exact: true,
    }),
  ).toBeVisible();
}
