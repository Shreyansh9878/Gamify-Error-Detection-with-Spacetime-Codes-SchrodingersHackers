import { test, expect, Page, Locator } from "@playwright/test";
import { pane, drop, cp } from "./learning-helpers";
import { completeAdvancedSchools, runAdvanced } from "./unified-helpers";

async function open(page: Page, step = 0) {
  await page.addInitScript(
    (step) =>
      localStorage.setItem(
        "quantum-shield-qed-v2",
        JSON.stringify({
          version: 2,
          tutorial: "new",
          step,
          sound: false,
          best: {},
        }),
      ),
    step,
  );
  await page.goto("/");
  await pane(page, "Experiment");
}
async function physicalDrag(
  page: Page,
  from: Locator,
  to: Locator,
  touch: boolean,
) {
  await from.scrollIntoViewIfNeeded();
  await to.scrollIntoViewIfNeeded();
  const a = await from.boundingBox(),
    b = await to.boundingBox();
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  const start = { x: a!.x + a!.width / 2, y: a!.y + a!.height / 2 },
    end = { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await page.waitForTimeout(240); // Deliberate long-press activation, not an app readiness delay.
    for (let i = 1; i <= 8; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * i) / 8,
            y: start.y + ((end.y - start.y) * i) / 8,
          },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
  }
}

test("pointer/touch and keyboard drags, click inactivity, single-item trash and atomic controlled endpoints", async ({
  page,
}, info) => {
  await open(page);
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1440, height: 1200 });
  const cell = page.locator('[data-canvas-target="g0@q0"]');
  await page.getByRole("button", { name: "Drag H", exact: true }).click();
  await cell.click();
  await expect(page.locator(".uc-node")).toHaveCount(0);
  await physicalDrag(
    page,
    page.getByRole("button", { name: "Drag H", exact: true }),
    cell,
    info.project.name === "mobile",
  );
  const gate = page.getByRole("button", {
    name: "Drag H on q0 Column 0",
    exact: true,
  });
  await expect(gate).toBeVisible();
  await physicalDrag(
    page,
    gate,
    page.getByRole("button", { name: "Delete — drop here", exact: true }),
    info.project.name === "mobile",
  );
  await expect(page.locator(".uc-node")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Undo circuit edit", exact: true })
    .click();
  await expect(gate).toBeAttached();
  await page
    .getByLabel("Number of data qubits", { exact: true })
    .selectOption("2");
  await drop(page, "Drag CX", "g1@q0");
  await expect(
    page.getByRole("button", {
      name: "Drag controlled gate target endpoint",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".uc-node")).toHaveCount(1);
  await drop(page, "Drag CX", "g1@q0");
  await drop(page, "Drag controlled gate target endpoint", "g1@q1");
  await expect(
    page.getByRole("button", { name: "Drag CX on q0 Column 1", exact: true }),
  ).toBeAttached();
  await drop(page, "Drag CX on q1 Column 1", "trash");
  await expect(page.locator(".uc-node")).toHaveCount(1);
  await page.screenshot({
    path: `artifacts/screenshots/unified-trash-${info.project.name}.png`,
  });
});

test("Bell phase QSphere, mixed populations, all-five wait and per-target trash survive source and reload", async ({
  page,
}, info) => {
  await open(page);
  await page.getByRole("button", { name: "Code", exact: true }).click();
  const code = page.getByLabel("Tutorial circuit code", { exact: true });
  await code.fill(
    "from quantum_shield import TutorialCircuit\nqc=TutorialCircuit(2)\nqc.h(0,at=0)\nqc.cx(0,1,at=1)\nqc.phase_flip(0,at=2)",
  );
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await pane(page, "Results");
  await expect(
    page.getByRole("img", { name: /QSphere, 2 displayed wires/ }),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("region", { name: "Results pane", exact: true })
      .getByRole("img", { name: /Bloch vector/ }),
  ).toHaveCount(0);
  const basis = page.locator(
    '.qs-figure g[role="button"][aria-label^="Basis 11"]',
  );
  expect(await basis.nth(0).getAttribute("aria-label")).not.toBe(
    await basis.nth(1).getAttribute("aria-label"),
  );
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await pane(page, "Experiment");
    await page
      .getByRole("button", { name: "Visual circuit", exact: true })
      .click();
  }
  await pane(page, "Results");
  await page.locator(".nw-results").evaluate((el) => {
    const state = el.querySelector(".qs-state");
    if (state)
      el.scrollTop +=
        state.getBoundingClientRect().top - el.getBoundingClientRect().top - 14;
  });
  await page.screenshot({
    path: `artifacts/screenshots/unified-bell-${info.project.name}.png`,
  });
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Visual circuit", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByLabel("Number of data qubits", { exact: true })
    .selectOption("5");
  for (let q = 0; q < 5; q++) await drop(page, "Drag X", `g0@q${q}`);
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Decoherence scope", { exact: true })
    .selectOption("all");
  await drop(page, "Drag Decoherence · wait", "g1@q0");
  await expect(page.locator(".uc-node.uc-error")).toHaveCount(5);
  await drop(page, "Drag Wait 50 on q4 Column 1", "trash");
  await expect(page.locator(".uc-node.uc-error")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Undo circuit edit", exact: true })
    .click();
  await expect(page.locator(".uc-node.uc-error")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await pane(page, "Results");
  await expect(page.getByText(/Mixed state · rank/)).toHaveCount(1);
  await expect(
    page.getByRole("img", { name: /QSphere, 5 displayed wires/ }),
  ).toHaveCount(2);
  await page.screenshot({
    path: `artifacts/screenshots/unified-mixed-${info.project.name}.png`,
  });
  await page.reload();
  await pane(page, "Experiment");
  await expect(page.locator(".uc-node.uc-error")).toHaveCount(5);
});

test("last three schools use one canvas, drag multiwire/T/capstone checks, reveal and graduate", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await open(page, 3);
  await expect(
    page.getByRole("region", {
      name: "Unified circuit workspace",
      exact: true,
    }),
  ).toHaveCount(1);
  await completeAdvancedSchools(page);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("quantum-shield-qed-v2")!).tutorial,
    ),
  ).toBe("complete");
  await page.screenshot({
    path: `artifacts/screenshots/unified-graduated-${info.project.name}.png`,
  });
});

test("gold T rejects X/Y, accepts Z, and sandbox is truly blank", async ({
  page,
}, info) => {
  await open(page, 4);
  await expect(page.locator(".uc-node")).toHaveCount(1);
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CX", 1, "a0", "q0");
  await cp(page, "CX", 4, "a0", "q0");
  await drop(page, "Drag H", "c5@a0");
  await drop(page, "Drag M", "c6@a0");
  await expect(page.locator(".uc-node-invalid")).toHaveCount(1);
  await drop(page, "Drag CX on a0 column 2", "trash");
  await drop(page, "Drag CX on a0 column 5", "trash");
  await cp(page, "CZ", 1, "a0", "q0");
  await cp(page, "CZ", 4, "a0", "q0");
  await expect(page.locator(".uc-node-valid")).toHaveCount(1);
  await runAdvanced(page);
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
  await drop(page, "Drag T", "c3@q4");
  await expect(
    page.getByRole("button", { name: "Drag T on q4 column 4", exact: true }),
  ).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Drag Opening P", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Circuit zones", { exact: true })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: `artifacts/screenshots/timeline-t-sandbox-${info.project.name}.png`,
  });
});

test("capstone hardware changes invalidate telemetry and there are no spatial errors or fixed shell gates", async ({
  page,
}) => {
  await open(page, 5);
  await expect(page.locator(".uc-node")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Drag Decoherence · wait", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Drag Ancilla H", exact: true }),
  ).toHaveCount(0);
  await drop(page, "Drag H", "c0@a0");
  await cp(page, "CX", 1, "a0", "q1");
  await cp(page, "CY", 9, "a0", "q1");
  await drop(page, "Drag H", "c11@a0");
  await drop(page, "Drag M", "c12@a0");
  await runAdvanced(page);
  await expect(
    page.getByRole("region", { name: "Qualification comparison" }),
  ).toBeVisible({ timeout: 60000 });
  // Running the identical accepted draft must produce a fresh comparison too.
  await runAdvanced(page);
  await expect(
    page.getByRole("region", { name: "Qualification comparison" }),
  ).toBeVisible({ timeout: 60000 });
  await pane(page, "Experiment");
  await page.getByLabel("Bit-flip probability", { exact: true }).fill("0.3");
  await pane(page, "Results");
  await expect(page.getByText(/Previous run — circuit/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Qualification comparison" }),
  ).toHaveCount(0);
});
