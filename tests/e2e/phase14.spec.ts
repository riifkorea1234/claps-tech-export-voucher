import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
import { createProject, createSession, assetFixture } from "../helpers/workspace-fixture";
import { readFile } from "node:fs/promises";
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
let previousJa:boolean;
const guideIds:string[]=[];
test.beforeAll(async()=>{previousJa=(await pool.query("SELECT enabled FROM locales WHERE code='ja'")).rows[0].enabled;await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");});
test.afterAll(async()=>{try{if(guideIds.length){await pool.query("UPDATE projects SET active_guide_id=NULL WHERE active_guide_id=ANY($1)",[guideIds]);await pool.query("DELETE FROM brand_guides WHERE id=ANY($1)",[guideIds]);}await cleanupAccounts();}finally{await pool.query("UPDATE locales SET enabled=$1 WHERE code='ja'",[previousJa]);await pool.end();}});
async function fixture(page:import('@playwright/test').Page, origin:string){const email=await createAccount(page.request,origin),p=await createProject(page.request,origin),s=await createSession(page.request,origin,p.id),id=await assetFixture(page.request,origin,p,s.id);return {email,p,s,id};}
async function extraEvents(sid:string, count:number){
 await promisify(execFile)(process.execPath,["--conditions=react-server","--import","tsx","tests/helpers/evidence-writer-fixture.ts",sid,String(count)],{env:process.env});
}
for(const locale of ['ko','en','ja'])test(`E02/L01/L05 ${locale} certificate, keyboard, 390px/200%, hydration and real browser print`,async({page,baseURL},testInfo)=>{
 test.setTimeout(60000);const f=await fixture(page,baseURL!),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const pack=JSON.parse(await readFile(`messages/${locale}/evidence.json`,'utf8'));await page.request.post('/api/locale',{headers:{Origin:baseURL!},data:{locale}});
 await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);await expect(page.getByTestId('asset-certificate')).toBeVisible();await expect(page.locator('[data-field="humanEdits"]')).toHaveText(pack['cert.notRecorded']);await expect(page.locator('[data-field="candidates"]')).toHaveText('1');
 await expect(page.locator('[data-field="generationOrigin"]')).toHaveText(pack['origin.legacy-derived']);await expect(page.getByTestId('evidence-badge')).toContainText(pack.readSuccess);
 await page.setViewportSize({width:390,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.waitForLoadState('networkidle');const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,classes:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,80)})));await testInfo.attach('reflow',{body:JSON.stringify(overflow,null,2),contentType:'application/json'});await page.screenshot({path:testInfo.outputPath(`${locale}-390-200-before-assert.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 const print=page.getByRole('button',{name:pack.print,exact:true});await expect(print).toBeEnabled();await print.focus();await expect(print).toBeFocused();expect(await print.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe('none');
 await page.evaluate(()=>{(window as unknown as {print:()=>void}).print=()=>{document.body.dataset.printCalled='true';};});await print.press('Enter');await expect(page.locator('body')).toHaveAttribute('data-print-called','true');
 await page.screenshot({path:testInfo.outputPath(`${locale}-390-200-evidence.png`),fullPage:true});
 await page.emulateMedia({media:'print'});await expect(page.locator('aside')).toBeHidden();await expect(page.getByTestId('evidence-document')).toBeVisible();const text=await page.getByTestId('evidence-document').innerText();expect(text).toContain(pack.source);expect(text).not.toMatch(/Test fixture|storageKey|claps-session|@example.test|\/api\/files/);
 await page.pdf({path:testInfo.outputPath(`${locale}-evidence-print.pdf`),format:'A4',printBackground:true});await page.screenshot({path:testInfo.outputPath(`${locale}-print-evidence.png`),fullPage:true});await page.emulateMedia({media:'screen'});
 await page.reload();await expect(page.getByTestId('asset-certificate')).toBeVisible();expect(errors).toEqual([]);
 await page.goto(`/assets/${f.s.id}/verify`);await expect(page.getByRole('link',{name:pack.documentTitle,exact:true})).toBeVisible();await page.goto(`/assets/${f.s.id}/final`);await expect(page.getByRole('link',{name:pack.documentTitle,exact:true})).toBeVisible();
});
test('E02 real cursor pages, cross-page consecutive folding, failures, refresh and incomplete-print gate',async({page,baseURL},testInfo)=>{
 const f=await fixture(page,baseURL!);await extraEvents(f.s.id,64);
 await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);const timeline=page.getByTestId('evidence-timeline');await expect(timeline.getByText('조회한 사건 30건',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeDisabled();
 await page.route(`**/api/asset-sessions/${f.s.id}/evidence?*cursor*`,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'synthetic',requestId:'fixture'}})}));
 await timeline.getByRole('button',{name:'다음 기록 조회',exact:true}).click();await expect(page.getByTestId('evidence-badge')).toContainText('30건 조회 · 다음 페이지 조회 실패');await expect(timeline.getByTestId('evidence-group')).toHaveCount(2);
 await page.unroute(`**/api/asset-sessions/${f.s.id}/evidence?*cursor*`);await page.getByTestId('evidence-badge').getByRole('button').click();await expect(timeline.getByText('조회한 사건 60건' ,{exact:false})).toBeVisible();await timeline.getByRole('button',{name:'다음 기록 조회',exact:true}).click();await expect(timeline.getByText('조회한 사건 65건',{exact:false})).toBeVisible();
 const groups=timeline.getByTestId('evidence-group');await expect(groups).toHaveCount(3);const expand=groups.nth(1).getByRole('button');await expect(expand).toContainText('#2–33');await expand.focus();await expand.press('Enter');await expect(expand).toHaveAttribute('aria-expanded','true');await expect(groups.nth(1).getByTestId('evidence-event')).toHaveCount(32);await expand.press('Enter');await expect(expand).toHaveAttribute('aria-expanded','false');
 await expect(groups.nth(2)).toContainText('#34–65');await expect(groups.nth(1)).toContainText('별개 작업 32개 / 자산 0개');expect((await pool.query("SELECT count(DISTINCT job_id)::int n FROM evidence_events WHERE session_id=$1 AND kind='generate.requested'",[f.s.id])).rows[0].n).toBe(64);await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeEnabled();
 await page.screenshot({path:testInfo.outputPath('timeline-65-folded.png'),fullPage:true});await expand.click();await page.screenshot({path:testInfo.outputPath('timeline-65-expanded.png'),fullPage:true});await expand.click();
 await page.emulateMedia({media:'print'});await expect(timeline.locator('[data-testid="evidence-event"]:visible')).toHaveCount(65);await page.pdf({path:testInfo.outputPath('timeline-65-print.pdf'),format:'A4'});await page.emulateMedia({media:'screen'});await expect(expand).toHaveAttribute('aria-expanded','false');
 await page.route(`**/api/asset-sessions/${f.s.id}/evidence?*`,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'synthetic',requestId:'fixture'}})}));await timeline.getByRole('button',{name:'서버 기록 새로고침'}).click();await expect(page.getByTestId('evidence-badge')).toContainText('서버 증빙 조회 실패');await expect(page.getByTestId('evidence-badge')).not.toContainText('조회 완료');await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeDisabled();
 await page.unroute(`**/api/asset-sessions/${f.s.id}/evidence?*`);await page.getByTestId('evidence-badge').getByRole('button').click();await expect(timeline.getByText('조회한 사건 30건',{exact:false})).toBeVisible();
});
test('E01/E02 owner archived/deleted evidence UI, foreign and suspended page guard; no file capability',async({page,browser,baseURL})=>{
 const f=await fixture(page,baseURL!);const asset=(await (await page.request.get(`/api/assets/${f.id}`)).json()).data;
 await page.request.delete(`/api/assets/${f.id}`,{headers:{Origin:baseURL!},data:{version:1}});await page.request.delete(`/api/asset-sessions/${f.s.id}`,{headers:{Origin:baseURL!},data:{version:1}});
 await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);await expect(page.getByTestId('asset-certificate')).toContainText('메타데이터만 읽기 가능');expect((await page.request.get(asset.imageUrl)).status()).toBe(404);await expect(page.getByRole('link',{name:'자산 목록으로'})).toHaveAttribute('href','/assets');await expect(page.locator('select option')).toContainText('삭제됨');await page.getByRole('link',{name:'자산 목록으로'}).click();await expect(page).toHaveURL(/\/assets$/);await expect(page.getByText('404',{exact:true})).toHaveCount(0);await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);
 const other=await browser.newContext({baseURL});try{await createAccount(other.request,baseURL!);const tab=await other.newPage();expect((await tab.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`))?.status()).toBe(404);}finally{await other.close();}
 await pool.query("UPDATE users SET status='suspended' WHERE email=$1",[f.email]);await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);await expect(page).toHaveURL(/login|profile-setup/);
});
test('E02 empty history and certificate GET failure cannot display a successful certificate',async({page,baseURL})=>{
 const f=await fixture(page,baseURL!);await page.route(`**/api/assets/${f.id}/certificate`,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'synthetic',requestId:'fixture'}})}));
 await page.goto(`/assets/${f.s.id}/evidence?asset=${f.id}`);await expect(page.getByTestId('asset-certificate')).toHaveCount(0);await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeDisabled();await page.unroute(`**/api/assets/${f.id}/certificate`);await page.getByRole('alert').getByRole('button').click();await expect(page.getByTestId('asset-certificate')).toBeVisible();
 const empty=await createSession(page.request,baseURL!,f.p.id,'Empty');await page.goto(`/assets/${empty.id}/evidence`);await expect(page.getByTestId('asset-certificate')).toHaveCount(0);await expect(page.getByTestId('evidence-badge')).toContainText('조회한 사건 1건');await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeEnabled();
 const {rows:[owner]}=await pool.query('SELECT owner_id FROM projects WHERE id=$1',[f.p.id]),legacy=randomUUID();await pool.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES($1,$2,$3,'Unrecorded legacy')",[legacy,owner.owner_id,f.p.id]);await page.goto(`/assets/${legacy}/evidence`);await expect(page.getByTestId('evidence-badge')).toContainText('세션 이력 미기록');await expect(page.getByTestId('evidence-badge')).toContainText('조회한 사건 0건');
});
test('E01/E02 native asset in partial session, exact job provenance, unknown/null and all verification verdicts/stale',async({page,baseURL})=>{
 await createAccount(page.request,baseURL!);const p=await createProject(page.request,baseURL!),sid=randomUUID();const {rows:[owner]}=await pool.query('SELECT owner_id FROM projects WHERE id=$1',[p.id]);
 await pool.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES($1,$2,$3,'Legacy session native birth')",[sid,owner.owner_id,p.id]);const id=await assetFixture(page.request,baseURL!,p,sid);
 const {rows:[a]}=await pool.query('SELECT generation_job_id,file FROM assets WHERE id=$1',[id]),gid=randomUUID(),vjob=randomUUID();
 await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules,status) VALUES($1,$2,1,$3,$4,'published')",[gid,p.id,a.file,{schemaVersion:1,rules:[{ruleId:'rule',title:'Synthetic',description:'Synthetic',condition:{field:'x',operator:'equals',value:true},evidence:{page:1,excerpt:'Synthetic'}}]}]);await pool.query('UPDATE projects SET active_guide_id=$2 WHERE id=$1',[p.id,gid]);
 guideIds.push(gid); const guide={id:gid,version:1,checksum:a.file.checksum};
 for(const [sequence,kind,payload] of [[1,'generate.requested',{guide}],[2,'generate.succeeded',{resultCount:1}]] as const)await pool.query('INSERT INTO evidence_events(id,owner_id,session_id,job_id,kind,actor_id,sequence,payload) VALUES($1,$2,$3,$4,$5,$2,$6,$7)',[randomUUID(),owner.owner_id,sid,a.generation_job_id,kind,sequence,{schemaVersion:1,kind,actorType:'worker',...payload}]);
 await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'verification','succeeded',$4,$5)",[vjob,owner.owner_id,p.id,{schemaVersion:1,kind:'verification',assetIds:[id],guideId:gid,outputLocale:'ko'},'a'.repeat(64)]);
 let eventId:string|undefined;
 for(const verdict of ['pass','warn','reject','unknown'] as const){
  const data={schemaVersion:1,verdict,ruleResults:[{ruleId:'rule',verdict,reason:'Synthetic rule original',evidence:'Synthetic full evidence'}],guideId:gid,guideVersion:1,jobId:vjob,engineVersion:'fixture',checkedAt:new Date().toISOString()};
  await pool.query('UPDATE assets SET verification=$2,verification_job_id=$3 WHERE id=$1',[id,data,vjob]);
  if(!eventId){eventId=randomUUID();await pool.query("INSERT INTO evidence_events(id,owner_id,session_id,asset_id,job_id,kind,actor_id,sequence,payload) VALUES($1,$2,$3,$4,$5,'verify.run',$2,3,$6)",[eventId,owner.owner_id,sid,id,vjob,{schemaVersion:1,kind:'verify.run',actorType:'user',guide,verification:{jobId:vjob,verdict,engineVersion:'fixture',checkedAt:data.checkedAt,ruleCount:1}}]);}
  await page.goto(`/assets/${sid}/evidence?asset=${id}`);await expect(page.locator('[data-field="verdict"]')).toHaveText(({pass:'통과',warn:'주의',reject:'반려',unknown:'판정 불가'})[verdict]);await expect(page.locator('[data-field="stale"]')).toContainText('현재 기준과 일치');await expect(page.locator('[data-field="generationOrigin"]')).toContainText('서버 사건 기록');await expect(page.locator('[data-field="humanEdits"]')).toHaveText('0');await expect(page.getByTestId('evidence-badge')).toContainText('세션 이력 일부만 기록됨');await expect(page.getByTestId('evidence-timeline')).toContainText('전체 규칙 결과는 해당 작업');
  await page.getByTestId('asset-certificate').locator('details').evaluate(e=>(e as HTMLDetailsElement).open=true);await expect(page.getByTestId('asset-certificate')).toContainText('Synthetic full evidence');
 }
 for (const status of ['failed','canceled']) {
  const other=randomUUID();await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'generation',$4,$5,$6)",[other,owner.owner_id,p.id,status,{schemaVersion:1,kind:'generation',sessionId:sid,prompt:'Other private batch prompt',outputLocale:'ko'},'b'.repeat(64)]);
  const kind=status==='failed'?'generate.failed':'generate.canceled';await pool.query('INSERT INTO evidence_events(id,owner_id,session_id,job_id,kind,actor_id,sequence,payload) VALUES($1,$2,$3,$4,$5,$2,(SELECT max(sequence)+1 FROM evidence_events WHERE session_id=$3),$6)',[randomUUID(),owner.owner_id,sid,other,kind,{schemaVersion:1,kind,actorType:'worker',errorCode:status==='failed'?'INVALID_RESULT':'CANCELED'}]);
 }
 await page.reload();await expect(page.getByTestId('evidence-timeline')).toContainText('생성 실패');await expect(page.getByTestId('evidence-timeline')).toContainText('생성 취소 완료');await expect(page.getByTestId('evidence-document')).not.toContainText('Other private batch prompt');await expect(page.locator('[data-field="candidates"]')).toHaveText('1');
 await pool.query("UPDATE assets SET verification=verification-'guideVersion' WHERE id=$1",[id]);await page.reload();await expect(page.locator('[data-field="stale"]')).not.toContainText('현재 기준과 일치');
});

test('m1 empty asset query normalizes to first certificate and gates print during GET',async({page,baseURL})=>{
 const f=await fixture(page,baseURL!);
 await page.route(`**/api/assets/${f.id}/certificate`,async r=>{await new Promise(resolve=>setTimeout(resolve,700));await r.continue();});
 await page.route(`**/api/asset-sessions/${f.s.id}/evidence?*`,async r=>{await new Promise(resolve=>setTimeout(resolve,700));await r.continue();});
 await page.goto(`/assets/${f.s.id}/evidence?asset=`);await expect(page.getByTestId("evidence-badge")).toContainText("서버 증빙 조회 중");await expect(page.getByTestId("evidence-badge")).not.toContainText("기록중");
 await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeDisabled();
 await expect(page.getByTestId('asset-certificate')).toBeVisible();await expect(page.locator('select')).toHaveValue(f.id);
 await expect(page.locator('select option')).toContainText('#1');await expect(page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true})).toBeEnabled();
});
