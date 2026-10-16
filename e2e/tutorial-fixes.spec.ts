import { test, expect, Page } from "@playwright/test";
import { pane, drop, cp, runCheck } from "./learning-helpers";
async function open(page: Page, step: number) {
  await page.addInitScript((step) => {
    localStorage.setItem(
      "quantum-shield-qed-v2",
      JSON.stringify({
        version: 2,
        tutorial: "new",
        step,
        sound: false,
        best: {},
      }),
    );
  }, step);
  await page.goto("/");
  await pane(page, "Experiment");
}
test("parameter-only inspector edits theta; dagger palettes, static Qiskit figures and MCQ rows render correctly", async ({
  page,
}, info) => {
  await open(page, 4);
  await expect(
    page.getByRole("button", { name: "Drag SDG", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Drag TDG", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Blank sandbox", exact: true })
    .click();
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CZ", 1, "a0", "q0");
  await drop(page, "Drag RZ", "c3@q0");
  await cp(page, "CZ", 5, "a0", "q0");
  await drop(page, "Drag H", "c7@a0");
  await drop(page, "Drag M", "c8@a0");
  await page
    .getByRole("button", { name: "Drag RZ on q0 column 4", exact: true })
    .click();
  const inspector = page.getByRole("region", {
    name: "Gate parameter inspector",
  });
  await expect(inspector).toBeVisible();
  await inspector.getByRole("button", { name: "pi/4", exact: true }).click();
  await inspector
    .getByRole("button", { name: "Apply angle", exact: true })
    .click();
  await expect(
    inspector.getByRole("button", { name: /delete|add gate/i }),
  ).toHaveCount(0);
  await expect(page.locator(".uc-valid").first()).toContainText(
    "Axis-aligned rotations commute",
  );
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await expect(
    page.getByLabel("Tutorial circuit code", { exact: true }),
  ).toHaveValue(/qc.rz\(0.7853981633974483/);
  await pane(page, "Theory");
  const image = page.getByRole("img", {
    name: /Clifford conjugation examples/,
  });
  await expect(image).toBeVisible();
  expect(
    await image.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  const label = page.locator(".ql-answer").first();
  const dimensions = await label.evaluate((el) => {
    const dot = el.querySelector("input")!.getBoundingClientRect(),
      text = el.querySelector("span")!.getBoundingClientRect();
    return { dx: text.left - dot.right, dy: Math.abs(text.top - dot.top) };
  });
  expect(dimensions.dx).toBeGreaterThan(0);
  expect(dimensions.dy).toBeLessThan(12);
  await page.screenshot({
    path: `artifacts/screenshots/tutorial-parameter-mcq-${info.project.name}.png`,
  });
});
test("hardware sliders accept full endpoints and capstone hint highlights the hotspot", async ({
  page,
}) => {
  await open(page, 5);
  await expect(page.locator(".uc-node-hotspot")).toHaveCount(2);
  await pane(page, "Theory");
  await page.getByRole("button", { name: "Show hint", exact: true }).click();
  await expect(page.getByText(/Use H\(a0\), then CX/)).toBeVisible();
  await pane(page, "Experiment");
  const probability = page.getByLabel("Bit-flip probability", { exact: true });
  await expect(probability).toHaveAttribute("max", "1");
  await probability.fill("1");
  const relaxation = page.getByLabel("Relaxation time per layer (μs)", {
    exact: true,
  });
  await expect(relaxation).toHaveAttribute("max", "120");
  await relaxation.fill("120");
  const result = await runCheck(page);
  expect(result.baselineScore).toBeGreaterThanOrEqual(0);
  expect(result.baselineScore).toBeLessThanOrEqual(1);
});
