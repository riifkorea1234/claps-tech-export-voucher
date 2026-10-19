import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
let pool: Pool, previous: boolean;
test.beforeAll(async()=>{
 const url=process.env.TEST_DATABASE_URL;if(!url||!/^\/claps_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname))throw Error("Dedicated test DB required");
 pool=new Pool({connectionString:url});previous=(await pool.query("SELECT enabled FROM locales WHERE code='ja'")).rows[0].enabled;await pool.query("UPDATE locales SET enabled=true WHERE code='ja'");
});
test.afterAll(async()=>{await cleanupAccounts();await pool.query("UPDATE locales SET enabled=$1 WHERE code='ja'",[previous]);await pool.end();});
for(const locale of ["ko","en","ja"]){
 test(`M1/M2/m2/m3 ${locale} typography, font preload, focus and page-family reflow`,async({page,baseURL},testInfo)=>{
  test.setTimeout(120000);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  await createAccount(page.request,baseURL!);const headers={Origin:baseURL!};
  expect((await page.request.post("/api/locale",{headers,data:{locale}})).status()).toBe(200);
  const response=await page.request.post("/api/projects",{headers,data:{name:"Reflow fixture",ip:"IP"}});expect(response.status()).toBe(201);const project=(await response.json()).data;
  expect((await page.request.post("/api/asset-sessions",{headers,data:{title:"Session fixture",projectId:project.id}})).status()).toBe(201);
  const evidence:{path:string;width:number;rootSize:string;overflow:number}[]=[];
  for(const [width,rootSize] of [[640,"100%"],[390,"200%"]] as const){
   await page.setViewportSize({width,height:900});
   for(const path of ["/projects",`/projects/${project.id}`,"/partners/criteria","/assets","/monitoring","/monitoring/new"]){
    await page.goto(path);await page.locator('main').last().waitFor();await page.evaluate(size=>document.documentElement.style.fontSize=size,rootSize);
    await expect(page.locator("html")).toHaveAttribute("lang",locale);await expect(page.getByText("Text unavailable",{exact:true})).toHaveCount(0);
    if(path==="/projects"){
     const title=page.locator("section h2").first();await expect(title).toBeVisible();expect(await title.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
     const style=await title.evaluate(e=>({weight:getComputedStyle(e).fontWeight,size:getComputedStyle(e).fontSize,tracking:getComputedStyle(e).letterSpacing}));
     expect(style.weight).toBe(locale==="ja"?"700":"600");expect(style.size).toBe(locale==="ja"?(rootSize==="200%"?"40px":"20px"):(rootSize==="200%"?"36px":"18px"));
    }
    // Wait for real API-loaded UI so an empty loading frame cannot hide a reflow problem.
    await page.waitForLoadState("networkidle");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);evidence.push({path,width,rootSize,overflow});if(overflow>0)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll("body *")).map(e=>({tag:e.tagName,classes:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,40)})).filter(e=>e.right>innerWidth).slice(-20)));expect(overflow,`${locale} ${path} ${width}/${rootSize}`).toBeLessThanOrEqual(0);
    await page.screenshot({path:testInfo.outputPath(`${locale}-${width}-${path.split('/').filter(Boolean).join('-')}.png`),fullPage:true});
   }
  }
  await createAccount(page.request,baseURL!,false);await page.request.post("/api/locale",{headers,data:{locale}});await page.goto("/profile-setup");await page.evaluate(()=>document.documentElement.style.fontSize="200%");await page.waitForLoadState("networkidle");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({path:testInfo.outputPath(`${locale}-390-profile-setup.png`),fullPage:true});
  // Locale fonts must not preload on ko, en or ja; they load on demand via CSS.
  const preload=await page.request.get("/login");expect(preload.headers().link??"").not.toMatch(/Inter_variable|NotoSansJP_variable/);
  await page.goto("/login");await page.locator("#email").focus();expect(await page.locator("#email").evaluate(e=>getComputedStyle(e).outlineStyle)).toBe("none");
  expect(await page.locator("#email").evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe("none");
  expect(await page.locator("#email").evaluate(e=>getComputedStyle(e).fontSize)).toBe(locale==="ja"?"16px":"14px");
  expect(await page.locator("#email").evaluate(e=>getComputedStyle(e).lineHeight)).toBe(locale==="en"?"21px":"20px");
  expect(await page.locator('label[for="email"]').evaluate(e=>getComputedStyle(e).fontWeight)).toBe(locale==="ja"?"400":"500");
  expect(errors).toEqual([]);await testInfo.attach("reflow-measurements",{body:JSON.stringify(evidence,null,2),contentType:"application/json"});
 });
}
