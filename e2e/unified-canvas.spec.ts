import { test, expect, Page, Locator } from "@playwright/test";
import { pane, drop } from "./learning-helpers";
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
    path: `docs/screenshots/unified-trash-${info.project.name}.png`,
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
  if(info.project.name==="desktop"){
    await page.setViewportSize({width:1440,height:1100});
    await pane(page,"Experiment");
    await page.getByRole("button",{name:"Visual circuit",exact:true}).click();
  }
  await pane(page,"Results");
  await page.locator(".nw-results").evaluate(el=>{
    const state=el.querySelector(".qs-state");
    if(state)el.scrollTop+=state.getBoundingClientRect().top-el.getBoundingClientRect().top-14;
  });
  await page.screenshot({
    path: `docs/screenshots/unified-bell-${info.project.name}.png`,
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
    path: `docs/screenshots/unified-mixed-${info.project.name}.png`,
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
    path: `docs/screenshots/unified-graduated-${info.project.name}.png`,
  });
});

test("T gate warns on X transport, glows green for Z, and needs no mandatory barrier run", async ({
  page,
}, info) => {
  await open(page, 4);
  await drop(page, "Drag T", "payload2@q0");
  for (const [name, target] of [
    ["Ancilla H", "c0:openH@a0"],
    ["Opening P", "c0:open@q0"],
    ["Closing P′", "c0:close@q0"],
    ["Final H", "c0:finalH@a0"],
    ["Syndrome M", "c0:measure@a0"],
  ])
    await drop(page, `Drag ${name}`, target);
  await expect(page.locator(".uc-node-invalid")).toHaveCount(1);
  await page.screenshot({
    path: `docs/screenshots/unified-t-barrier-${info.project.name}.png`,
  });
  await drop(page, "Drag P X on q0 a0 open @ 1", "trash");
  await drop(page, "Drag P′ X on q0 a0 close @ 3", "trash");
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption("Z");
  await drop(page, "Drag Opening P", "c0:open@q0");
  await drop(page, "Drag Closing P′", "c0:close@q0");
  await expect(page.locator(".uc-node-valid")).toHaveCount(1);
  await runAdvanced(page);
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("C) Z, because T Z T† = Z", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 5 complete",
      exact: true,
    }),
  ).toBeVisible();
});

test("capstone exploratory channels are undoable and cannot earn qualification", async ({
  page,
}, info) => {
  await open(page, 5);
  await page.locator(".uc-palette-settings summary").click();
  await page
    .getByLabel("Palette check Pauli", { exact: true })
    .selectOption("Z");
  await drop(page, "Drag Opening P", "payload2@q0");
  await drop(page, "Drag Closing P′", "rail-a0:close@q0");
  await expect(
    page.getByRole("heading", { name: "✓ Invariant closed", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Decoherence scope", { exact: true })
    .selectOption("all");
  await drop(page, "Drag Decoherence · wait", "fault3@q0");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/graduation-lab/diagnostic"),
  );
  await page
    .getByRole("button", { name: "Run diagnostic overlay", exact: true })
    .click();
  expect((await (await response).json()).qualifies).toBe(false);
  await pane(page, "Results");
  await expect(
    page.getByText("Diagnostic — cannot qualify", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("quantum-shield.flight-school-6.progress.v1")!,
        ).qualified,
    ),
  ).toBeNull();
  await page.screenshot({
    path: `docs/screenshots/unified-diagnostic-${info.project.name}.png`,
  });
  await pane(page, "Experiment");
  await page
    .getByRole("button", { name: "Undo diagnostic edit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run diagnostic overlay", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "✓ Invariant closed", exact: true }),
  ).toBeVisible();
});
