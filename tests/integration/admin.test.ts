import { randomUUID, randomBytes } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { seedDatabase } from "../../lib/server/db/seed";
import { AuthService, digest } from "../../lib/server/auth/service";
import { AdminAccess } from "../../lib/server/admin/access";
import { AdminService } from "../../lib/server/admin/service";
import { ContentService } from "../../lib/server/localized-contents/service";
import { JobService } from "../../lib/server/jobs/service";
import { HandlerRegistry } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { publishedContent } from "../../lib/i18n/content";
import { importSchema } from "../../lib/contracts/admin";
import * as schema from "../../db/schema";
const { pool } = createDatabase(getTestDatabaseUrl(), 8), db = drizzle(pool, { schema }), auth = new AuthService(pool, async () => { }, "http://localhost:3000"), access = new AdminAccess(auth);
const registry = new HandlerRegistry().register("matching", { run: async () => ({ output: { schemaVersion: 1, kind: "matching", partnerIds: [] } }) }), admin = new AdminService(access, new JobService(auth, registry, developmentQueuePolicy)), content = new ContentService(access);
const ids: string[] = [], partners: string[] = [], projects: string[] = [], guides: string[] = [];
let raw: string, member: string, actor: string, target: string;
const reason = "Synthetic phase 6 check", password = "eight888";
async function user(role = "member") { const id = randomUUID(), token = randomBytes(32).toString('hex'); ids.push(id); await pool.query("INSERT INTO users(id,email,name,email_verified,status,app_role,profile_completed_at) VALUES($1,$2,'Fixture',true,'active',$3,now())", [id, `${id}@example.test`, role]); await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, digest(token)]); await pool.query("INSERT INTO auth_accounts(id,user_id,account_id,provider_id,password) VALUES($1,$2,$2,'credential',$3)", [randomUUID(), id, await hashPassword(password)]); return { id, token }; }
const partnerInput = { name: "Original", description: "Source", contactEmail: null, visibility: "private", tags: ["tag"], ipNames: ["IP"], reason };
async function partner() { const p = await admin.partner(raw, undefined, partnerInput); partners.push(p.id); return p; }
const translation = (key: string, version = 0, sourceRevision = 1, name = "Translated") => ({ resourceType: "partner" as const, resourceKey: key, locale: "en", version, sourceRevision, content: { schemaVersion: 1 as const, resourceType: "partner" as const, name, description: "Translation" } });
beforeAll(async () => { await migrateDatabase(pool); await seedDatabase(db); const a = await user('admin'), m = await user(); raw = a.token; actor = a.id; member = m.token; target = m.id; await access.verify(raw, { password }); });
afterAll(async () => {
    await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM localized_contents WHERE resource_key=ANY($1)", [[...partners, ...guides]]);
    await pool.query("DELETE FROM brand_guides WHERE id=ANY($1)", [guides]);
    await pool.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [ids]);
    await pool.query("DELETE FROM projects WHERE id=ANY($1)", [projects]);
    await pool.query("DELETE FROM partners WHERE id=ANY($1)", [partners]);
    await pool.query("DELETE FROM admin_audit_logs WHERE actor_id=ANY($1)", [ids]);
    for (const t of ['auth_sessions', 'auth_accounts'])
        await pool.query(`DELETE FROM ${t} WHERE user_id=ANY($1)`, [ids]);
    await pool.query("DELETE FROM users WHERE id=ANY($1)", [ids]);
    await pool.query("DELETE FROM auth_rate_limits WHERE key=ANY($1)", [ids.map(id => digest(`admin-reauth:${id}`))]);
    await pool.query("DELETE FROM locales WHERE code IN ('fr','de')");
    await pool.end();
});
it('requires active admin plus same-session 15 minute reauthentication; expiry and revocation fail closed', async () => {
    await expect(admin.overview(member)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(admin.overview(undefined)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const a = await user('admin');
    await expect(admin.overview(a.token)).rejects.toMatchObject({ code: 'ADMIN_REAUTH_REQUIRED' });
    await expect(access.verify(a.token, { password: 'wrong888' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const verified = await access.verify(a.token, { password });
    expect(new Date(verified.expiresAt).getTime() - Date.now()).toBeGreaterThan(890000);
    await expect(admin.overview(a.token)).resolves.toHaveProperty('users');
    const other = await auth.login({ email: `${a.id}@example.test`, password, locale: 'ko' });
    await expect(admin.overview(other.token)).rejects.toMatchObject({ code: 'ADMIN_REAUTH_REQUIRED' });
    await pool.query("UPDATE auth_sessions SET admin_verified_until=now()-interval '1 second' WHERE token=$1", [digest(a.token)]);
    await expect(admin.overview(a.token)).rejects.toMatchObject({ code: 'ADMIN_REAUTH_REQUIRED' });
    await auth.logout(a.token);
    await expect(admin.overview(a.token)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});
it('limits failed reconfirmations independently of rollback and never records passwords', async () => { const a = await user('admin'); for (let i = 0; i < 5; i++)
    await expect(access.verify(a.token, { password: 'wrong888' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' }); await expect(access.verify(a.token, { password })).rejects.toMatchObject({ code: 'RATE_LIMITED' }); expect(JSON.stringify((await pool.query('SELECT changes,reason FROM admin_audit_logs WHERE actor_id=$1', [a.id])).rows)).not.toContain(password); });
it('suspends/restores with version and reason; revokes all sessions and prevents withdrawal resurrection', async () => {
    await expect(admin.user(raw, target, { version: 1, action: 'suspend', reason: '' })).rejects.toThrow();
    const r = await admin.user(raw, target, { version: 1, action: 'suspend', reason });
    expect(r.status).toBe('suspended');
    expect(await auth.session(member)).toBeNull();
    await expect(admin.user(raw, target, { version: 1, action: 'restore', reason })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await admin.user(raw, target, { version: 2, action: 'restore', reason });
    await pool.query("UPDATE users SET status='withdrawal_pending' WHERE id=$1", [target]);
    await expect(admin.user(raw, target, { version: 3, action: 'restore', reason })).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
    await pool.query("UPDATE users SET status='active' WHERE id=$1", [target]);
    await expect(admin.user(raw, actor, { version: 1, action: 'suspend', reason })).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
});
it('serializes two admins acting on one another without deadlock', async () => { const a = await user('admin'), b = await user('admin'); await access.verify(a.token, { password }); await access.verify(b.token, { password }); const results = await Promise.allSettled([admin.user(a.token, b.id, { version: 1, action: 'suspend', reason }), admin.user(b.token, a.id, { version: 1, action: 'suspend', reason })]); expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1); });
it('edits and archives/restores project with conflict checking and audit', async () => { const id = randomUUID(); projects.push(id); await pool.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES($1,$2,'Project','IP')", [id, target]); const d = { version: 1, name: 'Updated', ipName: 'IP', description: 'Notes', archived: true, reason }; await admin.project(raw, id, d); await expect(admin.project(raw, id, d)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' }); await admin.project(raw, id, { ...d, version: 2, archived: false }); const row = await admin.detail(raw, 'projects', id); expect(row.name).toBe('Updated'); expect(row.archived_at).toBeNull(); });
it('lists seven resources, searches literal text, paginates and audits personal detail only', async () => { const p = await partner(); for (const kind of ['users', 'projects', 'partners', 'jobs', 'guides', 'monitoring-records', 'audit-logs'])
    expect(await admin.list(raw, kind, { page: 1, pageSize: 1 })).toHaveProperty('items'); expect((await admin.list(raw, 'partners', { q: '%', pageSize: 1 })).items).toHaveLength(0); expect((await admin.list(raw, 'partners', { q: 'original' })).total).toBeGreaterThan(0); const list = await admin.list(raw, 'users', {}); expect(list.items.some(r => 'email' in r)).toBe(false); const detail = await admin.detail(raw, 'users', target); expect(detail.email).toContain('@example.test'); const logs = (await pool.query("SELECT * FROM admin_audit_logs WHERE action='admin.read' AND entity_id=$1", [target])).rows; expect(logs.length).toBeGreaterThan(0); expect(JSON.stringify(await admin.detail(raw, 'partners', p.id))).not.toContain('storageKey'); });
it('keeps default-language source publication atomic and preserves previous foreign publication after source changes', async () => {
    const p = await partner(), e = translation(p.id);
    await content.import(raw, { schemaVersion: 1, entries: [e], reason });
    let r = await content.get(raw, 'partner', p.id, 'en');
    expect(r.published).toBeNull();
    await content.publish(raw, { ...e, version: r.version, reason });
    r = await content.get(raw, 'partner', p.id, 'en');
    expect(r.publishedVersion).toBe(1);
    const start = Date.now();
    await admin.partner(raw, p.id, { ...partnerInput, name: 'Changed source', version: 1 });
    r = await content.get(raw, 'partner', p.id, 'en');
    expect(r.needsUpdate).toBe(true);
    expect(r.published).toMatchObject({ name: 'Translated' });
    expect((await content.get(raw, 'partner', p.id, 'ko')).published).toMatchObject({ name: 'Changed source' });
    expect(Date.now() - start).toBeLessThan(60000);
    await expect(content.publish(raw, { ...e, version: r.version, reason })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await seedDatabase(db);
    expect((await content.get(raw, 'partner', p.id, 'en')).published).toMatchObject({ name: 'Translated' });
});
it('public translation reader never serves drafts and resolves locale fallbacks', async () => {
    const p = await partner();
    await content.import(raw, { schemaVersion: 1, entries: [translation(p.id)], reason });
    const input = { resourceType: 'partner' as const, resourceKey: p.id, requestedLocale: 'en', originalLocale: 'ko', original: { schemaVersion: 1, resourceType: 'partner', name: 'Original', description: 'Source' }, registry: [{ code: 'ko', enabled: true, fallbackCode: null, nativeName: 'Korean', direction: 'ltr', sortOrder: 0 }, { code: 'en', enabled: true, fallbackCode: 'ko', nativeName: 'English', direction: 'ltr', sortOrder: 1 }] };
    expect(await publishedContent(input, db)).toMatchObject({ resolvedLocale: 'ko', fallbackUsed: true, content: { name: 'Original' } });
    await content.publish(raw, { ...translation(p.id), version: 1, reason });
    expect(await publishedContent(input, db)).toMatchObject({ resolvedLocale: 'en', fallbackUsed: false, content: { name: 'Translated' } });
});
it('previews without mutation, imports atomically, rejects stale versions and deduplicates reuploads', async () => {
    const a = await partner(), b = await partner(), entries = [translation(a.id), translation(b.id)];
    const preview = await content.import(raw, { schemaVersion: 1, entries, reason }, true);
    expect(preview.changed).toBe(2);
    expect((await content.get(raw, 'partner', a.id, 'en')).version).toBe(0);
    await content.import(raw, { schemaVersion: 1, entries, reason });
    expect((await content.import(raw, { schemaVersion: 1, entries, reason })).changed).toBe(0);
    await expect(content.import(raw, { schemaVersion: 1, entries: [{ ...translation(a.id, 1), content: { ...entries[0].content, name: 'Change' } }, { ...translation(b.id, 0), content: { ...entries[1].content, name: 'Stale' } }], reason })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await content.get(raw, 'partner', a.id, 'en')).draft).toMatchObject({ name: 'Translated' });
});
it('rejects duplicate, oversized, malicious and unsupported resource import data', async () => { const p = await partner(), e = translation(p.id); for (const entries of [[e, e], [{ ...e, resourceType: 'email' }], [{ ...e, content: { ...e.content, contactEmail: 'bad@example.test' } }], [{ ...e, resourceKey: '../bad' }]])
    await expect(content.import(raw, { schemaVersion: 1, entries, reason })).rejects.toThrow(); expect(importSchema.safeParse({ schemaVersion: 1, entries: [e], reason, landing: {} }).success).toBe(false); await expect(content.import(raw, { schemaVersion: 1, entries: Array.from({ length: 101 }, (_, i) => ({ ...e, resourceKey: String(i) })), reason })).rejects.toThrow(); });
it('guide translation accepts only existing unique rule IDs and rejects conditions', async () => {
    const project = randomUUID(), guide = randomUUID(), ruleId = randomUUID();
    projects.push(project);
    guides.push(guide);
    await pool.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES($1,$2,'Guide project','IP')", [project, target]);
    await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules) VALUES($1,$2,1,$3,$4)", [guide, project, { schemaVersion: 1, storageKey: 'fixture', originalName: 'fixture.pdf', mimeType: 'application/pdf', size: 1, checksum: 'a'.repeat(64) }, { schemaVersion: 1, rules: [{ ruleId, title: 'Source', description: 'Rule', condition: { field: 'color', operator: 'equals', value: 'red' }, evidence: { page: 1, excerpt: 'Rule' } }] }]);
    const e = { resourceType: 'guide', resourceKey: guide, locale: 'en', version: 0, sourceRevision: 1, content: { schemaVersion: 1, resourceType: 'guide', rules: [{ ruleId, title: 'Translated rule', description: 'Explanation' }] } };
    await content.import(raw, { schemaVersion: 1, entries: [e], reason });
    await content.publish(raw, { ...e, version: 1, reason });
    await expect(content.import(raw, { schemaVersion: 1, entries: [{ ...e, version: 2, content: { ...e.content, rules: [{ ruleId: randomUUID(), title: 'Bad', description: '' }] } }], reason })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
});
it('enforces deployed-pack intersection, default language and acyclic locale registration', async () => {
    const base = { nativeName: 'French', displayName: 'French', direction: 'ltr', fallbackCode: 'ko', enabled: false, sortOrder: 10, reason };
    await admin.locale(raw, undefined, { ...base, code: 'fr' });
    await expect(admin.locale(raw, 'fr', { ...base, enabled: true, version: 1 })).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
    await admin.locale(raw, undefined, { ...base, code: 'de', fallbackCode: 'fr' });
    await expect(admin.locale(raw, 'fr', { ...base, fallbackCode: 'de', version: 1 })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const ko = (await admin.locales(raw)).items.find(r => r.code === 'ko');
    await expect(admin.locale(raw, 'ko', { ...base, enabled: false, fallbackCode: null, version: ko.version })).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
    expect((await admin.locales(raw)).items.find(r => r.code === 'fr')).toMatchObject({ deployed: false, enabled: false });
});
it('admin retries use new child, preserve unknown outcomes, cancel queued and audit without job payloads', async () => {
    const job = randomUUID();
    await pool.query("INSERT INTO jobs(id,owner_id,kind,status,input,request_hash,error_code) VALUES($1,$2,'matching','failed',$3,$4,'TRANSIENT')", [job, target, { schemaVersion: 1, kind: 'matching', outputLocale: 'ko', preferences: { schemaVersion: 1 } }, 'a'.repeat(64)]);
    const child = await admin.job(raw, job, { action: 'retry', reason });
    expect(child.retryOfId).toBe(job);
    expect((await admin.job(raw, job, { action: 'retry', reason })).id).toBe(child.id);
    await admin.job(raw, child.id, { action: 'cancel', reason });
    expect((await admin.detail(raw, 'jobs', child.id)).status).toBe('canceled');
    await pool.query("UPDATE jobs SET dispatched_at=now(),error_code='PROVIDER_UNKNOWN',cost_state='unknown' WHERE id=$1", [child.id]);
    await expect(admin.job(raw, child.id, { action: 'retry', reason })).rejects.toMatchObject({ code: 'STATE_CONFLICT' });
    const logs = JSON.stringify((await pool.query("SELECT changes FROM admin_audit_logs WHERE entity_type='job' AND actor_id=$1", [actor])).rows);
    expect(logs).not.toContain('preferences');
});
it('allows only one conflicting concurrent draft edit and preserves omitted optional fields', async () => {
    const p = await partner(), e = translation(p.id);
    await content.import(raw, { schemaVersion: 1, entries: [{ ...e, content: { ...e.content, imageAlt: 'Accessible image' } }], reason });
    const results = await Promise.allSettled(['A', 'B'].map(name => content.import(raw, { schemaVersion: 1, entries: [translation(p.id, 1, 1, name)], reason })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    const row = await content.get(raw, 'partner', p.id, 'en');
    expect(row.draft).toHaveProperty('imageAlt', 'Accessible image');
    expect(row.version).toBe(2);
});
it('password changes and account suspension invalidate an already verified admin session', async () => {
    const a = await user('admin');
    await access.verify(a.token, { password });
    await auth.changePassword(a.token, password, 'updated888');
    await expect(admin.overview(a.token)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const b = await user('admin');
    await access.verify(b.token, { password });
    await admin.user(raw, b.id, { version: 1, action: 'suspend', reason });
    await expect(admin.overview(b.token)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});
it('rejects aggregate import bytes over 64KiB before any draft is saved', async () => {
    const p = await partner(), e = translation(p.id), entries = Array.from({ length: 8 }, (_, i) => ({ ...e, resourceKey: `missing-${i}`, content: { ...e.content, description: 'x'.repeat(10000) } }));
    await expect(content.import(raw, { schemaVersion: 1, entries, reason })).rejects.toThrow();
    expect((await content.get(raw, 'partner', p.id, 'en')).version).toBe(0);
});
