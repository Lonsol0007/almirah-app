import { expect, scan, test } from "./fixtures";

// F09 (must-have "configure jurisdiction"): High Court mode and the interface language.
test.describe("F09 High Court mode", () => {
  test("F09-H1 search a High Court case by number", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("radio", { name: "High Court" }).check();
    await page.getByLabel("State").selectOption({ label: "Maharashtra" });
    await page.getByLabel("High Court bench").selectOption({ label: "Bombay High Court, Principal Seat" });
    await page.getByLabel("Side").selectOption({ label: "Appellate Side" });
    await page.getByRole("combobox", { name: "Case type" }).selectOption("Writ Petition (Civil)");
    await page.getByRole("textbox", { name: "Case number" }).fill("456");
    await page.getByLabel("Year").selectOption("2025");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 result" })).toBeVisible();
    await scan(page);
  });

  test("F09-H2 High Court case types replace district ones in High Court mode", async ({ page }) => {
    await page.goto("/search");
    const types = page.getByRole("combobox", { name: "Case type" });
    await expect(types.locator("option", { hasText: "Civil Suit" })).toHaveCount(1);
    await page.getByRole("radio", { name: "High Court" }).check();
    await expect(types.locator("option", { hasText: "Writ Petition (Civil)" })).toHaveCount(1);
    await expect(types.locator("option", { hasText: "Civil Suit" })).toHaveCount(0);
  });

  test("F09-H3 Settings: High Court as the default court level", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("radio", { name: "High Court" }).check();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    await page.goto("/cause-list");
    await expect(page.getByRole("radio", { name: "High Court" })).toBeChecked();
    await expect(page.getByLabel("High Court bench")).toBeVisible();
  });

  test("F09-H4 High Court cases show on the case page with their bench", async ({ page }) => {
    await page.goto("/cnr");
    await page.getByLabel("CNR number").fill("HCBM010004562025");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText(/Appellate Side, Bombay High Court, Principal Seat/).first()).toBeVisible();
  });
});

test.describe("F09 language", () => {
  test("F09-L1 switching to Hindi changes the interface at once and survives a reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Language").selectOption("hi");
    await page.getByRole("button", { name: "Save settings" }).click();
    const nav = page.getByRole("navigation", { name: "मुख्य" });
    await expect(nav.getByRole("link", { name: "मेरे मामले" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "मामला खोजें" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "मामला खोजें" })).toBeVisible();
    await scan(page);
  });

  test("F09-L2 Marathi, and back to English", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Language").selectOption("mr");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("navigation", { name: "मुख्य" }).getByRole("link", { name: "माझी प्रकरणे" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "mr");
    await page.getByLabel("भाषा").selectOption("en");
    await page.getByRole("button", { name: "सेटिंग्ज जतन करा" }).click();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My cases" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("F09-L3 core flow works in Hindi: look up a case and record a hearing", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Language").selectOption("hi");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.goto("/cnr");
    await page.getByLabel("CNR नंबर").fill("MHPU010004212024");
    await page.getByRole("button", { name: "खोजें" }).click();
    await page.getByRole("link", { name: "सुनवाई दर्ज करें" }).click();
    await page.getByLabel("अगली सुनवाई की तारीख").fill("2030-03-10");
    await page.getByRole("button", { name: "सुनवाई सहेजें" }).click();
    await expect(page.getByText(/10 Mar 2030/).first()).toBeVisible();
  });

  test("F09-L4 secondary screens in Hindi", async ({ page }) => {
    test.slow(); // seven screens, each with an axe scan
    await page.goto("/settings");
    await page.getByLabel("Language").selectOption("hi");
    await page.getByRole("button", { name: "Save settings" }).click();
    const screens: Array<[string, string]> = [
      ["/more", "मदद"],
      ["/my-cases/backup", "बैकअप सहेजें"],
      ["/courts", "न्यायालय खोजें"],
      ["/cases/new", "मामला जोड़ें"],
      ["/account", "डेमो मोड"],
      ["/login", "खाते अभी चालू नहीं हैं"],
      ["/cnr/scan", "या CNR लिखें"],
    ];
    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await scan(page);
    }
    // High Court benches now appear in the court finder too.
    await page.goto("/courts");
    await expect(page.getByText("Bombay High Court, Principal Seat", { exact: true })).toBeVisible();
  });
});
