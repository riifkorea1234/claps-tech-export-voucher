import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { idSchema, paginate } from "../../contracts/common";
import { monitoringCreate, monitoringPatch, monitoringQuery, scanRequest, type MonitoringRecord, type ScanEntry } from "../../contracts/monitoring";
import { fileSchema } from "../../contracts/metadata";
import { monitoringResultSchema } from "../../contracts/monitoring-result";
import { WorkspaceService } from "../projects/service";
import { JobService, jobDto } from "../jobs/service";
import { lockJobParents } from "../jobs/parents";
import type { JobRow } from "../jobs/types";
import { digest } from "../auth/service";
import { AppError } from "../errors/http";
import { readStoredFile } from "../storage/read-file";
import { MAX_UPLOAD_BYTES } from "../storage/config";
export class MonitoringService {
  constructor(readonly workspace: WorkspaceService, readonly jobs: JobService) {}
  async row(c: PoolClient, owner: string, id: string, archived = false) {
    idSchema.parse(id);
    const { rows: [r] } = await c.query("SELECT * FROM monitoring_records WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, owner]);
    if (!r || (!archived && r.archived_at)) throw new AppError("NOT_FOUND");
    return r;
  }
  async source(c: PoolClient, r: QueryResultRow) {
    return fileSchema.parse(r.source_asset_id ? (await this.workspace.assetRow(c, r.owner_id, r.source_asset_id)).file : r.source_file);
  }
  async dto(c: PoolClient, r: QueryResultRow): Promise<MonitoringRecord> {
    let file = null;
    if (!r.archived_at) { try { file = await this.source(c, r); } catch (e) { if (!(e instanceof AppError) || !["NOT_FOUND", "STATE_CONFLICT"].includes(e.code)) throw e; } }
    return { id: r.id, name: r.name, version: r.version, sourceAssetId: r.source_asset_id, sourceName: file?.originalName ?? "", sourceAvailable: !!file, imageUrl: file ? `/api/monitoring-records/${r.id}/image` : null, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(), archivedAt: r.archived_at?.toISOString() ?? null, firstScannedAt: r.first_scanned_at?.toISOString() ?? null, lastScannedAt: r.last_scanned_at?.toISOString() ?? null, latestResultCount: r.latest_result_count, latestJobId: r.latest_job_id, scanAvailable: !!this.jobs.registry.get("monitoring") && !!file };
  }
  async list(raw: string | undefined, input: unknown = {}) {
    const q = monitoringQuery.parse(input);
    return this.workspace.run(raw, async (c, owner) => {
      const filter = "owner_id=$1 AND (archived_at IS NOT NULL)=$2 AND strpos(lower(name),lower($3))>0", values = [owner, q.archived === "true", q.q];
      const total = (await c.query(`SELECT count(*)::int n FROM monitoring_records WHERE ${filter}`, values)).rows[0].n;
      const page = paginate(Math.min(q.page, Math.max(1, Math.ceil(total / 20))), 20, total);
      const rows = (await c.query(`SELECT * FROM monitoring_records WHERE ${filter} ORDER BY ${q.sort === "created" ? "created_at ASC" : "COALESCE(last_scanned_at,created_at) DESC"},id LIMIT 20 OFFSET $4`, [...values, (page.page - 1) * 20])).rows;
      const items = []; for (const r of rows) items.push(await this.dto(c, r));
      return { items, ...page };
    });
  }
  get(raw: string | undefined, id: string) { return this.workspace.run(raw, async (c, owner) => this.dto(c, await this.row(c, owner, id, true))); }
  async create(raw: string | undefined, input: unknown) {
    const d = monitoringCreate.parse(input);
    return this.workspace.run(raw, async (c, owner) => {
      let file = null, assetId = null;
      if (d.source.kind === "asset") { const a = await this.workspace.assetRow(c, owner, d.source.assetId); fileSchema.parse(a.file); assetId = a.id; }
      else {
        const { rows: [t] } = await c.query("SELECT * FROM storage_tickets WHERE id=$1 AND owner_id=$2 AND target_type='monitoring' AND kind='upload' AND state='ready' AND expires_at>now() FOR UPDATE", [digest(d.source.ticket), owner]);
        if (!t) throw new AppError("NOT_FOUND"); file = fileSchema.parse(t.metadata);
        await c.query("UPDATE storage_tickets SET state='claimed',updated_at=now() WHERE id=$1", [t.id]);
      }
      const { rows: [r] } = await c.query("INSERT INTO monitoring_records(id,owner_id,name,source_asset_id,source_file) VALUES($1,$2,$3,$4,$5) RETURNING *", [randomUUID(), owner, d.name, assetId, file]);
      return this.dto(c, r);
    });
  }
  async patchLocked(c: PoolClient, owner: string, id: string, input: unknown) {
    const d = monitoringPatch.parse(input), r = await this.row(c, owner, id, true);
    this.workspace.checkVersion(r, d.version);
    if (r.archived_at && d.archived !== false) throw new AppError("STATE_CONFLICT");
    if (d.archived === false) await this.source(c, r);
    const { rows: [updated] } = await c.query("UPDATE monitoring_records SET name=$2,archived_at=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *", [id, d.name ?? r.name, d.archived === undefined ? r.archived_at : d.archived ? new Date() : null]);
    if (d.archived) await c.query("UPDATE jobs SET cancel_requested_at=COALESCE(cancel_requested_at,now()),status=CASE WHEN status='queued' THEN 'canceled' ELSE status END,finished_at=CASE WHEN status='queued' THEN now() ELSE finished_at END,error_code=CASE WHEN status='queued' THEN 'CANCELED' ELSE error_code END WHERE owner_id=$1 AND kind='monitoring' AND input->>'recordId'=$2 AND status IN ('queued','running')", [owner, id]);
    return this.dto(c, updated);
  }
  patch(raw: string | undefined, id: string, input: unknown) { return this.workspace.run(raw, (c, owner) => this.patchLocked(c, owner, id, input)); }
  image(raw: string | undefined, id: string) { return this.workspace.run(raw, async (c, owner) => { const file = await this.source(c, await this.row(c, owner, id)); return { bytes: await readStoredFile(file, MAX_UPLOAD_BYTES), mime: file.mimeType }; }); }
  async requestLocked(c: PoolClient, owner: string, id: string, data: unknown) {
    const d = scanRequest.parse(data), r = await this.row(c, owner, id);
    await this.source(c, r);
    const input = { schemaVersion: 1 as const, kind: "monitoring" as const, recordId: id, outputLocale: d.outputLocale };
    const parent = await lockJobParents(c, owner, input);
    const { rows: [existing] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='monitoring' AND idempotency_key=$2", [owner, d.idempotencyKey]);
    if (existing) { if (existing.input.kind !== "monitoring" || existing.input.recordId !== id || existing.input.outputLocale !== d.outputLocale) throw new AppError("IDEMPOTENCY_CONFLICT"); return jobDto(existing, this.jobs.policy); }
    if (!this.jobs.registry.get("monitoring")) throw new AppError("SERVICE_UNAVAILABLE");
    if ((await c.query("SELECT 1 FROM jobs WHERE owner_id=$1 AND kind='monitoring' AND input->>'recordId'=$2 AND status IN ('queued','running')", [owner, id])).rowCount) throw new AppError("STATE_CONFLICT");
    return jobDto(await this.jobs.insert(c, owner, input, d.idempotencyKey, parent), this.jobs.policy);
  }
  request(raw: string | undefined, id: string, data: unknown) { return this.workspace.run(raw, (c, owner) => this.requestLocked(c, owner, id, data)); }
  async historyLocked(c: PoolClient, owner: string, id: string, page: number) {
    await this.row(c, owner, id, true);
    const total = (await c.query("SELECT count(*)::int n FROM jobs WHERE owner_id=$1 AND kind='monitoring' AND input->>'recordId'=$2", [owner, id])).rows[0].n;
    const p = paginate(Math.min(page, Math.max(1, Math.ceil(total / 20))), 20, total);
    const rows = (await c.query<JobRow>("SELECT j.*, (SELECT id FROM jobs WHERE retry_of_id=j.id) retry_job_id FROM jobs j WHERE owner_id=$1 AND kind='monitoring' AND input->>'recordId'=$2 ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $3", [owner, id, (p.page - 1) * 20])).rows;
    const items: ScanEntry[] = rows.map(r => ({ job: jobDto(r, this.jobs.policy), result: r.status === "succeeded" && r.output?.kind === "monitoring" && r.output.result ? monitoringResultSchema.parse(r.output.result) : null }));
    return { items, ...p };
  }
  history(raw: string | undefined, id: string, query: unknown = {}) { const q = monitoringQuery.parse(query); return this.workspace.run(raw, (c, owner) => this.historyLocked(c, owner, id, q.page)); }
}
