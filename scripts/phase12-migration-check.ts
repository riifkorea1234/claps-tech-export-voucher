// Local synthetic migration evidence. Requires the dedicated Phase12 PostgreSQL.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { mkdtemp, mkdir, writeFile, cp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { migrateDatabase } from "../lib/server/db/migrate";
async function main() {
 const address=process.env.PHASE12_DATABASE_URL;
 if(!address)throw Error("PHASE12_DATABASE_URL required");const url=new URL(address);
 if(url.hostname!=="127.0.0.1"||url.port!=="55437"||url.pathname!=="/claps_test")throw Error("Dedicated Phase12 DB only");
 const admin=new Pool({connectionString:address});
 const temporary=await mkdtemp(path.join(tmpdir(),"claps-p12-migration-"));
 await mkdir(path.join(temporary,"meta"));
 const journal=JSON.parse(await readFile("db/migrations/meta/_journal.json","utf8"));
 for(const entry of journal.entries.filter((e:{idx:number})=>e.idx<=8))await cp(`db/migrations/${entry.tag}.sql`,path.join(temporary,`${entry.tag}.sql`));
 await writeFile(path.join(temporary,"meta/_journal.json"),JSON.stringify({...journal,entries:journal.entries.filter((e:{idx:number})=>e.idx<=8)}));
 for(const name of ["claps_test_prefix12","claps_test_empty12"]){await admin.query(`CREATE DATABASE ${name}`);}
 const connect=(name:string)=>{const next=new URL(address);next.pathname='/'+name;return new Pool({connectionString:next.toString()});};
 const prefix=connect("claps_test_prefix12");await migrate(drizzle(prefix),{migrationsFolder:temporary});
 await prefix.query("INSERT INTO users(id,email,name,org_name,status,email_verified,preferences,version) VALUES('p12-legacy','p12-legacy@example.test','Legacy Full Name','Org','active',true,'{\"schemaVersion\":1,\"locale\":\"en\"}',7)");
 await prefix.query("INSERT INTO locales(code,native_name,display_name,enabled,version) VALUES('ko','한국어','Reviewed',true,7),('en','English','English',true,5)");
 await prefix.query("INSERT INTO localized_contents(id,resource_type,resource_key,locale_code,source_revision,draft,published,published_source_revision,published_version,updated_by) VALUES('p12-published','partner','p12-resource','en',1,'{\"schemaVersion\":1,\"resourceType\":\"partner\",\"name\":\"Draft\",\"description\":\"draft\"}','{\"schemaVersion\":1,\"resourceType\":\"partner\",\"name\":\"Reviewed\",\"description\":\"kept\"}',1,4,'p12-legacy')");
 const before=(await prefix.query("SELECT row_to_json(u) value FROM users u")).rows;
 const content=(await prefix.query("SELECT row_to_json(t) value FROM localized_contents t")).rows;
 await prefix.end();await admin.query("CREATE DATABASE claps_test_upgrade12 TEMPLATE claps_test_prefix12");
 const empty=connect("claps_test_empty12"),upgrade=connect("claps_test_upgrade12");
 for(const [name,pool] of [["empty",empty],["0008 clone",upgrade]] as const){
  await migrateDatabase(pool);const journalBefore=(await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;await migrateDatabase(pool);assert.deepEqual((await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows,journalBefore);
  const columns=(await pool.query("SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name IN ('family_name','given_name','family_name_kana','given_name_kana') ORDER BY column_name")).rows;
  assert.equal(columns.length,4);assert.ok(columns.every(r=>r.is_nullable==='YES'));console.log(name+": migration apply/replay + four nullable columns PASS");
 }
 const legacy=(await upgrade.query("SELECT * FROM users WHERE id='p12-legacy'")).rows[0];const old={...legacy};for(const field of ['family_name','given_name','family_name_kana','given_name_kana']){assert.equal(old[field],null);delete old[field];}assert.deepEqual(old,before[0].value?Object.fromEntries(Object.entries(before[0].value).map(([k,v])=>[k,k.endsWith('_at')&&v?new Date(v as string):v])):{});
 assert.deepEqual((await upgrade.query("SELECT row_to_json(t) value FROM localized_contents t")).rows,content);
 console.log("0008 clone: legacy data, preferences, published content preserved; guessed backfill 0 PASS");
 // Use actual fixed backend AuthService/policy to prove old application read/write after additive migration.
 const oldDirectory=await mkdtemp(path.join(tmpdir(),"claps-p12-old-auth-"));
 await symlink(path.join(process.cwd(),"node_modules"),path.join(oldDirectory,"node_modules"),"dir");
 for(const filename of ['service.ts','policy.ts'])await writeFile(path.join(oldDirectory,filename),execFileSync('git',['show',`b4749eb:lib/server/auth/${filename}`]));
 const {AuthService}=await import(pathToFileURL(path.join(oldDirectory,'service.ts')).href);
 const service=new AuthService(upgrade,async()=>{},"http://127.0.0.1:3197");
 const connection=await upgrade.connect();
 const session=await service.issueSession(connection,legacy,"en");connection.release();
 assert.equal((await service.session(session.token))?.name,'Legacy Full Name');
 const dto=await service.profile(session.token,{name:'Old code smoke',org:'Org',role:'design'});assert.equal(dto.name,'Old code smoke');
 console.log("fixed b4749eb AuthService session/profile read+write on upgraded schema PASS");
 await empty.end(); // Pool connection used by issueSession must be released before ending upgrade.
 await upgrade.end();await admin.end();
 console.log("Retained isolated synthetic DBs and old-code fixture for review; no down migration or volume deletion.");
 process.exit(0);
}
main().catch(error=>{console.error(error);process.exit(1)});
