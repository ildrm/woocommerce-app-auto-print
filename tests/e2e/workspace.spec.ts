import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("locale", "en");
  });
  await page.goto("/");
  await expect(page.getByText("Agent online", { exact: true })).toBeVisible();
});
test("dashboard and responsive layout show real engine state", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Let’s set up your first print")).toBeVisible();
  await page.screenshot({
    path: "docs/DASHBOARD_VERIFIED.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "docs/MOBILE_VERIFIED.png", fullPage: true });
});
test("paper dimensions persist with exact imperial conversion", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Paper Manager", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create paper profile", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Acceptance 4x6");
  await dialog.getByLabel("Unit", { exact: true }).selectOption("in");
  await dialog.getByLabel("Width", { exact: true }).fill("4");
  await dialog.getByLabel("Continuous roll", { exact: true }).uncheck();
  await dialog.getByLabel("Height", { exact: true }).fill("6");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Acceptance 4x6" }),
  ).toBeVisible();
  const response = await page.request.get("/api/state");
  const state = await response.json();
  const paper = state.papers.find(
    (p: { name: string }) => p.name === "Acceptance 4x6",
  );
  expect(paper.width_um).toBe(101600);
  expect(paper.height_um).toBe(152400);
});
test("template authoring and actual artifact preview", async ({ page }) => {
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Create template", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Acceptance template");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByLabel("Text", { exact: true }).fill("Acceptance document");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "Document 1" }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Templates", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Acceptance template", exact: true }),
  ).toBeVisible();
});
test("PDF destination runs a durable test job", async ({ page }) => {
  await page.getByRole("button", { name: "Printers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add a printer", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Acceptance PDF");
  await dialog
    .getByLabel("Template", { exact: true })
    .selectOption("builtin-2");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  const printer = state.printers.find(
    (p: { name: string }) => p.name === "Acceptance PDF",
  );
  const template = state.templates.find(
    (t: { id: string }) => t.id === "builtin-2",
  );
  const response = await page.request.post("/api/test-print", {
    data: { printer, template },
  });
  expect(response.ok()).toBeTruthy();
  const { job_id } = await response.json();
  await expect
    .poll(
      async () => {
        const state = await (await page.request.get("/api/state")).json();
        return state.jobs.find((j: { id: string }) => j.id === job_id)?.state;
      },
      { timeout: 30000 },
    )
    .toBe("completed");
  await page
    .getByRole("button", { name: "Print History", exact: true })
    .click();
  await expect(page.getByText("Acceptance PDF", { exact: true })).toBeVisible();
});
test("language switching mirrors layout and preserves data", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Interface language", { exact: true })
    .selectOption("fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("button", { name: "داشبورد", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "داشبورد", exact: true }).click();
  await page.screenshot({ path: "docs/RTL_VERIFIED.png", fullPage: true });
  await expect(page.getByText("موتور چاپ فعال", { exact: true })).toBeVisible();
});
