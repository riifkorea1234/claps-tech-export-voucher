// Private synthetic fixture. No test adapter is registered in the production application.
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";
import sharp from "sharp";
import { AuthService } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry, type JobHandler } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { verificationHandler } from "../../lib/server/verifications/handler";
import { VerificationService } from "../../lib/server/verifications/service";
import { FinalizationService } from "../../lib/server/finalizations/service";
import { phase15DatabaseUrl } from "../../scripts/phase15-db-guard";
export async function readyReview(pool: Pool, raw: string, sessionId?: string) {
 phase15DatabaseUrl(process.env.TEST_DATABASE_URL);
 const auth = new AuthService(pool,async()=>{},"http://127.0.0.1:3281"), ws = new WorkspaceService(auth);
 const project = sessionId ? (await ws.getSession(raw,sessionId)).projectId! : (await ws.createProject(raw,{name:"Phase16 synthetic"})).id;
 const session = sessionId ?? (await ws.createSession(raw,{title:"Phase16 synthetic",projectId:project})).id;
 const gid = randomUUID(), aid = randomUUID(), png = await sharp({create:{width:16,height:16,channels:3,background:"#ff9933"}}).png().toBuffer();
 const file = {schemaVersion:1 as const,storageKey:randomUUID()+"-original",originalName:"synthetic.png",mimeType:"image/png",size:png.length,checksum:createHash("sha256").update(png).digest("hex")};
 await mkdir(process.env.UPLOADS_DIR!,{recursive:true,mode:0o700});await writeFile(join(process.env.UPLOADS_DIR!,file.storageKey),png,{mode:0o600});
 await pool.query("INSERT INTO brand_guides(id,project_id,version,file,rules,status) VALUES($1,$2,1,$3,$4,'published')",[gid,project,file,{schemaVersion:1,rules:[{ruleId:"one",title:"色の確認",description:"合成テスト",condition:{field:"x",operator:"equals",value:true},evidence:{page:1,excerpt:"合成"}}]}]);await pool.query("UPDATE projects SET active_guide_id=$2 WHERE id=$1",[project,gid]);
 const generation:JobHandler={run:async()=>({output:{schemaVersion:1,kind:"generation",assetIds:[aid]}}),apply:async(c,j)=>{if(j.input.kind!=="generation")throw Error();await c.query("INSERT INTO assets(id,session_id,generation_job_id,file) VALUES($1,$2,$3,$4)",[aid,session,j.id,file]);}};
 const registry = new HandlerRegistry().register("generation",generation).register("verification",verificationHandler(auth,{name:"phase16-synthetic",verify:async input=>({engineVersion:"synthetic-v1",results:input.assets.map(a=>({assetId:a.id,rules:input.rules.rules.map(rule=>({ruleId:rule.ruleId,verdict:"pass",reason:"適合",evidence:"合成の確認記録"}))}))})}));
 const jobs = new JobService(auth,registry,{...developmentQueuePolicy,requestsPerHour:100}), queue = new JobQueue(jobs);
 const gj = await jobs.enqueue(raw,{input:{schemaVersion:1,kind:"generation",sessionId:session,prompt:"Synthetic private prompt",guideId:gid,outputLocale:"ja"},idempotencyKey:randomUUID()});
 const claim = await queue.claim("phase16-fixture");if(claim?.id!==gj.id)throw Error("Unexpected fixture claim");await queue.complete(claim,generation,{output:{schemaVersion:1,kind:"generation",assetIds:[aid]}});
 await ws.patchAsset(raw,aid,{version:1,adopted:true});
 const vj = await new VerificationService(ws,jobs).request(raw,session,{assetIds:[aid],guideId:gid,outputLocale:"ja",idempotencyKey:randomUUID()}), vc=await queue.claim("phase16-fixture");if(vc?.id!==vj.id)throw Error("Unexpected verify claim");
 const h=registry.get("verification")!, result=await h.run({job:vc,signal:new AbortController().signal,dispatch:(p,id)=>queue.dispatch(vc,p,id),providerRequest:id=>queue.providerRequest(vc,id),reserveFile:f=>queue.reserveFile(vc,f)});await queue.complete(vc,h,result);await new FinalizationService(ws).set(raw,aid,{version:3},true);
 return {project,session,gid,aid,file,gj:gj.id,vj:vj.id};
}
