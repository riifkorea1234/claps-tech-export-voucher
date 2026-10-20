// Dedicated synthetic engine, using actual request/claim/provider validation/completion.
import { phase15DatabaseUrl } from '../../scripts/phase15-db-guard';
import { randomUUID,randomBytes } from 'node:crypto';
import { createDatabase } from '../../lib/server/db';
import { AuthService,digest } from '../../lib/server/auth/service';
import { WorkspaceService } from '../../lib/server/projects/service';
import { MonitoringService } from '../../lib/server/monitoring/service';
import { monitoringHandler } from '../../lib/server/monitoring/handler';
import { JobService } from '../../lib/server/jobs/service';
import { JobQueue } from '../../lib/server/jobs/queue';
import { HandlerRegistry } from '../../lib/server/jobs/types';
import { developmentQueuePolicy } from '../../lib/server/jobs/policy';
import { runClaimedJob } from '../../lib/server/jobs/runner';
async function main(){
 const url=phase15DatabaseUrl(process.env.TEST_DATABASE_URL);const {pool}=createDatabase(url.toString()),recordId=process.argv[2];
 const token=randomBytes(32).toString('hex'),session=randomUUID();
 try{
  const record=(await pool.query('SELECT owner_id,source_file FROM monitoring_records WHERE id=$1',[recordId])).rows[0];if(!record)throw Error('Record required');
  await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[session,record.owner_id,digest(token)]);
  const auth=new AuthService(pool,async()=>{},process.env.APP_ORIGIN!),ws=new WorkspaceService(auth);
  const factors={provider:'Synthetic engine (test only)',engineVersion:'fixture-v15',meaning:'similarity_percent' as const,character:0,color:null,composition:33.3333333};
  const handler=monitoringHandler(auth,{name:'isolated-phase15-engine',search:async bytes=>{if(bytes.length!==record.source_file.size)throw Error('Original file mismatch');return {state:'partial',sources:[{name:'synthetic',status:'succeeded'},{name:'unavailable',status:'failed'}],items:[0,79.99,80,89.99,90,100,null].map((similarity,i)=>({url:'https://public.com/phase15/'+i,source:'synthetic',similarity,discoveredAt:'2026-10-01T00:00:00Z',...(i===6?{}:{factors})}))};}});
  const jobs=new JobService(auth,new HandlerRegistry().register('monitoring',handler),developmentQueuePolicy),queue=new JobQueue(jobs),monitoring=new MonitoringService(ws,jobs);
  const job=await monitoring.request(token,recordId,{outputLocale:'ko',idempotencyKey:randomUUID()}),claim=await queue.claim('phase15-fixture');if(claim?.id!==job.id)throw Error('Unexpected claim');await runClaimedJob(queue,claim);if((await pool.query('SELECT status FROM jobs WHERE id=$1',[job.id])).rows[0].status!=='succeeded')throw Error('Completion failed');console.log(job.id);
 }finally{await pool.query('DELETE FROM auth_sessions WHERE id=$1',[session]);await pool.end();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Synthetic fixture failed');process.exitCode=1;});
