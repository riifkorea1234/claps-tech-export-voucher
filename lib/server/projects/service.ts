import "server-only";
import { issueFileUrl, projectFile, reserveCleanup } from "../storage/service";
import { digest } from "../auth/service";
import { fileSchema, coverSchema, parseMetadata } from "@/lib/contracts/metadata";
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { authService, type AuthService } from "../auth/service";
import { AppError } from "../errors/http";
import { idSchema, paginate } from "@/lib/contracts/common";
import { projectCreate, projectPatch, sessionCreate, sessionPatch, assetPatch, listQuery, type ProjectDto, type SessionDto, type AssetDto } from "@/lib/contracts/workspace";

const visibleSession = "s.archived_at IS NULL AND (s.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=s.project_id AND p.archived_at IS NULL))";
export class WorkspaceService {
  constructor(readonly auth: AuthService) {}
  run<T>(raw: string | undefined, fn: (c: PoolClient, owner: string) => Promise<T>) {
    return this.auth.authenticated(raw, (c, u) => { if (u.status !== "active") throw new AppError("FORBIDDEN"); return fn(c, u.id); });
  }
  async projectRow(c: PoolClient, owner: string, id: string, archived = false) {
    idSchema.parse(id);
    const { rows } = await c.query("SELECT * FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, owner]);
    if (!rows[0] || (!archived && rows[0].archived_at)) throw new AppError("NOT_FOUND");
    return rows[0];
  }
  async sessionRow(c: PoolClient, owner: string, id: string, archived = false) {
    idSchema.parse(id);
    const { rows } = await c.query(`SELECT s.* FROM asset_sessions s WHERE s.id=$1 AND s.owner_id=$2 ${archived ? "" : `AND ${visibleSession}`} FOR UPDATE OF s`, [id, owner]);
    if (!rows[0]) throw new AppError("NOT_FOUND");
    if (rows[0].project_id) await this.projectRow(c, owner, rows[0].project_id);
    return rows[0];
  }
  checkVersion(row: QueryResultRow, version: number) { if (row.version !== version) throw new AppError("VERSION_CONFLICT"); }
  async projectDto(c: PoolClient, row: QueryResultRow): Promise<ProjectDto> {
    const { rows: [n] } = await c.query(`SELECT count(DISTINCT s.id)::int sessions,count(a.id)::int generated,count(a.id) FILTER(WHERE a.finalized_at IS NOT NULL)::int finalized FROM asset_sessions s LEFT JOIN assets a ON a.session_id=s.id AND a.deleted_at IS NULL WHERE s.project_id=$1 AND s.archived_at IS NULL`, [row.id]);
    const file = row.archived_at ? null : await projectFile(c, row);
    const cover = file ? { kind: "local" as const, value: await issueFileUrl(c, row.owner_id, "project", row.id, "thumbnail") } : undefined;
    return { cover, id: row.id, name: row.name, ip: row.ip_name, description: row.description, status: row.status === "needs_revision" ? "needs_fix" : row.status, version: row.version, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), archivedAt: row.archived_at?.toISOString() ?? null, ...n };
  }
  async sessionDto(c: PoolClient, row: QueryResultRow): Promise<SessionDto> {
    const { rows: [n] } = await c.query(`SELECT count(*)::int generated,count(*) FILTER(WHERE adopted)::int adopted,count(*) FILTER(WHERE finalized_at IS NOT NULL)::int finalized FROM assets WHERE session_id=$1 AND deleted_at IS NULL`, [row.id]);
    const project = row.project_id ? (await c.query("SELECT name FROM projects WHERE id=$1", [row.project_id])).rows[0] : null;
    const latest = (await c.query("SELECT id FROM assets WHERE session_id=$1 AND deleted_at IS NULL AND finalized_at IS NOT NULL ORDER BY finalized_at DESC,id LIMIT 1", [row.id])).rows[0];
    const thumbnailUrl = latest && !row.archived_at ? await issueFileUrl(c, row.owner_id, "asset", latest.id, "thumbnail") : undefined;
    return { thumbnailUrl, id: row.id, title: row.title, version: row.version, projectId: row.project_id, projectName: project?.name ?? null, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), archivedAt: row.archived_at?.toISOString() ?? null, ...n };
  }
  async listProjects(raw: string | undefined, input: unknown = {}) {
    const q = listQuery.parse(input);
    return this.run(raw, async (c, owner) => {
      const filter = `owner_id=$1 AND (archived_at IS NOT NULL)=$2 AND (strpos(lower(name),lower($3))>0 OR strpos(lower(ip_name),lower($3))>0)`;
      const values = [owner, q.archived === "true", q.q];
      const { rows: [count] } = await c.query(`SELECT count(*)::int total FROM projects WHERE ${filter}`, values);
      const pagination = paginate(Math.min(q.page, Math.max(1, Math.ceil(count.total / q.pageSize))), q.pageSize, count.total);
      const { rows } = await c.query(`SELECT * FROM projects WHERE ${filter} ORDER BY updated_at ${q.sort === "oldest" ? "ASC" : "DESC"},id LIMIT $4 OFFSET $5`, [...values, q.pageSize, (pagination.page - 1) * q.pageSize]);
      const items = []; for (const r of rows) items.push(await this.projectDto(c, r));
      return { items, ...pagination };
    });
  }
  async stats(raw: string | undefined) {
    return this.run(raw, async (c, owner) => (await c.query(`SELECT count(*) FILTER(WHERE status<>'completed')::int "activeCount",count(*) FILTER(WHERE status='verifying')::int "inReviewCount",count(*) FILTER(WHERE status='needs_revision')::int "needsFixCount" FROM projects WHERE owner_id=$1 AND archived_at IS NULL`, [owner])).rows[0]);
  }
  async getProject(raw: string | undefined, id: string) { return this.run(raw, async (c, owner) => this.projectDto(c, await this.projectRow(c, owner, id))); }
  async createProject(raw: string | undefined, input: unknown) {
    const d = projectCreate.parse(input);
    return this.run(raw, async (c, owner) => {
      const { rows: [row] } = await c.query("INSERT INTO projects(id,owner_id,name,ip_name,description,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [randomUUID(), owner, d.name, d.ip, d.description, d.status === "needs_fix" ? "needs_revision" : d.status]);
      return this.projectDto(c, row);
    });
  }
  async patchProject(raw: string | undefined, id: string, input: unknown) {
    const d = projectPatch.parse(input);
    return this.run(raw, async (c, owner) => {
      const row = await this.projectRow(c, owner, id, true); this.checkVersion(row, d.version);
      if (row.archived_at && d.archived !== false) throw new AppError("STATE_CONFLICT");
      let cover = row.cover;
      if (d.cover) {
        if (d.cover.kind === "default") cover = { schemaVersion: 1, kind: "default" };
        else if (d.cover.kind === "asset") {
          const a = await this.assetRow(c, owner, d.cover.assetId);
          const session = await this.sessionRow(c, owner, a.session_id);
          if (session.project_id !== id || !a.finalized_at) throw new AppError("STATE_CONFLICT");
          cover = { schemaVersion: 1, kind: "asset", assetId: a.id };
        } else {
          const { rows: [ticket] } = await c.query("SELECT * FROM storage_tickets WHERE id=$1 AND owner_id=$2 AND target_id=$3 AND kind='upload' AND state='ready' AND expires_at>now() FOR UPDATE", [digest(d.cover.ticket), owner, id]);
          if (!ticket) throw new AppError("NOT_FOUND");
          cover = { schemaVersion: 1, kind: "upload", file: fileSchema.parse(ticket.metadata) };
          await c.query("UPDATE storage_tickets SET state='claimed',updated_at=now() WHERE id=$1", [ticket.id]);
        }
        parseMetadata(coverSchema, cover);
        if (row.cover.kind === "upload") await reserveCleanup(c, owner, "project", id, row.cover.file);
      }
      const { rows: [updated] } = await c.query(`UPDATE projects SET name=$2,ip_name=$3,description=$4,status=$5,archived_at=$6,cover=$7,version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [id, d.name ?? row.name, d.ip ?? row.ip_name, d.description ?? row.description, d.status === "needs_fix" ? "needs_revision" : d.status ?? row.status, d.archived === undefined ? row.archived_at : d.archived ? new Date() : null, cover]);
      return this.projectDto(c, updated);
    });
  }
  async listSessions(raw: string | undefined, input: unknown = {}) {
    const q = listQuery.parse(input);
    return this.run(raw, async (c, owner) => {
      if (q.projectId) await this.projectRow(c, owner, q.projectId);
      const filter = `s.owner_id=$1 AND (s.archived_at IS NOT NULL)=$2 AND strpos(lower(s.title),lower($3))>0 AND ($4::text IS NULL OR s.project_id=$4) AND (s.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=s.project_id AND p.archived_at IS NULL))`;
      const args = [owner, q.archived === "true", q.q, q.projectId ?? null];
      const { rows: [n] } = await c.query(`SELECT count(*)::int total FROM asset_sessions s WHERE ${filter}`, args);
      const pagination = paginate(Math.min(q.page, Math.max(1, Math.ceil(n.total / q.pageSize))), q.pageSize, n.total);
      const { rows } = await c.query(`SELECT s.* FROM asset_sessions s WHERE ${filter} ORDER BY s.created_at ${q.sort === "oldest" ? "ASC" : "DESC"},s.id LIMIT $5 OFFSET $6`, [...args, q.pageSize, (pagination.page - 1) * q.pageSize]);
      const items = []; for (const r of rows) items.push(await this.sessionDto(c, r));
      return { items, ...pagination };
    });
  }
  async getSession(raw: string | undefined, id: string) { return this.run(raw, async (c, owner) => this.sessionDto(c, await this.sessionRow(c, owner, id))); }
  async createSession(raw: string | undefined, input: unknown) {
    const d = sessionCreate.parse(input);
    return this.run(raw, async (c, owner) => {
      if (d.projectId) await this.projectRow(c, owner, d.projectId);
      const { rows: [r] } = await c.query("INSERT INTO asset_sessions(id,owner_id,title,project_id) VALUES($1,$2,$3,$4) RETURNING *", [randomUUID(), owner, d.title, d.projectId ?? null]);
      return this.sessionDto(c, r);
    });
  }
  async patchSession(raw: string | undefined, id: string, input: unknown) {
    const d = sessionPatch.parse(input);
    return this.run(raw, async (c, owner) => {
      const row = await this.sessionRow(c, owner, id, true); this.checkVersion(row, d.version);
      if (row.archived_at && d.archived !== false) throw new AppError("STATE_CONFLICT");
      if (d.projectId !== undefined && d.projectId !== row.project_id) {
        if (d.projectId) await this.projectRow(c, owner, d.projectId);
        const generated = await c.query("SELECT 1 FROM assets WHERE session_id=$1 UNION ALL SELECT 1 FROM jobs WHERE owner_id=$2 AND kind='generation' AND input->>'sessionId'=$1 LIMIT 1", [id, owner]);
        if (generated.rowCount) throw new AppError("STATE_CONFLICT");
      }
      const { rows: [r] } = await c.query("UPDATE asset_sessions SET title=$2,project_id=$3,archived_at=$4,version=version+1,updated_at=now() WHERE id=$1 RETURNING *", [id, d.title ?? row.title, d.projectId === undefined ? row.project_id : d.projectId, d.archived === undefined ? row.archived_at : d.archived ? new Date() : null]);
      return this.sessionDto(c, r);
    });
  }
  async assetRow(c: PoolClient, owner: string, id: string) {
    idSchema.parse(id);
    const { rows: [r] } = await c.query("SELECT a.* FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE a.id=$1 AND s.owner_id=$2 AND a.deleted_at IS NULL FOR UPDATE OF a", [id, owner]);
    if (!r) throw new AppError("NOT_FOUND"); await this.sessionRow(c, owner, r.session_id); return r;
  }
  async assetDto(c: PoolClient, owner: string, row: QueryResultRow): Promise<AssetDto> { return { id: row.id, sessionId: row.session_id, version: row.version, adopted: row.adopted, finalizedAt: row.finalized_at?.toISOString() ?? null, createdAt: row.created_at.toISOString(), imageUrl: await issueFileUrl(c, owner, "asset", row.id, "original"), thumbnailUrl: await issueFileUrl(c, owner, "asset", row.id, "thumbnail") }; }
  async getAsset(raw: string | undefined, id: string) { return this.run(raw, async (c, owner) => this.assetDto(c, owner, await this.assetRow(c, owner, id))); }
  async listAssets(raw: string | undefined, id: string, library = false) {
    return this.run(raw, async (c, owner) => {
      if (library) await this.projectRow(c, owner, id); else await this.sessionRow(c, owner, id);
      const { rows } = await c.query(`SELECT a.* FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE ${library ? "s.project_id" : "s.id"}=$1 AND a.deleted_at IS NULL AND ${visibleSession} ${library ? "AND a.finalized_at IS NOT NULL" : ""} ORDER BY ${library ? "a.finalized_at" : "a.created_at"} DESC,a.id`, [id]);
      return Promise.all(rows.map(r => this.assetDto(c, owner, r)));
    });
  }
  async patchAsset(raw: string | undefined, id: string, input: unknown) {
    const d = assetPatch.parse(input);
    return this.run(raw, async (c, owner) => {
      const row = await this.assetRow(c, owner, id); this.checkVersion(row, d.version);
      if (row.finalized_at || row.verification_job_id) throw new AppError("STATE_CONFLICT");
      if (d.deleted) {
        const references = await c.query("SELECT 1 FROM projects WHERE cover->>'assetId'=$1 UNION ALL SELECT 1 FROM monitoring_records WHERE source_asset_id=$1 UNION ALL SELECT 1 FROM jobs WHERE input->'assetIds' ? $1 LIMIT 1", [id]);
        if (references.rowCount) throw new AppError("STATE_CONFLICT");
      }
      const { rows: [r] } = await c.query("UPDATE assets SET adopted=$2,deleted_at=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *", [id, d.adopted ?? row.adopted, d.deleted ? new Date() : null]);
      if (d.deleted) await reserveCleanup(c, owner, "asset", id, row.file);
      return this.assetDto(c, owner, r);
    });
  }
}
export function workspaceService() { return new WorkspaceService(authService()); }
