import { MonitoringService } from "../monitoring/service";
import { WorkspaceService } from "../projects/service";
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AdminAccess, audit } from "./access";
import { adminQuery, localeSchema, localePatchSchema, partnerSchema, partnerPatchSchema, reasonSchema } from "../../contracts/admin";
import { partnerProfileSchema, parseMetadata } from "../../contracts/metadata";
import { localeCodeSchema, idSchema, versionSchema, paginate } from "../../contracts/common";
import { AppError } from "../errors/http";
import { deployedLocales } from "../../i18n/server";
import { validateFallbacks, type LocaleEntry } from "../../i18n/core";
import { syncOriginal } from "../localized-contents/service";
import { JobService, jobDto } from "../jobs/service";
import type { JobRow } from "../jobs/types";
const lists = {
    users: { table: "users", columns: "id,name,org_name,status,version,created_at", search: "name || ' ' || COALESCE(org_name,'') || ' ' || email" },
    projects: { table: "projects", columns: "id,name,ip_name,owner_id,status,version,archived_at,created_at", search: "name || ' ' || ip_name" },
    partners: { table: "partners", columns: "id,name,visibility,version,source_revision,created_at", search: "name || ' ' || (profile->'ipNames')::text" },
    jobs: { table: "jobs", columns: "id,owner_id,project_id,kind,status,attempt,retry_of_id,cancel_requested_at,cost_state,error_code,created_at", search: "kind || ' ' || status || ' ' || owner_id" },
    guides: { table: "brand_guides", columns: "id,project_id,status,version,source_revision,created_at", search: "id || ' ' || project_id" },
    "monitoring-records": { table: "monitoring_records", columns: "id,name,owner_id,latest_result_count,version,archived_at,created_at", search: "name || ' ' || owner_id" },
    "audit-logs": { table: "admin_audit_logs", columns: "id,actor_id,action,entity_type,entity_id,changes,reason,request_id,created_at", search: "action || ' ' || entity_id" },
} as const;
export type ListKind = keyof typeof lists;
export class AdminService {
    constructor(readonly access: AdminAccess, readonly jobs: JobService) { }
    async overview(raw: string | undefined) {
        return this.access.run(raw, async (c) => {
            const { rows: [counts] } = await c.query(`SELECT (SELECT count(*)::int FROM users) users,(SELECT count(*)::int FROM projects) projects,
      (SELECT count(*)::int FROM jobs WHERE status='queued') queued,(SELECT count(*)::int FROM jobs WHERE status='failed') failed,
      (SELECT count(*)::int FROM storage_tickets WHERE state='cleanup_pending') cleanup`);
            const usage = (await c.query("SELECT date_trunc('day',created_at) AS usage_date,kind,status,count(*)::int requests FROM jobs WHERE created_at>now()-interval '30 days' GROUP BY 1,2,3 ORDER BY 1 DESC")).rows;
            return { ...counts, usage };
        });
    }
    async list(raw: string | undefined, kind: string, query: unknown) {
        if (!(Object.hasOwn(lists, kind)))
            throw new AppError("NOT_FOUND");
        const config = lists[kind as ListKind], q = adminQuery.parse(query);
        return this.access.run(raw, async (c) => {
            const values: unknown[] = [q.q];
            const conditions = [`strpos(lower(${config.search}),lower($1))>0`];
            for (const [key, column] of [["status", "status"], ["kind", "kind"], ["ownerId", "owner_id"], ["projectId", "project_id"]] as const) {
                if (q[key]) {
                    if (!config.columns.split(",").includes(column))
                        throw new AppError("VALIDATION_ERROR");
                    values.push(q[key]);
                    conditions.push(`${column}=$${values.length}`);
                }
            }
            if (q.from) {
                values.push(q.from);
                conditions.push(`created_at >= $${values.length}`);
            }
            if (q.to) {
                values.push(q.to);
                conditions.push(`created_at <= $${values.length}`);
            }
            const where = conditions.join(" AND ");
            const total = (await c.query(`SELECT count(*)::int n FROM ${config.table} WHERE ${where}`, values)).rows[0].n;
            const items = (await c.query(`SELECT ${config.columns} FROM ${config.table} WHERE ${where} ORDER BY created_at DESC,id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, q.pageSize, (q.page - 1) * q.pageSize])).rows;
            return { items, ...paginate(q.page, q.pageSize, total) };
        });
    }
    async detail(raw: string | undefined, kind: string, id: string) {
        idSchema.parse(id);
        if (!(Object.hasOwn(lists, kind)) || kind === "audit-logs")
            throw new AppError("NOT_FOUND");
        return this.access.run(raw, async (c, u) => {
            const config = lists[kind as ListKind];
            const extras = kind === "users" ? ",email,app_role" : kind === "projects" ? ",description,active_guide_id" : kind === "partners" ? ",contact_email,profile" : kind === "jobs" ? ",provider,provider_request_id,usage" : "";
            const { rows: [row] } = await c.query(`SELECT ${config.columns}${extras} FROM ${config.table} WHERE id=$1`, [id]);
            if (!row)
                throw new AppError("NOT_FOUND");
            if (kind === "monitoring-records") {
                const service = new MonitoringService(new WorkspaceService(this.access.auth), this.jobs);
                const record = await service.row(c, row.owner_id, id, true);
                row.record = await service.dto(c, record);
                row.scans = await service.historyLocked(c, row.owner_id, id, 1);
            }
            if (kind === "partners")
                row.profile = { description: row.profile.description, tags: row.profile.tags, ipNames: row.profile.ipNames, marketDescription: row.profile.marketDescription ?? "", imageAlt: row.profile.imageAlt ?? "", imageCount: row.profile.images.length };
            if (kind === "users") {
                row.projects = (await c.query("SELECT id,name FROM projects WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100", [id])).rows;
                row.jobs = (await c.query("SELECT id,kind,status FROM jobs WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100", [id])).rows;
            }
            if (kind === "projects") {
                row.sessions = (await c.query("SELECT id,title FROM asset_sessions WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100", [id])).rows;
                row.assets = (await c.query("SELECT a.id,a.adopted,a.finalized_at,a.verification FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE s.project_id=$1 AND a.deleted_at IS NULL ORDER BY a.created_at DESC LIMIT 100", [id])).rows;
                row.guides = (await c.query("SELECT id,status,version FROM brand_guides WHERE project_id=$1 ORDER BY version DESC LIMIT 100", [id])).rows;
                row.jobs = (await c.query("SELECT id,kind,status FROM jobs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100", [id])).rows;
            }
            await audit(c, u.id, "admin.read", kind, id, "Administrative detail access");
            return row;
        }, kind === "monitoring-records" ? { kind: "monitoring", id } : undefined);
    }
    async monitoringHistory(raw: string | undefined, id: string, query: unknown) {
        const page = z.strictObject({ page: z.coerce.number().int().min(1).max(1000000).default(1) }).parse(query).page;
        idSchema.parse(id);
        return this.access.run(raw, async (c, actor) => {
            const r = (await c.query("SELECT owner_id FROM monitoring_records WHERE id=$1", [id])).rows[0];
            if (!r) throw new AppError("NOT_FOUND");
            const data = await new MonitoringService(new WorkspaceService(this.access.auth), this.jobs).historyLocked(c, r.owner_id, id, page);
            await audit(c, actor.id, "admin.read", "monitoring", id, "Monitoring history access");
            return data;
        }, { kind: "monitoring", id });
    }
    async monitoring(raw: string | undefined, id: string, input: unknown) {
        idSchema.parse(id);
        const d = z.strictObject({ action: z.enum(["archive", "restore", "scan"]), version: versionSchema, reason: reasonSchema, idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(), outputLocale: localeCodeSchema.default("ko") }).parse(input);
        return this.access.run(raw, async (c, actor) => {
            const r = (await c.query("SELECT * FROM monitoring_records WHERE id=$1", [id])).rows[0];
            if (!r) throw new AppError("NOT_FOUND");
            const owner = (await c.query("SELECT status FROM users WHERE id=$1", [r.owner_id])).rows[0];
            if (owner?.status !== "active") throw new AppError("STATE_CONFLICT");
            const workspace = new WorkspaceService(this.access.auth), service = new MonitoringService(workspace, this.jobs);
            workspace.checkVersion(r, d.version);
            if (d.action === "scan" && !d.idempotencyKey) throw new AppError("VALIDATION_ERROR");
            const result = d.action === "scan" ? await service.requestLocked(c, r.owner_id, id, { outputLocale: d.outputLocale, idempotencyKey: d.idempotencyKey }) : await service.patchLocked(c, r.owner_id, id, { version: d.version, archived: d.action === "archive" });
            await audit(c, actor.id, `monitoring.${d.action}`, "monitoring", id, d.reason);
            return result;
        }, { kind: "monitoring", id });
    }
    async user(raw: string | undefined, id: string, input: unknown) {
        idSchema.parse(id);
        const data = z.strictObject({ version: versionSchema, action: z.enum(["suspend", "restore", "revoke"]), reason: reasonSchema }).parse(input);
        return this.access.run(raw, async (c, u) => {
            const { rows: [row] } = await c.query("SELECT * FROM users WHERE id=$1", [id]);
            if (!row)
                throw new AppError("NOT_FOUND");
            if (row.version !== data.version)
                throw new AppError("VERSION_CONFLICT");
            if (data.action === "suspend" && (id === u.id || row.status !== "active"))
                throw new AppError("STATE_CONFLICT");
            if (data.action === "restore" && (row.status !== "suspended" || !row.email_verified || !row.profile_completed_at))
                throw new AppError("STATE_CONFLICT");
            const status = data.action === "suspend" ? "suspended" : data.action === "restore" ? "active" : row.status;
            await c.query("UPDATE users SET status=$2,version=version+1,updated_at=now() WHERE id=$1", [id, status]);
            await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [id]);
            await c.query("DELETE FROM auth_verifications WHERE identifier=ANY($1)", [[`verify:${id}`, `reset:${id}`]]);
            await audit(c, u.id, `user.${data.action}`, "user", id, data.reason, [{ field: "status", before: row.status, after: status }, { field: "sessionsRevoked", before: false, after: true }]);
            return { id, status, version: row.version + 1 };
        }, { kind: "user", id });
    }
    async project(raw: string | undefined, id: string, input: unknown) {
        idSchema.parse(id);
        const data = z.strictObject({ version: versionSchema, name: z.string().trim().min(1).max(200), ipName: z.string().trim().min(1).max(200), description: z.string().max(10000), archived: z.boolean(), reason: reasonSchema }).parse(input);
        return this.access.run(raw, async (c, u) => {
            const { rows: [row] } = await c.query("SELECT * FROM projects WHERE id=$1 FOR UPDATE", [id]);
            if (!row)
                throw new AppError("NOT_FOUND");
            if (row.version !== data.version)
                throw new AppError("VERSION_CONFLICT");
            await c.query("UPDATE projects SET name=$2,ip_name=$3,description=$4,archived_at=CASE WHEN $5 THEN COALESCE(archived_at,now()) ELSE NULL END,version=version+1,updated_at=now() WHERE id=$1", [id, data.name, data.ipName, data.description, data.archived]);
            await audit(c, u.id, "project.update", "project", id, data.reason, [{ field: "name", before: row.name, after: data.name }, { field: "ipName", before: row.ip_name, after: data.ipName }, { field: "descriptionChanged", before: false, after: row.description !== data.description }, { field: "archivedAt", before: row.archived_at?.toISOString() ?? null, after: data.archived ? "archived" : null }]);
            return { id, version: row.version + 1 };
        }, { kind: "project", id });
    }
    async partner(raw: string | undefined, id: string | undefined, input: unknown) {
        if (id)
            idSchema.parse(id);
        const data = id ? partnerPatchSchema.parse(input) : partnerSchema.parse(input);
        return this.access.run(raw, async (c, u) => {
            const row = id ? (await c.query("SELECT * FROM partners WHERE id=$1 FOR UPDATE", [id])).rows[0] : undefined;
            if (id && !row)
                throw new AppError("NOT_FOUND");
            if (row && (!('version' in data) || row.version !== data.version))
                throw new AppError("VERSION_CONFLICT");
            const key = id ?? randomUUID();
            const changed = !row || row.name !== data.name || row.profile.description !== data.description || JSON.stringify(row.profile.ipNames) !== JSON.stringify(data.ipNames) || row.profile.marketDescription !== (data.marketDescription ?? row.profile.marketDescription) || row.profile.imageAlt !== (data.imageAlt ?? row.profile.imageAlt);
            const revision = row ? row.source_revision + (changed ? 1 : 0) : 1;
            const profile = { schemaVersion: 1, description: data.description, tags: data.tags, ipNames: data.ipNames, marketDescription: data.marketDescription ?? row?.profile.marketDescription ?? "", imageAlt: data.imageAlt ?? row?.profile.imageAlt ?? "", images: row?.profile.images ?? [] };
            try {
                parseMetadata(partnerProfileSchema, profile);
            }
            catch {
                throw new AppError("VALIDATION_ERROR");
            }
            await c.query(`INSERT INTO partners(id,name,contact_email,visibility,profile,source_revision) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(id) DO UPDATE SET name=$2,contact_email=$3,visibility=$4,profile=$5,source_revision=$6,version=partners.version+1,updated_at=now()`, [key, data.name, data.contactEmail, data.visibility, profile, revision]);
            if (changed)
                await syncOriginal(c, u.id, "partner", key, revision, { schemaVersion: 1, resourceType: "partner", name: data.name, description: data.description, ipNames: data.ipNames, marketDescription: profile.marketDescription, imageAlt: profile.imageAlt });
            await audit(c, u.id, row ? "partner.update" : "partner.create", "partner", key, data.reason, [{ field: "name", before: row?.name ?? null, after: data.name }, { field: "visibility", before: row?.visibility ?? null, after: data.visibility }, { field: "sourceRevision", before: row ? String(row.source_revision) : null, after: String(revision) }, ...["contactEmail", "tags", "ipNames", "description"].map(field => ({ field, before: null, after: "updated" }))]);
            return { id: key, version: row ? row.version + 1 : 1, sourceRevision: revision };
        });
    }
    async job(raw: string | undefined, id: string, input: unknown) {
        idSchema.parse(id);
        const data = z.strictObject({ action: z.enum(["retry", "cancel"]), reason: reasonSchema }).parse(input);
        return this.access.run(raw, async (c, u) => {
            const { rows: [row] } = await c.query<JobRow>("SELECT * FROM jobs WHERE id=$1 FOR UPDATE", [id]);
            if (!row)
                throw new AppError("NOT_FOUND");
            let result = row;
            if (data.action === "retry") {
                if (!(await c.query("SELECT 1 FROM users WHERE id=$1 AND status='active' AND email_verified=true", [row.owner_id])).rowCount)
                    throw new AppError("STATE_CONFLICT");
                result = await this.jobs.retryLocked(c, row);
            }
            else if (["queued", "running"].includes(row.status)) {
                result = (await c.query<JobRow>(`UPDATE jobs SET cancel_requested_at=COALESCE(cancel_requested_at,now()),status=CASE WHEN status='queued' THEN 'canceled' ELSE status END,
          finished_at=CASE WHEN status='queued' THEN now() ELSE finished_at END,error_code=CASE WHEN status='queued' THEN 'CANCELED' ELSE error_code END,updated_at=now() WHERE id=$1 RETURNING *`, [id])).rows[0];
            }
            await audit(c, u.id, `job.${data.action}`, "job", id, data.reason, [{ field: "status", before: row.status, after: result.status }, { field: "retryId", before: null, after: data.action === "retry" ? result.id : null }]);
            return jobDto(result, this.jobs.policy);
        }, { kind: "job", id });
    }
    async locales(raw: string | undefined) {
        const packs = await deployedLocales();
        return this.access.run(raw, async (c) => ({ items: (await c.query(`SELECT l.*, (SELECT count(*)::int FROM partners p WHERE p.visibility='public' AND NOT EXISTS(SELECT 1 FROM localized_contents t WHERE t.resource_type='partner' AND t.resource_key=p.id AND t.locale_code=l.code AND t.published IS NOT NULL AND t.published_source_revision=p.source_revision)) missing FROM locales l ORDER BY sort_order,code`)).rows.map(r => ({ ...r, deployed: packs.includes(r.code) })) }));
    }
    async locale(raw: string | undefined, code: string | undefined, input: unknown) {
        const data = code ? { ...localePatchSchema.parse(input), code } : localeSchema.parse(input);
        localeSchema.parse(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'version')));
        const packs = await deployedLocales();
        return this.access.run(raw, async (c, u) => {
            await c.query("SELECT pg_advisory_xact_lock(6026)");
            const rows = (await c.query("SELECT * FROM locales ORDER BY code FOR UPDATE")).rows;
            const old = rows.find(r => r.code === data.code);
            if (code && !old)
                throw new AppError("NOT_FOUND");
            if (!code && old || code && (!('version' in data) || old.version !== data.version))
                throw new AppError("VERSION_CONFLICT");
            if (data.code === "ko" && (!data.enabled || data.fallbackCode !== null) || data.enabled && !packs.includes(data.code))
                throw new AppError("STATE_CONFLICT");
            const entries: LocaleEntry[] = rows.filter(r => r.code !== data.code).map(r => ({ code: r.code, nativeName: r.native_name, direction: r.direction, fallbackCode: r.fallback_code, enabled: r.enabled, sortOrder: r.sort_order }));
            entries.push({ ...data });
            try {
                validateFallbacks(entries);
            }
            catch {
                throw new AppError("VALIDATION_ERROR");
            }
            await c.query(`INSERT INTO locales(code,native_name,display_name,direction,fallback_code,enabled,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(code) DO UPDATE SET native_name=$2,display_name=$3,direction=$4,fallback_code=$5,enabled=$6,sort_order=$7,version=locales.version+1,updated_at=now()`, [data.code, data.nativeName, data.displayName, data.direction, data.fallbackCode, data.enabled, data.sortOrder]);
            await audit(c, u.id, "locale.update", "locale", data.code, data.reason, [{ field: "enabled", before: old?.enabled ?? null, after: data.enabled }, { field: "fallbackCode", before: old?.fallback_code ?? null, after: data.fallbackCode }, ...["nativeName", "displayName", "direction", "sortOrder"].map(field => ({ field, before: null, after: "updated" }))]);
            return { code: data.code, version: old ? old.version + 1 : 1 };
        });
    }
}
