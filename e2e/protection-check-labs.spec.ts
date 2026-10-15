import { test, expect, Page } from "@playwright/test";
import {
  pane,
  drop,
  runProtection,
  runCheck,
  buildGuided,
  passCheckQuiz,
} from "./learning-helpers";

async function openLesson(page: Page, step: number) {
  await page.addInitScript((step) => {
    if (!localStorage.getItem("quantum-shield-qed-v2"))
      localStorage.setItem(
        "quantum-shield-qed-v2",
        JSON.stringify({
          version: 2,
          tutorial: "new",
          step,
          sound: false,
          best: { 1: { score: 700, stars: 2 } },
        }),
      );
  }, step);
  await page.goto("/");
  await expect(
    page.getByLabel("Flight school lesson", { exact: true }),
  ).toHaveValue(String(step + 1));
}
async function source(page: Page) {
  await pane(page, "Experiment");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  return page.getByLabel("Tutorial circuit code", { exact: true });
}
async function screenshot(page: Page, name: string, mobile: boolean) {
  if (!mobile) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    const split = page.getByRole("separator", {
      name: "Resize experiment pane",
    });
    for (let i = 0; i < 5; i++) await split.press("ArrowUp");
  }
  for (const label of ["Theory pane", "Experiment pane", "Results pane"])
    await page
      .getByRole("region", { name: label, exact: true, includeHidden: true })
      .evaluate((el) => {
        el.scrollTop = 0;
      });
  await page.screenshot({
    path: `docs/screenshots/${name}-${mobile ? "mobile" : "desktop"}.png`,
  });
}

test("protection methods repeat freely, source errors are atomic, and resampling preserves physics", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await openLesson(page, 1);
  await pane(page, "Experiment");
  await page.getByRole("button", { name: /^Correction/ }).click();
  await runProtection(page);
  await pane(page, "Experiment");
  await page.getByRole("button", { name: /^Detection/ }).click();
  await runProtection(page);
  await pane(page, "Experiment");
  await page.getByRole("button", { name: /^Mitigation/ }).click();
  await runProtection(page);
  await expect(
    page.getByRole("img", {
      name: "ZNE measured expectations and zero-noise extrapolation",
    }),
  ).toBeVisible();
  await pane(page, "Experiment");
  await page.getByRole("button", { name: /^Detection/ }).click();
  await runProtection(page);
  const resampled = page.waitForResponse(
    (r) =>
      r.url().endsWith("/protection-lab/run") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Resample selected method", exact: true })
    .click();
  const response = await resampled,
    payload = await response.json();
  expect(response.request().postDataJSON().sampleSeed).toBe(2027);
  expect(payload.output.fidelity).toBeCloseTo(1);
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "flight-school-2", info.project.name === "mobile");
  const code = await source(page),
    valid = await code.inputValue();
  await code.fill(`${valid}\nimport os`);
  await page.getByRole("button", { name: "Apply code", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /Line/ }),
  ).toBeVisible();
  await expect(code).toHaveValue(`${valid}\nimport os`);
  await page.reload();
  await pane(page, "Experiment");
  await expect(
    page.getByLabel("Tutorial circuit code", { exact: true }),
  ).toHaveValue(`${valid}\nimport os`);
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("quantum-shield.flight-school-2.progress.v1")!,
    ),
  );
  expect(saved.tried).toEqual({
    detection: true,
    mitigation: true,
    correction: true,
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("quantum-shield-qed-v2")!).best[1]
          .score,
    ),
  ).toBe(700);
});

test("guided mismatch is diagnostic; sandbox coverage and knowledge check survive reload", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await openLesson(page, 2);
  await buildGuided(page);
  await drop(page, "Drag Phase flip · Z error", "fault3@q0");
  await runCheck(page);
  await expect(
    page
      .locator(".ql-comparison-metrics span")
      .filter({ hasText: "Experiment flag" }),
  ).toHaveText("Experiment flag 100.00%");
  await screenshot(page, "flight-school-3", info.project.name === "mobile");
  await pane(page, "Experiment");
  await page
    .getByRole("button", {
      name: "Sweep single X/Z fault coverage",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/tested fault locations · not a hardware score/),
  ).toBeVisible();
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("A) P′ = X", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Try again — evaluate S X S†",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 3 complete",
      exact: true,
    }),
  ).toHaveCount(0);
  await passCheckQuiz(page);
  await page.reload();
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await expect(page.getByLabel("B) P′ = Y", { exact: true })).toBeChecked();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 3 complete",
      exact: true,
    }),
  ).toBeVisible();
});

test("late simulation responses cannot certify changed protection experiments", async ({
  page,
}) => {
  await openLesson(page, 1);
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/api/tutorial/protection-lab/run", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Run selected method", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Running…", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Measurement basis", { exact: true }).selectOption("X");
  release();
  await expect(
    page.getByRole("button", { name: "Run selected method", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("quantum-shield.flight-school-2.progress.v1")!,
    ),
  );
  expect(saved.tried.detection).toBe(false);
  await pane(page, "Results");
  await expect(page.getByText("✓ Qiskit result", { exact: true })).toHaveCount(
    0,
  );
});
