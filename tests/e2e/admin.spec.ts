import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import sharp from 'sharp';
const password = 'eight888', reason = 'Synthetic browser review';
const ids: string[] = [], partners: string[] = [];
const db = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
async function fixture(admin = true) {
    if (!process.env.TEST_DATABASE_URL || new URL(process.env.TEST_DATABASE_URL).pathname !== '/claps_test')
        throw new Error('Isolated DB required');
    const id = randomUUID(), token = randomBytes(32).toString('hex');
    ids.push(id);
    await db.query("INSERT INTO users(id,email,name,email_verified,status,app_role,profile_completed_at) VALUES($1,$2,'Browser fixture',true,'active',$3,now())", [id, `${id}@example.test`, admin ? 'admin' : 'member']);
    await db.query("INSERT INTO auth_accounts(id,user_id,account_id,provider_id,password) VALUES($1,$2,$2,'credential',$3)", [randomUUID(), id, await hashPassword(password)]);
    await db.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')", [randomUUID(), id, createHash('sha256').update(token).digest('hex')]);
    return { id, token };
}
async function login(page: import('@playwright/test').Page, baseURL: string, admin = true) { const a = await fixture(admin); await page.context().addCookies([{ name: 'claps-session', value: a.token, url: baseURL }, { name: 'claps-locale', value: 'en', url: baseURL }]); return a; }
async function verify(page: import('@playwright/test').Page) { await page.goto('/admin'); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Reconfirm administrator password' })).toHaveCount(0); await expect(page.getByText('Requests in the last 30 days')).toBeVisible(); }
async function post(page: import('@playwright/test').Page, origin: string, path: string, data: unknown, method = 'POST') { return page.request.fetch(`/api/admin/${path}`, { method, headers: { Origin: origin, 'X-Claps-Locale': 'en' }, data }); }
async function createPartner(page: import('@playwright/test').Page, origin: string) { const res = await post(page, origin, 'partners', { name: 'Browser source', description: 'Source description', contactEmail: null, visibility: 'public', tags: [], ipNames: ['Fixture IP'], reason }); expect(res.status()).toBe(200); const p = (await res.json()).data; partners.push(p.id); return p; }
test.afterAll(async () => { await db.query('DELETE FROM storage_tickets WHERE owner_id=ANY($1)', [ids]); await db.query('DELETE FROM localized_contents WHERE resource_key=ANY($1)', [partners]); await db.query('DELETE FROM partners WHERE id=ANY($1)', [partners]); await db.query('DELETE FROM admin_audit_logs WHERE actor_id=ANY($1)', [ids]); for (const table of ['auth_sessions', 'auth_accounts'])
    await db.query(`DELETE FROM ${table} WHERE user_id=ANY($1)`, [ids]); await db.query('DELETE FROM auth_rate_limits WHERE key=ANY($1)', [ids.map(id => createHash('sha256').update(`admin-reauth:${id}`).digest('hex'))]); await db.query('DELETE FROM users WHERE id=ANY($1)', [ids]); await db.end(); });
test('member cannot access any admin endpoint; same-origin and strict bodies required', async ({ page, baseURL }) => {
    await login(page, baseURL!, false);
    for (const path of ['overview', 'users', 'projects', 'partners', 'jobs', 'guides', 'monitoring-records', 'audit-logs', 'locales'])
        expect((await page.request.get(`/api/admin/${path}`)).status()).toBe(403);
    expect((await post(page, baseURL!, 'reauthenticate', { password })).status()).toBe(403);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
    await login(page, baseURL!);
    expect((await post(page, 'https://wrong.example', 'reauthenticate', { password })).status()).toBe(403);
    expect((await post(page, baseURL!, 'reauthenticate', { password, role: 'admin' })).status()).toBe(422);
});
test('reauthentication, all seven menus, mobile keyboard navigation and expiration', async ({ page, baseURL }) => {
    const a = await login(page, baseURL!);
    await verify(page);
    await expect(page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link')).toHaveCount(7);
    for (const [path, title] of [['users', 'Members'], ['projects', 'Projects'], ['partners', 'Partners'], ['guides', 'Guides'], ['jobs', 'Jobs'], ['monitoring', 'Monitoring']]) {
        await page.goto(`/admin/${path}`);
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Members', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/admin\/users$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'md/evidence/phase6/admin-mobile.png', fullPage: true });
    await db.query("UPDATE auth_sessions SET admin_verified_until=now()-interval '1 second' WHERE user_id=$1", [a.id]);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});
test('partner create, language switching preserves form and content language; draft and publish update real catalog', async ({ page, baseURL }) => {
    await login(page, baseURL!);
    await verify(page);
    await page.goto('/admin/partners/new');
    await page.getByLabel('Name', { exact: true }).fill('Browser source');
    await page.getByLabel('Description', { exact: true }).fill('Source description');
    await page.getByLabel('Reason', { exact: true }).fill(reason);
    await page.getByLabel('Visibility', { exact: true }).selectOption('public');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/admin\/partners\/[a-f0-9-]+$/);
    const id = page.url().split('/').at(-1)!;
    partners.push(id);
    const region = page.getByRole('region', { name: 'Content translations' });
    await expect(region.getByLabel('Name', { exact: true })).toBeVisible();
    await region.getByLabel('Name', { exact: true }).fill('Published English');
    await region.getByLabel('Reason', { exact: true }).fill(reason);
    await page.getByRole('button', { name: 'Language', exact: true }).click();
    await page.getByRole('menuitem', { name: '한국어' }).click();
    const korean = page.getByRole('region', { name: '콘텐츠 번역' });
    await expect(korean.getByLabel('이름', { exact: true })).toHaveValue('Published English');
    await expect(korean.getByLabel('콘텐츠 편집 언어')).toHaveValue('en');
    await korean.getByRole('button', { name: '초안 저장' }).click();
    await expect(page.getByRole('status').first()).toBeVisible();
    let catalog = await page.request.get('/api/partners', { headers: { 'X-Claps-Locale': 'en' } });
    expect((await catalog.json()).data.items.find((p: {
        id: string;
    }) => p.id === id).name).toBe('Browser source');
    await korean.getByRole('button', { name: '게시', exact: true }).click();
    await expect.poll(async () => { catalog = await page.request.get('/api/partners', { headers: { 'X-Claps-Locale': 'en' } }); return (await catalog.json()).data.items.find((p: {
        id: string;
    }) => p.id === id).name; }).toBe('Published English');
    await page.screenshot({ path: 'md/evidence/phase6/translation-editor.png', fullPage: true });
});
test('import preview/export, conflict handling, image decoding and private catalog boundary', async ({ page, baseURL }) => {
    await login(page, baseURL!);
    await verify(page);
    const p = await createPartner(page, baseURL!);
    const entry = { resourceType: 'partner', resourceKey: p.id, locale: 'en', version: 0, sourceRevision: 1, content: { schemaVersion: 1, resourceType: 'partner', name: 'Import English', description: 'Import description' } };
    const payload = { schemaVersion: 1, entries: [entry], reason };
    expect((await post(page, baseURL!, 'localized-contents/import-preview', payload)).status()).toBe(200);
    let r = await page.request.get(`/api/admin/localized-contents/partner/${p.id}/en`);
    expect((await r.json()).data.version).toBe(0);
    expect((await post(page, baseURL!, 'localized-contents/import', payload)).status()).toBe(200);
    expect((await post(page, baseURL!, 'localized-contents/import', payload)).status()).toBe(200);
    r = await page.request.get(`/api/admin/localized-contents/partner/${p.id}/en/export`);
    expect((await r.json()).data.entries[0].content.name).toBe('Import English');
    await page.goto(`/admin/partners/${p.id}`);
    const editor = page.getByRole('region', { name: 'Content translations' });
    await editor.getByLabel('Reason', { exact: true }).fill(reason);
    await editor.locator('summary').filter({ hasText: 'Import JSON' }).click();
    await editor.getByLabel('JSON content', { exact: true }).fill(JSON.stringify(payload));
    await editor.getByRole('button', { name: 'Preview changes', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'Import JSON', exact: true })).toBeEnabled();
    await editor.getByRole('button', { name: 'Import JSON', exact: true }).click();
    const downloadPromise=page.waitForEvent('download');
    await editor.getByRole('button', { name: 'Export JSON', exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toContain('.json');
    const malformed = new URLSearchParams({version:'1',reason,name:'invalid.png'});
    expect((await page.request.post(`/api/admin/partners/${p.id}/images?${malformed}`, { headers: {Origin:baseURL!,'Content-Type':'image/png'}, data:Buffer.from('invalid image') })).status()).toBe(422);
    expect((await post(page,baseURL!,'localized-contents/import',{...payload,reason:'x'.repeat(70000)})).status()).toBe(400);
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#ee4499' } }).png().toBuffer();
    const query = new URLSearchParams({ version: '1', reason, name: 'fixture.png' });
    r = await page.request.post(`/api/admin/partners/${p.id}/images?${query}`, { headers: { Origin: baseURL!, 'Content-Type': 'image/png' }, data: png });
    expect(r.status()).toBe(200);
    expect((await page.request.get(`/api/partners/${p.id}/images/0`)).status()).toBe(200);
    const data = { name: 'Browser source', description: 'Source description', contactEmail: null, visibility: 'private', tags: [], ipNames: ['Fixture IP'], reason, version: 2 };
    expect((await post(page, baseURL!, `partners/${p.id}`, data, 'PATCH')).status()).toBe(200);
    expect((await page.request.get(`/api/partners/${p.id}/images/0`)).status()).toBe(404);
    expect((await page.request.get(`/api/partners/${p.id}/images/0?admin=1`)).status()).toBe(200);
    expect((await post(page, baseURL!, `partners/${p.id}`, data, 'PATCH')).status()).toBe(409);
    const all = await page.request.get('/api/partners');
    expect((await all.json()).data.items.some((r: {
        id: string;
    }) => r.id === p.id)).toBe(false);
});
