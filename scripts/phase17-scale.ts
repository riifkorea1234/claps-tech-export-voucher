import { existsSync } from 'node:fs';
// Local scale observations, not operating latency, throughput or SLA guarantees.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFile,writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { phase17Config, statistics } from './phase17-config';
import { AuthService } from '../lib/server/auth/service';
import { appendEvidence } from '../lib/server/evidence/writer';
import { SESSION_COOKIE } from '../lib/server/auth/policy';
async function main(){
 const config=phase17Config(),u=config.url;const counts=(process.env.PHASE17_SCALE_COUNTS ?? '100,1000,10000').split(',').map(Number);assert(counts.length&&counts.every(n=>Number.isInteger(n)&&n>=100&&n<=10000));
 if(existsSync(config.output+'/scale.json')) throw Error('Existing output rejected before mutation');
 const f=JSON.parse(await readFile(config.fixture,'utf8')),pool=new Pool({connectionString:u.toString(),max:8}),auth=new AuthService(pool,async()=>{},process.env.APP_ORIGIN!),origin=process.env.APP_ORIGIN!;
 const headers={Origin:origin,Cookie:`${SESSION_COOKIE}=${f.raw}`,'Content-Type':'application/json'},path=`/api/monitoring-records/${f.recordId}/scans/${f.jobId}/results/0/feedback`,readiness=`/api/asset-sessions/${f.session}/review-package`;
 const samples:unknown[]=[];
 const request=async(path:string,method='GET',data?:unknown)=>{const start=performance.now(),r=await fetch(origin+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})}),body=await r.text();assert.equal(r.status,path===readiness&&method==='POST'?201:200,body);return {ms:performance.now()-start,bytes:Buffer.byteLength(body),data:JSON.parse(body).data};};
 const stat=statistics;
 try{
 for(const n of counts){
 let count=Number((await pool.query('SELECT count(*) n FROM monitoring_feedback_events WHERE job_id=$1',[f.jobId])).rows[0].n);const writeMs:number[]=[];
 while(count<n){const x=await request(path,count%2?'DELETE':'POST',count%2?{idempotencyKey:'scale-'+count}:{reason:'different_subject',idempotencyKey:'scale-'+count});writeMs.push(x.ms);count++;}
 let events=Number((await pool.query('SELECT count(*) n FROM evidence_events WHERE session_id=$1',[f.session])).rows[0].n);
 while(events<n){await auth.authenticated(f.raw,(c,user)=>appendEvidence(c,user.id,f.session,{schemaVersion:1,kind:'asset.adopted',actorType:'user',assetVersion:4},f.aid));events++;}
 const a=await request(readiness),reads=[],history=[];
 for(let i=0;i<20;i++){reads.push((await request(readiness)).ms);history.push((await request(`/api/monitoring-records/${f.recordId}/scans`)).ms);}
 const replay=await request(path,'DELETE',{idempotencyKey:'scale-'+(n-1)});assert.equal(replay.data.sequence,n);
 const plans={feedback:(await pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT DISTINCT ON(job_id,result_index) * FROM monitoring_feedback_events WHERE owner_id=$1 AND job_id=ANY($2::text[]) ORDER BY job_id,result_index,sequence DESC',[f.owner,[f.jobId]])).rows,evidence:(await pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT sequence,kind,asset_id,job_id,payload FROM evidence_events WHERE session_id=$1 AND owner_id=$2 ORDER BY sequence',[f.session,f.owner])).rows};
 const sizes=(await pool.query("SELECT 'feedback' name,count(*)::int rows,sum(pg_column_size(t))::bigint bytes FROM monitoring_feedback_events t WHERE job_id=$1 UNION ALL SELECT 'evidence',count(*)::int,sum(pg_column_size(t))::bigint FROM evidence_events t WHERE session_id=$2",[f.jobId,f.session])).rows;
 const lockCases=[];
 for(const [table,id] of [['users',f.owner],['asset_sessions',f.session],['projects',f.project],['assets',f.aid]]){
 const blocker=await pool.connect();await blocker.query('BEGIN');await blocker.query(`SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);
 const pending=Array.from({length:4},()=>request(readiness));await new Promise(r=>setTimeout(r,200));
 const activity=(await pool.query("SELECT state,wait_event_type,wait_event,EXTRACT(EPOCH FROM clock_timestamp()-xact_start)*1000 tx_ms FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).rows;
 const locks=(await pool.query("SELECT locktype,mode,granted,relation::regclass::text relation,count(*)::int n FROM pg_locks WHERE pid IN(SELECT pid FROM pg_stat_activity WHERE datname=current_database()) GROUP BY locktype,mode,granted,relation ORDER BY locktype,mode,granted")).rows;
 await blocker.query('COMMIT');blocker.release();const contention=await Promise.all(pending);assert(activity.length>0);assert(contention.every(x=>x.data.targetHash===a.data.targetHash));
 lockCases.push({heldTable:table,activity,locks,latency:stat(contention.map(x=>x.ms))});
 }
 const patchData={version:a.data.checks.version,targetHash:a.data.targetHash,manual:{copyrightNotice:true,thirdPartyAssets:true,recipientConfirmed:true}};
 const race=await Promise.all([request(readiness),request(`/api/asset-sessions/${f.session}/review-checks`,'PATCH',patchData)]);assert.equal(race[1].data.version,patchData.version+1);
 const ready=await request(readiness);assert.equal(ready.data.ready,true);const key=randomUUID(),issueData={version:ready.data.checks.version,targetHash:ready.data.targetHash,idempotencyKey:key};
 const issued=await request(readiness,'POST',issueData),same=await request(readiness,'POST',issueData);assert.equal(issued.data.id,same.data.id);
 const h=await request(`/api/monitoring-records/${f.recordId}/scans`);assert.equal(h.data.items.length,1);assert.equal(h.data.items[0].result.items.length,1);
 samples.push({n,write:stat(writeMs),readiness:stat(reads),history:stat(history),raw:{readiness:reads,history,write:writeMs},readinessBytes:a.bytes,dtoItems:1,plans,sizes,lockCases,patchConcurrent:true,issueReplay:true,cutoff:ready.data.target.cutoff});
 console.log(JSON.stringify({n,write:stat(writeMs),readiness:stat(reads),history:stat(history),sizes,lockCases:lockCases.length}));
 await writeFile(config.output+'/scale.json',JSON.stringify(samples,null,2));
 }
 }finally{await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
