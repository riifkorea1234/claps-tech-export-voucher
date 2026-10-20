/** Explicit production evidence provisioning. Never imports isolated test fixtures. */
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, chmod, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import type { JobDto } from "../lib/contracts/jobs";
import { createDatabase } from "../lib/server/db";
import { AuthService, type AuthUser } from "../lib/server/auth/service";
import { WorkspaceService } from "../lib/server/projects/service";
import { StorageService } from "../lib/server/storage/service";
import { EvidenceSampleService } from "../lib/server/evidence-sample/service";
import { sampleImage, sampleRules, SAMPLE_PROVIDER } from "../lib/server/evidence-sample/handlers";
import { productionHandlers } from "../lib/server/adapters/registry";
import { JobService } from "../lib/server/jobs/service";
import { JobQueue } from "../lib/server/jobs/queue";
import { runClaimedJob } from "../lib/server/jobs/runner";
import { developmentQueuePolicy } from "../lib/server/jobs/policy";
import { VerificationService } from "../lib/server/verifications/service";
import { FinalizationService } from "../lib/server/finalizations/service";
import { ExportService } from "../lib/server/exports/service";
import { EvidenceService } from "../lib/server/evidence/service";
import { ReviewService } from "../lib/server/review/service";
import { MonitoringService } from "../lib/server/monitoring/service";
import { MonitoringFeedbackService } from "../lib/server/monitoring/feedback";
import { MatchingService } from "../lib/server/matching/service";
import { AdminAccess } from "../lib/server/admin/access";
import { AdminService } from "../lib/server/admin/service";
import { uploadPartnerImage } from "../lib/server/admin/images";
import { ContentService } from "../lib/server/localized-contents/service";

type Account = { email: string; password: string; locale: string; purpose: string; id?: string };
type State = { schemaVersion: 1; accounts: Account[]; steps: Record<string, unknown>; checks: { name: string; ok: boolean; at: string; detail?: unknown }[] };
const root = process.env.UPLOADS_DIR!, privatePath = join(root, "evidence-v1-private.json");
function pdf() {
  const stream = "BT /F1 20 Tf 50 750 Td (CLAPS EVIDENCE SAMPLE GUIDE - NO AI) Tj 0 -40 Td (SAMPLE RULE: navy / mint / yellow) Tj 0 -40 Td (SAMPLE RULE: disclose synthetic artwork) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let out = "%PDF-1.4\n"; const offsets = [0]; for (const [i, obj] of objects.entries()) { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${obj}\nendobj\n`; } const start = Buffer.byteLength(out);
  out += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`; return Buffer.from(out);
}
async function main() {
  if (process.env.EVIDENCE_SAMPLE_MODE !== "claps-evidence-v1" || process.env.EVIDENCE_TARGET_CONFIRM !== "https://claps.arcreation.work" || process.env.APP_ORIGIN !== "https://claps.arcreation.work") throw Error("EXPLICIT_EVIDENCE_TARGET_REQUIRED");
  const { pool } = createDatabase(process.env.DATABASE_URL!, 3);
  try {
    const database = (await pool.query("SELECT current_database() db")).rows[0].db;
    if (database !== "claps") throw Error("EXPECTED_CLAPS_DATABASE");
    const baseline = (await pool.query("SELECT id,email,app_role,status FROM users WHERE email='admin@claps.arcreation.work'")).rows[0];
    assert.equal(baseline?.app_role, "admin"); assert.equal(baseline.status, "active");
    const unexpected = await pool.query("SELECT j.id FROM jobs j JOIN users u ON u.id=j.owner_id WHERE j.status IN ('queued','running') AND u.email NOT LIKE 'evidence.v1.%@example.com'");
    assert.equal(unexpected.rowCount, 0, "Non-evidence jobs are active: defer seed");
    await mkdir(root, { recursive: true, mode: 0o700 });
    let state: State;
    try { state = JSON.parse(await readFile(privatePath, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; state = { schemaVersion: 1, accounts: Array.from({ length: 10 }, (_, i) => ({ email: `evidence.v1.${String(i + 1).padStart(2, "0")}@example.com`, password: `Ev1!${randomBytes(18).toString("base64url")}`, locale: i % 2 ? "ja" : "en", purpose: ["English full workflow", "Japanese full workflow", "English empty workspace", "Japanese empty workspace", "Review / revision", "Licensing / archive", "Evidence administrator", "Profile pending", "Email unverified", "Suspended access denial"][i] })), steps: {}, checks: [] }; }
    async function save() { await writeFile(privatePath + ".tmp", JSON.stringify(state, null, 2), { mode: 0o600 }); await rename(privatePath + ".tmp", privatePath); await chmod(privatePath, 0o600); }
    await save();
    async function step<T>(key: string, fn: () => Promise<T>): Promise<T> { if (key in state.steps) return state.steps[key] as T; const value = await fn(); state.steps[key] = value; await save(); console.log(JSON.stringify({ step: key, status: "ok" })); return value; }
    async function check(name: string, fn: () => Promise<unknown>) { try { const detail = await fn(); state.checks.push({ name, ok: true, at: new Date().toISOString(), detail }); } catch (e) { state.checks.push({ name, ok: false, at: new Date().toISOString(), detail: e instanceof Error ? e.message : "failure" }); await save(); throw e; } await save(); }
    async function denied(fn: () => Promise<unknown>, codes: string[]) { try { await fn(); assert.fail("Operation unexpectedly accepted"); } catch (e) { assert.ok(codes.includes((e as { code?: string }).code ?? ""), `${(e as Error).message}`); return { code: (e as { code: string }).code }; } }
    const links = new Map<string, string>(), auth = new AuthService(pool, async m => { links.set(m.to, m.url); }, process.env.APP_ORIGIN!);
    const ws = new WorkspaceService(auth), storage = new StorageService(ws), jobs = new JobService(auth, productionHandlers, developmentQueuePolicy), queue = new JobQueue(jobs), sample = new EvidenceSampleService(ws, jobs), verify = new VerificationService(ws, jobs), finals = new FinalizationService(ws), exports = new ExportService(ws, jobs), evidence = new EvidenceService(ws), review = new ReviewService(ws), monitoring = new MonitoringService(ws, jobs), feedback = new MonitoringFeedbackService(monitoring), matching = new MatchingService(ws, jobs);
    const tokens = new Map<number, string>();
    for (const [i, a] of state.accounts.entries()) {
      let u = (await pool.query<AuthUser>("SELECT * FROM users WHERE email=$1", [a.email])).rows[0];
      if (!u) { await auth.signup(a); u = (await pool.query<AuthUser>("SELECT * FROM users WHERE email=$1", [a.email])).rows[0]; }
      a.id = u!.id; await save();
      if (i === 8) continue;
      if (!u!.email_verified) { if (!links.get(a.email)) await auth.sendLink(a.email, "verify", a.locale); const token = new URL(links.get(a.email)!).searchParams.get("token")!; await auth.consume(token, "verify", undefined, a.locale); }
      if (u!.status === "suspended") continue;
      const login = await auth.login(a); tokens.set(i, login.token);
      if (i !== 7 && login.user.status !== "active") await auth.profile(login.token, { name: `Evidence User ${i + 1}`, org: "CLAPS Synthetic Evidence Studio", role: i === 6 ? "management" : "design", locale: a.locale, ...(a.locale === "ja" ? { familyName: "証憑", givenName: `利用者${i + 1}`, familyNameKana: "ショウヒョウ", givenNameKana: "リヨウシャ" } : {}) });
      if (i === 6 && login.user.app_role !== "admin") { await auth.manage(a.email, "promote"); tokens.set(i, (await auth.login(a)).token); }
      if (i === 9) { await auth.manage(a.email, "suspend"); tokens.delete(i); }
    }
    await check("10 provisioned evidence accounts / existing admin preserved", async () => { assert.equal((await pool.query("SELECT count(*)::int n FROM users WHERE email LIKE 'evidence.v1.%@example.com'")).rows[0].n, 10); assert.deepEqual((await pool.query("SELECT id,email,app_role,status FROM users WHERE id=$1", [baseline.id])).rows[0], baseline); });
    const adminRaw = tokens.get(6)!, access = new AdminAccess(auth), admin = new AdminService(access, jobs), content = new ContentService(access);
    await access.verify(adminRaw, { password: state.accounts[6].password });
    const partners: string[] = [];
    for (let i = 0; i < 7; i++) {
      const p = await step(`partner-${i}`, () => admin.partner(adminRaw, undefined, { name: `SAMPLE ${["Mint Studio", "Paper Works", "Lumen Toys", "Canvas Fashion", "Orchard Games", "Cedar Living", "Private Workshop"][i]}`, description: "합성 증빙용 파트너. 실제 사업자 추천이 아닙니다.", marketDescription: "SAMPLE licensing and character merchandise", contactEmail: null, visibility: i === 6 ? "private" : "public", tags: ["character", "licensing", "design", i % 2 ? "fashion" : "toys"], ipNames: ["SAMPLE Mint Friends"], reason: "Explicit evidence seed v1" }));
      const id = (p as { id: string }).id; partners.push(id);
      await step(`partner-image-${i}`, async () => { const row = (await pool.query("SELECT version FROM partners WHERE id=$1", [id])).rows[0]; return uploadPartnerImage(access, adminRaw, id, { version: row.version, reason: "Synthetic evidence image", name: "SAMPLE-partner.png" }, "image/png", await sampleImage(i)); });
      for (const locale of ["en", "ja"]) await step(`partner-${i}-${locale}`, async () => {
        const current = await content.get(adminRaw, "partner", id, locale);
        const translated = { schemaVersion: 1 as const, resourceType: "partner" as const, name: locale === "ja" ? `サンプル・パートナー ${i + 1}` : `SAMPLE Partner ${i + 1}`, description: locale === "ja" ? "証憑用の合成事業者。実際の推薦ではありません。" : "Synthetic evidence partner. Not a real business recommendation.", marketDescription: "SAMPLE character licensing", ipNames: ["SAMPLE Mint Friends"] };
        await content.import(adminRaw, { schemaVersion: 1, entries: [{ resourceType: "partner", resourceKey: id, locale, version: current.version, sourceRevision: current.sourceRevision, content: translated }], reason: "Evidence translation draft" });
        const draft = await content.get(adminRaw, "partner", id, locale);
        if (i === 6) return { draftOnly: true };
        return content.publish(adminRaw, { resourceType: "partner", resourceKey: id, locale, version: draft.version, sourceRevision: draft.sourceRevision, content: translated, reason: "Evidence translation publish" });
      });
    }
    async function drive(job: JobDto) {
      for (let n = 0; n < 100; n++) {
        const row = (await pool.query("SELECT status,error_code FROM jobs WHERE id=$1", [job.id])).rows[0];
        if (["succeeded", "failed", "canceled"].includes(row.status)) return row;
        const claimed = await queue.claim("evidence-seed-v1"); if (claimed) await runClaimedJob(queue, claimed); else await new Promise(r => setTimeout(r, 200));
      }
      throw Error("JOB_NOT_SETTLED");
    }
    async function successful(job: JobDto) { const r = await drive(job); assert.equal(r.status, "succeeded", `${job.kind}: ${r.error_code}`); return job.id; }
    await writeFile(join(root, "evidence-sample-guide.pdf"), pdf(), { mode: 0o600 });
    const flows: { ownerIndex: number; project: string; session: string; guide: string; assets: string[]; pass: string; zip: string; snapshot: string }[] = [];
    for (const i of [0, 1]) {
      const raw = tokens.get(i)!, locale = state.accounts[i].locale;
      const p = await step(`main-project-${i}`, () => ws.createProject(raw, { name: i ? "SAMPLE ミント・フレンズ 春の企画" : "SAMPLE Mint Friends Spring Campaign", ip: "SAMPLE Mint Friends", description: "Evidence-only synthetic project; provider results are samples.", status: "generating" }));
      const session = await step(`main-session-${i}`, () => ws.createSession(raw, { title: i ? "証憑サンプル・デザイン" : "Evidence sample designs", projectId: p.id }));
      const guide = await step(`main-guide-${i}`, () => sample.upload(raw, p.id, "SAMPLE-brand-guide.pdf", pdf()));
      await step(`extract-${i}`, async () => successful(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: "guide_extraction", guideId: guide.id, outputLocale: locale }, idempotencyKey: `ev1_extract_${i}` })));
      await step(`edit-guide-${i}`, async () => { const g = (await sample.list(raw, p.id)).find(g => g.id === guide.id)!; return sample.edit(raw, guide.id, { rowVersion: g.row_version, rules: sampleRules() }); });
      await step(`publish-guide-${i}`, () => sample.publish(raw, guide.id));
      const generation = await step(`generate-${i}`, async () => successful(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: "generation", sessionId: session.id, guideId: guide.id, prompt: "SAMPLE mascot designs / deterministic synthetic scenario", outputLocale: locale }, idempotencyKey: `ev1_generate_${i}` })));
      const assets = (await pool.query<{ id: string }>("SELECT id FROM assets WHERE generation_job_id=$1 ORDER BY id", [generation])).rows.map(a => a.id); assert.equal(assets.length, 3);
      await step(`adopt-${i}`, async () => { for (const id of assets) { const a = await ws.getAsset(raw, id); if (!a.adopted) await ws.patchAsset(raw, id, { version: a.version, adopted: true }); } const a = await ws.getAsset(raw, assets[2]); await ws.patchAsset(raw, a.id, { version: a.version, adopted: false }); const b = await ws.getAsset(raw, a.id); await ws.patchAsset(raw, b.id, { version: b.version, adopted: true }); return { adopted: 3 }; });
      await step(`verify-${i}`, async () => successful(await verify.request(raw, session.id, { assetIds: assets, guideId: guide.id, outputLocale: locale, idempotencyKey: `ev1_verify_${i}` })));
      const pass = assets[0];
      await check(`pass/warn/reject and finalization guard ${locale}`, async () => { const views = await Promise.all(assets.map(a => finals.get(raw, a))); assert.deepEqual(views.map(v => v.verification?.verdict), ["pass", "warn", "reject"]); for (const id of assets.slice(1)) { const a = await ws.getAsset(raw, id); await denied(() => finals.set(raw, id, { version: a.version }, true), ["STATE_CONFLICT"]); } return views.map(v => ({ verdict: v.verification?.verdict, canFinalize: v.canFinalize })); });
      await step(`final-${i}`, async () => { const a = await ws.getAsset(raw, pass); return finals.set(raw, pass, { version: a.version }, true); });
      const zip = await step(`zip-${i}`, async () => successful(await exports.request(raw, { assetIds: [pass], outputLocale: locale, idempotencyKey: `ev1_zip_${i}` })));
      await step(`zip-download-${i}`, async () => { const ticket = await exports.download(raw, zip); const download = await storage.download(raw, ticket.downloadUrl.split("/").at(-1)!.split("?")[0]); await writeFile(join(root, `evidence-${locale}.zip`), download.bytes, { mode: 0o600 }); assert.equal(download.bytes.readUInt32LE(0), 0x04034b50); return { size: download.bytes.length, sha256: createHash("sha256").update(download.bytes).digest("hex") }; });
      await step(`review-check-${i}`, async () => { const ready = await review.get(raw, session.id); return review.patch(raw, session.id, { version: ready.checks.version, targetHash: ready.targetHash, manual: { copyrightNotice: true, thirdPartyAssets: true, recipientConfirmed: true } }); });
      const snapshot = await step(`review-issue-${i}`, async () => { const r = await review.get(raw, session.id); assert.equal(r.ready, true, JSON.stringify(r.automatic)); return review.issue(raw, session.id, { version: r.checks.version, targetHash: r.targetHash, idempotencyKey: `ev1_review_${i}` }); });
      await check(`native evidence and immutable review snapshot ${locale}`, async () => { const cert = await evidence.certificate(raw, pass); assert.equal(cert.generation.origin, "native"); assert.equal(cert.verification?.origin, "native"); const stored = await review.snapshot(raw, session.id, snapshot.id); assert.equal(stored.checksum, snapshot.checksum); const timeline = await evidence.list(raw, session.id); assert.equal(timeline.history, "native"); return { certificate: cert, timeline, snapshot: stored }; });
      await step(`cover-${i}`, async () => { const a = await ws.getProject(raw, p.id); return ws.patchProject(raw, p.id, { version: a.version, cover: { kind: "asset", assetId: pass }, status: "completed" }); });
      await step(`matching-${i}`, async () => { const bytes = await sampleImage(0), upload = await storage.reserveMatching(raw, { name: "SAMPLE-reference.png", mime: "image/png", size: bytes.length }); await storage.upload(raw, upload.ticket, bytes, "image/png"); const current = await matching.get(raw); const saved = await matching.save(raw, { revision: current.revision, criteria: { ipName: "SAMPLE Mint Friends", category: "character", industries: ["toys", "fashion"], styles: ["design"], worldView: "SAMPLE character licensing" }, referenceIds: [upload.referenceId] }); return successful(await matching.request(raw, { revision: saved.revision, outputLocale: locale, idempotencyKey: `ev1_matching_${i}` })); });
      for (const scenario of ["results", "empty", "partial", "error", "unscanned", "archived"]) {
        const record = await step(`monitor-${i}-${scenario}`, async () => { const marker = `SAMPLE_${scenario.toUpperCase()}`, bytes = Buffer.concat([await sampleImage(scenario === "empty" ? 1 : 0), Buffer.from(marker)]), upload = await storage.reserveMonitoring(raw, { name: `${marker}.png`, mime: "image/png", size: bytes.length }); await storage.upload(raw, upload.ticket, bytes, "image/png"); return monitoring.create(raw, { name: `${marker} / NO LIVE WEB SEARCH`, source: { kind: "upload", ticket: upload.ticket } }); });
        if (["unscanned", "archived"].includes(scenario)) { if (scenario === "archived") await step(`archive-monitor-${i}`, () => monitoring.patch(raw, record.id, { version: record.version, archived: true })); continue; }
        await step(`scan-${i}-${scenario}`, async () => { const job = await monitoring.request(raw, record.id, { outputLocale: locale, idempotencyKey: `ev1_scan_${i}_${scenario}` }); const r = await drive(job); assert.equal(r.status, scenario === "error" ? "failed" : "succeeded"); return { jobId: job.id, ...r }; });
        if (scenario === "results") {
          await step(`rescan-${i}`, async () => successful(await monitoring.request(raw, record.id, { outputLocale: locale, idempotencyKey: `ev1_rescan_${i}` })));
          await step(`feedback-${i}`, async () => { const history = await monitoring.history(raw, record.id); const job = history.items[0].job.id; const reported = await feedback.write(raw, record.id, job, "0", "reported", { reason: "own_content", idempotencyKey: `ev1_feedback_${i}` }); const replay = await feedback.write(raw, record.id, job, "0", "reported", { reason: "own_content", idempotencyKey: `ev1_feedback_${i}` }); assert.equal(reported.eventId, replay.eventId); await feedback.write(raw, record.id, job, "0", "withdrawn", { idempotencyKey: `ev1_withdraw_${i}` }); return feedback.write(raw, record.id, job, "0", "reported", { reason: "licensed_use", idempotencyKey: `ev1_report_again_${i}` }); });
        }
      }
      await step(`asset-monitor-${i}`, async () => monitoring.create(raw, { name: "SAMPLE finalized asset source", source: { kind: "asset", assetId: pass } }));
      flows.push({ ownerIndex: i, project: p.id, session: session.id, guide: guide.id, assets, pass, zip, snapshot: snapshot.id });
      void generation;
    }
    const raw = tokens.get(0)!;
    for (const [idx, status] of ["preparing", "generating", "verifying", "needs_fix", "completed"].entries()) await step(`status-project-${idx}`, async () => { const p = await ws.createProject(raw, { name: `SAMPLE ${status} project`, status, description: "Synthetic state coverage" }); const s = await ws.createSession(raw, { projectId: p.id, title: `SAMPLE ${status} session` }); return { project: p.id, session: s.id }; });
    for (let index = 1; index <= 32; index++) await step(`pagination-project-${index}`, () => ws.createProject(raw, { name: `SAMPLE portfolio ${String(index).padStart(2, "0")}`, status: index % 2 ? "preparing" : "generating", description: "Synthetic pagination and search coverage" }));
    for (let index = 1; index <= 32; index++) await step(`pagination-session-${index}`, () => ws.createSession(raw, { projectId: flows[0].project, title: `SAMPLE exploration ${String(index).padStart(2, "0")}` }));
    await step("archived-session", async () => { const s = await ws.createSession(raw, { title: "SAMPLE archived session", projectId: flows[0].project }); return ws.patchSession(raw, s.id, { version: s.version, archived: true }); });
    for (const i of [4, 5, 6]) await step(`extra-owner-${i}`, async () => { const p = await ws.createProject(tokens.get(i)!, { name: `SAMPLE ${state.accounts[i].purpose}`, status: i === 4 ? "needs_fix" : "preparing" }); const s = await ws.createSession(tokens.get(i)!, { projectId: p.id, title: "SAMPLE empty session" }); return { project: p.id, session: s.id }; });
    await step("project-archive-restore", async () => { const p = await ws.createProject(raw, { name: "SAMPLE archived project" }); const archived = await ws.patchProject(raw, p.id, { version: p.version, archived: true }); const restored = await ws.patchProject(raw, p.id, { version: archived.version, archived: false }); return ws.patchProject(raw, p.id, { version: restored.version, archived: true }); });
    await step("failed-retry-cancel", async () => { const f = flows[0], data = { schemaVersion: 1, kind: "generation", sessionId: f.session, guideId: f.guide, prompt: "[sample-fail] deliberate evidence failure", outputLocale: "en" }; const failed = await jobs.enqueue(raw, { input: data, idempotencyKey: "ev1_fail" }); assert.equal((await drive(failed)).status, "failed"); const retry = await jobs.retry(raw, failed.id); await successful(retry); const canceled = await jobs.enqueue(raw, { input: { ...data, prompt: "SAMPLE queued cancellation" }, idempotencyKey: "ev1_cancel" }); assert.equal((await jobs.cancel(raw, canceled.id)).status, "canceled"); return { failed: failed.id, retry: retry.id, canceled: canceled.id }; });
    await step("stale-guide-scenario", async () => {
      const p = await ws.createProject(raw, { name: "SAMPLE stale verification / guide v2", status: "needs_fix" }), s = await ws.createSession(raw, { title: "SAMPLE guide version changed", projectId: p.id });
      const g = await sample.upload(raw, p.id, "SAMPLE-v1.pdf", pdf()); await successful(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: "guide_extraction", guideId: g.id, outputLocale: "en" }, idempotencyKey: `ev1_stale_extract_${g.id}` })); await sample.publish(raw, g.id);
      await successful(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: "generation", sessionId: s.id, guideId: g.id, prompt: "SAMPLE stale guide scenario", outputLocale: "en" }, idempotencyKey: `ev1_stale_gen_${s.id}` }));
      const a = (await ws.listAssets(raw, s.id))[0]; await ws.patchAsset(raw, a.id, { version: a.version, adopted: true });
      await successful(await verify.request(raw, s.id, { assetIds: [a.id], guideId: g.id, outputLocale: "en", idempotencyKey: `ev1_stale_verify_${s.id}` }));
      let current = await ws.getAsset(raw, a.id); await finals.set(raw, a.id, { version: current.version }, true); current = await ws.getAsset(raw, a.id); await finals.set(raw, a.id, { version: current.version }, false);
      current = await ws.getAsset(raw, a.id); await successful(await verify.request(raw, s.id, { assetIds: [a.id], guideId: g.id, outputLocale: "en", idempotencyKey: `ev1_stale_reverify_${s.id}` })); current = await ws.getAsset(raw, a.id); await finals.set(raw, a.id, { version: current.version }, true);
      const g2 = await sample.upload(raw, p.id, "SAMPLE-v2.pdf", pdf()); await successful(await jobs.enqueue(raw, { input: { schemaVersion: 1, kind: "guide_extraction", guideId: g2.id, outputLocale: "en" }, idempotencyKey: `ev1_stale_extract_${g2.id}` })); await sample.publish(raw, g2.id);
      assert.equal((await finals.get(raw, a.id)).stale, true); assert.equal((await review.get(raw, s.id)).automatic.verified, false);
      return { project: p.id, session: s.id, asset: a.id, oldGuide: g.id, newGuide: g2.id };
    });
    await step("password-reset-and-change", async () => { const a = state.accounts[4], temporary = `Tmp!${randomBytes(18).toString("hex")}`; await auth.sendLink(a.email, "reset", "en"); const token = new URL(links.get(a.email)!).searchParams.get("token")!; await auth.consume(token, "reset", temporary); const session = await auth.login({ ...a, password: temporary }); await auth.changePassword(session.token, temporary, a.password); return { reset: true, changedBack: true, externalEmailSent: false }; });
    await check("unauthenticated / other owner / stale version / suspended / unverified access", async () => {
      await denied(() => ws.getProject(undefined, flows[0].project), ["UNAUTHORIZED"]);
      await denied(() => ws.getProject(tokens.get(2), flows[0].project), ["NOT_FOUND"]);
      const p = await ws.getProject(raw, flows[0].project); await denied(() => ws.patchProject(raw, p.id, { version: p.version - 1, name: "wrong" }), ["VERSION_CONFLICT"]);
      await denied(() => auth.login(state.accounts[9]), ["UNAUTHORIZED"]); await denied(() => auth.login(state.accounts[8]), ["FORBIDDEN"]);
      await denied(() => admin.overview(raw), ["FORBIDDEN"]);
      return { passed: 6 };
    });
    await check("all admin sections readable", async () => { const overview = await admin.overview(adminRaw); const counts: Record<string, unknown> = {}; for (const kind of ["users", "projects", "partners", "jobs", "guides", "monitoring-records", "audit-logs"]) counts[kind] = await admin.list(adminRaw, kind, {}); counts.locales = await admin.locales(adminRaw); return { overview, counts }; });
    await save();
    const report = { schemaVersion: 1, target: process.env.APP_ORIGIN, database, provider: SAMPLE_PROVIDER, createdAt: new Date().toISOString(), accounts: state.accounts.map(({ password: _password, ...a }) => a), flows, partners, steps: state.steps, checks: state.checks, limitations: ["Generation, guide extraction and verification are explicit synthetic fixtures; not AI performance evidence.", "Monitoring sources, URLs and similarity percentages are synthetic; no live web search or infringement detection.", "Existing guide-analysis UI is a timer-based prototype. Evidence-specific PDF lifecycle uses real DB, queue and storage.", "Review package is currently Japanese only by product contract.", "Production email and OAuth providers remain disabled."] };
    await writeFile(join(root, "evidence-v1-result.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ status: "complete", accounts: 10, steps: Object.keys(state.steps).length, checks: state.checks.length, flows: flows.length }));
  } finally { await pool.end(); }
}
main().catch(e => { console.error(JSON.stringify({ status: "failed", error: e instanceof Error ? e.message : "unknown" })); process.exitCode = 1; });
