import { test, expect } from "@playwright/test";

test("menu-only credits hide missing photos and links and support keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator('footer[aria-label="Team credits"]');
  await expect(
    page.getByRole("heading", { name: "Understanding Quantum Errors" }),
  ).toBeVisible();
  await expect(footer).toHaveCount(0);
  await page
    .getByRole("button", { name: "Flight school", exact: true })
    .click();
  await expect(footer).toContainText(
    "Developed for the IITJ QFF'26 Hackathon by team Schrodinger's Hackers.",
  );
  const about = footer.getByRole("button", { name: "About the team" });
  await about.click();
  const dialog = page.getByRole("dialog", { name: "Schrodinger's Hackers" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(3);
  for (const name of ["Shreyansh Agarwal", "Vihan Karnik", "Sarthak Sharma"])
    await expect(
      dialog.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(0);
  const links = dialog.getByRole("link");
  await expect(links).toHaveCount(1);
  await expect(links).toHaveAttribute(
    "href",
    "https://github.com/Shreyansh9878",
  );
  await expect(links).toHaveAttribute("target", "_blank");
  await expect(links).toHaveAttribute("rel", "noopener noreferrer");
  await dialog.getByRole("button", { name: "Close About" }).focus();
  await page.keyboard.press("Tab");
  await expect(links).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Close About" }),
  ).toBeFocused();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(about).toBeFocused();
  await about.click();
  await page.getByRole("button", { name: "Close About" }).click();
  await expect(about).toBeFocused();
  await page
    .getByRole("button", {
      name: "Skip Tutorial / Unlock All Levels",
      exact: true,
    })
    .click();
  await expect(page.locator(".mission-card").first()).toBeEnabled();
  await page.locator(".mission-card").first().click();
  await expect(footer).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "About the team" }),
  ).toHaveCount(0);
});
