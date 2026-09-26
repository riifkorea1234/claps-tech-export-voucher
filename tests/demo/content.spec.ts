import { test, expect } from "@playwright/test";
import { readFile, writeFile, chmod } from "node:fs/promises";

test('sample content: real projects/sessions, originals, recommendations, bilingual UI and recovery fixture',async({page,baseURL,browser})=>{
 test.setTimeout(120000);
 const config=Object.fromEntries((await readFile('.env.seed.local','utf8')).trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
 if(baseURL!==config.APP_ORIGIN||config.POSTGRES_DB!=='claps_demo')throw new Error('LOCAL_DEMO_REQUIRED');
 const headers={Origin:baseURL!};
 expect((await page.request.post('/api/auth/sign-in',{headers,data:{email:config.DEMO_EMAIL,password:config.DEMO_PASSWORD}})).status()).toBe(200);
 const projects=(await (await page.request.get('/api/projects')).json()).data.items;
 expect(projects).toHaveLength(3);expect(projects.every((p:{name:string})=>p.name.startsWith('샘플'))).toBe(true);
 const sessions=(await (await page.request.get('/api/asset-sessions')).json()).data.items;expect(sessions).toHaveLength(3);
 const records=(await (await page.request.get('/api/monitoring-records')).json()).data.items;expect(records).toHaveLength(2);
 const image=await page.request.get(records[0].imageUrl);expect(image.status()).toBe(200);const bytes=await image.body();
 // Put a genuine uploaded cover on an actual project for the DB+file restoration check.
 let project=projects[0];
 if(!project.cover){
  const reservation=await page.request.post('/api/uploads',{headers,data:{projectId:project.id,name:'sample-cover.png',mime:'image/png',size:bytes.length}});expect(reservation.status()).toBe(201);
  const ticket=(await reservation.json()).data;
  expect((await page.request.put(ticket.uploadUrl,{headers:{...headers,'Content-Type':'image/png'},data:bytes})).status()).toBe(200);
  const changed=await page.request.patch(`/api/projects/${project.id}`,{headers,data:{version:project.version,cover:{kind:'upload',ticket:ticket.ticket}}});expect(changed.status()).toBe(200);project=(await changed.json()).data;
 }
 const criteria=(await (await page.request.get('/api/me/matching-criteria')).json()).data;
 const job=await page.request.post('/api/matches',{headers,data:{revision:criteria.revision,outputLocale:'ko',idempotencyKey:'demo-content-review-v1'}});expect(job.status()).toBe(202);
 const jobId=(await job.json()).data.jobId;
 await expect.poll(async()=>(await (await page.request.get(`/api/jobs/${jobId}`)).json()).data.status,{timeout:20000}).toBe('succeeded');
 await page.goto('/partners');await expect(page.getByTestId('match-hero')).toContainText('샘플 · 달빛 문구');
 await page.request.post('/api/locale',{headers,data:{locale:'en'}});await page.reload();
 await expect(page.getByTestId('match-hero')).toContainText('Sample · Moonlit Stationery');
 expect((await (await page.request.get('/api/matches/latest')).json()).data.result.jobId).toBe(jobId);
 const catalog=(await (await page.request.get('/api/partners',{headers:{'X-Claps-Locale':'en'}})).json()).data.items;
 expect(catalog).toHaveLength(6);expect(catalog.every((p:{name:string;contactEmail:string|null})=>p.name.startsWith('Sample')&&p.contactEmail===null)).toBe(true);
 for(const route of ['/projects',`/projects/${project.id}`,`/projects/${project.id}/sessions`,'/assets','/monitoring']){
  await page.goto(route);await expect(page.locator('html')).toHaveAttribute('lang','en');expect(await page.locator('body').innerText()).not.toContain('Text unavailable.');
 }
 await page.goto(`/monitoring/${records[0].id}`);await expect(page.getByText('No executions yet.',{exact:true})).toBeVisible();
 expect((await page.request.post(`/api/monitoring-records/${records[0].id}/scans`,{headers,data:{outputLocale:'en',idempotencyKey:'demo-unavailable'}})).status()).toBe(503);
 const other=await browser.newContext({baseURL});expect((await other.request.get(`/api/projects/${project.id}`)).status()).toBe(401);expect((await other.request.get(records[0].imageUrl)).status()).toBe(401);await other.close();
 await page.setViewportSize({width:390,height:844});await page.goto('/partners');await expect(page.getByTestId('match-hero')).toContainText('Sample · Moonlit Stationery');await expect(page.getByText('Sample · Cloud Digital',{exact:true}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'md/evidence/content-seed/partners-mobile.png',fullPage:true});
 await page.request.post('/api/locale',{headers,data:{locale:'ko'}});await page.goto('/projects');await expect(page.getByText(project.name,{exact:true})).toBeVisible();await page.reload();await expect(page.getByText(project.name,{exact:true})).toBeVisible();
 await page.screenshot({path:'md/evidence/content-seed/projects-mobile.png',fullPage:true});
 await page.context().storageState({path:'/tmp/claps-content-state.json'});await chmod('/tmp/claps-content-state.json',0o600);
 await writeFile('/tmp/claps-content-fixture.json',JSON.stringify({projectId:project.id,projectName:project.name,sessionIds:sessions.map((s:{id:string})=>s.id),recordId:records[0].id,image:bytes.toString('base64'),jobId}),{mode:0o600});
});
