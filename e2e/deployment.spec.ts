import { test, expect } from "@playwright/test";
import { initial, STORAGE_KEY } from "../src/lib/progress";
import { pane } from "./learning-helpers";

test("all sixteen direct links survive refresh; assets, console and origin are clean", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.addInitScript(
    ({ key, profile }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(profile));
    },
    {
      key: STORAGE_KEY,
      profile: {
        ...initial,
        tutorial: "skipped",
        missionVersion: 2,
        sound: true,
      },
    },
  );
  for (let number = 1; number <= 6; number++) {
    await page.goto(`/?school=${number}`);
    await expect(
      page.getByLabel("Flight school lesson", { exact: true }),
    ).toHaveValue(String(number));
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      page.getByLabel("Flight school lesson", { exact: true }),
    ).toHaveValue(String(number));
    await page.waitForLoadState("networkidle");
  }
  const levels = await (await page.request.get("/api/levels")).json();
  for (const level of levels) {
    await page.goto(`/?mission=${level.id}`);
    await expect(
      page.getByRole("heading", { name: level.title, exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: level.title, exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
  }
  const profile = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(profile.sound).toBe(true);
  expect(profile.tutorial).toBe("skipped");
  expect(errors).toEqual([]);
});

test("mixed QSphere pages work without a server cache callback", async ({
  page,
}) => {
  await page.goto("/?school=1");
  await pane(page, "Experiment");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page
    .getByLabel("Tutorial circuit code", { exact: true })
    .fill(
      "from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(5)\n" +
        Array.from({ length: 5 }, (_, q) => `qc.h(${q},at=0)`).join("\n") +
        "\nqc.decoherence([0,1,2,3,4],time_us=40,t1_us=100,t2_us=80,at=1)",
    );
  const pending = page.waitForResponse((response) =>
    response.url().endsWith("/api/tutorial/noise-lab/run"),
  );
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  const output = await (await pending).json();
  expect(output.states[1].visualization.componentPayload.count).toBe(32);
  let callbacks = 0;
  await page.route("**/api/tutorial/state-visualization", async (route) => {
    callbacks++;
    await route.abort();
  });
  await pane(page, "Results");
  await page
    .getByRole("button", { name: "Load next spectral components", exact: true })
    .click();
  await expect(page.getByRole("option", { name: /Component 5 ·/ })).toHaveCount(
    1,
  );
  expect(callbacks).toBe(0);
});
