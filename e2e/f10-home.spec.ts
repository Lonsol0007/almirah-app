import { SEED, expect, scan, test } from "./fixtures";

// Home leads with the diary: the calendar comes first, the selected day's hearings under it, then CNR lookup.
test.describe("F10 Home calendar", () => {
  test("F10-H1 calendar comes before CNR lookup, today's hearings show", async ({ page }) => {
    await page.goto("/");
    const grid = page.getByRole("grid");
    const cnr = page.getByLabel("CNR number");
    await expect(grid).toBeVisible();
    const [g, c] = await Promise.all([grid.boundingBox(), cnr.boundingBox()]);
    expect(g!.y).toBeLessThan(c!.y);
    await expect(page.getByRole("list", { name: "Today's hearings" }).getByText(/Ramesh Deshmukh/)).toBeVisible();
    await scan(page);
  });

  test("F10-H2 picking tomorrow shows tomorrow's hearings", async ({ page }) => {
    await page.goto("/");
    const today = await page.locator("[data-date][tabindex='0']").getAttribute("data-date");
    const next = new Date(Date.parse(today + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
    await page.locator(`[data-date='${next}']`).click();
    await expect(page.getByRole("list", { name: /Hearings on/ }).getByText(/Vikas Pawar/)).toBeVisible();
    await page.getByLabel("CNR number").fill(SEED.todayPune);
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page).toHaveURL(/\/case\?id=/);
  });

  test("F10-H3 case page offers the next hearing for Google Calendar", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill(SEED.tomorrow);
    await page.getByRole("button", { name: "Look up" }).click();
    const link = page.getByRole("link", { name: "Add to Google Calendar" });
    await expect(link).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&text=Hearing/);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("F10-H4 the Home tab brings the calendar back from any screen", async ({ page }) => {
    await page.goto("/my-cases");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("grid")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });
});
