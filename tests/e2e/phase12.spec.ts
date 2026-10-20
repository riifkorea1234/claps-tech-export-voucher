import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { createAccount, cleanupAccounts, fixturePassword } from "../helpers/auth-fixture";
let pool: Pool;
let previous: boolean;
test.beforeAll(async()=>{
 const url=process.env.TEST_DATABASE_URL;if(!url||!/^\/claps_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname))throw Error("Isolated test DB required");
 pool=new Pool({connectionString:url});previous=(await pool.query("SELECT enabled FROM locales WHERE code='ja'")).rows[0].enabled;
 await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");
});
test.afterAll(async()=>{await cleanupAccounts();await pool.query("UPDATE locales SET enabled=$1 WHERE code='ja'",[previous]);await pool.end();});
const change=async(page: Page,baseURL:string,locale:string)=>{
 expect((await page.request.post("/api/locale",{headers:{Origin:baseURL},data:{locale}})).status()).toBe(200);
};
test("L01/L03/L05 footer server locale, local fonts, disabled locale-specific social UI, keyboard and mobile",async({page,baseURL},testInfo)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await change(page,baseURL!,"ko");await page.goto("/");await page.locator("footer").getByRole("button",{name:"언어",exact:true}).click();await page.getByRole("menuitem",{name:"日本語",exact:true}).click();
 await expect(page.locator("html")).toHaveAttribute("lang","ja");await expect(page.locator("html")).toHaveAttribute("data-locale","ja");
 await page.reload();await expect(page.locator("html")).toHaveAttribute("lang","ja");
 await page.goto("/login");await expect(page.getByRole("button",{name:"LINEで続ける"})).toBeDisabled();await expect(page.getByRole("button",{name:/Kakao|Naver/})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator("#email").focus();await page.keyboard.type("keyboard@example.test");await page.keyboard.press("Tab");await expect(page.locator('button[type="submit"]')).toBeFocused();
 await page.evaluate(()=>document.documentElement.style.fontSize="200%");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath("ja-login-mobile-200.png"),fullPage:true});
 await page.emulateMedia({media:"print"});expect(await page.evaluate(()=>getComputedStyle(document.body).fontFamily)).toMatch(/noto/i);await page.emulateMedia({media:"screen"});
 // Only this fixture font is requested with browser network blocked; the original brand display font can use fallback.
 await page.route("https://**/*",r=>r.abort());await page.reload();await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>getComputedStyle(document.body).fontFamily)).toMatch(/noto/i);
 await change(page,baseURL!,"en");await page.goto("/login");await expect(page.getByRole("button",{name:"Continue with Google"})).toBeDisabled();await expect(page.getByRole("button",{name:/LINE|Kakao|Naver/})).toHaveCount(0);expect(await page.evaluate(()=>getComputedStyle(document.body).fontFamily)).toMatch(/inter/i);
 await change(page,baseURL!,"ko");await page.goto("/login");await expect(page.getByRole("button",{name:/Naver/})).toBeDisabled();await expect(page.getByRole("button",{name:/Kakao|카카오/})).toBeDisabled();
 expect(errors.filter(e=>!e.includes("ERR_FAILED")&&!e.includes("ERR_CONNECTION")&&!e.includes("ERR_BLOCKED"))).toEqual([]);
});
test("L05 ja signup profile requires family/given names, optional kana, native keyboard submit and persisted DTO",async({page,baseURL})=>{
 await createAccount(page.request,baseURL!,false);await change(page,baseURL!,"ja");await page.goto("/profile-setup");
 await expect(page.locator('button[type="submit"]')).toBeDisabled();await expect(page.getByText("必須",{exact:true})).toHaveCount(3);await expect(page.getByText("任意",{exact:true})).toHaveCount(3);
 await page.locator("#setup-familyName").fill("　山田　");await page.locator("#setup-givenName").fill(" 太郎 ");await page.locator("#setup-familyNameKana").fill("ﾔﾏﾀﾞ");await page.locator("#setup-org").fill(" Ａ社　");
 await page.locator("#setup-familyName").fill("姓".repeat(50));await page.locator("#setup-givenName").fill("名".repeat(50));await expect(page.locator('button[type="submit"]')).toBeDisabled();await expect(page.getByText(/合計100文字以内/)).toBeVisible();await page.locator("#setup-familyName").fill("　山田　");await page.locator("#setup-givenName").fill(" 太郎 ");
 await page.locator('button[type="submit"]').click();await expect(page).toHaveURL(/\/projects$/);
 const dto=(await (await page.request.get("/api/me")).json()).data;expect(dto).toMatchObject({name:"山田 太郎",familyName:"山田",givenName:"太郎",familyNameKana:"ヤマダ",givenNameKana:null,org:"A社"});
 await page.reload();await expect(page.locator("html")).toHaveAttribute("lang","ja");expect(await page.locator("body").innerText()).not.toContain("Text unavailable");
});
test("L02/L04/L05 existing account locale switch retains access, Japanese validation is safe and ISO stays server-owned",async({page,baseURL},testInfo)=>{
 await createAccount(page.request,baseURL!);await change(page,baseURL!,"ja");await page.goto("/projects");await expect(page).toHaveURL(/\/projects$/);
 let r=await page.request.patch("/api/me",{headers:{Origin:baseURL!,"X-Claps-Locale":"ja"},data:{name:"Legacy",org:"Org",locale:"ja"}});expect(r.status()).toBe(422);expect((await r.json()).error.fieldErrors).toHaveProperty("familyName");
 r=await page.request.get("/api/projects/missing",{headers:{"X-Claps-Locale":"ja-JP"}});expect(r.status()).toBe(404);expect((await r.json()).error.message).toContain("見つかりません");
 const project=await page.request.post("/api/projects",{headers:{Origin:baseURL!},data:{name:"コード fixture",ip:"IP"}});expect(project.status()).toBe(201);const data=(await project.json()).data;expect(data.status).toBe("preparing");expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
 await page.reload();await expect(page.locator("body")).toContainText("準備中");
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath("ja-projects-mobile.png"),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("L03/L05 ja my-page persistence and admin names at mobile 200 percent",async({page,baseURL},testInfo)=>{
 const email=await createAccount(page.request,baseURL!);await change(page,baseURL!,"ja");await page.goto("/projects");
 await page.setViewportSize({width:390,height:844});await page.getByRole("button",{name:"メニュー",exact:true}).click();await page.getByRole("menuitem",{name:"マイページ",exact:true}).click();
 const dialog=page.getByRole("dialog");await expect(dialog.locator("#my-familyName")).toBeEnabled();
 await expect(dialog.locator("#my-org")).toHaveValue("Test company");
 await dialog.locator("#my-familyName").fill("佐藤");await dialog.locator("#my-givenName").fill("花子");await dialog.locator("#my-givenNameKana").fill("ﾊﾅｺ");
 await page.evaluate(()=>document.documentElement.style.fontSize="200%");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath("ja-my-page-mobile-200.png"),fullPage:true});
 await dialog.getByRole("button",{name:"保存",exact:true}).click();await expect(dialog).toHaveCount(0);
 const account=(await (await page.request.get("/api/me")).json()).data;expect(account).toMatchObject({name:"佐藤 花子",givenNameKana:"ハナコ"});
 await pool.query("UPDATE users SET app_role='admin' WHERE email=$1",[email]);
 expect((await page.request.post("/api/admin/reauthenticate",{headers:{Origin:baseURL!},data:{password:fixturePassword}})).status()).toBe(200);
 await page.goto(`/admin/users/${account.id}`);for(const label of ["姓","名","姓（カナ）","名（カナ）"])await expect(page.getByText(label,{exact:true})).toBeVisible();
 await page.evaluate(()=>document.documentElement.style.fontSize="200%");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath("ja-admin-user-mobile-200.png"),fullPage:true});
 expect(await page.locator("body").innerText()).not.toContain("Text unavailable");
 const renamed=await page.request.patch("/api/me",{headers:{Origin:baseURL!},data:{name:"Display name",org:"Org",locale:"ko"}});expect(renamed.status()).toBe(200);expect((await renamed.json()).data.familyName).toBe("佐藤");
 await page.reload();await expect(page.getByText(/表示名と日本語の姓・名は別々に保存されます/)).toBeVisible();
});
