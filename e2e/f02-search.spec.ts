import type { Page } from "@playwright/test";
import { expect, scan, test } from "./fixtures";

async function pickCourt(page: Page, depth: "district" | "complex" | "establishment" = "establishment") {
  await page.getByLabel("State").selectOption({ label: "Maharashtra" });
  await page.getByLabel("District", { exact: true }).selectOption({ label: "Pune" });
  if (depth === "district") return;
  await page.getByLabel("Court complex").selectOption({ label: "District Court Complex, Pune" });
  if (depth === "complex") return;
  await page.getByLabel("Court", { exact: true }).selectOption({ label: "Civil Judge, Senior Division" });
}

const results = (page: Page) => page.getByRole("list", { name: "Search results" });

test.describe("F02 search by case details", () => {
  test("F02-H1 case number: court cascade, type, number, year", async ({ page }) => {
    await page.goto("/search");
    await pickCourt(page);
    await page.getByRole("combobox", { name: "Case type" }).selectOption("Civil Suit");
    await page.getByRole("textbox", { name: "Case number" }).fill("421");
    await page.getByLabel("Year").selectOption("2024");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
    await expect(results(page).getByText("Ramesh Deshmukh vs Pune Municipal Corporation")).toBeVisible();
    await scan(page);
  });

  test("F02-E1 child pickers stay disabled until the parent is chosen", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByLabel("District", { exact: true })).toBeDisabled();
    await page.getByLabel("State").selectOption({ label: "Karnataka" });
    await expect(page.getByLabel("District", { exact: true })).toBeEnabled();
    await expect(page.getByLabel("Court complex")).toBeDisabled();
  });

  test("F02-E2 changing the state clears the lower levels", async ({ page }) => {
    await page.goto("/search");
    await pickCourt(page);
    await page.getByLabel("State").selectOption({ label: "Delhi" });
    await expect(page.getByLabel("District", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Court complex")).toBeDisabled();
  });

  test("F02-N1 missing fields are flagged, nothing is searched", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("Choose the court.")).toBeVisible();
    await expect(page.getByText("Choose a case type.")).toBeVisible();
    await expect(page.getByText("Enter the case number in digits.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /result/ })).toHaveCount(0);
  });

  test("F02-H2 party name, partial and any case", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Party" }).click();
    await page.getByLabel("Party name").fill("gaikwad");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
    await expect(results(page).getByText(/Sunita Gaikwad/)).toBeVisible();
  });

  test("F02-E3 accents, emoji and very long input don't break search", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Party" }).click();
    await page.getByLabel("Party name").fill("Ñāmé 🙂 " + "x".repeat(300));
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "0 results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No cases found" })).toBeVisible();
  });

  test("F02-H3 FIR number needs only the district", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "FIR" }).click();
    await pickCourt(page, "district");
    await expect(page.getByLabel("Court complex")).toHaveCount(0);
    await page.getByLabel("Police station").fill("shivaji");
    await page.getByLabel("FIR number").fill("212");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(results(page).getByText(/Vikas Pawar/)).toBeVisible();
  });

  test("F02-H4 filing number", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Filing number" }).click();
    await pickCourt(page);
    await page.getByRole("textbox", { name: "Filing number" }).fill("1180");
    await page.getByLabel("Year").selectOption("2024");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
  });

  test("F02-H5 case type lists every matching case in the court", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Case type" }).click();
    await pickCourt(page);
    await page.getByRole("combobox", { name: "Case type" }).selectOption("Civil Suit");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
  });

  test("F02-H6 act and section", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Act" }).click();
    await page.getByRole("combobox", { name: "Act", exact: true }).selectOption("Negotiable Instruments Act, 1881");
    await page.getByLabel("Section (optional)").fill("138");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "2 results" })).toBeVisible();
  });

  test("F02-E4 search tabs work with arrow keys", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Case number" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Party" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Party" })).toBeFocused();
  });
});

test.describe("F03 advocate finds their cases", () => {
  test("F03-H1 by name", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Advocate" }).click();
    await page.getByLabel("Advocate name").fill("Kulkarni");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    // 4 district court matters plus the demo consumer complaint
    await expect(page.getByRole("heading", { name: "5 results" })).toBeVisible();
    await scan(page);
  });

  test("F03-H2 by bar registration", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Advocate" }).click();
    await page.getByRole("tab", { name: "Bar registration" }).click();
    await page.getByLabel("Bar registration number").fill("kar/1501/2010");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "2 results" })).toBeVisible();
  });

  test("F03-E1 status filter narrows results", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Advocate" }).click();
    await page.getByLabel("Advocate name").fill("Mehta");
    await page.getByLabel("Status").selectOption("disposed");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
  });

  test("F03-N1 a 2-letter name is refused", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "Advocate" }).click();
    await page.getByLabel("Advocate name").fill("Ra");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText(/at least 3 letters/)).toBeVisible();
  });
});
