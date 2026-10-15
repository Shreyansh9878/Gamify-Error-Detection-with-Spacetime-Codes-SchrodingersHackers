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
          missionVersion: 1,
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
    path: `artifacts/screenshots/${name}-${mobile ? "mobile" : "desktop"}.png`,
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
  expect(payload.output.fidelity).toBeGreaterThan(0);
  expect(payload.output.fidelity).toBeLessThan(1);
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "flight-school-2", info.project.name === "mobile");
  await pane(page, "Theory");
  await page.getByRole("button", { name: "Examples", exact: true }).click();
  await page
    .getByRole("button", { name: "Load example: Hidden phase", exact: true })
    .click();
  await pane(page, "Experiment");
  await expect(
    page.getByLabel("Phase-flip probability", { exact: true }),
  ).toHaveValue("0.04");
  await expect(
    page.getByLabel("Bit-flip probability", { exact: true }),
  ).toHaveValue("0");
  await expect(page.locator(".uc-node")).toHaveCount(1); // Only the authored H; helpers stay in the read-only method view.
  await expect(
    page.getByRole("button", { name: "Drag Bit-flip channel", exact: true }),
  ).toHaveCount(0);
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
      localStorage.getItem(
        "quantum-shield.flight-school-2.progress.hardware.v2",
      )!,
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

test("ordinary S checks diagnose faults; blank sandbox, source, and knowledge evidence survive reload", async ({
  page,
}, info) => {
  await openLesson(page, 2);
  await buildGuided(page);
  await pane(page, "Experiment");
  await drop(page, "Drag Phase flip · Z error", "c3@q0");
  const r = await runCheck(page);
  expect(r.discardedShots).toBe(1024);
  expect(r.output).toBeNull();
  await screenshot(page, "timeline-school-3", info.project.name === "mobile");
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("X", { exact: true }).check();
  await expect(
    page.getByRole("button", {
      name: "Continue to next Flight School →",
      exact: true,
    }),
  ).toBeDisabled();
  await passCheckQuiz(page);
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Blank sandbox", exact: true })
    .click();
  await expect(page.locator(".uc-node")).toHaveCount(0);
  await page
    .getByLabel("Number of data qubits", { exact: true })
    .selectOption("5");
  await page
    .getByLabel("Number of ancillas", { exact: true })
    .selectOption("2");
  await drop(page, "Drag H", "c0@q4");
  await page.reload();
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Blank sandbox", exact: true })
    .click();
  await expect(
    page.getByLabel("Number of data qubits", { exact: true }),
  ).toHaveValue("5");
  await expect(
    page.getByRole("button", { name: "Drag H on q4 column 1", exact: true }),
  ).toBeAttached();
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await expect(page.getByLabel("Y", { exact: true })).toBeChecked();
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
      localStorage.getItem(
        "quantum-shield.flight-school-2.progress.hardware.v2",
      )!,
    ),
  );
  expect(saved.tried.detection).toBe(false);
  await pane(page, "Results");
  await expect(page.getByText("✓ Qiskit result", { exact: true })).toHaveCount(
    0,
  );
});
