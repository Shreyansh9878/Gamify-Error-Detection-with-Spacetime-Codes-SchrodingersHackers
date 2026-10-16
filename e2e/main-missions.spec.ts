import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { generate, type Draft } from "../src/lib/missions/contracts";
import { pane, drop } from "./learning-helpers";
const refs = () =>
  JSON.parse(readFileSync("backend/missions/references.json", "utf8"))
    .levels as {
    id: number;
    target: number;
    reasonable: number;
    reasonableDraft: Draft;
  }[];
async function enter(page: Page, id: number) {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Skip Tutorial / Unlock All Levels",
      exact: true,
    })
    .click();
  await page
    .locator(".mission-card")
    .nth(id - 1)
    .click();
  await pane(page, "Experiment");
}
async function apply(page: Page, d: Draft) {
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page
    .getByLabel("Mission circuit code", { exact: true })
    .fill(generate(d));
  await page.getByRole("button", { name: "Apply code", exact: true }).click();
  await expect(page.getByText("✓ Synced", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run mission", exact: true }),
  ).toBeEnabled();
}
for (let id = 1; id <= 10; id++)
  test(`main mission ${id}: real reference passes in the shared workspace`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const ref = refs()[id - 1];
    await enter(page, id);
    await expect(page.locator(".nw-pane")).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: "Delete — drop here", exact: true }),
    ).toBeVisible();
    await apply(page, ref.reasonableDraft);
    await expect(
      page.locator('.uc-connector-layer path[stroke="#8ae6bd"]'),
    ).toHaveCount(1);
    if (id >= 4) {
      await expect(
        page.locator('.uc-node[aria-label^="Locked"]').first(),
      ).toBeVisible();
      await expect(
        page.locator('[data-canvas-target^="auto-"]').first(),
      ).toBeAttached();
    }
    await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/missions/run")),
      page.getByRole("button", { name: "Run mission", exact: true }).click(),
    ]);
    await pane(page, "Results");
    await expect(page.getByText("PASS", { exact: true })).toBeVisible();
    await expect(page.getByTestId("combined-score")).toHaveText(
      ref.reasonable.toFixed(4),
    );
    await expect(
      page.getByText("Operator trajectory", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `artifacts/screenshots/main-${id}-${test.info().project.name}.png`,
    });
    await page
      .getByRole("button", { name: "Mission control", exact: true })
      .click();
    await page.reload();
    await expect(page.locator(".mission-card").nth(id - 1)).toContainText(
      "Personal best",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

test("main DnD, inserted columns, manual red/green closure, Dustbin and removal guards", async ({
  page,
}) => {
  await enter(page, 1);
  await page.getByLabel("Payload insertion boundary").selectOption("1");
  await page
    .getByRole("button", { name: "Insert columns", exact: true })
    .click();
  await drop(page, "Drag H", "b1s0@a0");
  await drop(page, "Drag CX", "b1s1@a0");
  await drop(page, "Drag controlled gate target endpoint", "b1s1@q1");
  await expect(
    page.locator('.uc-node[aria-label^="Drag CX"]').first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove columns", exact: true })
    .click();
  await expect(page.locator(".nw-error")).toContainText("Dustbin");
  await page
    .locator('.uc-node[aria-label^="Drag H on a0"]')
    .first()
    .press("Space");
  await page
    .getByRole("button", { name: "Delete — drop here", exact: true })
    .press("Space");
  await page
    .locator('.uc-node[aria-label^="Drag CX on a0"]')
    .first()
    .press("Space");
  await page
    .getByRole("button", { name: "Delete — drop here", exact: true })
    .press("Space");
  await page
    .getByRole("button", { name: "Remove columns", exact: true })
    .click();
  await expect(page.locator('[data-canvas-target="b1s0@a0"]')).toHaveCount(0);
  const ref = refs()[0];
  const bad = structuredClone(ref.reasonableDraft);
  const closing = bad.operations
    .filter((g) => ["cx", "cy", "cz"].includes(g.name))
    .sort((a, b) => a.boundary - b.boundary || a.slot - b.slot)
    .at(-1)!;
  expect(
    closing,
    "The manual reference must contain a closing check",
  ).toBeDefined();
  closing.name = closing.name === "cz" ? "cx" : "cz";
  await applyInvalid(page, bad);
  await expect(
    page.locator('.uc-connector-layer path[stroke="#fb8f99"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Run mission", exact: true }),
  ).toBeDisabled();
  await apply(page, ref.reasonableDraft);
});
async function applyInvalid(page: Page, d: Draft) {
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page.getByLabel("Mission circuit code").fill(generate(d));
  await page.getByRole("button", { name: "Apply code", exact: true }).click();
  await expect(page.getByText("✓ Synced", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visual", exact: true }).click();
}

test("main T crossing rejects a non-Pauli opening and blocks scoring", async ({
  page,
}) => {
  await enter(page, 8);
  const levels = await (await page.request.get("/api/levels")).json();
  const level = levels.find((l: { id: number }) => l.id === 8);
  const crossing = level.payload.find(
    (g: { name: string }) => g.name === "t" || g.name === "tdg",
  );
  expect(
    crossing,
    "This test needs a real non-Clifford crossing",
  ).toBeDefined();
  const start = crossing.column,
    end = start + 1,
    helper = level.qubits;
  // Isolate the actual T boundary: the calibrated winning window may avoid it.
  const valid: Draft = {
    version: 1,
    levelId: 8,
    bands: { "0": 4, [level.payload.length]: 8, [start]: 4, [end]: 8 },
    operations: [
      { id: "h0", name: "h", qubits: [helper], boundary: start, slot: 0 },
      {
        id: "opening",
        name: "cz",
        qubits: [helper, crossing.qubits[0]],
        boundary: start,
        slot: 1,
      },
      { id: "h1", name: "h", qubits: [helper], boundary: end, slot: 6 },
      { id: "readout", name: "m", qubits: [helper], boundary: end, slot: 7 },
    ],
  };
  const bad = structuredClone(valid);
  bad.operations.find((g) => g.id === "opening")!.name = "cx";
  await applyInvalid(page, bad);
  await expect(page.locator(".mission-validation")).toContainText("Non-Pauli");
  await expect(
    page.locator('.uc-connector-layer path[stroke="#fb8f99"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Run mission", exact: true }),
  ).toBeDisabled();
  await apply(page, valid);
  await expect(
    page.locator('.uc-connector-layer path[stroke="#8ae6bd"]'),
  ).toHaveCount(1);
});
