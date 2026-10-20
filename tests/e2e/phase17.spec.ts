import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { writeFile } from 'node:fs/promises';
import { phase15DatabaseUrl } from '../../scripts/phase15-db-guard';
import { createAccount, cleanupAccounts, fixturePassword } from '../helpers/auth-fixture';

test('Phase17 isolated admin ja reauthentication, CAS audit, two owner fallback and preferences',async({page,browser,baseURL},testInfo)=>{
 test.setTimeout(120000);
 const url=phase15DatabaseUrl(process.env.TEST_DATABASE_URL).toString();
 const pool=new Pool({connectionString:url}),other=await browser.newContext({baseURL}),headers={Origin:baseURL!};
 try{
 const admin=await createAccount(page.request,baseURL!),owner=await createAccount(other.request,baseURL!);
 await pool.query("UPDATE users SET app_role='admin' WHERE email=$1",[admin]);
 const get=async()=> (await pool.query("SELECT * FROM locales WHERE code='ja'")).rows[0];
 const initial=await get();expect(initial.enabled).toBe(false);
 const patch=async(enabled:boolean,version:number)=>page.request.patch('/api/admin/locales/ja',{headers,data:{nativeName:initial.native_name,displayName:initial.display_name,direction:initial.direction,fallbackCode:initial.fallback_code,sortOrder:initial.sort_order,enabled,version,reason:'Phase17 isolated activation smoke'}});
 expect((await patch(true,initial.version)).status()).toBe(403);
 expect((await page.request.post('/api/admin/reauthenticate',{headers,data:{password:'incorrect888'}})).status()).toBe(401);
 expect((await page.request.post('/api/admin/reauthenticate',{headers,data:{password:fixturePassword}})).status()).toBe(200);
 expect((await patch(true,initial.version)).status()).toBe(200);
 expect((await patch(false,initial.version)).status()).toBe(409);
 for(const ctx of [page.context(),other]){
 expect((await ctx.request.post('/api/locale',{headers,data:{locale:'ja'}})).status()).toBe(200);
 const me=(await (await ctx.request.get('/api/me')).json()).data;
 expect((await ctx.request.patch('/api/me',{headers,data:{name:me.name,org:me.org,familyName:'山田',givenName:'太郎',locale:'ja'}})).status()).toBe(200);
 }
 await page.goto('/projects');await expect(page.locator('html')).toHaveAttribute('lang','ja');
 const ownerPage=await other.newPage();await ownerPage.goto('/projects');await expect(ownerPage.locator('html')).toHaveAttribute('lang','ja');
 const prefs=(await pool.query('SELECT id,preferences FROM users WHERE email=ANY($1) ORDER BY id',[[admin,owner]])).rows;
 expect(prefs.every(r=>r.preferences.locale==='ja')).toBe(true);
 expect((await patch(false,(await get()).version)).status()).toBe(200);
 await page.reload();await ownerPage.reload();await expect(page.locator('html')).not.toHaveAttribute('lang','ja');await expect(ownerPage.locator('html')).not.toHaveAttribute('lang','ja');
 expect((await pool.query('SELECT id,preferences FROM users WHERE email=ANY($1) ORDER BY id',[[admin,owner]])).rows).toEqual(prefs);
 const audit=(await pool.query("SELECT action,entity_type,entity_id FROM admin_audit_logs WHERE actor_id=(SELECT id FROM users WHERE email=$1) ORDER BY created_at",[admin])).rows;
 expect(audit.filter(r=>r.entity_id==='ja').length).toBeGreaterThanOrEqual(2);
 expect((await pool.query("SELECT enabled FROM locales WHERE code IN ('ko','en')")).rows.every(r=>r.enabled)).toBe(true);
 await writeFile(testInfo.outputPath('admin-ja.json'),JSON.stringify({initialEnabled:false,finalEnabled:(await get()).enabled,initialVersion:initial.version,finalVersion:(await get()).version,audit,owners:2,preferencesPreserved:true},null,2));
 }finally{if((await pool.query("SELECT enabled FROM locales WHERE code='ja'")).rows[0].enabled) throw Error('Admin API disable did not complete; retain fixture for diagnosis');await other.close();await cleanupAccounts();await pool.end();}
});
