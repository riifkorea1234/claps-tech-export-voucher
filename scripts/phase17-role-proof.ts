import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { phase17Config, roleNames } from './phase17-config';
import { operationalProof } from './phase17-operability';
import { readFile,writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { AuthService } from '../lib/server/auth/service';
import { WorkspaceService } from '../lib/server/projects/service';
import { ReviewService } from '../lib/server/review/service';
import { appendEvidence } from '../lib/server/evidence/writer';
import { MonitoringService } from '../lib/server/monitoring/service';
import { MonitoringFeedbackService } from '../lib/server/monitoring/feedback';
import { HandlerRegistry } from '../lib/server/jobs/types';
import { developmentQueuePolicy } from '../lib/server/jobs/policy';
import { JobService } from '../lib/server/jobs/service';
async function main(){
 const config=phase17Config(),{roles,db}=roleNames(),u=new URL(config.url),source=u.pathname.slice(1),password=randomBytes(48).toString('hex');u.pathname='/postgres';
 const root=new Pool({connectionString:u.toString()});
 try {
 // Check every target before the first CREATE, so a collision never leaves partial roles.
 for(const role of roles) assert.equal((await root.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount,0);
 assert.equal((await root.query('SELECT 1 FROM pg_database WHERE datname=$1',[db])).rowCount,0);
 for(const role of roles) await root.query(`CREATE ROLE ${role} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);
 await root.query(`CREATE DATABASE ${db} TEMPLATE ${source} OWNER ${roles[0]}`);
 await writeFile(config.root+'/role-credentials-'+roles[0]+'.json',JSON.stringify({roles,db,password}),{mode:0o600,flag:'wx'});
 }finally{await root.end();}
 u.pathname='/'+db;const owner=new Pool({connectionString:u.toString()});
 try{
 for(const r of (await owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows)await owner.query(`ALTER TABLE public."${r.tablename}" OWNER TO ${roles[0]}`);
 for(const r of (await owner.query("SELECT proname,pg_get_function_identity_arguments(p.oid) args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'")).rows)await owner.query(`ALTER FUNCTION public."${r.proname}"(${r.args}) OWNER TO ${roles[0]}`);
 await owner.query(`ALTER SCHEMA public OWNER TO ${roles[0]}`);await owner.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');await owner.query(`GRANT USAGE ON SCHEMA public TO ${roles[1]},${roles[2]}`);
 await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${roles[1]},${roles[2]}`);
 for(const table of ['users','auth_sessions','auth_accounts','auth_verifications','auth_rate_limits','projects','asset_sessions','assets','brand_guides','jobs','storage_tickets','monitoring_records','review_checks','locales','localized_contents','partners'])await owner.query(`GRANT INSERT,UPDATE ON "${table}" TO ${roles[1]}`);
 for(const table of ['auth_sessions','auth_verifications','storage_tickets'])await owner.query(`GRANT DELETE ON "${table}" TO ${roles[1]}`);
 for(const table of ['evidence_events','monitoring_feedback_events','review_package_snapshots','admin_audit_logs'])await owner.query(`GRANT INSERT ON "${table}" TO ${roles[1]}`);
 }finally{await owner.end();}
 const appUrl=new URL(u);appUrl.username=roles[1];appUrl.password=password;const app=new Pool({connectionString:appUrl.toString()}),f=JSON.parse(await readFile(config.fixture,'utf8')),denials:unknown[]=[];
 try{
 assert.equal((await app.query(`SELECT pg_has_role(current_user,'${roles[0]}','MEMBER') member`)).rows[0].member,false);
 assert.equal((await app.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public' AND tableowner=current_user")).rows[0].n,0);
 const {privateCredentials:credentials,...operational}=await operationalProof(app,config.origin);await writeFile(config.root+'/admin-'+roles[0]+'.json',JSON.stringify(credentials),{mode:0o600,flag:'wx'});
 const auth=new AuthService(app,async()=>{},process.env.APP_ORIGIN!),ws=new WorkspaceService(auth),review=new ReviewService(ws);
 await auth.authenticated(f.raw,(c,user)=>appendEvidence(c,user.id,f.session,{schemaVersion:1,kind:'asset.adopted',actorType:'user',assetVersion:4},f.aid));
 const r=await review.get(f.raw,f.session);await review.patch(f.raw,f.session,{version:r.checks.version,targetHash:r.targetHash,manual:{copyrightNotice:true,thirdPartyAssets:true,recipientConfirmed:true}});const ready=await review.get(f.raw,f.session),input={version:ready.checks.version,targetHash:ready.targetHash,idempotencyKey:'role-proof'};const receipt=await review.issue(f.raw,f.session,input);assert.deepEqual(await review.issue(f.raw,f.session,input),receipt);
 const feedback=new MonitoringFeedbackService(new MonitoringService(ws,new JobService(auth,new HandlerRegistry(),developmentQueuePolicy))),data={reason:'different_subject',idempotencyKey:'role-positive'};const reported=await feedback.write(f.raw,f.recordId,f.jobId,'0','reported',data);assert.deepEqual(await feedback.write(f.raw,f.recordId,f.jobId,'0','reported',data),reported);await feedback.write(f.raw,f.recordId,f.jobId,'0','withdrawn',{idempotencyKey:'role-positive'});
 for(const table of ['evidence_events','monitoring_feedback_events','review_package_snapshots'])for(const sql of [`UPDATE ${table} SET id=id`,`DELETE FROM ${table}`,`TRUNCATE ${table}`,`ALTER TABLE ${table} ADD COLUMN forbidden integer`,`ALTER TABLE ${table} DISABLE TRIGGER ALL`]){let code='';try{await app.query(sql)}catch(e){code=(e as {code:string}).code;}assert.equal(code,'42501',sql);denials.push({sql,code});}
 let code='';try{await app.query('CREATE TABLE forbidden_role_probe(id integer)')}catch(e){code=(e as {code:string}).code}assert.equal(code,'42501');denials.push({sql:'CREATE TABLE',code});
 const readerUrl=new URL(appUrl);readerUrl.username=roles[2];const reader=new Pool({connectionString:readerUrl.toString()});try{assert.equal((await reader.query('SELECT count(*)::int n FROM review_package_snapshots')).rows[0].n>0,true);let code='';try{await reader.query("INSERT INTO evidence_events SELECT * FROM evidence_events LIMIT 1")}catch(e){code=(e as {code:string}).code}assert.equal(code,'42501');}finally{await reader.end()}
 await writeFile(config.output+'/role-proof-'+roles[0]+'.json',JSON.stringify({database:db,roles,operational,appOwnsTables:0,inheritsMigrationOwner:false,positive:['authenticated append evidence','review get/patch/issue/replay','feedback report/withdraw/replay','reader SELECT'],denials,operatingGrantsChanged:false},null,2));console.log('Least privilege isolated app positives PASS; denied probes',denials.length);
 }finally{await app.end();const cleanup=new Pool({connectionString:u.toString()});try{for(const role of roles)await cleanup.query(`ALTER ROLE ${role} NOLOGIN PASSWORD NULL`);}finally{await cleanup.end();}}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
