import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, beforeEach, afterAll, afterEach, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { EvidenceService } from "../../lib/server/evidence/service";
import { appendEvidence } from "../../lib/server/evidence/writer";
import { JobQueue } from "../../lib/server/jobs/queue";
import { JobService } from "../../lib/server/jobs/service";
import { HandlerRegistry, JobFailure, type JobHandler } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { VerificationService } from "../../lib/server/verifications/service";
import { verificationHandler } from "../../lib/server/verifications/handler";
import { FinalizationService } from "../../lib/server/finalizations/service";
import { AdminService } from "../../lib/server/admin/service";
import { AdminAccess } from "../../lib/server/admin/access";
import { assertDatabaseMetadata } from "../../lib/server/evidence/size";
import { verificationSchema } from "../../lib/contracts/metadata";
import { StorageService } from "../../lib/server/storage/service";
import { cleanupEvidence } from "../helpers/evidence-cleanup";
const {pool}=createDatabase(getTestDatabaseUrl(),8),auth=new AuthService(pool,async()=>{},"http://localhost:3000"),ws=new WorkspaceService(auth),evidence=new EvidenceService(ws),finals=new FinalizationService(ws);
const owners:string[]=[];let owner:string,raw:string,dir:string,file: {schemaVersion:1; storageKey:string; originalName:string; mimeType:string; size:number; checksum:string};
let jobs:JobService,queue:JobQueue,registry:HandlerRegistry;
async function account(){const id=randomUUID(),token=randomBytes(32).toString("hex");owners.push(id);await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Synthetic',true,'active')",[id,`${id}@example.test`]);await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",[randomUUID(),id,digest(token)]);return {id,token};}
const generation:JobHandler={run:async()=>({output:{schemaVersion:1,kind:"generation",assetIds:[]}}),apply:async(c,j,r)=>{if(j.input.kind!=="generation"||r.output.kind!=="generation")throw Error();for(const id of r.output.assetIds)await c.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)",[id,j.input.sessionId,j.id,file]);}};
async function setup(){const p=await ws.createProject(raw,{name:"E01"}),s=await ws.createSession(raw,{title:"Evidence",projectId:p.id});const gid=randomUUID();await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules,status) VALUES($1,$2,1,$3,$4,'published')",[gid,p.id,file,{schemaVersion:1,rules:[{ruleId:"one",title:"Synthetic",description:"Fixture",condition:{field:"x",operator:"equals",value:true},evidence:{page:1,excerpt:"fixture"}}]}]);await pool.query("UPDATE projects SET active_guide_id=$2 WHERE id=$1",[p.id,gid]);return {p,s,gid};}
async function enqueue(sid:string,prompt="Batch A",guideId?:string,key:string=randomUUID()){return jobs.enqueue(raw,{input:{schemaVersion:1,kind:"generation",sessionId:sid,prompt,guideId,outputLocale:"ko"},idempotencyKey:key});}
async function generate(f:Awaited<ReturnType<typeof setup>>,prompt="Batch A",n=1){const j=await enqueue(f.s.id,prompt,f.gid),claimed=(await queue.claim("phase13"))!,ids=Array.from({length:n},()=>randomUUID());expect(await queue.complete(claimed,generation,{output:{schemaVersion:1,kind:"generation",assetIds:ids}})).toBe(true);return {j,claimed,ids};}
const events=async(sid:string)=>(await evidence.list(raw,sid,{limit:"100"})).items;
beforeAll(async()=>{await migrateDatabase(pool);dir=await mkdtemp(join(tmpdir(),"claps-p13-"));process.env.UPLOADS_DIR=dir;const png=await sharp({create:{width:16,height:16,channels:3,background:"red"}}).png().toBuffer();file={schemaVersion:1,storageKey:`${randomUUID()}-original`,originalName:"synthetic.png",mimeType:"image/png",size:png.length,checksum:createHash("sha256").update(png).digest("hex")};await writeFile(join(dir,file.storageKey),png);});
beforeEach(async()=>{({id:owner,token:raw}=await account());registry=new HandlerRegistry().register("generation",generation).register("verification",verificationHandler(auth,{name:"synthetic",verify:async input=>({engineVersion:"fixture-v1",results:input.assets.map(a=>({assetId:a.id,rules:input.rules.rules.map(r=>({ruleId:r.ruleId,verdict:"pass",reason:"Synthetic",evidence:"Synthetic"}))}))})}));jobs=new JobService(auth,registry,developmentQueuePolicy);queue=new JobQueue(jobs);});
afterEach(async()=>{await pool.query("UPDATE jobs SET status='canceled' WHERE owner_id=ANY($1) AND status IN ('queued','running')",[owners]);});
afterAll(async()=>{await cleanupEvidence(pool,owners);await pool.query("DELETE FROM admin_audit_logs WHERE actor_id=ANY($1)",[owners]);await pool.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)",[owners]);await pool.query("UPDATE projects SET active_guide_id=NULL WHERE owner_id=ANY($1)",[owners]);await pool.query("DELETE FROM assets WHERE session_id IN(SELECT id FROM asset_sessions WHERE owner_id=ANY($1))",[owners]);await pool.query("DELETE FROM brand_guides WHERE project_id IN(SELECT id FROM projects WHERE owner_id=ANY($1))",[owners]);for(const t of ['jobs','asset_sessions','projects'])await pool.query(`DELETE FROM ${t} WHERE owner_id=ANY($1)`,[owners]);await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)",[owners]);await pool.query("DELETE FROM users WHERE id=ANY($1)",[owners]);await pool.end();expect(await readdir(dir)).toEqual([file.storageKey]);expect(createHash("sha256").update(await readFile(join(dir,file.storageKey))).digest("hex")).toBe(file.checksum);await rm(join(dir,file.storageKey));await rm(dir,{recursive:true});});
it("E01 records session and concurrent generation acceptance once with server actor/time/sequence",async()=>{const f=await setup();const rows=await Promise.all(Array.from({length:6},()=>enqueue(f.s.id,"Batch A",f.gid,"same")));expect(new Set(rows.map(r=>r.id)).size).toBe(1);const es=await events(f.s.id);expect(es.map(e=>e.kind)).toEqual(["session.created","generate.requested"]);expect(es.map(e=>e.sequence)).toEqual([1,2]);expect(es.every(e=>e.actorId===owner&&e.at&&e.origin==="native")).toBe(true);expect(JSON.stringify(es)).not.toContain("Batch A");expect(es[1].payload).toMatchObject({guide:{id:f.gid,version:1,checksum:file.checksum}});});
it("E01 success apply and replay count actual assets without mixing batch conditions",async()=>{const f=await setup(),a=await generate(f,"Batch A",2),b=await generate(f,"Batch B",1);expect(await queue.complete(a.claimed,generation,{output:{schemaVersion:1,kind:"generation",assetIds:a.ids}})).toBe(false);for(const id of a.ids)expect(await evidence.certificate(raw,id)).toMatchObject({generation:{jobId:a.j.id,prompt:"Batch A",candidateCount:2,origin:"native"},selection:{history:"complete",userSelectionCount:0}});expect((await evidence.certificate(raw,b.ids[0])).generation.prompt).toBe("Batch B");expect((await events(f.s.id)).filter(e=>e.kind==="generate.succeeded")).toHaveLength(2);});
it("E01 failed and canceled jobs remain distinct from success including late replay",async()=>{const f=await setup(),j=await enqueue(f.s.id),claim=(await queue.claim("fail"))!;await queue.fail(claim,new JobFailure("INTERNAL"));await queue.fail(claim,new JobFailure("INTERNAL"));const canceled=await enqueue(f.s.id);await jobs.cancel(raw,canceled.id);await jobs.cancel(raw,canceled.id);const running=await enqueue(f.s.id),late=(await queue.claim("cancel"))!;await jobs.cancel(raw,running.id);expect(await queue.complete(late,generation,{output:{schemaVersion:1,kind:"generation",assetIds:[]}})).toBe(false);const es=await events(f.s.id);expect(es.filter(e=>e.kind==="generate.succeeded")).toHaveLength(0);expect(es.filter(e=>e.jobId===j.id&&e.kind==="generate.failed")).toHaveLength(1);expect(es.filter(e=>e.kind==="generate.canceled")).toHaveLength(2);});
it("E01 rolls back partially applied assets and evidence on an apply error",async()=>{const f=await setup();await enqueue(f.s.id);const claim=(await queue.claim("rollback"))!,id=randomUUID();await expect(queue.complete(claim,{...generation,apply:async(c,j,r)=>{await generation.apply!(c,j,r);await appendEvidence(c,owner,f.s.id,{schemaVersion:1,kind:"asset.adopted",actorType:"user",assetVersion:1},id);throw Error("injected");}},{output:{schemaVersion:1,kind:"generation",assetIds:[id]}})).rejects.toThrow("injected");expect((await pool.query("SELECT 1 FROM assets WHERE id=$1",[id])).rowCount).toBe(0);expect((await events(f.s.id)).map(e=>e.kind)).toEqual(["session.created","generate.requested"]);});
it("E01 evidence write failure rolls back business success instead of silently succeeding",async()=>{const f=await setup();await enqueue(f.s.id);const claim=(await queue.claim("bad-provenance"))!,id=randomUUID();await expect(queue.complete(claim,{...generation,apply:async c=>{await c.query("UPDATE users SET name='rollback' WHERE id=$1",[owner]);}},{output:{schemaVersion:1,kind:"generation",assetIds:[id]}})).rejects.toMatchObject({code:"STATE_CONFLICT"});expect((await pool.query("SELECT 1 FROM assets WHERE id=$1",[id])).rowCount).toBe(0);expect((await jobs.get(raw,claim.id)).status).toBe("running");});
it("E01 adoption and unadoption are atomic; unchanged state adds no event",async()=>{const f=await setup(),a=await generate(f);let dto=await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});dto=await ws.patchAsset(raw,a.ids[0],{version:dto.version,adopted:true});await ws.patchAsset(raw,a.ids[0],{version:dto.version,adopted:false});expect((await evidence.certificate(raw,a.ids[0])).selection).toMatchObject({userSelectionCount:2,adopted:false});expect((await events(f.s.id)).filter(e=>e.assetId===a.ids[0]).map(e=>e.kind)).toEqual(["asset.adopted","asset.unadopted"]);});
it("E01 verification and finalization preserve guide/rules/engine and cancel history",async()=>{const f=await setup(),a=await generate(f);await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});const v=new VerificationService(ws,jobs);const verifyJob=await v.request(raw,f.s.id,{assetIds:a.ids,guideId:f.gid,outputLocale:"ko",idempotencyKey:randomUUID()});const vc=(await queue.claim("verify"))!;const vh=registry.get("verification")!;const vr=await vh.run({job:vc,signal:new AbortController().signal,dispatch:(p,id)=>queue.dispatch(vc,p,id),providerRequest:id=>queue.providerRequest(vc,id),reserveFile:f=>queue.reserveFile(vc,f)});expect(await queue.complete(vc,vh,vr)).toBe(true);expect(await jobs.get(raw,verifyJob.id)).toMatchObject({status:"succeeded"});let dto=await finals.set(raw,a.ids[0],{version:3},true);await finals.set(raw,a.ids[0],{version:dto.version},true);dto=await finals.set(raw,a.ids[0],{version:dto.version},false);await finals.set(raw,a.ids[0],{version:dto.version},false);const cert=await evidence.certificate(raw,a.ids[0]);expect(cert).toMatchObject({verification:{origin:"native",stale:false,data:{verdict:"pass",engineVersion:"fixture-v1",guideVersion:1}},finalization:{origin:"native",finalizedAt:null}});expect((await events(f.s.id)).filter(e=>e.assetId===a.ids[0]).map(e=>e.kind)).toEqual(["asset.adopted","verify.run","final.added","final.removed"]);await pool.query("UPDATE brand_guides SET file=jsonb_set(file,'{checksum}',to_jsonb($2::text)) WHERE id=$1",[f.gid,"b".repeat(64)]);expect((await evidence.certificate(raw,a.ids[0])).verification?.stale).toBe(true);expect((await finals.get(raw,a.ids[0])).stale).toBe(true);await pool.query("UPDATE projects SET active_guide_id=NULL WHERE id=$1",[f.p.id]);expect((await evidence.certificate(raw,a.ids[0])).verification?.stale).toBe(true);});
it("E01 soft deletion keeps certificate metadata but blocks files and repeated writes",async()=>{const f=await setup(),a=await generate(f),dto=await ws.getAsset(raw,a.ids[0]);await ws.patchAsset(raw,a.ids[0],{version:1,deleted:true});expect((await evidence.certificate(raw,a.ids[0])).deletedAt).not.toBeNull();expect((await events(f.s.id)).filter(e=>e.kind==="asset.deleted")).toHaveLength(1);await expect(new StorageService(ws).download(raw,dto.imageUrl.split('/').at(-1)!)).rejects.toThrow();await expect(ws.patchAsset(raw,a.ids[0],{version:2,deleted:true})).rejects.toMatchObject({code:"NOT_FOUND"});});
it.each(["session","project"])("E01 %s archival keeps owner metadata but blocks file/write access",async target=>{const f=await setup(),a=await generate(f),dto=await ws.getAsset(raw,a.ids[0]);if(target==="session")await ws.patchSession(raw,f.s.id,{version:1,archived:true});else await ws.patchProject(raw,f.p.id,{version:1,archived:true});expect((await evidence.certificate(raw,a.ids[0])).archived).toBe(true);expect(await events(f.s.id)).toHaveLength(3);await expect(ws.patchAsset(raw,a.ids[0],{version:1,adopted:true})).rejects.toMatchObject({code:"NOT_FOUND"});await expect(new StorageService(ws).download(raw,dto.imageUrl.split('/').at(-1)!)).rejects.toThrow();});
it("E01 denies foreign owners, suspended and unauthenticated metadata reads",async()=>{const f=await setup(),a=await generate(f),b=await account();for(const read of [()=>evidence.list(b.token,f.s.id),()=>evidence.certificate(b.token,a.ids[0])])await expect(read()).rejects.toMatchObject({code:"NOT_FOUND"});await expect(evidence.list(undefined,f.s.id)).rejects.toMatchObject({code:"UNAUTHORIZED"});await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[owner]);for(const read of [()=>evidence.list(raw,f.s.id),()=>evidence.certificate(raw,a.ids[0])])await expect(read()).rejects.toMatchObject({code:"UNAUTHORIZED"});});
it("E01 legacy-derived uses exact generation job and unknown human history without backfill",async()=>{const f=await setup(),jid=randomUUID(),aid=randomUUID();await pool.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES($1,$2,$3,'generation','succeeded',$4,$5)",[jid,owner,f.p.id,{schemaVersion:1,kind:"generation",sessionId:f.s.id,prompt:"Legacy A",guideId:f.gid,outputLocale:"en"},"a".repeat(64)]);await pool.query("INSERT INTO assets(id,session_id,generation_job_id,file,adopted) VALUES($1,$2,$3,$4,true)",[aid,f.s.id,jid,file]);await generate(f,"New B");expect(await evidence.certificate(raw,aid)).toMatchObject({generation:{jobId:jid,prompt:"Legacy A",origin:"legacy-derived",candidateCount:1},selection:{history:"unrecorded",userSelectionCount:null,recordedSelectionCount:0}});expect((await events(f.s.id)).filter(e=>e.jobId===jid)).toHaveLength(0);});
it("E01 cursor is stable across service recreation and later appends",async()=>{const f=await setup();await generate(f);const first=await evidence.list(raw,f.s.id,{limit:"2"});expect(first.nextCursor).toBe("2");await enqueue(f.s.id);const next=await new EvidenceService(new WorkspaceService(new AuthService(pool,async()=>{},"http://localhost:3000"))).list(raw,f.s.id,{cursor:first.nextCursor,limit:"2"});expect(next.items.map(e=>e.sequence)).toEqual([3,4]);expect(next.nextCursor).toBeNull();expect(new Set([...first.items,...next.items].map(e=>e.id)).size).toBe(4);});
it("E01 DB forbids mutation, cross-owner relations and oversized metadata",async()=>{const f=await setup(),event=(await events(f.s.id))[0],b=await account();await expect(pool.query("UPDATE evidence_events SET kind=kind WHERE id=$1",[event.id])).rejects.toMatchObject({code:"23514"});await expect(pool.query("DELETE FROM evidence_events WHERE id=$1",[event.id])).rejects.toMatchObject({code:"23514"});for(const [oid,payload] of [[b.id,{schemaVersion:1,kind:"session.created",actorType:"user"}],[owner,{schemaVersion:1,kind:"session.created",extra:"a".repeat(65536)}]])await expect(pool.query("INSERT INTO evidence_events(id,owner_id,session_id,kind,actor_id,sequence,payload) VALUES($1,$2,$3,'session.created',$2,99,$4)",[randomUUID(),oid,f.s.id,payload])).rejects.toMatchObject({code:"23514"});});
it("E01 lease expiry during evidence insert rolls back assets and success event together",async()=>{
 const f=await setup();await enqueue(f.s.id);const claim=(await queue.claim("evidence-deadline"))!,id=randomUUID();
 const name='p13_delay_'+owner.replaceAll('-','');
 await pool.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.2); RETURN NEW; END $$`);
 await pool.query(`CREATE TRIGGER ${name} BEFORE INSERT ON evidence_events FOR EACH ROW WHEN (NEW.owner_id='${owner}' AND NEW.kind='generate.succeeded') EXECUTE FUNCTION ${name}()`);
 try {
  await pool.query("UPDATE jobs SET deadline_at=now()+interval '0.1 seconds',lease_until=now()+interval '0.1 seconds' WHERE id=$1",[claim.id]);
  await expect(queue.complete(claim,generation,{output:{schemaVersion:1,kind:"generation",assetIds:[id]}})).rejects.toMatchObject({code:"TIMEOUT"});
  expect((await pool.query("SELECT 1 FROM assets WHERE id=$1",[id])).rowCount).toBe(0);
  expect((await events(f.s.id)).filter(e=>e.kind==="generate.succeeded")).toHaveLength(0);
  expect((await jobs.get(raw,claim.id)).status).toBe("running");
 }finally{await pool.query(`DROP TRIGGER ${name} ON evidence_events`);await pool.query(`DROP FUNCTION ${name}()`);}
});
it("E01 safe automatic retry acceptance attributes the worker instead of inventing another user action",async()=>{
 const f=await setup();await enqueue(f.s.id);const claim=(await queue.claim("retry-actor"))!;
 await queue.fail(claim,new JobFailure("TRANSIENT",true));
 const es=await events(f.s.id),accepted=es.filter(e=>e.kind==="generate.requested");
 expect(accepted).toHaveLength(2);expect(accepted[0].payload.actorType).toBe("user");expect(accepted[1].payload.actorType).toBe("worker");expect(accepted.every(e=>e.actorId===owner)).toBe(true);
 expect(es.filter(e=>e.kind==="generate.failed")).toHaveLength(1);
 expect(es.filter(e=>e.kind==="generate.succeeded")).toHaveLength(0);
});

it.each(["queued", "running", "retry"])("E01 admin %s records initiator privately and only actual terminal outcomes",async mode=>{
 const f=await setup(),actor=await account();await pool.query("UPDATE users SET app_role='admin' WHERE id=$1",[actor.id]);await pool.query("UPDATE auth_sessions SET admin_verified_until=now()+interval '10 minutes' WHERE user_id=$1",[actor.id]);
 const admin=new AdminService(new AdminAccess(auth),jobs),job=await enqueue(f.s.id);
 const claim=mode!=="queued"?(await queue.claim("admin-actor"))!:null;
 if(mode==="retry")await queue.fail(claim!,new JobFailure("TRANSIENT"));
 const response=await admin.job(actor.token,job.id,{action:mode==="retry"?"retry":"cancel",reason:"Synthetic actor review"});
 if(mode==="running"){
  expect(response.status).toBe("running");expect((await events(f.s.id)).filter(e=>e.kind==="generate.canceled")).toHaveLength(0);
  await jobs.cancel(raw,job.id); // A later requester cannot replace the first initiator.
  expect(await queue.complete(claim!,generation,{output:{schemaVersion:1,kind:"generation",assetIds:[]}})).toBe(false);
 }
 const kind=mode==="retry"?"generate.requested":"generate.canceled",target=mode==="retry"?response.id:job.id;
 const stored=(await pool.query("SELECT * FROM evidence_events WHERE job_id=$1 AND kind=$2",[target,kind])).rows;
 expect(stored).toHaveLength(1);expect(stored[0].actor_id).toBe(actor.id);expect(stored[0].payload.actorType).toBe("admin");
 const dto=(await events(f.s.id)).find(e=>e.jobId===target&&e.kind===kind)!;expect(dto.actorId).toBeNull();expect(dto.payload.actorType).toBe("admin");expect(JSON.stringify(await events(f.s.id))).not.toContain(actor.id);
});
it("E01 running user cancellation survives worker recovery without fabricating early completion",async()=>{
 const f=await setup(),j=await enqueue(f.s.id);const claim=(await queue.claim("user-cancel"))!;await jobs.cancel(raw,j.id);
 expect((await jobs.get(raw,j.id)).status).toBe("running");expect((await events(f.s.id)).filter(e=>e.kind==="generate.canceled")).toHaveLength(0);
 await pool.query("UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=$1",[claim.id]);await queue.recoverExpired();await queue.recoverExpired();
 const es=(await events(f.s.id)).filter(e=>e.kind==="generate.canceled");expect(es).toHaveLength(1);expect(es[0]).toMatchObject({actorId:owner,payload:{actorType:"user"}});
});
it("E01 database rejects TRUNCATE without losing existing evidence",async()=>{
 const f=await setup();await expect(pool.query("TRUNCATE evidence_events")).rejects.toMatchObject({code:"23514"});expect(await events(f.s.id)).toHaveLength(1);
});
it("E01 native asset in legacy session has complete selection and legacy verification stale is consistent",async()=>{
 const f=await setup(),sid=randomUUID();await pool.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES($1,$2,$3,'Legacy')",[sid,owner,f.p.id]);f.s.id=sid;
 const a=await generate(f);await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});expect((await evidence.certificate(raw,a.ids[0])).selection).toMatchObject({history:"complete",userSelectionCount:1});
 const legacy={schemaVersion:1,verdict:"pass",ruleResults:[{ruleId:"one",verdict:"pass",reason:"Fixture",evidence:"Fixture"}],guideId:f.gid,jobId:randomUUID(),engineVersion:"old",checkedAt:new Date().toISOString()};await pool.query("UPDATE assets SET verification=$2 WHERE id=$1",[a.ids[0],legacy]);
 expect((await evidence.certificate(raw,a.ids[0])).verification?.stale).toBe(true);expect(await finals.get(raw,a.ids[0])).toMatchObject({stale:true,canFinalize:false});
});
it("E01 unauthenticated invalid IDs and queries return auth first",async()=>{
 for(const read of [()=>evidence.list(undefined,"!",{limit:"1e1"}),()=>evidence.certificate(undefined,"!")])await expect(read()).rejects.toMatchObject({code:"UNAUTHORIZED"});
 const f=await setup();await expect(evidence.list(raw,f.s.id,{limit:"1e1"})).rejects.toThrow();
});
function boundaryVerification(jobId:string,guideId:string){return {schemaVersion:1 as const,verdict:"pass" as const,ruleResults:Array.from({length:70},(_,i)=>({ruleId:"rule"+i,verdict:"pass" as const,reason:"r".repeat(400),evidence:"e".repeat(400)})),guideId,guideVersion:1,jobId,engineVersion:"boundary",checkedAt:"2026-10-01T00:00:00.000Z"};}
async function fitBytes(value:ReturnType<typeof boundaryVerification>,target:number,wrapper:(v:ReturnType<typeof boundaryVerification>)=>unknown=v=>v){
 const bytes=async()=>(await pool.query("SELECT octet_length($1::jsonb::text) n",[JSON.stringify(wrapper(value))])).rows[0].n;
 let delta=target-await bytes();for(const rule of value.ruleResults){for(const key of ["reason","evidence"] as const){const change=Math.max(1-rule[key].length,Math.min(500-rule[key].length,delta));rule[key]+="x".repeat(Math.max(0,change));if(change<0)rule[key]=rule[key].slice(0,rule[key].length+change);delta-=change;}}
 expect(await bytes()).toBe(target);verificationSchema.parse(value);return value;
}
it.each([65535,65536,65537])("E01 verification %i-byte DB boundary preserves asset capacity and INVALID_RESULT classification",async bytes=>{
 const f=await setup(),a=await generate(f);await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});const v=new VerificationService(ws,jobs);await v.request(raw,f.s.id,{assetIds:a.ids,guideId:f.gid,outputLocale:"ko",idempotencyKey:randomUUID()});const claim=(await queue.claim("boundary"))!;
 await queue.dispatch(claim,"synthetic");const verification=await fitBytes(boundaryVerification(claim.id,f.gid),bytes);const result={output:{schemaVersion:1 as const,kind:"verification" as const,assetIds:a.ids,results:[{assetId:a.ids[0],verification}]}};
 if(bytes<=65536){await auth.transaction(async c=>{await assertDatabaseMetadata(c,verification);await registry.get("verification")!.apply!(c,claim,result);});expect((await events(f.s.id)).filter(e=>e.kind==="verify.run")).toHaveLength(1);expect((await pool.query("SELECT verification FROM assets WHERE id=$1",[a.ids[0]])).rows[0].verification).toEqual(verification);}
 else {await expect(assertDatabaseMetadata(pool,verification)).rejects.toMatchObject({code:"INVALID_RESULT"});await expect(pool.query("UPDATE assets SET verification=$2 WHERE id=$1",[a.ids[0],verification])).rejects.toMatchObject({code:"23514"});}
 // Existing jobs.output bound includes its envelope. Actual queue refusal uses DB size, even when compact JSON fits.
 try{await queue.complete(claim,registry.get("verification")!,result);throw Error("Unexpected oversized success");}catch(error){expect(error).toMatchObject({code:"INVALID_RESULT"});await queue.fail(claim,error);}
 expect(await jobs.get(raw,claim.id)).toMatchObject({status:"failed",errorCode:"INVALID_RESULT",canRetry:false});
});
it.each([65535,65536,65537])("E01 full job output %i-byte boundary is measured exactly like its DB CHECK",async bytes=>{
 const f=await setup(),a=await generate(f);await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});await new VerificationService(ws,jobs).request(raw,f.s.id,{assetIds:a.ids,guideId:f.gid,outputLocale:"ko",idempotencyKey:randomUUID()});const claim=(await queue.claim("output-boundary"))!;
 const wrap=(verification:ReturnType<typeof boundaryVerification>)=>({schemaVersion:1 as const,kind:"verification" as const,assetIds:a.ids,results:[{assetId:a.ids[0],verification}]});const verification=await fitBytes(boundaryVerification(claim.id,f.gid),bytes,wrap),output=wrap(verification);
 const handler=registry.get("verification")!;
 if(bytes<=65536){expect(await queue.complete(claim,handler,{output})).toBe(true);expect((await pool.query("SELECT output FROM jobs WHERE id=$1",[claim.id])).rows[0].output).toEqual(output);expect((await pool.query("SELECT verification FROM assets WHERE id=$1",[a.ids[0]])).rows[0].verification).toEqual(verification);expect((await events(f.s.id)).filter(e=>e.kind==="verify.run")).toHaveLength(1);}else {await expect(queue.complete(claim,handler,{output})).rejects.toMatchObject({code:"INVALID_RESULT"});expect((await events(f.s.id)).filter(e=>e.kind==="verify.run")).toHaveLength(0);}
});

it("E01 provider oversized response becomes INVALID_RESULT before apply despite dispatch",async()=>{
 const f=await setup(),a=await generate(f);await ws.patchAsset(raw,a.ids[0],{version:1,adopted:true});
 const rules=Array.from({length:70},(_,i)=>({ruleId:"rule"+i,title:"Fixture",description:"Fixture",condition:{field:"x",operator:"equals",value:true},evidence:{page:1,excerpt:"Fixture"}}));await pool.query("UPDATE brand_guides SET rules=$2 WHERE id=$1",[f.gid,{schemaVersion:1,rules}]);
 await new VerificationService(ws,jobs).request(raw,f.s.id,{assetIds:a.ids,guideId:f.gid,outputLocale:"ko",idempotencyKey:randomUUID()});const claim=(await queue.claim("invalid-provider"))!;
 const handler=verificationHandler(auth,{name:"synthetic",verify:async()=>({engineVersion:"fixture",results:[{assetId:a.ids[0],rules:rules.map(r=>({ruleId:r.ruleId,verdict:"pass",reason:"r".repeat(500),evidence:"e".repeat(500)}))}]})});
 try{await handler.run({job:claim,signal:new AbortController().signal,dispatch:p=>queue.dispatch(claim,p),providerRequest:id=>queue.providerRequest(claim,id),reserveFile:f=>queue.reserveFile(claim,f)});throw Error("Oversized provider accepted");}catch(error){expect(error).toMatchObject({code:"INVALID_RESULT"});await queue.fail(claim,error);}
 expect(await jobs.get(raw,claim.id)).toMatchObject({status:"failed",errorCode:"INVALID_RESULT",canRetry:false});expect((await pool.query("SELECT verification FROM assets WHERE id=$1",[a.ids[0]])).rows[0].verification).toBeNull();expect((await events(f.s.id)).filter(e=>e.kind==="verify.run")).toHaveLength(0);
});

it("E01 pre-fix foreign actor IDs remain masked without rewriting old immutable events",async()=>{
 const f=await setup(),actor=await account();await auth.transaction(c=>appendEvidence(c,owner,f.s.id,{schemaVersion:1,kind:"generate.requested",actorType:"user",guide:null},null,null,actor.id));
 const es=await events(f.s.id);expect(es[1].actorId).toBeNull();expect((await pool.query("SELECT actor_id FROM evidence_events WHERE id=$1",[es[1].id])).rows[0].actor_id).toBe(actor.id);
});
