// Dedicated synthetic instance only; preserve every created DB for independent review.
import { phase15DatabaseName, phase15DatabaseUrl } from "./phase15-db-guard";
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
 const u=phase15DatabaseUrl(process.env.TEST_DATABASE_URL),address=u.toString();
 const prefixName=phase15DatabaseName(process.env.PHASE16_MIGRATION_PREFIX ?? "");
 const targets=Object.fromEntries(["prefix","empty","upgrade","latest12","latest13","latest14","latest15"].map(key=>[key,phase15DatabaseName(prefixName+key)]));
 const predecessors=JSON.parse(process.env.PHASE16_MIGRATION_PREDECESSORS ?? "{}") as Record<string,string>;
 for(const key of ["latest12","latest13","latest14","latest15"])phase15DatabaseName(predecessors[key] ?? "");
 if(new Set(Object.values(targets)).size!==7 || Object.values(targets).some(n=>Object.values(predecessors).includes(n)||n===u.pathname.slice(1)))throw Error("Clone names must be distinct from target/predecessors");
 const admin=new Pool({connectionString:address});const connect=(name:string)=>{const url=new URL(address);url.pathname='/'+name;return new Pool({connectionString:url.toString()});};
 try {
 // Preflight every name before creating any clone. Existing databases are never replaced.
 const existing=(await admin.query("SELECT datname FROM pg_database WHERE datname=ANY($1)",[Object.values(targets)])).rows;
 if(existing.length)throw Error("Migration clone name already exists; select an unused prefix");
 const folder=await mkdtemp(join(tmpdir(),"claps-p16-prefix-"));await mkdir(join(folder,'meta'));const journal=JSON.parse(await readFile('db/migrations/meta/_journal.json','utf8'));
 for(const entry of journal.entries.filter((e:{idx:number})=>e.idx<=8))await cp(`db/migrations/${entry.tag}.sql`,join(folder,`${entry.tag}.sql`));await writeFile(join(folder,'meta/_journal.json'),JSON.stringify({...journal,entries:journal.entries.filter((e:{idx:number})=>e.idx<=8)}));
 for(const name of [targets.prefix,targets.empty])await admin.query(`CREATE DATABASE "${name}"`);
 const prefix=connect(targets.prefix);await migrate(drizzle(prefix),{migrationsFolder:folder});
 await prefix.query("INSERT INTO users(id,email,name,email_verified,status,preferences) VALUES('p13-legacy','p13-legacy@example.test','Legacy',true,'active','{\"schemaVersion\":1,\"locale\":\"en\"}')");
 await prefix.query("INSERT INTO locales(code,native_name,display_name,enabled) VALUES('ko','ko','ko',true),('en','en','en',true)");
 await prefix.query("INSERT INTO projects(id,owner_id,name,ip_name) VALUES('p13-project','p13-legacy','Legacy project','IP')");
 await prefix.query("INSERT INTO asset_sessions(id,owner_id,project_id,title) VALUES('p13-session','p13-legacy','p13-project','Legacy session')");
 await prefix.query("INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash) VALUES('p13-job','p13-legacy','p13-project','generation','succeeded','{\"schemaVersion\":1,\"kind\":\"generation\",\"sessionId\":\"p13-session\",\"prompt\":\"Synthetic legacy\",\"outputLocale\":\"en\"}',$1)",['a'.repeat(64)]);
 await prefix.query("CREATE TABLE phase16_order_probe(id integer PRIMARY KEY,value text NOT NULL)");
 await prefix.query("INSERT INTO phase16_order_probe VALUES(3,'three'),(2,'two'),(1,'one')");
 const reverseRows=(await prefix.query('SELECT t::text row FROM phase16_order_probe t ORDER BY t::text COLLATE "C"')).rows;
 const checksumSql=`SELECT count(*)::int count,md5(string_agg(t::text,'|' ORDER BY t::text COLLATE "C")) checksum FROM phase16_order_probe t`;
 const reverseChecksum=(await prefix.query(checksumSql)).rows[0];
 await prefix.query('TRUNCATE phase16_order_probe');await prefix.query("INSERT INTO phase16_order_probe VALUES(1,'one'),(2,'two'),(3,'three')");
 assert.deepEqual((await prefix.query('SELECT t::text row FROM phase16_order_probe t ORDER BY t::text COLLATE "C"')).rows,reverseRows);
 assert.deepEqual((await prefix.query(checksumSql)).rows[0],reverseChecksum);console.log('Three reversed insertion rows: canonical ordering/checksum invariant PASS',reverseChecksum);
 const tables=['projects','asset_sessions','jobs','phase16_order_probe'];const snapshots=await Promise.all(tables.map(t=>prefix.query(`SELECT row_to_json(t) value FROM ${t} t ORDER BY t::text COLLATE "C"`)));await prefix.end();
 await admin.query(`CREATE DATABASE "${targets.upgrade}" TEMPLATE "${targets.prefix}"`);
 // Phase12 clone is taken only after writer stop; no existing DB migration/write.
 await admin.query(`CREATE DATABASE "${targets.latest12}" TEMPLATE "${predecessors.latest12}"`);
 await admin.query(`CREATE DATABASE "${targets.latest13}" TEMPLATE "${predecessors.latest13}"`);
 await admin.query(`CREATE DATABASE "${targets.latest14}" TEMPLATE "${predecessors.latest14}"`);
 await admin.query(`CREATE DATABASE "${targets.latest15}" TEMPLATE "${predecessors.latest15}"`);
 for(const name of [targets.empty,targets.upgrade,targets.latest12,targets.latest13,targets.latest14,targets.latest15]){
  const pool=connect(name);try{
   const originalTables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);const checksums=new Map<string,{sql:string;value:unknown}>();for(const t of originalTables){
    const columns=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[t])).rows.map(r=>'t."'+r.column_name.replaceAll('"','""')+'"').join(',');
    // Compare every original column, excluding additive fields introduced by migration.
    const sql=`SELECT count(*)::int count,md5(string_agg(ROW(${columns})::text,'|' ORDER BY ROW(${columns})::text COLLATE "C")) checksum FROM ${t} t`;
    checksums.set(t,{sql,value:(await pool.query(sql)).rows[0]});}const preserved=new Map<string, { value: Record<string,unknown> }[]>();for(const t of originalTables)preserved.set(t,(await pool.query(`SELECT row_to_json(t) value FROM ${t} t ORDER BY t::text COLLATE "C"`)).rows);
   const before=(await pool.query("SELECT row_to_json(u) value FROM users u").catch(()=>({rows:[]}))).rows;
   await migrateDatabase(pool);const applied=(await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;assert.equal(applied.length,14);await migrateDatabase(pool);assert.deepEqual((await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows,applied);
   for(const [t,oldRows] of preserved){const check=checksums.get(t)!;const sum=(await pool.query(check.sql)).rows[0];assert.deepEqual(sum,check.value);console.log(name,t,JSON.stringify(sum));const nowRows=(await pool.query(`SELECT row_to_json(t) value FROM ${t} t ORDER BY t::text COLLATE "C"`)).rows;assert.equal(nowRows.length,oldRows.length);for(let i=0;i<oldRows.length;i++)for(const [key,value] of Object.entries(oldRows[i].value))assert.deepEqual(nowRows[i].value[key],value);}
   await assert.rejects(pool.query('TRUNCATE evidence_events'),{code:'23514'});await assert.rejects(pool.query('TRUNCATE monitoring_feedback_events'),{code:'23514'});await assert.rejects(pool.query('TRUNCATE review_package_snapshots'),{code:'23514'});
   for(const old of before){const now=(await pool.query('SELECT row_to_json(u) value FROM users u WHERE id=$1',[old.value.id])).rows[0].value;for(const [key,value] of Object.entries(old.value))assert.deepEqual(now[key],value);}
   if(name===targets.upgrade)for(let i=0;i<tables.length;i++){const now=(await pool.query(`SELECT row_to_json(t) value FROM ${tables[i]} t ORDER BY t::text COLLATE "C"`)).rows;for(let n=0;n<snapshots[i].rows.length;n++)for(const [k,v] of Object.entries(snapshots[i].rows[n].value))assert.deepEqual(now[n].value[k],v);};
   console.log(`${name}: apply/replay, existing rows preserved, evidence backfill0 PASS`);
  }finally{await pool.end();}
 }
 const oldDir=await mkdtemp(join(tmpdir(),'claps-p16-old-auth-'));await symlink(join(process.cwd(),'node_modules'),join(oldDir,'node_modules'),'dir');
 for(const f of ['service.ts','policy.ts'])await writeFile(join(oldDir,f),execFileSync('git',['-C','/mnt/f/claps-product','show',`b4749eb:lib/server/auth/${f}`]));
 const {AuthService}=await import(pathToFileURL(join(oldDir,'service.ts')).href),upgraded=connect(targets.upgrade);
 try{const auth=new AuthService(upgraded,async()=>{},'http://127.0.0.1:3201'),c=await upgraded.connect();let session;try{session=await auth.issueSession(c,(await c.query("SELECT * FROM users WHERE id='p13-legacy'")).rows[0],'en');}finally{c.release();}assert.equal((await auth.session(session.token))?.name,'Legacy');assert.equal((await auth.profile(session.token,{name:'Old Auth',org:'Fixture'})).name,'Old Auth');await auth.logout(session.token);assert.equal(await auth.session(session.token),null);console.log('Fixed b4749eb actual AuthService session/profile/logout on additive schema PASS');}finally{await upgraded.end();}
 } finally { await admin.end(); }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Migration failed');process.exitCode=1;});
