import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, afterEach, it, expect } from "vitest";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { seedDatabase } from "../../lib/server/db/seed";
import { AuthService, digest } from "../../lib/server/auth/service";
import { WorkspaceService } from "../../lib/server/projects/service";
import { seedDemo, demoId } from "../../lib/server/demo/seed";
import { demoPartners } from "../../lib/server/demo/data";
import { readStoredFile } from "../../lib/server/storage/read-file";
import { fileSchema } from "../../lib/contracts/metadata";
const {pool,db}=createDatabase(getTestDatabaseUrl(),8);
const auth=new AuthService(pool,async()=>{},"http://localhost:3000");
const ids:string[]=[]; let dir:string;
const partnerIds=demoPartners.map(p=>`demo-v1-partner-${p.key}`);
async function account(status="active") {
 const id=randomUUID(),raw=randomBytes(32).toString("hex");ids.push(id);
 await pool.query("INSERT INTO users(id,email,name,email_verified,status) VALUES($1,$2,'Demo test',true,$3)",[id,`${id}@example.test`,status]);
 await pool.query("INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",[randomUUID(),id,digest(raw)]);
 return {id,raw};
}
beforeAll(async()=>{await migrateDatabase(pool);await seedDatabase(db);expect((await pool.query("SELECT 1 FROM partners WHERE id=ANY($1)",[partnerIds])).rowCount).toBe(0);dir=await mkdtemp(join(tmpdir(),"claps-demo-test-"));process.env.UPLOADS_DIR=dir;});
afterEach(async()=>{
 await pool.query("DELETE FROM localized_contents WHERE resource_key=ANY($1)",[partnerIds]);
 for(const table of ['monitoring_records','storage_tickets','asset_sessions','projects']) await pool.query(`DELETE FROM ${table} WHERE owner_id=ANY($1)`,[ids]);
 await pool.query("DELETE FROM partners WHERE id=ANY($1)",[partnerIds]);
 await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)",[ids]);await pool.query("DELETE FROM users WHERE id=ANY($1)",[ids]);ids.length=0;
 for(const file of await readdir(dir))await rm(join(dir,file));
});
afterAll(async()=>{await pool.end();if(dir)await rm(dir,{recursive:true,force:true});});
it('seeds real project/session/translation/file rows without invented AI outcomes',async()=>{
 const a=await account();await seedDemo(auth,a.raw);
 expect((await pool.query("SELECT * FROM partners WHERE id=ANY($1)",[partnerIds])).rows.every(p=>p.contact_email===null&&p.name.startsWith('샘플'))).toBe(true);
 expect((await pool.query("SELECT * FROM localized_contents WHERE resource_key=ANY($1)",[partnerIds])).rowCount).toBe(12);
 expect((await pool.query("SELECT * FROM projects WHERE owner_id=$1",[a.id])).rowCount).toBe(3);
 expect((await pool.query("SELECT * FROM asset_sessions WHERE owner_id=$1",[a.id])).rowCount).toBe(3);
 const files=(await pool.query("SELECT source_file FROM monitoring_records WHERE owner_id=$1",[a.id])).rows;
 expect(files).toHaveLength(2);
 for(const row of files){const f=fileSchema.parse(row.source_file);const b=await readStoredFile(f,10*1024*1024);expect(createHash('sha256').update(b).digest('hex')).toBe(f.checksum);}
 expect((await pool.query("SELECT * FROM jobs WHERE owner_id=$1",[a.id])).rowCount).toBe(0);
 expect((await pool.query("SELECT * FROM assets WHERE session_id=ANY($1)",[[0,1,2].map(i=>demoId(a.id,'session',i))])).rowCount).toBe(0);
});
it('serializes concurrent reruns without duplicate rows or files',async()=>{
 const a=await account();await Promise.all([seedDemo(auth,a.raw),seedDemo(auth,a.raw)]);
 expect((await pool.query("SELECT * FROM projects WHERE owner_id=$1",[a.id])).rowCount).toBe(3);
 expect((await pool.query("SELECT * FROM monitoring_records WHERE owner_id=$1",[a.id])).rowCount).toBe(2);
 expect((await pool.query("SELECT * FROM storage_tickets WHERE owner_id=$1",[a.id])).rowCount).toBe(2);
 expect(await readdir(dir)).toHaveLength(4);
});
it('preserves edited, archived and published data and account preferences',async()=>{
 const a=await account();await seedDemo(auth,a.raw);
 await pool.query("UPDATE projects SET name='Edited',archived_at=now(),version=9 WHERE id=$1",[demoId(a.id,'project',0)]);
 await pool.query("UPDATE partners SET name='Edited partner',visibility='private',version=9 WHERE id=$1",[partnerIds[0]]);
 await pool.query("UPDATE localized_contents SET draft=jsonb_set(draft,'{name}','\"Edited translation\"'),published=jsonb_set(published,'{name}','\"Edited translation\"'),version=9 WHERE resource_key=$1",[partnerIds[0]]);
 const prefs={schemaVersion:1,locale:'en',matching:{revision:4,worldView:'My words'}};
 await pool.query("UPDATE users SET preferences=$2 WHERE id=$1",[a.id,prefs]);
 await seedDemo(auth,a.raw);
 expect((await pool.query("SELECT name,version,archived_at FROM projects WHERE id=$1",[demoId(a.id,'project',0)])).rows[0]).toMatchObject({name:'Edited',version:9,archived_at:expect.any(Date)});
 expect((await pool.query("SELECT name,visibility,version FROM partners WHERE id=$1",[partnerIds[0]])).rows[0]).toEqual({name:'Edited partner',visibility:'private',version:9});
 expect((await pool.query("SELECT published,version FROM localized_contents WHERE resource_key=$1",[partnerIds[0]])).rows.every(r=>r.published.name==='Edited translation'&&r.version===9)).toBe(true);
 expect((await pool.query("SELECT preferences FROM users WHERE id=$1",[a.id])).rows[0].preferences).toEqual(prefs);
});
it('isolates each account and rejects inactive or unauthenticated seeding',async()=>{
 await expect(seedDemo(auth,'missing')).rejects.toMatchObject({code:'UNAUTHORIZED'});
 const inactive=await account('profile_pending');await expect(seedDemo(auth,inactive.raw)).rejects.toMatchObject({code:'FORBIDDEN'});
 const a=await account(),b=await account();await seedDemo(auth,a.raw);await seedDemo(auth,b.raw);
 const workspace=new WorkspaceService(auth);
 await expect(workspace.getProject(b.raw,demoId(a.id,'project',0))).rejects.toMatchObject({code:'NOT_FOUND'});
 expect((await pool.query("SELECT * FROM partners WHERE id=ANY($1)",[partnerIds])).rowCount).toBe(6);
 expect((await pool.query("SELECT count(*)::int n FROM projects WHERE owner_id=ANY($1)",[[a.id,b.id]])).rows[0].n).toBe(6);
});
