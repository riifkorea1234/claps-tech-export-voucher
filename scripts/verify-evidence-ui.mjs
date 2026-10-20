import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("md/evidence-full-process"), origin = "https://claps.arcreation.work";
const state = JSON.parse(await fs.readFile(path.join(root, "private-state.json"), "utf8"));
const seed = JSON.parse(await fs.readFile(path.join(root, "seed-result.json"), "utf8"));
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const report = { target: origin, scenarios: [], captures: [], checks: [], errors: [] }; let seq = 0;
async function persist() { await fs.writeFile(path.join(root, "ui-flow-results.json"), JSON.stringify(report, null, 2)); }
async function api(ctx, method, url, data, status = 200) { const res = await ctx.request.fetch(origin + url, { method, headers: { Origin: origin }, ...(data === undefined ? {} : { data }) }); const body = await res.json(); assert.equal(res.status(), status, `${url}: ${res.status()} ${body?.error?.code}`); return body.data; }
async function poll(ctx, job) { for (let i = 0; i < 80; i++) { const j = await api(ctx, "GET", `/api/jobs/${job}`); if (["succeeded", "failed", "canceled"].includes(j.status)) { assert.equal(j.status, "succeeded", j.errorCode); return j; } await new Promise(r => setTimeout(r, 250)); } throw Error("Job timed out"); }
async function capture(page, locale, label, expand = false) {
  console.log(JSON.stringify({ stage: "capture-start", label, locale }));
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]));
  if (expand) await page.locator('details').evaluateAll(n => n.forEach(d => d.open = true));
  const file = `captures/flow-${String(++seq).padStart(3, "0")}-${locale}-${label}.png`; await page.screenshot({ path: path.join(root, file), fullPage: true, animations: "disabled" });
  report.captures.push({ label, locale, device: "desktop", file, route: new URL(page.url()).pathname, at: new Date().toISOString() }); await persist(); console.log(JSON.stringify({ capture: label, locale }));
}
async function responseAction(page, predicate, action) {
  const next = page.waitForResponse(r => predicate(r.url(), r.request().method()), { timeout: 15000 }).then(response => ({response}), error => ({error}));
  await action(); const received = await next; if(received.error) throw received.error;
  const response=received.response; console.log(JSON.stringify({stage:'response',url:new URL(response.url()).pathname,status:response.status()}));
  const result=await Promise.race([response.json(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Browser response body exceeded 15 seconds')),15000))]);
  assert.ok(response.ok(),JSON.stringify(result)); return result.data;
}

try {
  for (const locale of ["en", "ja"]) {
    const i = locale === "en" ? 0 : 1, a = state.accounts[i], ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale, reducedMotion: "reduce" });
    await api(ctx, "POST", "/api/auth/sign-in", { email: a.email, password: a.password }); await ctx.addCookies([{ name: "claps-locale", value: locale, url: origin }]);
    ctx.setDefaultTimeout(15000); ctx.setDefaultNavigationTimeout(30000);
    const page = await ctx.newPage(); console.log(JSON.stringify({ stage: "logged-in", locale })); page.on('pageerror', e => report.errors.push(e.message));
    const p = await api(ctx, "POST", "/api/projects", { name: `SAMPLE browser workflow ${locale}`, ip: "SAMPLE Mint Friends", description: "Created through public HTTP, then exercised by real browser clicks." }, 201);
    console.log(JSON.stringify({ stage: "project-created", id: p.id })); await page.goto(origin + `/projects/${p.id}`);
    const panel = page.getByTestId("evidence-sample-panel"); await panel.waitFor();
    console.log(JSON.stringify({ stage: "upload-start", locale }));
    const uploadedResponse = page.waitForResponse(r => r.url().includes('/api/evidence-sample?project=') && r.request().method() === 'POST', { timeout: 15000 });
    await panel.locator('input[type=file]').setInputFiles(path.join(root, 'sample-guide.pdf'));
    const uploaded = await uploadedResponse; assert.ok(uploaded.ok(), `PDF upload ${uploaded.status()}`);
    const guideList = await api(ctx, 'GET', `/api/evidence-sample?project=${p.id}`); const g = guideList[0]; assert.ok(g?.id);
    console.log(JSON.stringify({ stage: "upload-complete", locale, id: g.id })); await capture(page, locale, "guide-uploaded");
    const extraction = await responseAction(page, (url, method) => url.endsWith('/api/evidence-sample') && method === 'POST', () => panel.getByRole('button', { name: locale === 'en' ? 'Extract sample rules' : 'サンプル規則抽出' }).click());
    await poll(ctx, extraction.id); await page.reload(); await capture(page, locale, "guide-extracted-draft");
    await responseAction(page, (url, method) => url.endsWith('/api/evidence-sample') && method === 'POST', () => panel.getByRole('button', { name: locale === 'en' ? 'Publish and activate' : '公開して有効化' }).click());
    await capture(page, locale, "guide-published");
    const s = await api(ctx, "POST", "/api/asset-sessions", { title: `SAMPLE browser session ${locale}`, projectId: p.id }, 201);
    await page.goto(origin + `/assets/${s.id}`); await page.getByTestId("evidence-sample-panel").waitFor();
    await page.getByLabel('Sample prompt').fill('SAMPLE browser click workflow / mint character');
    const generation = await responseAction(page, (url, method) => url.endsWith('/api/evidence-sample') && method === 'POST', () => page.getByRole('button', { name: locale === 'en' ? 'Generate sample images' : 'サンプル画像を生成' }).click());
    // Capture the actual queued/running UI without waiting for network idle to let it finish.
    const runningFile = `captures/flow-${String(++seq).padStart(3, '0')}-${locale}-generation-submitted.png`; await page.screenshot({ path: path.join(root, runningFile), fullPage: true }); report.captures.push({ label: 'generation-submitted', locale, device: 'desktop', file: runningFile, route: `/assets/${s.id}`, at: new Date().toISOString() });
    await poll(ctx, generation.id); await page.reload(); await capture(page, locale, "generation-succeeded");
    const adoptionName = locale === 'en' ? 'Adopt' : '採用';
    for (let n = 0; n < 3; n++) await responseAction(page, (url, method) => /\/api\/assets\/[^/]+$/.test(new URL(url).pathname) && method === 'PATCH', () => page.getByRole('button', { name: adoptionName, exact: true }).nth(n).click());
    await page.goto(origin + `/assets/${s.id}/verify`);
    const verification = await responseAction(page, (url, method) => url.endsWith(`/api/asset-sessions/${s.id}/verifications`) && method === 'POST', () => page.getByRole('button', { name: locale === 'en' ? 'Run sample verification' : 'サンプル検証を実行' }).click());
    await poll(ctx, verification.jobId); await page.reload(); await capture(page, locale, "verification-three-verdicts", true);
    const list = await api(ctx, 'GET', `/api/asset-sessions/${s.id}/assets`), views = await Promise.all(list.map(asset => api(ctx, 'GET', `/api/assets/${asset.id}/verification`))); const eligible = list.filter((_, index) => views[index].canFinalize); assert.equal(eligible.length, 1);
    const finalName = locale === 'en' ? 'Finalize' : '最終';
    const candidates = page.getByRole('button', { name: locale === 'en' ? /^Finalize$/ : /最終確定/ });
    let clicked = false; for (let n = 0; n < await candidates.count(); n++) if (await candidates.nth(n).isEnabled()) { await responseAction(page, (url, method) => url.endsWith('/finalization') && method === 'PUT', () => candidates.nth(n).click()); clicked = true; break; } assert.equal(clicked, true, finalName);
    await page.goto(origin + `/assets/${s.id}/final`); await page.locator('input[type=checkbox]').first().check();
    const exp = await responseAction(page, (url, method) => url.endsWith('/api/exports') && method === 'POST', () => page.getByRole('button', { name: locale === 'en' ? /Create selected ZIP/ : /ZIP/ }).first().click()); await poll(ctx, exp.jobId); await capture(page, locale, "final-selected-zip");
    await page.goto(origin + `/assets/${s.id}/review-package`); await page.locator('section[data-testid=automatic-checks]').waitFor();
    for (let n = 0; n < 3; n++) { await responseAction(page, (url, method) => url.endsWith('/review-checks') && method === 'PATCH', () => page.locator('input[type=checkbox]').nth(n).click()); await page.waitForFunction(index => document.querySelectorAll('input[type=checkbox]')[index]?.checked, n); }
    const issued = await responseAction(page, (url, method) => url.endsWith('/review-package') && method === 'POST', () => page.getByRole('button', { name: locale === 'en' ? /Issue snapshot/ : /資料を発行/ }).first().click());
    await capture(page, locale, "review-issued");
    await page.goto(origin + '/monitoring/new'); await page.locator('input[type=file]').setInputFiles(path.join(root, 'sample-reference.png')); await page.locator('form input:not([type=file])').fill(`SAMPLE browser monitoring ${locale}`);
    const record = await responseAction(page, (url, method) => new URL(url).pathname === '/api/monitoring-records' && method === 'POST', () => page.locator('form button[type=submit],form button:not([type])').last().click()); await page.waitForURL(`**/monitoring/${record.id}`); await capture(page, locale, "monitoring-upload-created");
    const scan = await responseAction(page, (url, method) => url.endsWith('/scans') && method === 'POST', () => page.getByRole('button', { name: locale === 'en' ? /Start scan|Run search|Search/ : /検知を開始/ }).last().click()); await poll(ctx, scan.jobId); await page.reload(); await capture(page, locale, "monitoring-scan-results", true);
    await api(ctx, 'PATCH', `/api/projects/${p.id}`, { version: 0, name: 'invalid' }, 422);
    report.checks.push({ name: `public HTTP invalid input status ${locale}`, ok: true, actual: 422, correction: 'The first capture harness expected 400; product contract is 422.' });
    report.scenarios.push({ locale, status: 'passed', project: p.id, session: s.id, guide: g.id, generation: generation.id, verification: verification.jobId, finalAsset: eligible[0].id, export: exp.jobId, snapshot: issued.id, monitoring: record.id, scan: scan.jobId });
    await ctx.close(); await persist();
  }
} catch (e) { report.errors.push(e.stack || e.message); await persist(); throw e; }
finally { await browser.close(); await persist(); }
