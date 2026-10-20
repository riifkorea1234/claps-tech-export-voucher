import { test,expect } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createAccount,cleanupAccounts } from '../helpers/auth-fixture';
import { cleanupFeedback } from '../helpers/monitoring-feedback-cleanup';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL}),emails:string[]=[];let previousJa:boolean;
test.beforeAll(async()=>{previousJa=(await pool.query("SELECT enabled FROM locales WHERE code='ja'")).rows[0].enabled;await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");});
test.afterAll(async()=>{try{const owners=(await pool.query('SELECT id FROM users WHERE email=ANY($1)',[emails])).rows.map(r=>r.id);await cleanupFeedback(pool,owners);await cleanupAccounts();}finally{await pool.query("UPDATE locales SET enabled=$1 WHERE code='ja'",[previousJa]);await pool.end();}});
async function fixture(request:import('@playwright/test').APIRequestContext,origin:string){
 const email=await createAccount(request,origin);emails.push(email);const png=await sharp({create:{width:40,height:40,channels:3,background:'red'}}).png().toBuffer();
 const reserved=await request.post('/api/monitoring-records/uploads',{headers:{Origin:origin},data:{name:'Phase15.png',mime:'image/png',size:png.length}});expect(reserved.status()).toBe(201);const ticket=(await reserved.json()).data;expect((await request.put(ticket.uploadUrl,{headers:{Origin:origin,'Content-Type':'image/png'},data:png})).status()).toBe(200);
 const response=await request.post('/api/monitoring-records',{headers:{Origin:origin},data:{name:'Phase15 synthetic evidence',source:{kind:'upload',ticket:ticket.ticket}}});expect(response.status()).toBe(201);const record=(await response.json()).data;const jobId=await scan(record.id);return {email,record,jobId,png};
}
async function scan(recordId:string){const result=await promisify(execFile)(process.execPath,['--conditions=react-server','--import','tsx','tests/helpers/monitoring-scan-fixture.ts',recordId],{env:process.env});return result.stdout.trim();}
const cardStatus=(card:import('@playwright/test').Locator)=>card.getByRole('status');
const endpoint=(id:string,jobId:string,index='0')=>`/api/monitoring-records/${id}/scans/${jobId}/results/${index}/feedback`;
for(const locale of ['ko','en','ja'])test(`M01/M02/L01/L03 ${locale} actual scan factors, 80/90/null, detail icons, keyboard and 390px/200%`,async({page,baseURL},testInfo)=>{
 const f=await fixture(page.request,baseURL!),pack=JSON.parse(await readFile(`messages/${locale}/monitoring.json`,'utf8')),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 expect((await page.request.post('/api/locale',{headers:{Origin:baseURL!},data:{locale}})).status()).toBe(200);await page.goto('/monitoring/'+f.record.id);await page.getByTestId('monitoring-scan').locator('summary').first().click();const cards=page.getByTestId('monitoring-result');await expect(cards).toHaveCount(7);
 for(const [i,grade] of ['low','low','review','review','high','high','unknown'].entries())await expect(cards.nth(i).getByTestId('monitoring-grade')).toContainText(pack['feedback.grade.'+grade]);
 await expect(cards.first().locator('[data-result-id]')).toHaveCount(0);expect(await cards.first().getAttribute('data-result-id')).toBe(f.jobId+':0');await expect(cards.first().getByRole('button')).toBeHidden(); // collapsed detail contains no visible card-level report
 await cards.first().locator('summary').click();const report=cards.first().getByRole('button',{name:pack['feedback.report'],exact:true});await expect(report).not.toHaveAttribute('aria-pressed');await expect(cardStatus(cards.first())).toContainText(pack['feedback.unreported']);await expect(report.locator('svg')).toHaveAttribute('aria-hidden','true');await expect(cards.first().getByRole('meter',{name:pack['feedback.factor.character']})).toHaveAttribute('aria-valuenow','0');await expect(cards.first().getByRole('meter')).toHaveCount(2);
 await expect(cards.first()).toContainText('33.3%');await expect(cards.first().getByRole('meter',{name:pack['feedback.factor.composition']})).toHaveAttribute('aria-valuenow','33.3333333');await expect(report).toHaveAttribute('title',pack['feedback.report']);
 await page.screenshot({path:testInfo.outputPath(locale+'-desktop-detail.png'),fullPage:true});await report.focus();await expect(report).toBeFocused();expect(await report.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe('none');await report.press('Enter');const withdraw=cards.first().getByRole('button',{name:pack['feedback.withdraw'],exact:true});await expect(withdraw).not.toHaveAttribute('aria-pressed');await expect(cardStatus(cards.first())).toContainText(pack['feedback.reported']);await expect(cards.first()).toContainText(pack['feedback.reported']);await page.reload();await page.getByTestId('monitoring-scan').locator('summary').first().click();await cards.first().locator('summary').click();await expect(withdraw).not.toHaveAttribute('aria-pressed');await expect(cardStatus(cards.first())).toContainText(pack['feedback.reported']);await withdraw.press('Enter');await expect(report).not.toHaveAttribute('aria-pressed');await expect(cardStatus(cards.first())).toContainText(pack['feedback.unreported']);
 await page.setViewportSize({width:390,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.waitForLoadState('networkidle');await page.screenshot({path:testInfo.outputPath(locale+'-mobile-200-detail.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await cards.nth(6).locator('summary').click();await expect(cards.nth(6)).toContainText(pack['feedback.noFactors']);await expect(cards.nth(6).getByRole('meter')).toHaveCount(0);expect(errors).toEqual([]);
});
test('M02 actual HTTP 401/422/404/CSRF/no leaks/replay/hashconflict/concurrency/repeatedwithdraw/new scan/503',async({page,browser,baseURL})=>{
 const f=await fixture(page.request,baseURL!),url=endpoint(f.record.id,f.jobId),body={reason:'other',idempotencyKey:'same-key'};const before=(await pool.query('SELECT output FROM jobs WHERE id=$1',[f.jobId])).rows[0].output;
 const other=await browser.newContext({baseURL});try{
  expect((await other.request.post(url,{headers:{Origin:baseURL!},data:body})).status()).toBe(401);emails.push(await createAccount(other.request,baseURL!));
  const foreign=await other.request.post(url,{headers:{Origin:baseURL!},data:body});expect(foreign.status()).toBe(404);const text=await foreign.text();expect(text).not.toContain(f.jobId);expect(text).not.toContain(f.record.id);expect(text).not.toContain('owner_id');
 }finally{await other.close();}
 expect((await page.request.post(url,{headers:{Origin:'https://cross-origin.invalid'},data:body})).status()).toBe(403);
 for(const data of [{reason:'private PII',idempotencyKey:'key'},{reason:'other',idempotencyKey:'bad key'},{reason:'other',idempotencyKey:'x'.repeat(129)}])expect((await page.request.post(url,{headers:{Origin:baseURL!},data})).status()).toBe(422);
 for(const index of ['50','00','-1'])expect((await page.request.post(endpoint(f.record.id,f.jobId,index),{headers:{Origin:baseURL!},data:body})).status()).toBe(422);expect((await page.request.post(endpoint(f.record.id,f.jobId,'49'),{headers:{Origin:baseURL!},data:body})).status()).toBe(404);
 const replies=await Promise.all(Array.from({length:6},()=>page.request.post(url,{headers:{Origin:baseURL!},data:body})));expect(replies.map(r=>r.status())).toEqual(Array(6).fill(200));const receipts=await Promise.all(replies.map(r=>r.json()));expect(new Set(receipts.map(r=>r.data.eventId)).size).toBe(1);
 expect((await page.request.post(url,{headers:{Origin:baseURL!},data:{...body,reason:'licensed_use'}})).status()).toBe(409);
 const withdrawn=await page.request.delete(url,{headers:{Origin:baseURL!},data:{idempotencyKey:'withdraw'}});expect(withdrawn.status()).toBe(200);const receipt=(await withdrawn.json()).data;expect(receipt.reported).toBe(false);expect((await (await page.request.delete(url,{headers:{Origin:baseURL!},data:{idempotencyKey:'withdraw'}})).json()).data).toEqual(receipt);
 expect((await page.request.delete(url,{headers:{Origin:baseURL!},data:{idempotencyKey:'withdraw-2'}})).status()).toBe(200);expect((await page.request.post(url,{headers:{Origin:baseURL!},data:body})).status()).toBe(200);
 const nextId=await scan(f.record.id),history=(await (await page.request.get(`/api/monitoring-records/${f.record.id}/scans`)).json()).data;expect(history.items[0].job.id).toBe(nextId);expect(history.items[0].result.items[0].feedback.reported).toBe(false);expect(history.items[1].result.items[0].feedback.reported).toBe(false);
 expect((await page.request.post(`/api/monitoring-records/${f.record.id}/scans`,{headers:{Origin:baseURL!},data:{outputLocale:'ko',idempotencyKey:randomUUID()}})).status()).toBe(503);expect((await (await page.request.get(`/api/monitoring-records/${f.record.id}`)).json()).data.latestJobId).toBe(nextId);expect((await pool.query('SELECT output FROM jobs WHERE id=$1',[f.jobId])).rows[0].output).toEqual(before);
});

test('M02 reply lost after actual commit, retry and rapid double click before history refresh append once',async({page,baseURL},testInfo)=>{
 const f=await fixture(page.request,baseURL!),url=endpoint(f.record.id,f.jobId);await page.goto('/monitoring/'+f.record.id);await page.getByTestId('monitoring-scan').locator('summary').first().click();const card=page.getByTestId('monitoring-result').first();await card.locator('summary').click();const report=card.getByRole('button',{name:'오탐 신고',exact:true});
 await page.route('**'+url,async route=>{const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');});await report.click();await expect(card.getByRole('alert')).toBeVisible();await expect(report).toBeVisible();await expect(card.getByRole('status')).toContainText('오탐 신고 없음');await page.unroute('**'+url);
 const history='**/api/monitoring-records/'+f.record.id+'/scans?*';await page.route(history,async route=>{await new Promise(resolve=>setTimeout(resolve,900));await route.continue();});
 await report.click();await expect(report).toBeEnabled();await report.click();const withdraw=card.getByRole('button',{name:'신고 철회',exact:true});await expect(withdraw).toBeVisible();await expect(card.getByRole('status')).toContainText('오탐 신고됨');expect((await pool.query('SELECT count(*)::int n FROM monitoring_feedback_events WHERE job_id=$1 AND result_index=0',[f.jobId])).rows[0].n).toBe(1);await page.unroute(history);await page.screenshot({path:testInfo.outputPath('response-loss-retry-icon.png'),fullPage:true});
});

for(const direction of ['A','B'] as const)test(`M1 ${direction} same mounted UI after another tab changes sequence appends a fresh event`,async({page,context,baseURL},testInfo)=>{
 const f=await fixture(page.request,baseURL!),url=endpoint(f.record.id,f.jobId),keys:string[]=[],errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith(url)&&['POST','DELETE'].includes(r.method()))keys.push(r.postDataJSON().idempotencyKey);});
 await page.goto('/monitoring/'+f.record.id);await page.getByTestId('monitoring-scan').locator('summary').first().click();const card=page.getByTestId('monitoring-result').first();await card.locator('summary').click();
 const report=card.getByRole('button',{name:'오탐 신고',exact:true}),withdraw=card.getByRole('button',{name:'신고 철회',exact:true});
 await report.click();await expect(withdraw).toBeVisible();if(direction==='B'){await withdraw.click();await expect(report).toBeVisible();}
 // A real second tab shares the session but uses its own fresh request key.
 const tab=await context.newPage();try{await tab.goto('/monitoring/'+f.record.id);await tab.getByTestId('monitoring-scan').locator('summary').first().click();await tab.getByTestId('monitoring-result').first().locator('summary').click();await tab.getByRole('button',{name:direction==='A'?'신고 철회':'오탐 신고',exact:true}).click();await expect(tab.getByRole('button',{name:direction==='A'?'오탐 신고':'신고 철회',exact:true})).toBeVisible();}finally{await tab.close();}
 await page.getByRole('button',{name:'다시 불러오기',exact:true}).click();const action=direction==='A'?report:withdraw;await expect(action).toBeVisible();await action.click();await expect(direction==='A'?withdraw:report).toBeVisible();
 const rows=(await pool.query('SELECT sequence,action FROM monitoring_feedback_events WHERE job_id=$1 AND result_index=0 ORDER BY sequence',[f.jobId])).rows;
 expect(rows).toEqual((direction==='A'?['reported','withdrawn','reported']:['reported','withdrawn','reported','withdrawn']).map((action,i)=>({sequence:i+1,action})));
 expect(keys.at(-1)).not.toBe(keys[direction==='A'?0:1]);await expect(card.getByRole('status')).toContainText(direction==='A'?'오탐 신고됨':'오탐 신고 없음');await expect(card.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);await page.screenshot({path:testInfo.outputPath('sequence-'+direction+'.png'),fullPage:true});
});
test('M1 success receipt racing a newer reload and later different reason each use the observed sequence',async({page,baseURL})=>{
 const f=await fixture(page.request,baseURL!),url=endpoint(f.record.id,f.jobId);await page.goto('/monitoring/'+f.record.id);await page.getByTestId('monitoring-scan').locator('summary').first().click();const card=page.getByTestId('monitoring-result').first();await card.locator('summary').click();const report=card.getByRole('button',{name:'오탐 신고',exact:true}),withdraw=card.getByRole('button',{name:'신고 철회',exact:true});
 let release:()=>void=()=>{},committed:()=>void=()=>{};const gate=new Promise<void>(r=>release=r),done=new Promise<void>(r=>committed=r);
 await page.route('**'+url,async route=>{const response=await route.fetch();expect(response.status()).toBe(200);committed();await gate;await route.fulfill({response});});await report.click();await done;
 expect((await page.request.delete(url,{headers:{Origin:baseURL!},data:{idempotencyKey:randomUUID()}})).status()).toBe(200);
 const refreshed=page.waitForResponse(r=>r.url().includes('/scans?')&&r.status()===200);await page.getByRole('button',{name:'다시 불러오기',exact:true}).click();await refreshed;await expect(card.getByRole('status')).toContainText('오탐 신고 없음');release();await expect(report).toBeEnabled();await page.unroute('**'+url);
 await report.click();await expect(withdraw).toBeVisible();await withdraw.click();await expect(report).toBeVisible();await card.getByRole('combobox').selectOption('licensed_use');await report.click();await expect(withdraw).toBeVisible();
 const rows=(await pool.query('SELECT sequence,action,reason,idempotency_key FROM monitoring_feedback_events WHERE job_id=$1 AND result_index=0 ORDER BY sequence',[f.jobId])).rows;expect(rows).toHaveLength(5);expect(new Set(rows.map(r=>r.idempotency_key)).size).toBe(5);expect(rows.at(-1)).toMatchObject({sequence:5,action:'reported',reason:'licensed_use'});await expect(card.getByRole('status')).toContainText('오탐 신고됨');
});
test('n4 direct HTTP auth-first, strict query, explicit HEAD/405, CSRF and bounded JSON',async({page,browser,baseURL})=>{
 const f=await fixture(page.request,baseURL!),url=endpoint(f.record.id,f.jobId),body={reason:'other',idempotencyKey:randomUUID()};const anonymous=await browser.newContext({baseURL});
 try{for(const method of ['POST','DELETE'])for(const [type,data] of [['text/plain','not JSON'],['application/json','{'],['application/json','x'.repeat(70*1024)]]){
  const response=await anonymous.request.fetch(url+'?unexpected=1',{method,headers:{Origin:'https://invalid.test','Content-Type':type},data:Buffer.from(data)});expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toBe('private, no-store');
 }}finally{await anonymous.close();}
 for(const method of ['GET','HEAD','PUT','PATCH','OPTIONS']){const response=await page.request.fetch(url,{method});expect(response.status()).toBe(405);expect(response.headers()['allow']).toBe('POST, DELETE');expect(response.headers()['cache-control']).toBe('private, no-store');if(method==='HEAD')expect(await response.body()).toHaveLength(0);}
 for(const method of ['POST','DELETE']){expect((await page.request.fetch(url+'?unexpected=1',{method,headers:{Origin:baseURL!},data:body})).status()).toBe(422);
 for(const [type,data] of [['text/plain','not JSON'],['application/json','{'],['application/json','x'.repeat(70*1024)]])expect((await page.request.fetch(url,{method,headers:{Origin:baseURL!,'Content-Type':type},data:Buffer.from(data)})).status()).toBe(400);
 expect((await page.request.fetch(url+'?unexpected=1',{method,headers:{Origin:'https://invalid.test','Content-Type':'text/plain'},data:'bad'})).status()).toBe(403);}
 expect((await pool.query('SELECT count(*)::int n FROM monitoring_feedback_events WHERE job_id=$1',[f.jobId])).rows[0].n).toBe(0);
});
