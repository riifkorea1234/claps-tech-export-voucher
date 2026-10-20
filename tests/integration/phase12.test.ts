import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { AuthService } from "../../lib/server/auth/service";
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { migrateDatabase } from "../../lib/server/db/migrate";
import { seedDatabase } from "../../lib/server/db/seed";
import { activateInitialLocales } from "../../lib/i18n/activate";
import { availableLocales, loadMessages } from "../../lib/i18n/server";
import type { LocaleEntry } from "../../lib/i18n/core";
const {pool,db}=createDatabase(getTestDatabaseUrl(),4);
const mail: {url:string}[]=[];
const service=new AuthService(pool,async m=>{mail.push(m)},"http://127.0.0.1:3197");
const emails:string[]=[];
async function account(){const email=`p12-${randomUUID()}@example.test`;emails.push(email);await service.signup({email,password:"eight888",locale:"ko"});const raw=new URL(mail.at(-1)!.url).searchParams.get("token")!;const s=await service.consume(raw,"verify");if(!("token" in s))throw Error("Session missing");await service.profile(s.token,{name:"Legacy Ａ",org:" Org "});return s;}
beforeAll(async()=>{await migrateDatabase(pool);await seedDatabase(db);await activateInitialLocales(db);});
afterAll(async()=>{const ids=(await pool.query("SELECT id FROM users WHERE email=ANY($1)",[emails])).rows.map(r=>r.id);await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)",[ids]);await pool.query("DELETE FROM auth_accounts WHERE user_id=ANY($1)",[ids]);await pool.query("DELETE FROM users WHERE id=ANY($1)",[ids]);await pool.end();});
it("L06 seeds disabled Japanese and activateInitialLocales preserves it and existing settings",async()=>{
 const before=(await pool.query("SELECT * FROM locales ORDER BY code")).rows;
 await seedDatabase(db);await seedDatabase(db);await activateInitialLocales(db);
 const after=(await pool.query("SELECT * FROM locales ORDER BY code")).rows;
 expect(after).toEqual(before);expect(after.find(r=>r.code==="ja")).toMatchObject({enabled:false,fallback_code:"ko",direction:"ltr",version:1});
 const localeTable=(await import("../../db/schema")).locales;
 await pool.query("UPDATE locales SET updated_at=updated_at WHERE code IN ('ko','ja')");
 const registered=await db.select().from(localeTable).orderBy(localeTable.sortOrder);
 const available=await availableLocales(registered);expect(available.map(r=>r.code)).toEqual(["ko","en"]);
 const entries=await db.select().from((await import("../../db/schema")).locales);expect((await loadMessages("ja",entries as LocaleEntry[],["auth"]))["auth.familyName"]).toBe("姓");
});
it("L05 language-only switch retains existing account access; explicit ja profile requires names and syncs name",async()=>{
 const s=await account();await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");
 try {
  await service.preferences(s.token,"ja");expect((await service.session(s.token))?.status).toBe("active");
  await expect(service.profile(s.token,{name:"Legacy",org:"Org",locale:"ja"})).rejects.toThrow();
  const result=await service.profile(s.token,{name:"Ignored",org:" Ａ社　",locale:"ja",familyName:"　髙﨑　",givenName:" 太郎 ",familyNameKana:"ﾀｶｻｷ",givenNameKana:"ﾀﾛｳ"});
  expect(result).toMatchObject({name:"髙﨑 太郎",org:"A社",familyName:"髙﨑",givenName:"太郎",familyNameKana:"タカサキ",givenNameKana:"タロウ"});
  const changed=await service.profile(s.token,{name:"Latin Ａ",org:"Org",locale:"en"});
  expect(changed).toMatchObject({name:"Latin A",familyName:"髙﨑",givenNameKana:"タロウ"});
  await expect(service.profile(s.token,{name:"X",org:"Y",locale:"ja",familyName:"",givenName:"太郎"})).rejects.toThrow();
 } finally {await pool.query("UPDATE locales SET enabled=false WHERE code='ja'");}
});
it("L05 rejects undeployed/disabled explicit locales and cross-account profile fields",async()=>{
 const a=await account(),b=await account();
 await expect(service.profile(a.token,{name:"X",org:"Y",locale:"ja",familyName:"姓",givenName:"名"})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
 await expect(service.profile(a.token,{name:"X",org:"Y",locale:"fr"})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
 await expect(service.profile(a.token,{name:"X",org:"Y",id:b.user.id})).rejects.toThrow();
 expect((await service.session(b.token))?.name).toBe("Legacy A");
});
it("L06 nullable columns do not guess legacy names and old profile SQL preserves split fields",async()=>{
 const a=await account();const before=(await pool.query("SELECT * FROM users WHERE id=$1",[a.user.id])).rows[0];
 expect([before.family_name,before.given_name,before.family_name_kana,before.given_name_kana]).toEqual([null,null,null,null]);
 await pool.query("UPDATE users SET family_name='山田',given_name='太郎' WHERE id=$1",[a.user.id]);
 await pool.query("UPDATE users SET name=$2,org_name=$3,job_role=$4,status='active',profile_completed_at=COALESCE(profile_completed_at,now()),version=version+1,updated_at=now() WHERE id=$1",[a.user.id,"Old code","Org","design"]);
 expect((await pool.query("SELECT name,family_name,given_name FROM users WHERE id=$1",[a.user.id])).rows[0]).toEqual({name:"Old code",family_name:"山田",given_name:"太郎"});
});

it("m5 non-Japanese display name changes preserve separately stored Japanese names", async()=>{
 const s=await account();await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");
 try {
  await service.profile(s.token,{name:"",org:"Org",locale:"ja",familyName:"山田",givenName:"太郎",familyNameKana:"ヤマダ"});
  for(const locale of ["ko","en"]){const dto=await service.profile(s.token,{name:"Display " + locale,org:"Org",locale});expect(dto).toMatchObject({name:"Display " + locale,familyName:"山田",givenName:"太郎",familyNameKana:"ヤマダ"});}
  const restored=await service.profile(s.token,{name:"Ignored",org:"Org",locale:"ja",familyName:"山田",givenName:"太郎"});expect(restored.name).toBe("山田 太郎");
 } finally {await pool.query("UPDATE locales SET enabled=false WHERE code='ja'");}
});
