import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { idSchema } from "../../contracts/common";
import { aggregateVerdict } from "../../contracts/verification";
import { verificationSchema, guideRulesSchema, jobInputSchema, jobOutputSchema } from "../../contracts/metadata";
import { checkSchema, readinessSchema, snapshotSchema, manifestSchema, reviewPatch, reviewIssue } from "../../contracts/review";
import { reviewHash } from "./hash";
import { AppError } from "../errors/http";
import { evidenceSession } from "../evidence/service";
import { verificationStale } from "../verifications/stale";
import { WorkspaceService } from "../projects/service";
const empty = { copyrightNotice: false, thirdPartyAssets: false, recipientConfirmed: false };
export class ReviewService {
  constructor(readonly workspace: WorkspaceService) {}
  async current(c: PoolClient, owner: string, id: string) {
    const s = await evidenceSession(c, owner, id);
    await c.query("SELECT id FROM asset_sessions WHERE id=$1 FOR UPDATE", [id]);
    const p = s.project_id ? (await c.query("SELECT * FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE", [s.project_id, owner])).rows[0] : null;
    const g = p?.active_guide_id ? (await c.query("SELECT * FROM brand_guides WHERE id=$1 AND project_id=$2 FOR SHARE", [p.active_guide_id, p.id])).rows[0] : null;
    const assets = (await c.query("SELECT * FROM assets WHERE session_id=$1 ORDER BY id FOR UPDATE", [id])).rows;
    const events = (await c.query("SELECT sequence,kind,asset_id,job_id,payload FROM evidence_events WHERE session_id=$1 AND owner_id=$2 ORDER BY sequence", [id, owner])).rows;
    const cutoff = events.at(-1)?.sequence ?? 0;
    const finals = assets.filter(a => !a.deleted_at && a.adopted && a.finalized_at);
    if (finals.length > 100) throw new AppError("STATE_CONFLICT");
    const guide = g ? { id: g.id, version: g.version, checksum: g.file.checksum } : null;
    const jobIds = [...new Set(assets.flatMap(a => [a.generation_job_id, a.verification_job_id]).filter(Boolean))];
    const jobs = (await c.query("SELECT id,owner_id,project_id,kind,status,input,output,provider FROM jobs WHERE id=ANY($1) ORDER BY id FOR SHARE", [jobIds])).rows;
    const busy = (await c.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='verification' AND status IN ('queued','running') AND input->'assetIds' ?| $2::text[] LIMIT 1", [owner, finals.map(a => a.id)])).rowCount;
    const verified = !busy && finals.length > 0 && finals.every(a => {
      const v = verificationSchema.safeParse(a.verification), job = jobs.find(j => j.id === a.verification_job_id), event = events.findLast(e => e.asset_id === a.id && e.job_id === a.verification_job_id && e.kind === "verify.run");
      if (!v.success || !job || !event || !g || g.status !== "published" || !job.provider) return false;
      const input = jobInputSchema.safeParse(job.input), output = jobOutputSchema.safeParse(job.output);
      if (!input.success || input.data.kind !== "verification" || !output.success || output.data.kind !== "verification") return false;
      const stored = output.data.results?.find(r => r.assetId === a.id)?.verification;
      return job.owner_id === owner && job.project_id === p?.id && job.kind === "verification" && job.status === "succeeded" && v.data.jobId === job.id && v.data.verdict === "pass" && aggregateVerdict(v.data.ruleResults) === "pass" && !verificationStale(v.data, guide, event.payload.guide?.checksum) && a.finalized_guide_id === g.id && input.data.guideId === g.id && input.data.assetIds.includes(a.id) && !!input.data.snapshot && input.data.snapshot.guideVersion === g.version && input.data.snapshot.assets.some(x => x.id === a.id && x.version + 2 === a.version) && reviewHash(input.data.snapshot.rules) === reviewHash(g.rules) && !!stored && reviewHash(stored) === reviewHash(v.data);
    });
    const automatic = { finalized: finals.length > 0, verified, history: finals.length > 0 && finals.every(a => {
      const j = jobs.find(j => j.id === a.generation_job_id);
      return j?.owner_id === owner && j.kind === "generation" && j.status === "succeeded" && j.input.sessionId === id && events.some(e => e.job_id === j.id && e.kind === "generate.requested") && events.some(e => e.job_id === j.id && e.kind === "generate.succeeded") && events.some(e => e.asset_id === a.id && e.kind === "final.added");
    }), guideVersion: !!guide && g.status === "published" && finals.length > 0 && finals.every(a => events.some(e => e.job_id === a.generation_job_id && e.kind === "generate.requested" && reviewHash(e.payload.guide) === reviewHash(guide))) };
    const rules = guideRulesSchema.safeParse(g?.rules);
    const titles = new Map(rules.success ? rules.data.rules.map(rule => [rule.ruleId, rule.title]) : []);
    const target = { sessionId: id, sessionVersion: s.version, projectVersion: p?.version ?? null, guide, cutoff, assets: finals.map(a => ({ id: a.id, version: a.version, checksum: a.file.checksum, generationJobId: a.generation_job_id, verificationJobId: a.verification_job_id, finalizedAt: a.finalized_at.toISOString(), verification: (() => { const v = verificationSchema.safeParse(a.verification); return v.success ? { ...v.data, ruleResults: v.data.ruleResults.map(rule => ({ ...rule, ...(titles.has(rule.ruleId) ? { title: titles.get(rule.ruleId) } : {}) })) } : null; })() })) };
    // Include nonfinal/deleted assets and job/rules contents: equal version does not hide basis drift.
    const targetHash = reviewHash({ target, assets: assets.map(a => ({ id: a.id, version: a.version, adopted: a.adopted, finalized: a.finalized_at, deleted: a.deleted_at, file: a.file, verification: a.verification })), jobs, rules: g?.rules, archived: !!(s.archived_at || p?.archived_at) });
    const row = (await c.query("SELECT * FROM review_checks WHERE session_id=$1 AND owner_id=$2", [id, owner])).rows[0];
    const checks = checkSchema.parse({ version: row?.version ?? 0, targetHash: row?.target_hash ?? targetHash, manual: row?.manual ?? empty, actorId: row?.actor_id ?? null, at: row?.checked_at?.toISOString() ?? null, stale: !!row && row.target_hash !== targetHash });
    const metadataOnly = !!(s.archived_at || p?.archived_at) || assets.length > 0 && assets.every(a => !!a.deleted_at);
    const snapshots = (await c.query("SELECT id,checksum,issued_at FROM review_package_snapshots WHERE session_id=$1 AND owner_id=$2 ORDER BY issued_at DESC,id DESC LIMIT 20", [id, owner])).rows.map(r => ({ id: r.id, checksum: r.checksum, issuedAt: r.issued_at.toISOString() }));
    return readinessSchema.parse({ targetHash, target, checks, automatic, metadataOnly, snapshots, ready: !metadataOnly && !checks.stale && Object.values(checks.manual).every(Boolean) && Object.values(automatic).every(Boolean) });
  }
  get(raw: string | undefined, id: string) { return this.workspace.run(raw, (c, owner) => this.current(c, owner, id)); }
  patch(raw: string | undefined, id: string, input: unknown) {
    return this.workspace.run(raw, async (c, owner) => {
      const d = reviewPatch.parse(input), r = await this.current(c, owner, id);
      if (r.metadataOnly) throw new AppError("NOT_FOUND");
      if (d.version !== r.checks.version || d.targetHash !== r.targetHash) throw new AppError("VERSION_CONFLICT");
      await c.query(`INSERT INTO review_checks(session_id,owner_id,target_hash,manual,actor_id,checked_at,version) VALUES($1,$2,$3,$4,$2,clock_timestamp(),1)
        ON CONFLICT(session_id) DO UPDATE SET target_hash=$3,manual=$4,actor_id=$2,checked_at=clock_timestamp(),version=review_checks.version+1`, [id, owner, r.targetHash, d.manual]);
      return (await this.current(c, owner, id)).checks;
    });
  }
  issue(raw: string | undefined, id: string, input: unknown) {
    return this.workspace.run(raw, async (c, owner) => {
      const d = reviewIssue.parse(input), r = await this.current(c, owner, id);
      if (r.metadataOnly) throw new AppError("NOT_FOUND");
      const hash = reviewHash(d), old = (await c.query("SELECT * FROM review_package_snapshots WHERE owner_id=$1 AND idempotency_key=$2", [owner, d.idempotencyKey])).rows[0];
      if (old) { if (old.session_id !== id || old.request_hash !== hash) throw new AppError("IDEMPOTENCY_CONFLICT"); return snapshotSchema.parse({ id: old.id, checksum: old.checksum, manifest: old.manifest }); }
      if (d.version !== r.checks.version || d.targetHash !== r.targetHash) throw new AppError("VERSION_CONFLICT");
      if (!r.ready) throw new AppError("STATE_CONFLICT");
      const at = (await c.query("SELECT clock_timestamp() at")).rows[0].at.toISOString();
      const manifest = manifestSchema.parse({ schemaVersion: 1, locale: "ja", format: "browser-print", sessionId: id, issuedAt: at, actorId: owner, targetHash: r.targetHash, checkVersion: r.checks.version, target: r.target, manual: r.checks.manual, manualActorId: r.checks.actorId, manualAt: r.checks.at, automatic: r.automatic });
      const fileRefs = (await c.query("SELECT file FROM assets WHERE id=ANY($1) UNION ALL SELECT file FROM brand_guides WHERE id=$2", [r.target.assets.map(a => a.id), r.target.guide?.id ?? null])).rows.map(a => a.file);
      const sid = randomUUID(), checksum = reviewHash(manifest);
      await c.query("INSERT INTO review_package_snapshots(id,owner_id,session_id,actor_id,manifest,checksum,target_hash,check_version,cutoff,issued_at,idempotency_key,request_hash,file_refs) VALUES($1,$2,$3,$2,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [sid, owner, id, manifest, checksum, r.targetHash, r.checks.version, r.target.cutoff, at, d.idempotencyKey, hash, JSON.stringify(fileRefs)]);
      await c.query("UPDATE review_checks SET version=version+1 WHERE session_id=$1", [id]);
      return snapshotSchema.parse({ id: sid, checksum, manifest });
    });
  }
  snapshot(raw: string | undefined, id: string, snapshotId: string) {
    return this.workspace.run(raw, async (c, owner) => {
      await evidenceSession(c, owner, id); idSchema.parse(snapshotId);
      const row = (await c.query("SELECT id,checksum,manifest FROM review_package_snapshots WHERE id=$1 AND session_id=$2 AND owner_id=$3", [snapshotId, id, owner])).rows[0];
      if (!row) throw new AppError("NOT_FOUND");
      return snapshotSchema.parse(row);
    });
  }
}
