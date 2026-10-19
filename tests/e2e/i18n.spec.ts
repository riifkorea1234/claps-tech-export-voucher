import { createProject, createSession, assetFixture } from "../helpers/workspace-fixture";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
test.beforeEach(async ({ page, baseURL }, info) => {
  if (!/^(API matches|SSR chooses|login and recovery)/.test(info.title)) await createAccount(page.request, baseURL!);
});
test.afterAll(cleanupAccounts);
import { expect, test, type Page } from "@playwright/test";
async function change(page: Page, label: string, target: string) {
  await page.getByRole("button", { name: label, exact: true }).first().click();
  const persisted = page.waitForResponse((response) => response.url().endsWith("/api/locale") && response.request().method() === "POST");
  await page.getByRole("menuitem", { name: target }).click();
  await persisted;
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    target === "English" ? "en" : "ja",
  );
}
test("API matches regional languages, rejects invalid origins/locales and sets a private cookie", async ({
  request,
  baseURL,
}) => {
  const locales = await request.get("/api/locales");
  expect(locales.status()).toBe(200);
  expect(
    (await locales.json()).data.map((l: { code: string }) => l.code),
  ).toEqual(["en", "ja"]);
  expect(
    (
      await request.post("/api/locale", {
        headers: { Origin: "https://invalid.example" },
        data: { locale: "en" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/locale", {
        headers: { Origin: baseURL! },
        data: { locale: "fr" },
      })
    ).status(),
  ).toBe(422);
  const response = await request.post("/api/locale", {
    headers: { Origin: baseURL! },
    data: { locale: "en-US" },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).data.locale).toBe("en");
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
  expect(response.headers()["set-cookie"]).toContain("SameSite=lax");
  const expired = await request.post("/api/locale", {
    headers: { Origin: baseURL!, Cookie: `claps-session=${"f".repeat(64)}` }, data: { locale: "ja" },
  });
  expect(expired.status()).toBe(200);
  expect(expired.headers()["set-cookie"]).toContain("claps-session=;");

});
test("SSR chooses browser language and cookie without hydration errors", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto(baseURL + "/login");
  expect(await response!.text()).toContain('lang="en"');
  await expect(page.getByText("Continue with Google")).toBeVisible();
  await change(page, "Language", "日本語");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByText("Googleで続ける")).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
test("login and recovery inputs survive language changes and failed persistence can be retried", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: "claps-locale", value: "ja", domain: "127.0.0.1", path: "/" },
    ]);
  await page.goto("/login");
  await page.locator("input[type=email]").fill("phase2@example.test");
  await change(page, "言語", "English");
  await expect(page.locator("input[type=email]")).toHaveValue(
    "phase2@example.test",
  );
  await page.goto("/forgot-password");
  await page.locator("input[type=email]").fill("restore@example.test");
  await change(page, "Language", "日本語");
  await expect(page.locator("input[type=email]")).toHaveValue(
    "restore@example.test",
  );
  await page.route("**/api/locale", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "SERVICE_UNAVAILABLE" } },
    }),
  );
  await page.getByRole("button", { name: "言語", exact: true }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.locator("p[role=alert]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.unroute("**/api/locale");
  await change(page, "言語", "English");
  await expect(page.locator("p[role=alert]")).toHaveCount(0);
});
test("project search and open form retain original input and server status", async ({
  page, baseURL,
}) => {
  await createProject(page.request, baseURL!);
  await page.goto("/projects");
  await page
    .getByRole("textbox", { name: /Search projects|プロジェクトを検索/ })
    .first()
    .fill("원문");
  const current = await page.locator("html").getAttribute("lang");
  await change(
    page,
    current === "en" ? "Language" : "言語",
    current === "en" ? "日本語" : "English",
  );
  await expect(page.locator("input[type=text]").first()).toHaveValue("원문");
  await expect(page.getByText("원문 프로젝트", { exact: true })).toBeVisible();
  await expect(page.getByText(/Verifying|検証/).first()).toBeVisible();
  await page
    .getByRole("button", { name: /New project|新規プロジェクト/, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const name = dialog.locator("input").first();
  await name.fill("작성 중 원문");
  const dialogLocale = await page.locator("html").getAttribute("lang");
  await dialog
    .getByRole("button", {
      name: dialogLocale === "en" ? "Language" : "言語",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", {
      name: dialogLocale === "en" ? "日本語" : "English",
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    dialogLocale === "en" ? "ja" : "en",
  );
  await expect(name).toHaveValue("작성 중 원문");
});
test("asset prompt, style, generated output and URL survive changing locale without a new job", async ({ page, baseURL }) => {
  const project = await createProject(page.request, baseURL!);
  const session = await createSession(page.request, baseURL!, project.id);
  await assetFixture(page.request, baseURL!, project, session.id);
  await page.goto(`/assets/${session.id}?title=Untrusted&from=%2Fassets`);
  const original = page.url();
  await page.locator("textarea").fill("원문 prompt stays");
  await page
    .getByRole("button", { name: /Flat vector|フラットベクター/, exact: true })
    .click();
  const current = await page.locator("html").getAttribute("lang");
  let jobs = 0;
  page.on("request", (r) => {
    if (/\/api\/.*jobs/.test(r.url()) && r.method() === "POST") jobs++;
  });
  await change(
    page,
    current === "en" ? "Language" : "言語",
    current === "en" ? "日本語" : "English",
  );
  await expect(page.locator("textarea")).toHaveValue("원문 prompt stays");
  expect(page.url()).toBe(original);
  expect(jobs).toBe(0);
  await expect(page.getByRole("img", { name: /Generated images|生成画像/ })).toHaveCount(1);
  await expect(page.getByText("Original session", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Flat vector|フラットベクター/, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
for (const width of [390, 1280])
  test(`landing and application selector are visible and keyboard accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const lang = page.getByRole("button", { name: /^Language$|^言語$/ }).first();
    await expect(lang).toBeInViewport();
    await lang.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    const current = await page.locator("html").getAttribute("lang");
    await change(
      page,
      current === "en" ? "Language" : "言語",
      current === "en" ? "日本語" : "English",
    );
    await page.goto("/projects");
    await expect(
      page.getByRole("button", { name: /^Language$|^言語$/ }).first(),
    ).toBeInViewport();
  });
test("all existing page families render localized UI with no runtime errors", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "claps:projects",
      JSON.stringify([
        {
          id: "fixture-project",
          name: "Original project",
          ip: "Original IP",
          status: "verifying",
          createdAt: "2026.09.23",
        },
      ]),
    ),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .context()
    .addCookies([
      { name: "claps-locale", value: "en", domain: "127.0.0.1", path: "/" },
    ]);
  for (const url of [
    "/",
    "/login",
    "/forgot-password",
    "/profile-setup?email=fixture%40example.test",
    "/projects",
    "/projects/fixture-project",
    "/projects/fixture-project/sessions",
    "/partners",
    "/partners/criteria",
    "/assets",
    "/assets/fixture",
    "/assets/fixture/verify",
    "/assets/fixture/final",
    "/monitoring",
    "/monitoring/fixture",
  ]) {
    await page.goto(url);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("button", { name: "Language", exact: true }).first(),
    ).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain(
      "Text unavailable.",
    );
  }
  expect(errors).toEqual([]);
});
test("profile role uses a stable code and entered values survive switching", async ({
  page,
}) => {
  await page.goto("/profile-setup?email=profile%40example.test");
  await page.locator("#setup-name").fill("Original name");
  await page.locator("#setup-org").fill("원문 회사");
  await page.getByRole("combobox").click();
  await page
    .getByRole("option", { name: /Brand \/ Marketing|ブランド・マーケティング/ })
    .click();
  const current = await page.locator("html").getAttribute("lang");
  await change(
    page,
    current === "en" ? "Language" : "言語",
    current === "en" ? "日本語" : "English",
  );
  await expect(page.locator("#setup-org")).toHaveValue("원문 회사");
  await expect(page.getByRole("combobox")).toContainText(
    /Brand \/ Marketing|ブランド・マーケティング/,
  );
  // Japanese uses split name fields; switching back restores the English name input.
  if (await page.locator("html").getAttribute("lang") === "ja") await change(page, "言語", "English");
  await expect(page.locator("#setup-name")).toHaveValue("Original name");
});
test("partner sorting remains selected while business source content is preserved", async ({
  page,
}) => {
  await page.goto("/partners");
  await page.getByRole("combobox", { name: /Sort|並び替え/ }).selectOption("world");
  const current = await page.locator("html").getAttribute("lang");
  await change(
    page,
    current === "en" ? "Language" : "言語",
    current === "en" ? "日本語" : "English",
  );
  await expect(
    page.getByRole("combobox", { name: /Sort|並び替え/ }),
  ).toHaveValue("world");
});
