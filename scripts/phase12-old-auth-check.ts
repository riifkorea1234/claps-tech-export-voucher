// Recheck fixed old auth code from /tmp against the retained synthetic upgraded DB.
import { mkdtemp, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import assert from "node:assert/strict";
async function main(){
 const address=process.env.PHASE12_DATABASE_URL;if(!address)throw Error("Dedicated DB required");const url=new URL(address);
 if(url.hostname!=="127.0.0.1"||url.port!=="55437"||url.pathname!=="/claps_test_upgrade12")throw Error("Dedicated upgraded fixture required");
 const folder=await mkdtemp(path.join(tmpdir(),"claps-p12-old-auth-"));await symlink(path.join(process.cwd(),"node_modules"),path.join(folder,"node_modules"),"dir");
 for(const file of ["service.ts","policy.ts"])await writeFile(path.join(folder,file),execFileSync("git",["show",`b4749eb:lib/server/auth/${file}`]));
 const {AuthService}=await import(pathToFileURL(path.join(folder,"service.ts")).href);const pool=new Pool({connectionString:address});
 try {const c=await pool.connect();let session;try {const user=(await c.query("SELECT * FROM users WHERE id='p12-legacy'")).rows[0];session=await new AuthService(pool,async()=>{},"http://127.0.0.1:3199").issueSession(c,user,"en");}finally{c.release();}
 const auth=new AuthService(pool,async()=>{},"http://127.0.0.1:3199");assert.ok(await auth.session(session.token));assert.equal((await auth.profile(session.token,{name:"Old code smoke",org:"Org"})).name,"Old code smoke");await auth.logout(session.token);console.log("Fixed b4749eb actual AuthService /tmp fixture read/write PASS; no checkout fixture created.");
 }finally{await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
