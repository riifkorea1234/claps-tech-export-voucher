import { expect, test } from "@playwright/test";
import { createAccount, cleanupAccounts, fixtureEmail, fixturePassword, mailToken, post } from "../helpers/auth-fixture";
test.afterAll(cleanupAccounts);
test("email-first signup, eight-character password, verification, profile, password change and logout", async ({ page, baseURL }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const email = fixtureEmail();
  await page.goto("/login"); await page.locator("#email").fill(email); await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/sign-up\?/);
  await page.locator("#password").fill(fixturePassword); await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await page.goto(`/verify-email?token=${await mailToken(email, "verify")}`);
  await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/profile-setup$/);
  // URL identity is ignored by the server.
  await page.goto("/profile-setup?email=attacker%40example.test");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.locator("#setup-name").fill("Real profile"); await page.locator("#setup-org").fill("Fixture org");
  await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/projects$/);
  expect((await (await page.request.get("/api/me")).json()).data.email).toBe(email);
  await page.goto("/change-password"); await page.locator("#current-password").fill(fixturePassword); await page.locator("#password").fill("changed8");
  await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page.locator("#email").fill(email); await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/sign-in\?/);
  await page.locator("#password").fill(fixturePassword); await page.locator('button[type=submit]').click(); await expect(page.locator('p[role=alert]')).toBeVisible();
  await page.locator("#password").fill("changed8"); await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("button", { name: /Real profile/ }).click(); await page.getByRole("menuitem", { name: /로그아웃|Log out/ }).click();
  await expect(page).toHaveURL(baseURL! + "/"); expect((await page.request.get("/api/me")).status()).toBe(401); expect(errors).toEqual([]);
});
test("recovery UI resets password, rejects reuse and invalidates another browser session", async ({ page, browser, baseURL }) => {
  const email = await createAccount(page.request, baseURL!);
  const second = await browser.newContext(); const r = second.request;
  expect((await r.post(baseURL + "/api/auth/sign-in", { headers: { Origin: baseURL! }, data: { email, password: fixturePassword } })).status()).toBe(200);
  await page.goto("/forgot-password"); await page.locator("#email").fill(email); await page.locator('button[type=submit]').click(); await expect(page.locator('p[role=status]')).toBeVisible();
  const token = await mailToken(email, "reset"); await page.goto(`/reset-password?token=${token}`); await page.locator("#password").fill("reset888"); await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/login$/);
  expect((await r.get(baseURL + "/api/me")).status()).toBe(401);
  expect((await post(page.request, baseURL!, "reset-password", { token, password: "other888" })).status()).toBe(422);
  expect((await post(page.request, baseURL!, "sign-in", { email, password: "reset888" })).status()).toBe(200);
  await second.close();
});
test("URL/localStorage/social bypasses and malformed, cross-origin or privilege-escalating requests are rejected", async ({ page, baseURL }) => {
  await page.addInitScript(() => { localStorage.setItem("claps:current-email", "forged@example.test"); localStorage.setItem("claps:accounts", JSON.stringify({ "forged@example.test": { email: "forged@example.test", name: "Forged" } })); });
  for (const path of ["/projects", "/assets/fixture", "/profile-setup?email=forged@example.test"]) { await page.goto(path); await expect(page).toHaveURL(/\/login$/); }
  await expect(page.getByRole("button", { name: /Google/ })).toBeDisabled(); await expect(page.getByRole("button", { name: /Kakao|카카오/ })).toBeDisabled();
  expect((await page.request.get("/api/admin/access")).status()).toBe(401);
  expect((await page.request.post("/api/auth/lookup", { data: { email: fixtureEmail() } })).status()).toBe(403);
  expect((await page.request.post("/api/auth/lookup", { headers: { Origin: "https://evil.example" }, data: { email: fixtureEmail() } })).status()).toBe(403);
  expect((await post(page.request, baseURL!, "sign-up", { email: fixtureEmail(), password: "1234567" })).status()).toBe(422);
  expect((await post(page.request, baseURL!, "sign-up", { email: fixtureEmail(), password: fixturePassword, appRole: "admin" })).status()).toBe(422);
  await createAccount(page.request, baseURL!);
  expect((await page.request.get("/api/admin/access")).status()).toBe(403);
  expect((await page.request.patch("/api/me", { headers: { Origin: baseURL! }, data: { name: "X", org: "Y", appRole: "admin" } })).status()).toBe(422);
  expect((await page.request.delete("/api/me", { headers: { Origin: "https://evil.example" }, data: {} })).status()).toBe(403);
  const me = await page.request.get("/api/me"); const body = await me.json(); expect(body.data).not.toHaveProperty("password"); expect(body.data).not.toHaveProperty("token");
});
test("account language follows A/B across sessions; persistence errors leave the selected language unchanged", async ({ page, baseURL }) => {
  const a = await createAccount(page.request, baseURL!);
  expect((await page.request.patch("/api/me/preferences", { headers: { Origin: baseURL! }, data: { locale: "en" } })).status()).toBe(200);
  await post(page.request, baseURL!, "sign-out", {});
  const b = await createAccount(page.request, baseURL!);
  expect((await page.request.patch("/api/me/preferences", { headers: { Origin: baseURL! }, data: { locale: "ko" } })).status()).toBe(200);
  await post(page.request, baseURL!, "sign-out", {});
  await post(page.request, baseURL!, "sign-in", { email: a, password: fixturePassword }); await page.goto("/projects"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.route("**/api/locale", route => route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE" } } }));
  await page.getByRole("button", { name: "Language", exact: true }).click(); await page.getByRole("menuitem", { name: "한국어" }).click();
  await expect(page.locator('p[role=alert]')).toBeVisible(); await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.unroute("**/api/locale");
  await page.getByRole("button", { name: "Language", exact: true }).click(); await page.getByRole("menuitem", { name: "한국어" }).click(); await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  expect((await (await page.request.get("/api/me")).json()).data.locale).toBe("ko");
  await post(page.request, baseURL!, "sign-out", {}); await post(page.request, baseURL!, "sign-in", { email: b, password: fixturePassword }); await page.reload(); await expect(page.locator("html")).toHaveAttribute("lang", "ko");
});
test("profile pending cannot enter app and mobile account withdrawal blocks all previous sessions", async ({ page, browser, baseURL }) => {
  const email = await createAccount(page.request, baseURL!, false);
  await page.goto("/projects"); await expect(page).toHaveURL(/\/profile-setup$/);
  await page.locator("#setup-name").fill("Mobile fixture"); await page.locator("#setup-org").fill("Company"); await page.locator('button[type=submit]').click(); await expect(page).toHaveURL(/\/projects$/);
  const other = await browser.newContext(); await other.request.post(baseURL + "/api/auth/sign-in", { headers: { Origin: baseURL! }, data: { email, password: fixturePassword } });
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: /메뉴|Menu/, exact: true }).click(); await page.getByRole("menuitem", { name: /마이페이지|내 계정|My account/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /탈퇴하기|Delete my account/, exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /탈퇴|Delete/ }).click();
  await expect(page).toHaveURL(baseURL! + "/");
  expect((await other.request.get(baseURL + "/api/me")).status()).toBe(401);
  expect((await post(page.request, baseURL!, "sign-in", { email, password: fixturePassword })).status()).toBe(401);
  await other.close();
});
test("lookup is rate limited and never issues a session cookie", async ({ request, baseURL }) => {
  const email = fixtureEmail();
  for (let i = 0; i < 10; i++) { const r = await post(request, baseURL!, "lookup", { email }); expect(r.status()).toBe(200); expect(r.headers()["set-cookie"]).toBeUndefined(); expect(await r.json()).toEqual({ data: { nextStep: "sign-up" } }); }
  expect((await post(request, baseURL!, "lookup", { email })).status()).toBe(429);
});
