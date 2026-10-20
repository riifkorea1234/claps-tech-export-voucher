import { existsSync } from 'node:fs';
// Phase17 synthetic local fixture; never registers providers in the running app.
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { phase17Config } from './phase17-config';
import { AuthService, digest } from '../lib/server/auth/service';
import { WorkspaceService } from '../lib/server/projects/service';
import { readyReview } from '../tests/helpers/review-fixture';
import { ReviewService } from '../lib/server/review/service';
import { MonitoringService } from '../lib/server/monitoring/service';
import { MonitoringFeedbackService } from '../lib/server/monitoring/feedback';
import { monitoringHandler } from '../lib/server/monitoring/handler';
import { JobService } from '../lib/server/jobs/service';
import { JobQueue } from '../lib/server/jobs/queue';
import { HandlerRegistry } from '../lib/server/jobs/types';
import { developmentQueuePolicy } from '../lib/server/jobs/policy';
import { runClaimedJob } from '../lib/server/jobs/runner';
async function main() {
 const config=phase17Config(),url=config.url;
 if(existsSync(config.fixture)) throw Error('Existing fixture rejected before mutation');
 const pool=new Pool({connectionString:url.toString()});
 try {
 const owner=randomUUID(),raw=randomBytes(32).toString('hex');
 await pool.query("INSERT INTO users(id,email,name,email_verified,status,preferences) VALUES($1,$2,'Phase17 synthetic',true,'active',$3)",[owner,owner+'@example.test',{schemaVersion:1,locale:'ja'}]);
 await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '2 days')",[randomUUID(),owner,digest(raw)]);
 const f=await readyReview(pool,raw),auth=new AuthService(pool,async()=>{},process.env.APP_ORIGIN!),ws=new WorkspaceService(auth),review=new ReviewService(ws);
 let r=await review.get(raw,f.session);await review.patch(raw,f.session,{version:r.checks.version,targetHash:r.targetHash,manual:{copyrightNotice:true,thirdPartyAssets:true,recipientConfirmed:true}});r=await review.get(raw,f.session);
 const snapshot=await review.issue(raw,f.session,{version:r.checks.version,targetHash:r.targetHash,idempotencyKey:'phase17-recovery'});
 const handler=monitoringHandler(auth,{name:'phase17-local-fixture',search:async()=>({state:'results',sources:[{name:'synthetic',status:'succeeded'}],items:[{url:'https://public.com/phase17-synthetic',source:'synthetic',similarity:80,discoveredAt:'2026-10-01T00:00:00Z',factors:{provider:'Synthetic only',engineVersion:'local-v17',meaning:'similarity_percent',character:80,color:null,composition:0}}]})});
 const jobs=new JobService(auth,new HandlerRegistry().register('monitoring',handler),{...developmentQueuePolicy,requestsPerHour:100}),monitoring=new MonitoringService(ws,jobs),queue=new JobQueue(jobs);
 const record=await monitoring.create(raw,{name:'Phase17 recovery original',source:{kind:'asset',assetId:f.aid}}),job=await monitoring.request(raw,record.id,{outputLocale:'ja',idempotencyKey:'phase17-monitoring'}),claim=await queue.claim('phase17-fixture');if(claim?.id!==job.id)throw Error('Unexpected job');await runClaimedJob(queue,claim);
 const feedback=await new MonitoringFeedbackService(monitoring).write(raw,record.id,job.id,'0','reported',{reason:'different_subject',idempotencyKey:'phase17-feedback'});
 await writeFile(config.fixture,JSON.stringify({owner,raw,...f,snapshotId:snapshot.id,recordId:record.id,jobId:job.id,feedback}),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({synthetic:true,project:f.project,session:f.session,snapshot:snapshot.id,record:record.id,job:job.id,automatic:(await review.get(raw,f.session)).automatic}));
 }finally{await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
