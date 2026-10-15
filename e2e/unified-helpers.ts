import { Page, expect, test } from "@playwright/test";
import { pane, drop, cp, runCheck } from "./learning-helpers";
export async function runAdvanced(page: Page) {
  return runCheck(page);
}
export async function completeAdvancedSchools(page: Page) {
  if (test.info().project.name === "desktop")
    await page.setViewportSize({ width: 1440, height: 1100 });
  await pane(page, "Experiment");
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CZ", 1, "a0", "q0");
  await cp(page, "CX", 6, "a0", "q0");
  await drop(page, "Drag H", "c8@a0");
  await drop(page, "Drag M", "c9@a0");
  await expect(page.locator(".uc-invalid").first()).toContainText(
    "Closing product",
  );
  await cp(page, "CX", 7, "a0", "q1");
  await expect(page.locator(".uc-valid").first()).toContainText(
    "Closed operator",
  );
  await runCheck(page);
  if (test.info().project.name === "desktop") {
    await page.locator(".nw-experiment").evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.locator(".nw-results").evaluate((el) => {
      const state = el.querySelector(".qs-state");
      if (state)
        el.scrollTop +=
          state.getBoundingClientRect().top -
          el.getBoundingClientRect().top -
          12;
    });
    await page.screenshot({
      path: "artifacts/screenshots/timeline-canvas-desktop.png",
    });
  }
  await page.screenshot({
    path: `artifacts/screenshots/timeline-school-4-${test.info().project.name}.png`,
  });
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("X on both wires", { exact: true }).check();
  await expect(
    page.getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("X0 X1", { exact: true }).check();
  await page
    .getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    })
    .click();
  await pane(page, "Experiment");
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CZ", 1, "a0", "q0");
  await cp(page, "CZ", 4, "a0", "q0");
  await drop(page, "Drag H", "c5@a0");
  await drop(page, "Drag M", "c6@a0");
  await runCheck(page);
  await page.screenshot({
    path: `artifacts/screenshots/timeline-school-5-${test.info().project.name}.png`,
  });
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("Z", { exact: true }).check();
  await page
    .getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    })
    .click();
  await pane(page, "Experiment");
  await expect(page.locator(".uc-node").filter({ hasText: "M" })).toHaveCount(
    0,
  );
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CX", 1, "a0", "q1");
  await cp(page, "CY", 9, "a0", "q1");
  await drop(page, "Drag H", "c11@a0");
  await drop(page, "Drag M", "c12@a0");
  await runCheck(page);
  await expect(
    page.getByRole("region", { name: "Qualification comparison" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Actual Paulice gamma/)).toBeVisible();
  await page
    .getByRole("button", { name: "I reviewed the comparison", exact: true })
    .click();
  await page.screenshot({
    path: `artifacts/screenshots/timeline-school-6-${test.info().project.name}.png`,
  });
  await page
    .getByRole("button", {
      name: "Unlock Main Game Missions 1–10",
      exact: true,
    })
    .last()
    .click();
  await expect(
    page.getByText("All missions unlocked", { exact: true }),
  ).toBeVisible();
}
