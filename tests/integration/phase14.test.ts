import { randomUUID, randomBytes } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { EvidenceService } from "../../lib/server/evidence/service";
import { JobService } from "../../lib/server/jobs/service";
import { HandlerRegistry } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { cleanupEvidence } from "../helpers/evidence-cleanup";
import { groupEvidence, mergeEvidence, type EvidenceEvent } from "../../lib/evidence-view";
const { pool } = createDatabase(getTestDatabaseUrl()), owner=randomUUID(), raw=randomBytes(32).toString("hex");
const auth=new AuthService(pool,async()=>{},"http://localhost:3000"), ws=new WorkspaceService(auth), service=new EvidenceService(ws), jobs=new JobService(auth,new HandlerRegistry(),{...developmentQueuePolicy,queuedPerUser:100,requestsPerHour:100});
beforeAll(async()=>{await migrateDatabase(pool);await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Phase14',true,'active')",[owner,owner+'@example.test']);await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",[randomUUID(),owner,digest(raw)]);});
afterAll(async()=>{await cleanupEvidence(pool,[owner]);await pool.query("DELETE FROM jobs WHERE owner_id=$1",[owner]);await pool.query("DELETE FROM asset_sessions WHERE owner_id=$1",[owner]);await pool.query("DELETE FROM auth_sessions WHERE user_id=$1",[owner]);await pool.query("DELETE FROM users WHERE id=$1",[owner]);await pool.end();});
it("E01/E02 real multi-page server cursor preserves every event across fold boundary and admin masking",async()=>{
 const s=await ws.createSession(raw,{title:"Cursor boundary"});
 for(let i=0;i<64;i++)await auth.transaction(c=>jobs.insert(c,owner,{schemaVersion:1,kind:"generation",sessionId:s.id,prompt:"Synthetic "+i,outputLocale:"ko"},"fold-"+i,null,undefined,owner,i<32?"user":"admin"));
 let items:EvidenceEvent[]=[],cursor:string|undefined;let pages=0;
 do {const page=await service.list(raw,s.id,{limit:'30',...(cursor?{cursor}:{})});items=mergeEvidence(items,page);cursor=page.nextCursor??undefined;pages++;}while(cursor);
 expect(new Set(items.slice(1).map(e=>e.jobId)).size).toBe(64);expect(items.slice(1).every(e=>!!e.jobId)).toBe(true);expect(pages).toBe(3);expect(items.map(e=>e.sequence)).toEqual(Array.from({length:65},(_,i)=>i+1));expect(groupEvidence(items).map(g=>g.length)).toEqual([1,32,32]);expect(items.slice(33).every(e=>e.actorId===null)).toBe(true);
 // Archived metadata read remains valid and does not make workspace writes available.
 await pool.query("UPDATE asset_sessions SET archived_at=now() WHERE id=$1",[s.id]);expect((await service.list(raw,s.id)).items).toHaveLength(30);await expect(ws.patchSession(raw,s.id,{version:1,title:"Denied"})).rejects.toMatchObject({code:'STATE_CONFLICT'});
});
