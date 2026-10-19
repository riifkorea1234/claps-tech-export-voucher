import { Pool } from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { migrateDatabase } from "../lib/server/db/migrate";
import { seedDatabase } from "../lib/server/db/seed";
import { createDatabase } from "../lib/server/db";
import { AuthService } from "../lib/server/auth/service";
import { activateInitialLocales } from "../lib/i18n/activate";
import { seedDemo } from "../lib/server/demo/seed";
import assert from "node:assert/strict";
async function main(){
 const mode=process.argv[2];
 const envPath=process.env.PHASE12_DEMO_ENV;
 if(!envPath||!envPath.startsWith('/tmp/claps-phase12-'))throw Error("Isolated demo env file required");
 if(mode==='prepare'){
  const base=process.env.PHASE12_DATABASE_URL;if(!base)throw Error("Dedicated DB required");const parsed=new URL(base);if(parsed.hostname!=='127.0.0.1'||parsed.port!=='55437'||parsed.pathname!=='/claps_test')throw Error("Dedicated DB required");
  const admin=new Pool({connectionString:base});await admin.query('CREATE DATABASE claps_demo');await admin.end();parsed.pathname='/claps_demo';
  const {pool,db}=createDatabase(parsed.toString(),4);await migrateDatabase(pool);await seedDatabase(db);await activateInitialLocales(db);
  const mail:{url:string}[]=[];const email='phase12-demo@example.test',password=randomBytes(18).toString('hex');
  const service=new AuthService(pool,async m=>{mail.push(m)},'http://127.0.0.1:3198');await service.signup({email,password,locale:'ko'});
  const session=await service.consume(new URL(mail[0].url).searchParams.get('token')!,'verify');if(!('token' in session))throw Error('Session required');
  await service.profile(session.token,{name:'Synthetic Demo',org:'Synthetic Studio',role:'design'});await service.logout(session.token);
  await writeFile(envPath,`POSTGRES_DB=claps_demo\nDATABASE_URL=${parsed}\nAPP_ORIGIN=http://127.0.0.1:3198\nUPLOADS_DIR=/tmp/claps-phase12-demo-uploads\nMAIL_ADAPTER=sandbox\nMAIL_SANDBOX_DIR=/tmp/claps-phase12-demo-mail\nDEMO_EMAIL=${email}\nDEMO_PASSWORD=${password}\n`,{mode:0o600});await pool.end();console.log('Dedicated synthetic demo DB/account/private env prepared; no credentials printed.');
 }else if(mode==='verify'){
  const env=Object.fromEntries((await readFile(envPath,'utf8')).trim().split('\n').map(line=>{const index=line.indexOf('=');return[line.slice(0,index),line.slice(index+1)]}));
  if(new URL(env.DATABASE_URL).pathname!=='/claps_demo'||new URL(env.DATABASE_URL).port!=='55437')throw Error('Dedicated demo DB required');
  process.env.UPLOADS_DIR=env.UPLOADS_DIR;const {pool}=createDatabase(env.DATABASE_URL,4);const service=new AuthService(pool,async()=>{},env.APP_ORIGIN);const session=await service.login({email:env.DEMO_EMAIL,password:env.DEMO_PASSWORD,locale:'ko'});
  const before=(await pool.query('SELECT id,published,published_version,version FROM localized_contents ORDER BY id')).rows;const prefs=(await service.session(session.token))!.preferences;
  await seedDemo(service,session.token);await seedDemo(service,session.token);assert.deepEqual((await pool.query('SELECT id,published,published_version,version FROM localized_contents ORDER BY id')).rows,before);assert.deepEqual((await service.session(session.token))!.preferences,prefs);
  assert.equal((await pool.query("SELECT count(*)::int n FROM localized_contents WHERE locale_code='ja'")).rows[0].n,0);
  await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");
  try {
   const signed=await fetch(env.APP_ORIGIN+'/api/auth/sign-in',{method:'POST',headers:{Origin:env.APP_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({email:env.DEMO_EMAIL,password:env.DEMO_PASSWORD})});assert.equal(signed.status,200);const cookie=signed.headers.getSetCookie().find(c=>c.startsWith('claps-session='))!.split(';')[0];
   const response=await fetch(env.APP_ORIGIN+'/api/partners',{headers:{Cookie:cookie,'X-Claps-Locale':'ja'}});assert.equal(response.status,200);const data=await response.json();assert.equal(data.data.items.length,6);assert.ok(data.data.items.every((p:{name:string;resolvedLocale:string;fallbackUsed:boolean})=>p.name.startsWith('샘플')&&p.resolvedLocale==='ko'&&p.fallbackUsed));
   await fetch(env.APP_ORIGIN+'/api/auth/sign-out',{method:'POST',headers:{Origin:env.APP_ORIGIN,'Content-Type':'application/json',Cookie:cookie},body:'{}'});
   console.log('L06 demo rerun preserves published ko/en and preferences; ja business content resolves ko fallback PASS.');
  }finally{await pool.query("UPDATE locales SET enabled=false WHERE code='ja'");await service.logout(session.token);await pool.end();}
 }else throw Error('prepare|verify required');
}
main().catch(()=>{console.error('Phase12 isolated demo check failed; credentials withheld.');process.exitCode=1;});
