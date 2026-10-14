import { test, expect } from "@playwright/test";
test("tutorial, scored mission, and persistence", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small steps. Quantum leaps." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  const actions = [
    ["Apply H · superpose"],
    ["Inject X glitch"],
    ["Detect & discard", "Mitigate estimate", "Decode repetition code"],
    ["Run unprotected", "Add one helper"],
    ["1 · Place H", "2 · Add CX"],
    ["Prepare |1〉", "Protect & run"],
  ];
  for (let i = 0; i < actions.length; i++) {
    for (const name of actions[i])
      await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", {
        name: i === 5 ? "Unlock missions" : "Continue",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", { name: /01 FOUNDATIONS First light/ })
    .click();
  await page.getByRole("button", { name: "X", exact: true }).click();
  await page.getByRole("button", { name: "q0 time 0", exact: true }).click();
  await page.getByRole("button", { name: "Run circuit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to missions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /01 FOUNDATIONS First light/ }),
  ).toContainText("Personal best");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /01 FOUNDATIONS First light/ }),
  ).toContainText("Personal best");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("skip unlocks every mission", async ({ page }) => {
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
  await page.reload();
  await expect(
    page.getByRole("button", { name: /10 BEYOND CLIFFORD/ }),
  ).toBeEnabled();
});
