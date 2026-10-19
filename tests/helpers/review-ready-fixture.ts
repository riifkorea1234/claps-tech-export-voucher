import { randomUUID,randomBytes } from "node:crypto";
import { Pool } from "pg";
import { digest } from "../../lib/server/auth/service";
import { readyReview } from "./review-fixture";
import { phase15DatabaseUrl } from "../../scripts/phase15-db-guard";
async function main(){const pool=new Pool({connectionString:phase15DatabaseUrl(process.env.TEST_DATABASE_URL).toString()}),session=process.argv[2],token=randomBytes(32).toString('hex'),authId=randomUUID();try{const s=(await pool.query('SELECT owner_id FROM asset_sessions WHERE id=$1',[session])).rows[0];if(!s)throw Error('Missing owned fixture');await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[authId,s.owner_id,digest(token)]);console.log(JSON.stringify(await readyReview(pool,token,session)));}finally{await pool.query('DELETE FROM auth_sessions WHERE id=$1',[authId]);await pool.end();}}
main().catch(e=>{console.error(e instanceof Error?e.message:'Synthetic fixture failed');process.exitCode=1;});
