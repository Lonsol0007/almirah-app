// Before JavaScript loads, a form submits natively. That must never put what was typed into the URL
// (browser history, server logs) — least of all a password.
import { expect, test } from "./fixtures";

test.use({ javaScriptEnabled: false });

// /cases/new, /login and /cause-list render client-side only (they read URL params), so they have no form
// before JavaScript runs; their forms still use method="post".
const FORMS: Array<[string, string, string, string]> = [
  ["CNR lookup", "/cnr", "CNR number", "MHPU010004212024"],
  ["case search", "/search", "Case number", "421"],
  ["password reset", "/auth/reset", "Email", "someone@example.test"],
];

for (const [name, path, label, value] of FORMS) {
  test(`BUG-002 ${name}: submitting before the app loads keeps input out of the URL`, async ({ page }) => {
    await page.goto(path);
    const field = page.getByRole("textbox", { name: label, exact: true });
    await field.fill(value);
    await field.press("Enter");
    await page.waitForLoadState("domcontentloaded");
    expect(new URL(page.url()).search).toBe("");
    expect(page.url()).not.toContain(encodeURIComponent(value).slice(0, 8));
  });
}
