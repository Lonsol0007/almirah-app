import { expect, scan, test } from "./fixtures";

// F11: consumer commission matters (District, State, National). e-Jagriti has no public API, so these are tracked
// by hand: added with their e-Jagriti case number (no CNR), with a link out to the portal.
async function pickBench(page: import("@playwright/test").Page) {
  await page.getByRole("radio", { name: "Consumer commission" }).check();
  await page.getByLabel("State").selectOption({ label: "Maharashtra" });
  await page.getByLabel("Commission", { exact: true }).selectOption({ label: "District Consumer Commission, Pune" });
  await page.getByLabel("Bench", { exact: true }).selectOption({ label: "Main Bench" });
}

test.describe("F11 consumer commissions", () => {
  test("F11-H1 add a consumer case by its e-Jagriti number, then open it", async ({ page }) => {
    await page.goto("/cases/new");
    await pickBench(page);
    await expect(page.getByLabel("CNR number")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Case type" }).selectOption("Consumer Complaint");
    await page.getByRole("textbox", { name: "Case number" }).fill("CC/77/2026");
    await page.getByLabel("Next hearing date").fill("2030-02-10");
    await page.getByLabel("Petitioner", { exact: true }).fill("Asha Pillai");
    await page.getByLabel("Respondent", { exact: true }).fill("QuickKart Retail");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page).toHaveURL(/\/case\?id=/);
    await expect(page.getByRole("heading", { level: 2, name: /Asha Pillai vs QuickKart Retail/ })).toBeVisible();
    await expect(page.getByText("CC/77/2026").first()).toBeVisible();
    await expect(page.getByText(/Main Bench, District Consumer Commission, Pune/).first()).toBeVisible();
    const portal = page.getByRole("link", { name: "Check status on e-Jagriti" });
    await expect(portal).toHaveAttribute("href", "https://e-jagriti.gov.in/");
    await expect(portal).toHaveAttribute("target", "_blank");
    await scan(page);
  });

  test("F11-E1 the case number is required, and the same case can't be added twice", async ({ page }) => {
    await page.goto("/cases/new");
    await pickBench(page);
    await page.getByLabel("Petitioner", { exact: true }).fill("Asha Pillai");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByText("Add the case number from e-Jagriti, like CC/123/2025.")).toBeVisible();
    await page.getByRole("textbox", { name: "Case number" }).fill("cc / 78 / 2026");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page).toHaveURL(/\/case\?id=/);

    await page.goto("/cases/new");
    await pickBench(page);
    await page.getByRole("textbox", { name: "Case number" }).fill("CC/78/2026");
    await page.getByLabel("Petitioner", { exact: true }).fill("Asha Pillai");
    await page.getByRole("button", { name: "Save case" }).click();
    await expect(page.getByText("This case is already in your list.")).toBeVisible();
  });

  test("F11-H2 consumer case types, and the demo complaint found by search", async ({ page }) => {
    await page.goto("/search");
    await pickBench(page);
    const types = page.getByRole("combobox", { name: "Case type" });
    await expect(types.locator("option", { hasText: "Revision Petition" })).toHaveCount(1);
    await expect(types.locator("option", { hasText: "Civil Suit" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Party" }).click();
    await page.getByLabel("Party name").fill("Meera Joshi");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("CC/412/2025").first()).toBeVisible();
  });

  test("F11-H3 commissions appear in the court finder", async ({ page }) => {
    await page.goto("/courts");
    await expect(page.getByRole("list", { name: "Court complexes" }).getByText("National Consumer Commission", { exact: true })).toBeVisible();
  });
});
