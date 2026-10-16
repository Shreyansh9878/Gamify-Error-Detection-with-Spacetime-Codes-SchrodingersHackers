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
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/tutorial/protection-lab/run") &&
        r.request().method() === "POST",
    ),
    page
      .getByRole("button", { name: "Run selected method", exact: true })
      .click(),
  ]);
  expect(response.ok()).toBeTruthy();
  await pane(page, "Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
}
export async function drop(page: Page, name: string, target: string) {
  await page.getByRole("button", { name, exact: true }).press("Space");
  await page.locator(`[data-canvas-target="${target}"]`).press("Space");
}
export async function cp(
  page: Page,
  name: string,
  column: number,
  control: string,
  target: string,
) {
  await drop(page, `Drag ${name}`, `c${column}@${control}`);
  await drop(
    page,
    "Drag controlled gate target endpoint",
    `c${column}@${target}`,
  );
}
export async function runCheck(page: Page) {
  await pane(page, "Experiment");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/tutorial/timeline/run") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run circuit", exact: true }).click();
  const r = await response;
  expect(r.ok()).toBeTruthy();
  await pane(page, "Results");
  await expect(page.getByText(/Counts fluctuate from/)).toBeVisible();
  return r.json();
}
export async function buildGuided(page: Page) {
  await pane(page, "Experiment");
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CX", 1, "a0", "q0");
  await cp(page, "CX", 4, "a0", "q0");
  await drop(page, "Drag H", "c5@a0");
  await drop(page, "Drag M", "c6@a0");
  await expect(page.locator(".uc-invalid").first()).toContainText(
    "Closing product",
  );
  await drop(page, "Drag CX on a0 column 5", "trash");
  await cp(page, "CY", 4, "a0", "q0");
  await expect(page.locator(".uc-valid").first()).toContainText(
    "Closed operator",
  );
  await runCheck(page);
}
export async function passCheckQuiz(page: Page) {
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("Y", { exact: true }).check();
  await expect(
    page.getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    }),
  ).toBeEnabled();
}
