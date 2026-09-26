import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
import { assetFixture } from "../helpers/workspace-fixture";
const exec = promisify(execFile);
function testPool() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/claps_test") throw new Error("ISOLATED_TEST_DB_REQUIRED");
  return new Pool({ connectionString: url });
}
test.afterAll(async () => { await cleanupAccounts(); });
test("production server blocks fake verification and supports final → ZIP → cancel in ko/en", async ({ page, baseURL, browser }) => {
  test.setTimeout(180000);
  await createAccount(page.request, baseURL!);
  const headers = { Origin: baseURL! };
  await page.request.post("/api/locale", { headers, data: { locale: "en" } });
  const p = (await (await page.request.post("/api/projects", { headers, data: { name: "Phase 8 browser" } })).json()).data;
  const s = (await (await page.request.post("/api/asset-sessions", { headers, data: { title: "Phase 8 session", projectId: p.id } })).json()).data;
  const aid = await assetFixture(page.request, baseURL!, p, s.id);
  await page.request.patch(`/api/assets/${aid}`, { headers, data: { version: 1, adopted: true } });
  expect((await page.request.put(`/api/assets/${aid}/finalization`, { headers, data: { version: 2 } })).status()).toBe(409);
  expect((await page.request.put(`/api/assets/${aid}/finalization`, { headers: { Origin: "https://invalid.test" }, data: { version: 2 } })).status()).toBe(403);
  expect((await page.request.post(`/api/asset-sessions/${s.id}/verifications`, { headers, data: { assetIds: [aid], guideId: "unavailable", outputLocale: "en", idempotencyKey: "not-configured" } })).status()).toBe(503);
  await page.goto(`/assets/${s.id}/verify`);
  await expect(page.getByText("Not verified", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalize", exact: true })).toBeDisabled();
  // Direct DB synthetic evidence only: no public test adapter, no paid provider call.
  const pool = testPool(), guide = randomUUID(), job = randomUUID();
  try {
    const a = (await pool.query("SELECT a.*,s.owner_id FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE a.id=$1", [aid])).rows[0];
    const rules = { schemaVersion: 1, rules: [{ ruleId: "one", title: "Color", description: "Synthetic", condition: { field: "color", operator: "equals", value: "pink" }, evidence: { page: 1, excerpt: "Pink" } }] };
    const verification = { schemaVersion: 1, verdict: "pass", ruleResults: [{ ruleId: "one", verdict: "pass", reason: "Synthetic test result", evidence: "Synthetic pink image" }], guideId: guide, guideVersion: 1, jobId: job, engineVersion: "browser-fixture", checkedAt: new Date().toISOString() };
    await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules,status) VALUES($1,$2,1,$3,$4,'published')", [guide, p.id, a.file, rules]);
    await pool.query("UPDATE projects SET active_guide_id=$2 WHERE id=$1", [p.id, guide]);
    const input = { schemaVersion: 1, kind: "verification", assetIds: [aid], guideId: guide, outputLocale: "en", snapshot: { sessionId: s.id, guideVersion: 1, rules, assets: [{ id: aid, version: 2 }] } };
    const output = { schemaVersion: 1, kind: "verification", assetIds: [aid], results: [{ assetId: aid, verification }] };
    await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,output,request_hash,finished_at) VALUES($1,$2,$3,'verification','succeeded',$4,$5,$6,now())", [job, a.owner_id, p.id, input, output, "e".repeat(64)]);
    await pool.query("UPDATE assets SET verification_job_id=$2,verification=$3,version=3 WHERE id=$1", [aid, job, verification]);
    await page.reload(); await expect(page.getByRole("button", { name: "Finalize", exact: true })).toBeEnabled();
    await page.getByText("Rule evidence", { exact: true }).click(); await expect(page.getByText("Synthetic pink image", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finalize", exact: true }).click(); await expect(page.getByRole("button", { name: "Cancel finalization", exact: true })).toBeVisible();
    await page.goto(`/assets/${s.id}/final`); await expect(page.getByRole("checkbox", { name: "Include in ZIP" })).toBeVisible();
    const single = page.waitForEvent("download"); await page.getByRole("button", { name: "Download", exact: true }).click(); expect((await single).suggestedFilename()).toMatch(/\.png$/);
    await page.getByRole("checkbox", { name: "Include in ZIP" }).check(); await page.getByRole("button", { name: "Create selected ZIP (1/50)", exact: true }).click();
    const link = page.getByRole("link", { name: "View export status" }); await expect(link).toBeVisible(); const url = await link.getAttribute("href");
    if (process.env.E2E_EXTERNAL_WORKER !== "1") await exec(process.execPath, ["--conditions=react-server", "--import", "tsx", resolve("tests/helpers/phase8-worker.ts")], { env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, APP_ORIGIN: baseURL }, timeout: 90000 });
    await link.click(); await expect(page.getByRole("button", { name: "Download ZIP", exact: true })).toBeVisible();
    const zip = page.waitForEvent("download"); await page.getByRole("button", { name: "Download ZIP", exact: true }).click(); expect((await zip).suggestedFilename()).toMatch(/\.zip$/);
    const other = await browser.newContext(); await createAccount(other.request, baseURL!);
    expect((await other.request.get(`/api/exports/${url!.split("/").at(-1)}`)).status()).toBe(404); await other.close();
    await page.request.post("/api/locale", { headers, data: { locale: "ko" } });
    await page.goto(`/assets/${s.id}/final`); await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "최종 확정 취소", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "md/evidence/phase8/final-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "최종 확정 취소", exact: true }).click(); await expect(page.getByRole("checkbox")).toHaveCount(0);
    expect((await page.request.get(`/api/exports/${url!.split("/").at(-1)}`)).status()).toBe(409);
    await page.goto(`/projects/${p.id}`); expect((await (await page.request.get(`/api/projects/${p.id}/library`)).json()).data).toHaveLength(0);
  } finally {
    // Remove synthetic guide dependencies before the shared account cleanup.
    await pool.query("UPDATE projects SET active_guide_id=NULL WHERE id=$1", [p.id]);
    await pool.query("UPDATE assets SET finalized_guide_id=NULL WHERE id=$1", [aid]);
    await pool.query("DELETE FROM brand_guides WHERE id=$1", [guide]); await pool.end();
  }
});
