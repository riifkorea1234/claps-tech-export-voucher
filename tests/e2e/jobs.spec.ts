import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
let email: string;
async function fixture(status = "queued") {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/claps_test") throw new Error("Isolated test DB required");
  const pool = new Pool({ connectionString: url }), id = randomUUID();
  try {
    const { rows: [u] } = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    await pool.query("INSERT INTO jobs(id,owner_id,kind,status,input,request_hash,next_run_at) VALUES($1,$2,'matching',$3,$4,$5,now()+interval '1 day')", [id, u.id, status, { schemaVersion: 1, kind: "matching", outputLocale: "ko", preferences: { schemaVersion: 1 } }, "a".repeat(64)]);
  } finally { await pool.end(); } return id;
}
async function complete(id: string) {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try { await pool.query("UPDATE jobs SET status='succeeded',finished_at=now(),output=$2 WHERE id=$1", [id, { schemaVersion: 1, kind: "matching", partnerIds: [] }]); } finally { await pool.end(); }
}
test.beforeEach(async ({ page, baseURL }) => {
  email = await createAccount(page.request, baseURL!);
  await page.request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "en" } });
});
test.afterAll(cleanupAccounts);
test("restores real job status on reload, polls completion, and recovers transient polling errors", async ({ page }) => {
  const id = await fixture(); await page.goto(`/jobs/${id}`); await expect(page.getByRole("status")).toHaveText("Queued"); await page.reload(); await expect(page.getByRole("status")).toHaveText("Queued");
  await page.route(`**/api/jobs/${id}`, route => route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable", requestId: "synthetic" } } }));
  await expect(page.getByRole("region", { name: "Job status" }).getByRole("alert")).toBeVisible(); await expect(page.getByRole("status")).toHaveText("Queued");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await complete(id); await page.unroute(`**/api/jobs/${id}`);
  await expect(page.getByRole("status")).toHaveText("Completed", { timeout: 10000 }); await expect(page.getByRole("region", { name: "Job status" }).getByRole("alert")).toHaveCount(0); await expect(page.getByRole("button", { name: "Cancel job", exact: true })).toHaveCount(0);
});
test("distinguishes cancellation requests from canceled and uses ko/en labels", async ({ page, baseURL }) => {
  const id = await fixture("running"); await page.goto(`/jobs/${id}`); await expect(page.getByRole("status")).toHaveText("Running");
  await page.getByRole("button", { name: "Cancel job", exact: true }).click(); await expect(page.getByText("Cancellation requested. Waiting for the job to stop.")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Running"); await page.reload(); await expect(page.getByText("Cancellation requested. Waiting for the job to stop.")).toBeVisible();
  const next = await fixture(); await page.goto(`/jobs/${next}`); await page.getByRole("button", { name: "Cancel job", exact: true }).click(); await expect(page.getByRole("status")).toHaveText("Canceled");
  await page.request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "ko" } }); await page.reload(); await expect(page.getByRole("status")).toHaveText("취소됨");
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: "md/evidence/phase5/job-mobile.png", fullPage: true });
});
test("forces job ownership, origin and strict mutation DTO at real HTTP boundaries", async ({ page, browser, baseURL }) => {
  const id = await fixture(); const other = await browser.newContext(); await createAccount(other.request, baseURL!);
  expect((await other.request.get(`/api/jobs/${id}`)).status()).toBe(404);
  expect((await other.request.post(`/api/jobs/${id}/cancel`, { headers: { Origin: baseURL! }, data: {} })).status()).toBe(404);
  expect((await page.request.post(`/api/jobs/${id}/cancel`, { headers: { Origin: "https://example.invalid" }, data: {} })).status()).toBe(403);
  expect((await page.request.post(`/api/jobs/${id}/cancel`, { headers: { Origin: baseURL! }, data: { status: "succeeded" } })).status()).toBe(422);
  expect((await page.request.get(`/api/jobs/${id}`)).headers()["cache-control"]).toContain("no-store");
  await other.close();
});
