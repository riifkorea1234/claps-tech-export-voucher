import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { AdminAccess, audit } from "../admin/access";
import { AppError } from "../errors/http";
import { importSchema, reasonSchema, translationSchema } from "../../contracts/admin";
import { idSchema, localeCodeSchema } from "../../contracts/common";
import { guideRulesSchema, localizedContentSchema, parseMetadata } from "../../contracts/metadata";
export type Content = z.infer<typeof localizedContentSchema>;
export async function source(c: PoolClient, type: string, key: string) {
    idSchema.parse(key);
    if (type === "partner") {
        const { rows: [row] } = await c.query("SELECT * FROM partners WHERE id=$1 FOR UPDATE", [key]);
        if (!row)
            throw new AppError("NOT_FOUND");
        return { revision: row.source_revision as number, content: { schemaVersion: 1, resourceType: "partner", name: row.name, description: row.profile.description, ipNames: row.profile.ipNames, marketDescription: row.profile.marketDescription ?? "", imageAlt: row.profile.imageAlt ?? "" } as Content };
    }
    if (type !== "guide")
        throw new AppError("VALIDATION_ERROR");
    const { rows: [row] } = await c.query("SELECT * FROM brand_guides WHERE id=$1 FOR UPDATE", [key]);
    if (!row)
        throw new AppError("NOT_FOUND");
    const rules = guideRulesSchema.parse(row.rules);
    return { revision: row.source_revision as number, content: { schemaVersion: 1, resourceType: "guide", rules: rules.rules.map(({ ruleId, title, description }) => ({ ruleId, title, description })) } as Content };
}
export function validateContent(input: unknown, original: Content): Content {
    const content = parseMetadata(localizedContentSchema, input);
    if (content.resourceType !== original.resourceType)
        throw new AppError("VALIDATION_ERROR");
    if (content.resourceType === "partner") {
        if (!content.name.trim())
            throw new AppError("VALIDATION_ERROR");
    }
    else if (original.resourceType === "guide") {
        const ids = content.rules.map(r => r.ruleId);
        if (new Set(ids).size !== ids.length || content.rules.some(r => !r.title.trim()) || JSON.stringify([...ids].sort()) !== JSON.stringify(original.rules.map(r => r.ruleId).sort()))
            throw new AppError("VALIDATION_ERROR");
    }
    return content;
}
export async function syncOriginal(c: PoolClient, actor: string, type: string, key: string, revision: number, content: Content) {
    await c.query(`INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,published,published_at,updated_by,published_source_revision,published_version)
    VALUES($1,$2,$3,'ko',$4,$5,$5,now(),$6,$4,1) ON CONFLICT(resource_type,resource_key,locale_code)
    DO UPDATE SET source_revision=$4,draft=$5,published=$5,published_at=now(),updated_by=$6,updated_at=now(),version=localized_contents.version+1,published_source_revision=$4,published_version=localized_contents.published_version+1`, [randomUUID(), type, key, revision, content, actor]);
}
export class ContentService {
    constructor(readonly access: AdminAccess) { }
    async get(raw: string | undefined, type: string, key: string, locale: string) {
        localeCodeSchema.parse(locale);
        return this.access.run(raw, async (c, u) => {
            const original = await source(c, type, key);
            if (!(await c.query("SELECT 1 FROM locales WHERE code=$1", [locale])).rowCount)
                throw new AppError("NOT_FOUND");
            const { rows: [row] } = await c.query("SELECT draft,published,version,source_revision,published_source_revision,published_version,published_at FROM localized_contents WHERE resource_type=$1 AND resource_key=$2 AND locale_code=$3", [type, key, locale]);
            await audit(c, u.id, "translation.read", type, key, "Content editor access");
            return { resourceType: type, resourceKey: key, locale, original: original.content, sourceRevision: original.revision, version: row?.version ?? 0, draft: row?.draft ?? original.content, published: row?.published ?? null, publishedVersion: row?.published_version ?? 0, needsUpdate: !!row?.published && row.published_source_revision !== original.revision };
        });
    }
    async saveLocked(c: PoolClient, actor: string, entry: z.infer<typeof translationSchema>, preview: boolean) {
        const original = await source(c, entry.resourceType, entry.resourceKey);
        if (entry.locale === "ko")
            throw new AppError("STATE_CONFLICT"); // original is edited in its resource form
        if (!(await c.query("SELECT 1 FROM locales WHERE code=$1", [entry.locale])).rowCount)
            throw new AppError("VALIDATION_ERROR");
        if (entry.sourceRevision !== original.revision)
            throw new AppError("VERSION_CONFLICT");
        const { rows: [row] } = await c.query("SELECT * FROM localized_contents WHERE resource_type=$1 AND resource_key=$2 AND locale_code=$3 FOR UPDATE", [entry.resourceType, entry.resourceKey, entry.locale]);
        const content = validateContent({ ...original.content, ...(row?.draft ?? {}), ...entry.content }, original.content);
        const same = row && row.source_revision === entry.sourceRevision && JSON.stringify(localizedContentSchema.parse(row.draft)) === JSON.stringify(content);
        if (!same && (row?.version ?? 0) !== entry.version)
            throw new AppError("VERSION_CONFLICT");
        if (preview || same)
            return { ...entry, version: row?.version ?? 0, changed: !same, before: row?.draft ?? null, after: content };
        const { rows: [saved] } = await c.query(`INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(resource_type,resource_key,locale_code) DO UPDATE SET draft=$6,source_revision=$5,updated_by=$7,version=localized_contents.version+1,updated_at=now() RETURNING version`, [randomUUID(), entry.resourceType, entry.resourceKey, entry.locale, entry.sourceRevision, content, actor]);
        return { ...entry, version: saved.version, changed: true, before: row?.draft ?? null, after: content };
    }
    async import(raw: string | undefined, input: unknown, preview = false) {
        const data = importSchema.parse(input);
        parseMetadata(importSchema, data);
        return this.access.run(raw, async (c, u) => {
            // Stable resource order also serializes imports across different admins.
            const entries = [...data.entries].sort((a, b) => `${a.resourceType}/${a.resourceKey}/${a.locale}`.localeCompare(`${b.resourceType}/${b.resourceKey}/${b.locale}`));
            const result = [];
            for (const entry of entries)
                result.push(await this.saveLocked(c, u.id, entry, preview));
            if (!preview)
                for (const entry of result.filter(e => e.changed))
                    await audit(c, u.id, "translation.import", entry.resourceType, entry.resourceKey, data.reason, [{ field: "draftVersion", before: String(entry.version - 1), after: String(entry.version) }, { field: "locale", before: null, after: entry.locale }]);
            return { entries: result, changed: result.filter(r => r.changed).length, preview };
        });
    }
    async publish(raw: string | undefined, input: unknown) {
        const { reason, ...entry } = z.object({ reason: reasonSchema }).passthrough().parse(input);
        const data = { ...translationSchema.parse(entry), reason };
        return this.access.run(raw, async (c, u) => {
            const original = await source(c, data.resourceType, data.resourceKey);
            if (data.locale === "ko")
                throw new AppError("STATE_CONFLICT");
            const { rows: [row] } = await c.query("SELECT * FROM localized_contents WHERE resource_type=$1 AND resource_key=$2 AND locale_code=$3 FOR UPDATE", [data.resourceType, data.resourceKey, data.locale]);
            if (!row)
                throw new AppError("NOT_FOUND");
            if (row.version !== data.version || row.source_revision !== original.revision || data.sourceRevision !== original.revision)
                throw new AppError("VERSION_CONFLICT");
            const content = validateContent(row.draft, original.content);
            await c.query("UPDATE localized_contents SET published=draft,published_at=now(),published_source_revision=source_revision,published_version=published_version+1,version=version+1,updated_at=now(),updated_by=$1 WHERE id=$2", [u.id, row.id]);
            await audit(c, u.id, "translation.publish", data.resourceType, data.resourceKey, data.reason, [{ field: "publishedVersion", before: String(row.published_version), after: String(row.published_version + 1) }, { field: "locale", before: null, after: data.locale }]);
            return { published: content, version: row.version + 1, publishedVersion: row.published_version + 1 };
        });
    }
}
