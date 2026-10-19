import { randomUUID, randomBytes } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { createDatabase } from '../../lib/server/db';
import { getTestDatabaseUrl } from '../../lib/server/config/env';
import { migrateDatabase } from '../../lib/server/db/migrate';
import { AuthService,digest } from '../../lib/server/auth/service';
import { WorkspaceService } from '../../lib/server/projects/service';
import { StorageService } from '../../lib/server/storage/service';
import { MonitoringService } from '../../lib/server/monitoring/service';
import { MonitoringFeedbackService } from '../../lib/server/monitoring/feedback';
import { monitoringHandler } from '../../lib/server/monitoring/handler';
import { JobService } from '../../lib/server/jobs/service';
import { JobQueue } from '../../lib/server/jobs/queue';
import { HandlerRegistry } from '../../lib/server/jobs/types';
import { developmentQueuePolicy } from '../../lib/server/jobs/policy';
import { runClaimedJob } from '../../lib/server/jobs/runner';
import { cleanupFeedback } from '../helpers/monitoring-feedback-cleanup';
import sharp from 'sharp';
import type { MonitoringResult } from '../../lib/contracts/monitoring-result';
const {pool}=createDatabase(getTestDatabaseUrl(),8),auth=new AuthService(pool,async()=>{},'http://localhost:3000'),ws=new WorkspaceService(auth),storage=new StorageService(ws);
const factors={provider:'Synthetic engine',engineVersion:'v15',meaning:'similarity_percent' as const,character:0,color:null,composition:100};
const output:MonitoringResult={state:'partial',sources:[{name:'synthetic',status:'succeeded'},{name:'unavailable',status:'failed'}],items:[{url:'https://public.com/a',source:'synthetic',similarity:80,discoveredAt:'2026-10-01T00:00:00Z',factors},{url:'https://public.com/b',source:'synthetic',similarity:null,discoveredAt:'2026-10-01T00:00:00Z'}]};
const handler=monitoringHandler(auth,{name:'synthetic',search:async()=>output}),jobs=new JobService(auth,new HandlerRegistry().register('monitoring',handler),{...developmentQueuePolicy,requestsPerHour:100}),queue=new JobQueue(jobs),service=new MonitoringService(ws,jobs),feedback=new MonitoringFeedbackService(service);
const owners:string[]=[];let owner:string,raw:string,foreign:string,recordId:string,jobId:string,png:Buffer,original:unknown;
async function account(){const id=randomUUID(),token=randomBytes(32).toString('hex');owners.push(id);await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Phase15',true,'active')",[id,id+'@example.test']);await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",[randomUUID(),id,digest(token)]);return {id,token};}
const report=(key:string,reason='different_subject',index='0')=>feedback.write(raw,recordId,jobId,index,'reported',{reason,idempotencyKey:key});
const withdraw=(key:string,index='0')=>feedback.write(raw,recordId,jobId,index,'withdrawn',{idempotencyKey:key});
async function scan(){const job=await service.request(raw,recordId,{outputLocale:'ko',idempotencyKey:randomUUID()});const claim=await queue.claim('phase15');expect(claim!.id).toBe(job.id);await runClaimedJob(queue,claim!);return job.id;}
beforeAll(async()=>{await migrateDatabase(pool);({id:owner,token:raw}=await account());foreign=(await account()).token;png=await sharp({create:{width:10,height:10,channels:3,background:'red'}}).png().toBuffer();const t=await storage.reserveMonitoring(raw,{name:'Synthetic.png',mime:'image/png',size:png.length});await storage.upload(raw,t.ticket,png,'image/png');recordId=(await service.create(raw,{name:'Phase15 synthetic',source:{kind:'upload',ticket:t.ticket}})).id;jobId=await scan();original=(await pool.query('SELECT output FROM jobs WHERE id=$1',[jobId])).rows[0].output;});
afterAll(async()=>{await cleanupFeedback(pool,owners);await pool.query('DELETE FROM storage_tickets WHERE owner_id=ANY($1)',[owners]);await pool.query('DELETE FROM monitoring_records WHERE owner_id=ANY($1)',[owners]);await pool.query('DELETE FROM jobs WHERE owner_id=ANY($1)',[owners]);await pool.query('DELETE FROM auth_sessions WHERE user_id=ANY($1)',[owners]);await pool.query('DELETE FROM users WHERE id=ANY($1)',[owners]);await pool.end();});
it('M01 old and partial factors retain null/zero, stable job:index IDs without output mutation',async()=>{const h=await service.history(raw,recordId),items=h.items[0].result!.items;expect(items.map(i=>i.id)).toEqual([jobId+':0',jobId+':1']);expect(items[0].factors?.character).toBe(0);expect(items[0].factors?.color).toBeNull();expect(items[1].similarity).toBeNull();expect(items[1].factors).toBeUndefined();expect(items[0].feedback.reported).toBe(false);});
it('M02 authentication/foreign result/job/record, actual range and canonical index guards',async()=>{
 await expect(feedback.write(undefined,recordId,jobId,'0','reported',{})).rejects.toMatchObject({code:'UNAUTHORIZED'});
 await expect(feedback.write(foreign,recordId,jobId,'0','reported',{reason:'other',idempotencyKey:'foreign'})).rejects.toMatchObject({code:'NOT_FOUND'});
 for(const [rid,jid,index] of [[randomUUID(),jobId,'0'],[recordId,randomUUID(),'0'],[recordId,jobId,'2'],[recordId,jobId,'49']])await expect(feedback.write(raw,rid,jid,index,'reported',{reason:'other',idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'NOT_FOUND'});
 for(const index of ['50','-1','00','job:0'])await expect(report(randomUUID(),'other',index)).rejects.toHaveProperty('name','ZodError');
 await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[owner]);try{await expect(report('suspended')).rejects.toMatchObject({code:'UNAUTHORIZED'});}finally{await pool.query("UPDATE users SET status='active' WHERE id=$1",[owner]);}
});
it('M02 replay returns original receipt; hash conflict does not append; action-scoped keys',async()=>{
 const a=await report('replay');expect(await report('replay')).toEqual(a);await expect(report('replay','licensed_use')).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});await expect(report('replay','different_subject','1')).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 const w=await withdraw('replay');expect(w.reported).toBe(false);expect(w.sequence).toBe(a.sequence+1);expect(await report('replay')).toEqual(a);expect((await service.history(raw,recordId)).items[0].result!.items[0].feedback).toEqual(w);
});
it('M02 concurrent exact retries produce one real event and simultaneous hash conflicts one winner',async()=>{
 const replies=await Promise.all(Array.from({length:8},()=>report('parallel')));expect(new Set(replies.map(r=>r.eventId)).size).toBe(1);
 const requests=await Promise.allSettled([report('conflict','licensed_use'),report('conflict','own_content')]);expect(requests.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(requests.filter(r=>r.status==='rejected')).toHaveLength(1);
 expect((await pool.query("SELECT count(*)::int n FROM monitoring_feedback_events WHERE owner_id=$1 AND action='reported' AND idempotency_key='parallel'",[owner])).rows[0].n).toBe(1);
});
it('M02 report/withdraw serialize with consecutive sequence; repeated withdrawals are audit receipts',async()=>{
 const events=await Promise.all([report('race-report'),withdraw('race-withdraw'),withdraw('race-withdraw2')]);const sorted=events.sort((a,b)=>a.sequence-b.sequence);expect(sorted.map(x=>x.sequence)).toEqual([sorted[0].sequence,sorted[0].sequence+1,sorted[0].sequence+2]);expect((await service.history(raw,recordId)).items[0].result!.items[0].feedback).toEqual(sorted[2]);
 const receipt=await withdraw('repeat-final');expect(receipt.reported).toBe(false);expect(await withdraw('repeat-final')).toEqual(receipt);
});
it('M02 transaction failure rolls back append and permits same-key recovery',async()=>{
 await pool.query(`CREATE FUNCTION phase15_fail_feedback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.idempotency_key='rollback-test' THEN RAISE EXCEPTION 'SYNTHETIC_ROLLBACK'; END IF; RETURN NEW; END $$`);await pool.query('CREATE TRIGGER phase15_fail BEFORE INSERT ON monitoring_feedback_events FOR EACH ROW EXECUTE FUNCTION phase15_fail_feedback()');
 try{await expect(report('rollback-test')).rejects.toThrow();expect((await pool.query("SELECT count(*)::int n FROM monitoring_feedback_events WHERE idempotency_key='rollback-test'")).rows[0].n).toBe(0);}finally{await pool.query('DROP TRIGGER phase15_fail ON monitoring_feedback_events');await pool.query('DROP FUNCTION phase15_fail_feedback()');}
 expect((await report('rollback-test')).reported).toBe(true);
});
it('M02 database update/delete/truncate denied; forged cross-owner, actual range and action/hash rejected',async()=>{
 const event=await report('immutable');for(const sql of ['UPDATE monitoring_feedback_events SET reason=reason WHERE id=$1','DELETE FROM monitoring_feedback_events WHERE id=$1'])await expect(pool.query(sql,[event.eventId])).rejects.toMatchObject({code:'23514'});await expect(pool.query('TRUNCATE monitoring_feedback_events')).rejects.toMatchObject({code:'23514'});
 const insert=`INSERT INTO monitoring_feedback_events(id,owner_id,actor_id,record_id,job_id,result_index,result_id,action,reason,idempotency_key,request_hash,sequence) VALUES($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,999)`;
 for(const [uid,index,action,reason,hash] of [[owners[1],0,'reported','other','a'.repeat(64)],[owner,49,'reported','other','a'.repeat(64)],[owner,0,'reported',null,'a'.repeat(64)],[owner,0,'withdrawn','other','a'.repeat(64)],[owner,0,'reported','other','bad']])await expect(pool.query(insert,[randomUUID(),uid,recordId,jobId,index,jobId+':'+index,action,reason,randomUUID(),hash])).rejects.toMatchObject({code:'23514'});
});
it('M01/M02 re-detect same URL new job gets separate feedback; 503 and late old success preserve latest summary',async()=>{
 const before=(await service.history(raw,recordId)).items[0].result!.items[0].feedback;const nextId=await scan();const unavailable=new MonitoringService(ws,new JobService(auth,new HandlerRegistry(),developmentQueuePolicy));await expect(unavailable.request(raw,recordId,{outputLocale:'ko',idempotencyKey:'no-provider'})).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
 const history=await service.history(raw,recordId);expect(history.items[0].job.id).toBe(nextId);expect(history.items[0].result!.items[0].feedback.reported).toBe(false);expect(history.items[1].result!.items[0].feedback).toEqual(before);
 const old=(await pool.query('SELECT * FROM jobs WHERE id=$1',[jobId])).rows[0];await auth.transaction(c=>handler.apply!(c,old,{output:original as import('../../lib/server/jobs/types').JobResult['output']}));expect((await service.get(raw,recordId)).latestJobId).toBe(nextId);
 expect((await pool.query('SELECT output FROM jobs WHERE id=$1',[jobId])).rows[0].output).toEqual(original);expect((await service.image(raw,recordId)).bytes).toEqual(png);
});
it('M01/M02 real 50-result output accepts last index49, and cannot address index50',async()=>{
 const previous=output.items;let nextId:string;
 try{output.items=Array.from({length:50},(_,i)=>({...previous[0],url:'https://public.com/boundary/'+i}));nextId=await scan();}finally{output.items=previous;}
 const event=await feedback.write(raw,recordId,nextId!,'49','reported',{reason:'other',idempotencyKey:'last-index'});expect(event.resultId).toBe(nextId!+':49');expect(event.sequence).toBe(1);await expect(feedback.write(raw,recordId,nextId!,'50','reported',{reason:'other',idempotencyKey:'out-of-range'})).rejects.toHaveProperty('name','ZodError');
 const latest=(await service.history(raw,recordId)).items[0].result!.items;expect(latest).toHaveLength(50);expect(latest[49].feedback).toEqual(event);expect(latest[0].feedback.reported).toBe(false);
});
it('M02 archived record denies feedback while readable history and previous reports remain intact',async()=>{
 const count=(await pool.query('SELECT count(*)::int n FROM monitoring_feedback_events WHERE record_id=$1',[recordId])).rows[0].n;await service.patch(raw,recordId,{version:1,archived:true});await expect(report('archived')).rejects.toMatchObject({code:'NOT_FOUND'});expect((await service.history(raw,recordId)).total).toBe(3);expect((await pool.query('SELECT count(*)::int n FROM monitoring_feedback_events WHERE record_id=$1',[recordId])).rows[0].n).toBe(count);
});
