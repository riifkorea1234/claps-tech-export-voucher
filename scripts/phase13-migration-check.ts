// Dedicated synthetic instance only; preserve every created DB for independent review.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { mkdtemp, mkdir, cp, readFile, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { migrateDatabase } from "../lib/server/db/migrate";
async function main(){
 const address=process.env.TEST_DATABASE_URL;if(!address)throw Error("TEST_DATABASE_URL required");const u=new URL(address);if(u.hostname!=="127.0.0.1"||u.port!=="55437"||u.pathname!=="/claps_test_phase13")throw Error("Dedicated Phase13 DB only");
 const admin=new Pool({connectionString:address});const connect=(name:string)=>{const url=new URL(address);url.pathname='/'+name;return new Pool({connectionString:url.toString()});};
 const folder=await mkdtemp(join(tmpdir(),"claps-p13-prefix-"));await mkdir(join(folder,'meta'));const journal=JSON.parse(await readFile('db/migrations/meta/_journal.json','utf8'));
 for(const entry of journal.entries.filter((e:{idx:number})=>e.idx<=8))await cp(`db/migrations/${entry.tag}.sql`,join(folder,`${entry.tag}.sql`));await writeFile(join(folder,'meta/_journal.json'),JSON.stringify({...journal,entries:journal.entries.filter((e:{idx:number})=>e.idx<=8)}));
 for(const name of ['claps_test_prefix13','claps_test_empty13'])await admin.query(`CREATE DATABASE ${name}`);
 const prefix=connect('claps_test_prefix13');await migrate(drizzle(prefix),{migrationsFolder:folder});
 await prefix.query("INSERT INTO users(id,email,name,email_verified,status,preferences) VALUES('p13-legacy','p13-legacy@example.test','Legacy',true,'active','{\"schemaVersion\":1,\"locale\":\"en\"}')");
 await prefix.query("INSERT INTO locales(code,native_name,display_name,enabled) VALUES('ko','ko','ko',true),('en','en','en',true)");
 await prefix.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES('p13-project','p13-legacy','Legacy project','IP')");
 await prefix.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES('p13-session','p13-legacy','p13-project','Legacy session')");
 await prefix.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES('p13-job','p13-legacy','p13-project','generation','succeeded','{\"schemaVersion\":1,\"kind\":\"generation\",\"sessionId\":\"p13-session\",\"prompt\":\"Synthetic legacy\",\"outputLocale\":\"en\"}',$1)",['a'.repeat(64)]);
 const tables=['projects','asset_sessions','jobs'];const snapshots=await Promise.all(tables.map(t=>prefix.query(`SELECT row_to_json(t) value FROM ${t} t`)));await prefix.end();
 await admin.query('CREATE DATABASE claps_test_upgrade13 TEMPLATE claps_test_prefix13');
 // Phase12 clone is taken only after writer stop; no existing DB migration/write.
 await admin.query('CREATE DATABASE claps_test_latest13 TEMPLATE claps_test_upgrade12');
 for(const name of ['claps_test_empty13','claps_test_upgrade13','claps_test_latest13']){
  const pool=connect(name);try{
   const before=(await pool.query("SELECT row_to_json(u) value FROM users u").catch(()=>({rows:[]}))).rows;
   await migrateDatabase(pool);const applied=(await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;assert.equal(applied.length,11);await migrateDatabase(pool);assert.deepEqual((await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows,applied);
   assert.equal((await pool.query('SELECT count(*)::int n FROM evidence_events')).rows[0].n,0);
   for(const old of before){const now=(await pool.query('SELECT row_to_json(u) value FROM users u WHERE id=$1',[old.value.id])).rows[0].value;for(const [key,value] of Object.entries(old.value))assert.deepEqual(now[key],value);}
   if(name==='claps_test_upgrade13')for(let i=0;i<tables.length;i++)assert.deepEqual((await pool.query(`SELECT row_to_json(t) value FROM ${tables[i]} t`)).rows,snapshots[i].rows);
   console.log(`${name}: apply/replay, existing rows preserved, evidence backfill0 PASS`);
  }finally{await pool.end();}
 }
 const oldDir=await mkdtemp(join(tmpdir(),'claps-p13-old-auth-'));await symlink(join(process.cwd(),'node_modules'),join(oldDir,'node_modules'),'dir');
 for(const f of ['service.ts','policy.ts'])await writeFile(join(oldDir,f),execFileSync('git',['-C','/mnt/f/claps-product','show',`b4749eb:lib/server/auth/${f}`]));
 const {AuthService}=await import(pathToFileURL(join(oldDir,'service.ts')).href),upgraded=connect('claps_test_upgrade13');
 try{const auth=new AuthService(upgraded,async()=>{},'http://127.0.0.1:3201'),c=await upgraded.connect();let session;try{session=await auth.issueSession(c,(await c.query("SELECT * FROM users WHERE id='p13-legacy'")).rows[0],'en');}finally{c.release();}assert.equal((await auth.session(session.token))?.name,'Legacy');assert.equal((await auth.profile(session.token,{name:'Old Auth',org:'Fixture'})).name,'Old Auth');await auth.logout(session.token);assert.equal(await auth.session(session.token),null);console.log('Fixed b4749eb actual AuthService session/profile/logout on additive schema PASS');}finally{await upgraded.end();await admin.end();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Migration failed');process.exitCode=1;});
