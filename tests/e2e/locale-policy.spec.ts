import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { cleanupAccounts, createAccount } from "../helpers/auth-fixture";

test.afterAll(cleanupAccounts);

async function selectLanguage(page: Page, name: string) {
  const persisted = page.waitForResponse((response) => response.url().endsWith("/api/locale") && response.request().method() === "POST");
  await page.getByRole("menuitem", { name }).click();
  expect((await persisted).status()).toBe(200);
}

test("public SSR uses English for legacy Korean and offers only English and Japanese", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ locale: "ko-KR", extraHTTPHeaders: { "x-claps-language-scope": "admin" } });
  await context.addCookies([{ name: "claps-locale", value: "ko", url: baseURL! }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseURL}/login`);
  expect(await response!.text()).toContain('lang="en"');
  await page.locator("input[type=email]").fill("language@example.test");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.getByRole("menuitem")).toHaveCount(2);
  await expect(page.getByRole("menuitem", { name: "한국어" })).toHaveCount(0);
  await selectLanguage(page, "日本語");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("input[type=email]")).toHaveValue("language@example.test");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  expect(errors).toEqual([]);
  await context.close();
});

test("admin Korean stays separate during client navigation to and from the public app", async ({ page, baseURL }) => {
  const email = await createAccount(page.request, baseURL!);
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await pool.query("UPDATE users SET app_role='admin' WHERE email=$1", [email]);
    expect((await page.request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "ja" } })).status()).toBe(200);
    expect((await page.request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "ko", scope: "admin" } })).status()).toBe(200);
    const response = await page.goto("/admin");
    expect(await response!.text()).toContain('lang="ko"');
    await page.getByRole("button", { name: "언어", exact: true }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(3);
    await expect(page.getByRole("menuitem", { name: "한국어" })).toBeVisible();
    await page.keyboard.press("Escape");
    await Promise.all([page.waitForURL("**/projects"), page.locator('a[href="/projects"]').click()]);
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await page.getByRole("button", { name: "言語", exact: true }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(2);
    await selectLanguage(page, "English");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await Promise.all([page.waitForURL("**/admin"), page.locator('a[href="/admin"]').click()]);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    const preference = (await pool.query("SELECT preferences->>'locale' locale FROM users WHERE email=$1", [email])).rows[0].locale;
    expect(preference).toBe("en");
  } finally {
    await pool.end();
  }
});
