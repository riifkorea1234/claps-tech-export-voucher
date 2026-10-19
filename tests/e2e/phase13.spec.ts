import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
import { createProject, createSession, assetFixture } from "../helpers/workspace-fixture";
import { certificateSchema, evidencePageSchema } from "../../lib/contracts/evidence";
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
test.afterAll(async()=>{await cleanupAccounts();await pool.end();});
test("E01 production evidence pagination/certificate are private strict metadata; POST is unavailable",async({page,baseURL})=>{
 await createAccount(page.request,baseURL!);const p=await createProject(page.request,baseURL!),s=await createSession(page.request,baseURL!,p.id),id=await assetFixture(page.request,baseURL!,p,s.id);
 let a=(await (await page.request.get(`/api/assets/${id}`)).json()).data;
 for(const adopted of [true,false,true]){const r=await page.request.patch(`/api/assets/${id}`,{headers:{Origin:baseURL!},data:{version:a.version,adopted}});expect(r.status()).toBe(200);a=(await r.json()).data;}
 const first=await page.request.get(`/api/asset-sessions/${s.id}/evidence?limit=2`);expect(first.status()).toBe(200);expect(first.headers()['cache-control']).toContain('no-store');const firstData=evidencePageSchema.parse((await first.json()).data);expect(firstData.items.map(e=>e.sequence)).toEqual([1,2]);expect(firstData.nextCursor).toBe('2');
 const rest=evidencePageSchema.parse((await (await page.request.get(`/api/asset-sessions/${s.id}/evidence?cursor=2&limit=2`)).json()).data);expect(rest.items.map(e=>e.sequence)).toEqual([3,4]);expect(rest.nextCursor).toBeNull();
 const c=certificateSchema.parse((await (await page.request.get(`/api/assets/${id}/certificate`)).json()).data);expect(c).toMatchObject({generation:{origin:'legacy-derived',prompt:'Test fixture'},selection:{history:'partial',userSelectionCount:null,recordedSelectionCount:3}});expect(JSON.stringify(c)).not.toMatch(/storageKey|thumbnailKey|downloadUrl/);
 expect((await page.request.post(`/api/asset-sessions/${s.id}/evidence`,{headers:{Origin:baseURL!},data:{kind:'generate.succeeded'}})).status()).toBe(405);
 const bad=await page.request.get(`/api/asset-sessions/${s.id}/evidence?cursor=invalid`);expect(bad.status()).toBe(422);expect((await bad.json()).error.requestId).toBeTruthy();
 await page.goto(`/assets/${s.id}`);expect((await page.evaluate(async(id)=>{const r=await fetch(`/api/assets/${id}/certificate`);return {status:r.status,data:(await r.json()).data};},id)).status).toBe(200);
});
test("E01 production archived/deleted owner metadata remains readable while foreign/suspended reads fail",async({page,browser,baseURL})=>{
 const email=await createAccount(page.request,baseURL!),p=await createProject(page.request,baseURL!),s=await createSession(page.request,baseURL!,p.id),id=await assetFixture(page.request,baseURL!,p,s.id);
 const a=(await (await page.request.get(`/api/assets/${id}`)).json()).data;
 expect((await page.request.delete(`/api/assets/${id}`,{headers:{Origin:baseURL!},data:{version:1}})).status()).toBe(200);
 expect((await page.request.delete(`/api/asset-sessions/${s.id}`,{headers:{Origin:baseURL!},data:{version:1}})).status()).toBe(200);
 expect((await page.request.get(`/api/assets/${id}/certificate`)).status()).toBe(200);expect((await page.request.get(`/api/asset-sessions/${s.id}/evidence`)).status()).toBe(200);expect((await page.request.get(a.imageUrl)).status()).toBe(404);
 const other=await browser.newContext({baseURL});try{await createAccount(other.request,baseURL!);for(const path of [`/api/assets/${id}/certificate`,`/api/asset-sessions/${s.id}/evidence`])expect((await other.request.get(path)).status()).toBe(404);}finally{await other.close();}
 await pool.query("UPDATE users SET status='suspended' WHERE email=$1",[email]);for(const path of [`/api/assets/${id}/certificate`,`/api/asset-sessions/${s.id}/evidence`])expect((await page.request.get(path)).status()).toBe(401);
});

test("E01 HTTP strict query, auth-first and HEAD/405 cache policy",async({page,browser,baseURL})=>{
 await createAccount(page.request,baseURL!); const p=await createProject(page.request,baseURL!),s=await createSession(page.request,baseURL!,p.id),id=await assetFixture(page.request,baseURL!,p,s.id);
 const path=`/api/asset-sessions/${s.id}/evidence`;
 for(const q of ["limit=abc&limit=1","limit=1&limit=abc","cursor=1&cursor=2","limit=1e1","limit=0x10","limit=%205","limit=5%20","limit=%2B7","limit=5.0","limit=01","limit=0","limit=101","limit="])expect((await page.request.get(path+"?"+q)).status()).toBe(422);
 for(const limit of [1,100])expect((await page.request.get(path+"?limit="+limit)).status()).toBe(200);
 for(const endpoint of [path,`/api/assets/${id}/certificate`]){
  const head=await page.request.head(endpoint);expect(head.status()).toBe(200);expect(await head.body()).toHaveLength(0);expect(head.headers()["cache-control"]).toBe("private, no-store");
  for(const method of ["POST","PUT","PATCH","DELETE","OPTIONS"]){const response=await page.request.fetch(endpoint,{method});expect(response.status()).toBe(method==="OPTIONS"?204:405);expect(response.headers().allow).toBe("GET, HEAD, OPTIONS");expect(response.headers()["cache-control"]).toBe("private, no-store");}
 }
 const other=await browser.newContext({baseURL});try{for(const endpoint of [path+"?limit=abc&limit=1","/api/asset-sessions/!/evidence?limit=1e1","/api/assets/!/certificate"])expect((await other.request.get(endpoint)).status()).toBe(401);expect((await other.request.head(path)).status()).toBe(401);}finally{await other.close();}
});
