import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("md/evidence-full-process"), origin = "https://claps.arcreation.work";
const state = JSON.parse(await fs.readFile(path.join(root, "private-state.json"), "utf8"));
const seed = JSON.parse(await fs.readFile(path.join(root, "seed-result.json"), "utf8"));
await fs.mkdir(path.join(root, "captures"), { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const records = [], errors = [], checks = [];
let sequence = 0;
const clean = value => value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
async function api(ctx, method, url, data, expected = 200) {
  const r = await ctx.request.fetch(origin + url, { method, headers: { Origin: origin, "X-Claps-Locale": "en" }, ...(data === undefined ? {} : { data }) });
  const body = await r.json().catch(() => null);
  assert.equal(r.status(), expected, `${method} ${url}: ${r.status()} ${body?.error?.code}`); return body?.data;
}
async function context(locale, accountIndex, mobile = false) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: 1, locale, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
  await ctx.addCookies([{ name: "claps-locale", value: locale, url: origin }]);
  if (accountIndex !== undefined) {
    const a = state.accounts[accountIndex]; await api(ctx, "POST", "/api/auth/sign-in", { email: a.email, password: a.password });
    await ctx.addCookies([{ name: "claps-locale", value: locale, url: origin }]);
  }
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push({ kind: "pageerror", message: e.message, at: page.url() }));
  // Expected 4xx/503 responses in negative scenarios are tracked by explicit assertions, not called rendering failures.
  ctx.on("response", r => { if (r.status() >= 500 && !r.url().includes("/api/auth/")) errors.push({ kind: "http5xx", status: r.status(), url: r.url() }); });
  return { ctx, page, locale, mobile, accountIndex };
}
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.complete ? undefined : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 1500); }))));
  await page.waitForTimeout(180);
}
async function snap(session, label, route, options = {}) {
  const { page, locale, mobile } = session; let response;
  try {
    if (route) response = await page.goto(origin + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!options.quick) await settle(page);
    if (options.expand) { await page.locator("details").evaluateAll(nodes => nodes.forEach(n => { n.open = true; })); await page.waitForTimeout(150); }
    const text = await page.locator("body").innerText();
    assert.ok(!/Application error: a (client|server)-side exception/.test(text), "Application exception");
    const filename = `${String(++sequence).padStart(3, "0")}-${locale}-${mobile ? "mobile" : "desktop"}-${clean(label)}.png`;
    await page.screenshot({ path: path.join(root, "captures", filename), fullPage: true, animations: "disabled" });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, language: document.documentElement.lang, title: document.title }));
    records.push({ label, locale, device: mobile ? "mobile" : "desktop", route: new URL(page.url()).pathname + new URL(page.url()).search, file: `captures/${filename}`, status: response?.status() ?? null, ...layout, at: new Date().toISOString() });
    await fs.writeFile(path.join(root, "capture-results.json"), JSON.stringify({ target: origin, records, errors, checks }, null, 2));
    console.log(JSON.stringify({ capture: sequence, locale, label }));
  } catch (e) { errors.push({ kind: "capture", label, locale, route, message: e.message }); console.log(JSON.stringify({ failed: label, locale, message: e.message })); }
}
async function optional(s, name, fn) { try { await fn(); checks.push({ name, ok: true }); } catch (e) { checks.push({ name, ok: false, error: e.message }); } }
try {
  for (const locale of ["en", "ja"]) {
    const s = await context(locale);
    for (const [label, route] of [["landing", "/"], ["login-email-lookup", "/login"], ["sign-in", "/sign-in"], ["sign-up", "/sign-up"], ["verify-email-awaiting", "/verify-email"], ["verify-email-invalid-token", "/verify-email?token=" + "0".repeat(64)], ["forgot-password", "/forgot-password"], ["reset-password-no-token", "/reset-password"], ["reset-password-invalid-token", "/reset-password?token=" + "0".repeat(64)], ["protected-redirect", "/projects"]]) await snap(s, label, route);
    await snap(s, "sign-in-invalid-credentials-form", "/sign-in?email=evidence.v1.01%40example.com");
    await s.page.locator('#password').fill("InvalidEvidencePassword!"); await s.page.locator('button[type=submit]').click(); await s.page.getByRole("alert").waitFor(); await snap(s, "sign-in-invalid-credentials", null);
    await s.ctx.close();
    const memberIndex = locale === "en" ? 0 : 1, f = seed.flows.find(f => f.ownerIndex === memberIndex), m = await context(locale, memberIndex);
    const pages = [["projects", "/projects"], ["project-detail-guide-published", `/projects/${f.project}`], ["project-session-list", `/projects/${f.project}/sessions`], ["asset-session-list", "/assets"], ["generation-adopted-candidates", `/assets/${f.session}`], ["verification-pass-warn-reject", `/assets/${f.session}/verify`], ["final-assets", `/assets/${f.session}/final`], ["evidence-timeline", `/assets/${f.session}/evidence`], ["asset-certificate", `/assets/${f.session}/evidence?asset=${f.pass}`], ["review-checks-and-snapshot", `/assets/${f.session}/review-package?snapshot=${f.snapshot}`], ["export-job-download", `/jobs/${f.zip}`], ["recommendation-results-and-catalog", "/partners"], ["recommendation-criteria-reference", "/partners/criteria"], ["monitoring-records", "/monitoring"], ["monitoring-new-upload", "/monitoring/new"], ["change-password", "/change-password"]];
    for (const [label, route] of pages) await snap(m, label, route, { expand: label.includes("verification") });
    await optional(m, `review-print-${locale}`, async () => { await m.page.goto(origin + `/assets/${f.session}/review-package?snapshot=${f.snapshot}`); await settle(m.page); await m.page.emulateMedia({ media: "print" }); await snap(m, "review-print-layout", null); await m.page.pdf({ path: path.join(root, `review-package-${locale}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true }); await m.page.emulateMedia({ media: "screen" }); });
    for (const scenario of ["results", "empty", "partial", "error", "unscanned", "archived"]) { const r = seed.steps[`monitor-${memberIndex}-${scenario}`]; await snap(m, `monitoring-${scenario}`, `/monitoring/${r.id}`, { expand: true }); }
    const retry = seed.steps["failed-retry-cancel"]; if (memberIndex === 0) for (const status of ["failed", "retry", "canceled"]) await snap(m, `generation-job-${status}`, `/jobs/${retry[status]}`);
    if (memberIndex === 0) { const stale = seed.steps["stale-guide-scenario"]; await snap(m, "verification-stale-guide-v2", `/assets/${stale.session}/verify`, { expand: true }); await snap(m, "review-not-ready-stale", `/assets/${stale.session}/review-package`); }
    await optional(m, `new-project-dialog-${locale}`, async () => { await m.page.goto(origin + "/projects"); await settle(m.page); const text = locale === "ja" ? /新規プロジェクト|プロジェクトを作成|プロジェクト作成/ : /New project|Create project/i; await m.page.getByRole("button", { name: text }).first().click(); await m.page.getByRole("dialog").waitFor(); await snap(m, "new-project-dialog", null); });
    await optional(m, `project-edit-dialog-${locale}`, async () => { await m.page.goto(origin + `/projects/${f.project}`); await settle(m.page); await m.page.getByRole("button", { name: locale === "ja" ? /編集|名前変更/ : /Rename|Edit/i }).first().click(); await m.page.getByRole("dialog").waitFor(); await snap(m, "project-edit-dialog", null); });
    await optional(m, `partner-details-dialog-${locale}`, async () => { await m.page.goto(origin + "/partners"); await m.page.getByTestId("match-hero").waitFor(); await m.page.getByTestId("match-hero").getByRole("button").click(); await m.page.getByRole("dialog").waitFor(); await snap(m, "partner-detail-dialog", null); });
    await optional(m, `my-account-dialog-${locale}`, async () => { await m.page.goto(origin + "/projects"); await settle(m.page); await m.page.locator('aside button[data-slot="dropdown-menu-trigger"]').click(); await m.page.getByRole("menuitem", { name: locale === "ja" ? /マイ|アカウント/ : /My account/i }).click(); await m.page.getByRole("dialog").waitFor(); await snap(m, "my-account-dialog", null); });
    await optional(m, `project-search-no-results-${locale}`, async () => { await m.page.goto(origin + "/projects"); await settle(m.page); await m.page.locator('input').first().fill("NO_SUCH_EVIDENCE_PROJECT"); await m.page.waitForTimeout(500); await snap(m, "project-search-no-results", null); });
    // Same owner negative HTTP contracts on the publicly deployed server.
    await optional(m, `HTTP-contracts-${locale}`, async () => { await api(m.ctx, "GET", `/api/projects/${f.project}`); await api(m.ctx, "PATCH", `/api/projects/${f.project}`, { version: 0, name: "invalid" }, 400); await api(m.ctx, "GET", `/api/assets/${f.pass}/certificate`); await api(m.ctx, "GET", `/api/asset-sessions/${f.session}/review-package/snapshots/${f.snapshot}`); });
    await m.ctx.close();
    const empty = await context(locale, locale === "en" ? 2 : 3);
    for (const route of ["/projects", "/assets", "/partners", "/monitoring"]) await snap(empty, "empty-" + clean(route), route);
    await snap(empty, "other-owner-project-not-found", `/projects/${f.project}`);
    await optional(empty, `cross-owner-api-${locale}`, async () => { await api(empty.ctx, "GET", `/api/projects/${f.project}`, undefined, 404); await api(empty.ctx, "GET", `/api/assets/${f.pass}/certificate`, undefined, 404); });
    await empty.ctx.close();
    const mobile = await context(locale, memberIndex, true);
    for (const [label, route] of pages.filter(([label]) => !label.includes("password"))) await snap(mobile, label, route, { expand: label.includes("verification") });
    await snap(mobile, "monitoring-result-factors", `/monitoring/${seed.steps[`monitor-${memberIndex}-results`].id}`, { expand: true });
    await mobile.ctx.close();
  }
  const pending = await context("ja", 7); await snap(pending, "profile-setup-japanese", "/profile-setup"); await pending.ctx.close();
  const anonymous = await context("en");
  for (const i of [8, 9]) {
    const a = state.accounts[i]; await anonymous.page.goto(origin + `/sign-in?email=${encodeURIComponent(a.email)}`); await anonymous.page.locator('#password').fill(a.password); await anonymous.page.locator('button[type=submit]').click(); await anonymous.page.getByRole('alert').waitFor(); await snap(anonymous, i === 8 ? "unverified-login-denied" : "suspended-login-denied", null);
  }
  await anonymous.ctx.close();
  const adminIndex = 6, f = seed.flows[0], monitor = seed.steps["monitor-0-results"];
  for (const locale of ["ko", "en", "ja"]) {
    const s = await context("en", adminIndex); s.locale = locale;
    await api(s.ctx, "POST", "/api/locale", { locale, scope: "admin" });
    await snap(s, "admin-reauth-required", "/admin");
    await api(s.ctx, "POST", "/api/admin/reauthenticate", { password: state.accounts[adminIndex].password });
    const routes = [["overview", "/admin"], ...["users", "projects", "partners", "jobs", "monitoring", "audit-logs", "locales"].map(x => [x, "/admin/" + x]), ["user-detail", `/admin/users/${state.accounts[0].id}`], ["project-detail", `/admin/projects/${f.project}`], ["project-guides", `/admin/projects/${f.project}?tab=guides`], ["project-assets", `/admin/projects/${f.project}?tab=assets`], ["project-jobs", `/admin/projects/${f.project}?tab=jobs`], ["project-history", `/admin/projects/${f.project}?tab=history`], ["partner-detail", `/admin/partners/${seed.partners[0]}`], ["partner-images", `/admin/partners/${seed.partners[0]}?tab=images`], ["partner-translations", `/admin/partners/${seed.partners[0]}?tab=translations`], ["partner-new", "/admin/partners/new"], ["job-detail", `/admin/jobs/${f.zip}`], ["monitoring-detail", `/admin/monitoring/${monitor.id}`], ["monitoring-scans", `/admin/monitoring/${monitor.id}?tab=scans`], ["user-history", `/admin/users/${state.accounts[0].id}?tab=history`]];
    for (const [label, route] of routes) await snap(s, "admin-" + label, route, { expand: label.includes("scans") });
    await optional(s, `admin-locale-separation-${locale}`, async () => { await s.page.goto(origin + "/projects"); assert.equal(await s.page.locator('html').getAttribute('lang'), "en"); await s.page.goto(origin + "/admin"); assert.equal(await s.page.locator('html').getAttribute('lang'), locale); });
    await s.ctx.close();
  }
  const mobileAdmin = await context("en", adminIndex, true); await api(mobileAdmin.ctx, "POST", "/api/admin/reauthenticate", { password: state.accounts[adminIndex].password });
  for (const route of ["/admin", "/admin/users", `/admin/projects/${f.project}?tab=guides`, "/admin/jobs", "/admin/locales"]) await snap(mobileAdmin, "admin-" + clean(route), route);
  await mobileAdmin.ctx.close();
} finally {
  await browser.close();
  await fs.writeFile(path.join(root, "capture-results.json"), JSON.stringify({ target: origin, records, errors, checks }, null, 2));
  console.log(JSON.stringify({ completed: records.length, renderErrors: errors.length, checksPassed: checks.filter(c => c.ok).length, checksFailed: checks.filter(c => !c.ok).length }));
}
