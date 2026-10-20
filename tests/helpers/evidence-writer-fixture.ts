// Private synthetic E2E setup through the actual business writer, never a public API.
import { Pool } from "pg";
import { AuthService } from "../../lib/server/auth/service";
import { JobService } from "../../lib/server/jobs/service";
import { HandlerRegistry } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
async function main() {
 const url=process.env.TEST_DATABASE_URL;
 if(!url || !/^\/claps_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname)) throw new Error("Synthetic test DB required");
 const pool=new Pool({connectionString:url}),auth=new AuthService(pool,async()=>{},"http://localhost:3000"),jobs=new JobService(auth,new HandlerRegistry(),{...developmentQueuePolicy,queuedPerUser:100,requestsPerHour:100});
 try {
 const [sid,count]=process.argv.slice(2),{rows:[s]}=await pool.query("SELECT owner_id,project_id FROM asset_sessions WHERE id=$1",[sid]);
 for(let i=0;i<Number(count);i++)await auth.transaction(async c=>{
 const job=await jobs.insert(c,s.owner_id,{schemaVersion:1,kind:"generation",sessionId:sid,prompt:"Private synthetic fold "+i,outputLocale:"ko"},"fold-"+i,s.project_id,undefined,s.owner_id,i<32?"user":"admin");
 await c.query("UPDATE jobs SET next_run_at=now()+interval '1 day' WHERE id=$1",[job.id]);
 });
 } finally { await pool.end(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
