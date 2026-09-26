import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { createAccount, cleanupAccounts, fixturePassword } from "../helpers/auth-fixture";
import sharp from "sharp";

test("third file pack deploy → register → publish → activate → disable with preference and file persistence", async ({ page, baseURL }) => {
  test.setTimeout(120000);
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/claps_test") throw new Error("ISOLATED_DB_REQUIRED");
  const pool = new Pool({ connectionString: url });
  let partnerId: string | undefined;
  const keep = process.env.PHASE11_KEEP_RECOVERY_FIXTURE === "1";
  const headers = { Origin: baseURL! }, reason = "Phase 11 isolated extension test";
  const post = async (route: string, data: unknown) => {
    const r = await page.request.post(route, { headers, data });
    expect(r.status(), await r.text()).toBe(200); return (await r.json()).data;
  };
  try {
    const before = (await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations")).rows[0].n;
    const email = await createAccount(page.request, baseURL!);
    await pool.query("UPDATE users SET app_role='admin' WHERE email=$1", [email]);
    await post("/api/admin/reauthenticate", { password: fixturePassword });
    const locale = { nativeName: "English (test)", displayName: "English test pack", direction: "ltr", fallbackCode: "en", enabled: false, sortOrder: 90, reason };
    await post("/api/admin/locales", { ...locale, code: "en-GB" });
    const entries = (await (await page.request.get("/api/admin/locales")).json()).data.items;
    expect(entries.find((e: {code: string}) => e.code === "en-GB")).toMatchObject({ deployed: true, enabled: false });
    // An absent pack is never activatable.
    expect((await page.request.post("/api/admin/locales", { headers, data: { ...locale, code: "it", enabled: true } })).status()).toBe(409);
    const partner = await post("/api/admin/partners", { name: "P11 original", description: "Source", contactEmail: "p11@example.test", visibility: "public", tags: [], ipNames: [], reason });
    partnerId = partner.id;
    const entry = { resourceType: "partner", resourceKey: partnerId, locale: "en-GB", version: 0, sourceRevision: 1, content: { schemaVersion: 1, resourceType: "partner", name: "P11 published translation", description: "Test content" } };
    await post("/api/admin/localized-contents/import-preview", { schemaVersion: 1, entries: [entry], reason });
    await post("/api/admin/localized-contents/import", { schemaVersion: 1, entries: [entry], reason });
    const activate = async (enabled: boolean, version: number) => {
      const r = await page.request.patch("/api/admin/locales/en-GB", { headers, data: { ...locale, enabled, version } });
      expect(r.status(), await r.text()).toBe(200);
    };
    await activate(true, 1);
    const switched = await post("/api/locale", { locale: "en-GB" });
    expect(switched.locale).toBe("en-GB");
    expect(switched.messages["common.unavailable"]).toBe("Test language unavailable");
    expect(switched.messages["errors.NOT_FOUND"]).toBeTruthy();
    await post("/api/auth/forgot-password", { email });
    const { readdir, readFile } = await import("node:fs/promises");
    const mails = await Promise.all((await readdir(process.env.E2E_MAIL_DIR!)).map(async file => JSON.parse(await readFile(`${process.env.E2E_MAIL_DIR}/${file}`, "utf8"))));
    const mail = mails.find(m => m.to === email && m.kind === "reset");
    const template = JSON.parse(await readFile("messages/en-GB/email.json", "utf8"));
    expect(mail).toMatchObject({ locale: "en-GB", subject: template.resetSubject });
    expect(mail.text).toBe(template.resetBody.replace("{url}", mail.url));
    const saved = await page.request.put("/api/me/matching-criteria", { headers, data: { revision: 0, criteria: { ipName: "P11" }, referenceIds: [] } });
    expect(saved.status()).toBe(200);
    const jobResponse = await page.request.post("/api/matches", { headers, data: { revision: 1, outputLocale: "en-GB", idempotencyKey: "p11-locale" } });
    expect(jobResponse.status()).toBe(202);
    const jobId = (await jobResponse.json()).data.jobId;
    expect((await pool.query("SELECT input->>'outputLocale' AS locale FROM jobs WHERE id=$1", [jobId])).rows[0].locale).toBe("en-GB");
    // Keep this test usable with or without an external worker; cancel any outstanding fixture job.
    expect((await page.request.post(`/api/jobs/${jobId}/cancel`, { headers, data: {} })).status()).toBe(200);
    const catalog = async () => (await (await page.request.get(`/api/partners/${partnerId}`, { headers: { "X-Claps-Locale": "en-GB" } })).json()).data;
    expect((await catalog()).name).toBe("P11 original");
    const started = Date.now();
    await post("/api/admin/localized-contents/publish", { ...entry, version: 1, reason });
    await expect.poll(async () => (await catalog()).name, { timeout: 60000 }).toBe("P11 published translation");
    expect(Date.now() - started).toBeLessThan(60000);
    await page.goto("/monitoring/new");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    await page.getByLabel("Record name", { exact: true }).fill("P11 recovery original");
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "blue" } }).png().toBuffer();
    await page.locator('input[type="file"]').setInputFiles({ name: "p11.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Language", exact: true }).click();
    await page.getByRole("menuitem", { name: "한국어", exact: true }).click();
    await expect(page.getByLabel("기록 이름", { exact: true })).toHaveValue("P11 recovery original");
    await post("/api/locale", { locale: "en-GB" }); await page.reload();
    await page.getByLabel("Record name", { exact: true }).fill("P11 recovery original");
    await page.locator('input[type="file"]').setInputFiles({ name: "p11.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Save record", exact: true }).click();
    await expect(page).toHaveURL(/\/monitoring\/(?!new)[a-zA-Z0-9_-]+$/);
    const recordId = page.url().split("/").at(-1)!;
    expect(await (await page.request.get(`/api/monitoring-records/${recordId}/image`)).body()).toEqual(png);
    await page.reload(); await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    expect((await pool.query("SELECT preferences->>'locale' AS locale FROM users WHERE email=$1", [email])).rows[0].locale).toBe("en-GB");
    await activate(false, 2); await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("lang", "en-GB");
    expect((await pool.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations")).rows[0].n).toBe(before);
    if (keep) {
      await activate(true, 3);
      await post("/api/locale", { locale: "en-GB" });
      await page.context().storageState({ path: "/tmp/claps-p11-state.json" });
      const { writeFile, chmod } = await import("node:fs/promises");
      await chmod("/tmp/claps-p11-state.json", 0o600);
      await writeFile("/tmp/claps-p11-fixture.json", JSON.stringify({ partnerId, recordId, png: png.toString("base64") }), { mode: 0o600 });
    }
  } finally {
    if (!keep) {
      if (partnerId) { await pool.query("DELETE FROM localized_contents WHERE resource_key=$1", [partnerId]); await pool.query("DELETE FROM partners WHERE id=$1", [partnerId]); }
      await pool.query("DELETE FROM locales WHERE code='en-GB'");
      await cleanupAccounts();
    }
    await pool.end();
  }
});
