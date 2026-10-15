import { test, expect, Page } from "@playwright/test";
async function pane(page: Page, name: string) {
  await page.locator(".noise-workspace").waitFor();
  const button = page
    .getByRole("navigation", { name: "Workspace panes" })
    .getByRole("button", { name, exact: true });
  if (await button.isVisible()) await button.click();
}
async function run(page: Page) {
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/tutorial/noise-lab/run") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Run experiment", exact: true }).click(),
  ]);
  await pane(page, "Results");
  await expect(
    page.getByText("✓ Qiskit result", { exact: true }),
  ).toBeVisible();
}
async function preset(page: Page, title: string) {
  await pane(page, "Theory");
  await page.getByRole("button", { name: "Examples", exact: true }).click();
  await page
    .getByRole("button", { name: `Load example: ${title}`, exact: true })
    .click();
  await pane(page, "Experiment");
}

test("three error models, basis comparisons, source editing, history, resize and quiz", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Understanding Quantum Errors",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Bit flip · X swaps zero and one",
      exact: true,
    }),
  ).toBeAttached();
  if (info.project.name === "desktop") {
    const divider = page.getByRole("separator", { name: "Resize theory pane" });
    await divider.focus();
    await divider.press("ArrowRight");
    await expect(divider).toHaveAttribute("aria-valuenow", "38");
  }
  await preset(page, "Zero becomes one");
  await run(page);
  await expect(page.getByText(/q0: zero became one/)).toBeVisible();
  await expect(
    page.getByText("Σ counts = 1024 / 1024 · Z basis", { exact: true }),
  ).toHaveCount(2);
  await preset(page, "Plus becomes minus");
  await run(page);
  await expect(page.getByText(/the X direction reversed/)).toBeVisible();
  await page.getByLabel("Measurement basis", { exact: true }).selectOption("X");
  await expect(
    page.getByText("Previous run — settings changed", { exact: true }),
  ).toBeVisible();
  await pane(page, "Experiment");
  await run(page);
  await expect(
    page.getByText("Σ counts = 1024 / 1024 · X basis", { exact: true }),
  ).toHaveCount(2);
  if (info.project.name === "desktop") {
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 1440, height: 1100 });
    const split = page.getByRole("separator", {
      name: "Resize experiment pane",
    });
    for (let i = 0; i < 8; i++) await split.press("ArrowUp");
    await page
      .getByRole("region", { name: "Experiment pane", exact: true })
      .evaluate((el) => {
        el.scrollTop = 0;
      });
    await page
      .getByRole("region", { name: "Results pane", exact: true })
      .evaluate((el) => {
        el.scrollTop = 0;
      });
    await page.screenshot({
      path: "docs/screenshots/noise-lab-preview-desktop.png",
    });
    for (let i = 0; i < 8; i++) await split.press("ArrowDown");
    await page.setViewportSize(viewport);
  }
  await preset(page, "One relaxes");
  await page.getByLabel("Elapsed waiting time", { exact: true }).fill("150");
  await page
    .getByRole("button", { name: "Apply block changes", exact: true })
    .click();
  await run(page);
  await expect(page.getByText(/excited population decreased/)).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/noise-lab-workbench-${info.project.name}.png`,
  });
  await pane(page, "Experiment");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  const code = page.getByLabel("Tutorial circuit code", { exact: true });
  await expect(code).toHaveValue(/time_us=150/);
  const source =
    "from quantum_shield import TutorialCircuit\nfrom math import pi\nqc = TutorialCircuit(2)\nqc.h(0, at=0)\nqc.cx(0, 1, at=1)\nqc.phase_flip(1, at=2)\n";
  await code.fill(source);
  await run(page);
  await page.getByLabel("View qubit", { exact: true }).selectOption("1");
  await page.getByLabel("Joint outcomes", { exact: true }).check();
  await expect(page.getByRole("table")).toBeVisible();
  await pane(page, "Experiment");
  await code.fill(source + "import os\n");
  let runs = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/tutorial/noise-lab/run")) runs++;
  });
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(
    page.getByText(/Line 7, column 1: Only qc gate\/error calls/),
  ).toBeVisible();
  expect(runs).toBe(0);
  await expect(code).toHaveValue(source + "import os\n");
  await page
    .getByRole("button", { name: "Visual circuit", exact: true })
    .click();
  await expect(
    page.getByText(/Unapplied code changes. Visual shows/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Discard code changes", exact: true })
    .click();
  await page
    .getByLabel("Number of data qubits", { exact: true })
    .selectOption("1");
  await expect(page.getByText(/Shrinking to 1 wires removes/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByLabel("Number of data qubits", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Undo circuit edit", exact: true })
    .click();
  await expect(
    page.getByLabel("Number of data qubits", { exact: true }),
  ).toHaveValue("1");
  await page
    .getByRole("button", { name: "Redo circuit edit", exact: true })
    .click();
  await expect(
    page.getByLabel("Number of data qubits", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Export native Qiskit", exact: true })
    .click();
  await expect(
    page.getByLabel("Native Qiskit export", { exact: true }),
  ).toHaveValue(/from qiskit import QuantumCircuit/);
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await page.getByLabel("A. Always 0.", { exact: true }).check();
  await page
    .getByLabel("A. They must give opposite deterministic Z outcomes.", {
      exact: true,
    })
    .check();
  await page
    .getByLabel("B. Every qubit flips at exactly t=T1.", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.getByText(/Try again — the answer is B/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Continue to Flight School 2 →",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("B. Always 1.", { exact: true }).check();
  await page
    .getByLabel(
      "C. Their immediate Z probabilities match, but X measurement distinguishes them.",
      { exact: true },
    )
    .check();
  await page
    .getByLabel("A. P(1) decreases and P(0) increases.", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 1 complete",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Understanding Quantum Errors",
      exact: true,
    }),
  ).toBeVisible();
  await pane(page, "Theory");
  await page
    .getByRole("button", { name: "Knowledge Check", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Flight School 1 complete",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/noise-lab-${info.project.name}.png`,
  });
});

test("keyboard placement, safe combinations, stale requests and independent progress storage", async ({
  page,
}) => {
  await page.goto("/");
  await pane(page, "Experiment");
  await page
    .getByLabel("Number of data qubits", { exact: true })
    .selectOption("5");
  await page.getByRole("button", { name: "H", exact: true }).click();
  await page
    .getByRole("button", { name: "Place h on q0 column 0", exact: true })
    .press("Enter");
  if (test.info().project.name === "desktop") {
    await page.getByRole("button", { name: "H", exact: true }).dragTo(
      page.getByRole("button", {
        name: "Place h on q0 column 4",
        exact: true,
      }),
    );
    await expect(
      page.getByRole("button", {
        name: "Select H on q0 column 4",
        exact: true,
      }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Bit flip · X error", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Place bit_flip on q0 column 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Phase flip · Z error", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Place phase_flip on q0 column 2",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Replace the existing bit flip/)).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm undoable change", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Select X error on q0 column 1",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Single error · Combine Errors", { exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Place phase_flip on q0 column 3",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Combined experiment · up to 8 ordered errors", { exact: true })
    .click();
  await expect(page.getByText(/Remove extra error blocks/)).toBeVisible();
  await page
    .getByRole("button", { name: "Delete selected block", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Z error on q0 column 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete selected block", exact: true })
    .click();
  await page
    .getByLabel("Combined experiment · up to 8 ordered errors", { exact: true })
    .uncheck();
  await page.route("**/api/tutorial/noise-lab/run", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  const pendingResponse = page.waitForResponse((r) =>
    r.url().endsWith("/api/tutorial/noise-lab/run"),
  );
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page
    .getByLabel("Tutorial circuit code", { exact: true })
    .fill("invalid source stays here");
  await pendingResponse;
  await expect(page.getByText("✓ Qiskit result", { exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await pane(page, "Experiment");
  await expect(
    page.getByLabel("Tutorial circuit code", { exact: true }),
  ).toHaveValue("invalid source stays here");
  await page
    .getByRole("button", {
      name: "Skip Tutorial / Unlock All Levels",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: /10 BEYOND CLIFFORD The master spacetime architect/,
    }),
  ).toBeEnabled();
});

test("existing skip and best scores survive a corrupt lab draft; reduced-motion examples stay at endpoints", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "quantum-shield-qed-v2",
      JSON.stringify({
        version: 2,
        tutorial: "skipped",
        step: 0,
        sound: false,
        best: { 1: { score: 900, stars: 3 } },
      }),
    );
    localStorage.setItem(
      "quantum-shield.flight-school-1.draft.v1",
      JSON.stringify({ circuit: { qubits: 999 } }),
    );
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Revisit the basics", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Understanding Quantum Errors",
      exact: true,
    }),
  ).toBeVisible();
  await pane(page, "Experiment");
  await expect(page.getByText(/Saved experiment was invalid/)).toBeVisible();
  await expect(
    page.getByLabel("Number of data qubits", { exact: true }),
  ).toHaveValue("1");
  await pane(page, "Theory");
  const bit = page.locator("#theory-bit-flip");
  await bit
    .getByRole("button", { name: "Replay transformation", exact: true })
    .click();
  await expect(
    bit.getByRole("img", {
      name: /Replay \/ after: Bloch vector X 0.000, Y -?0.000, Z -1.000/,
    }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("quantum-shield-qed-v2")!),
  );
  expect(saved.tutorial).toBe("skipped");
  expect(saved.best[1]).toEqual({ score: 900, stars: 3 });
});
