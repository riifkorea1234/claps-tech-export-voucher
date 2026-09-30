const {chromium}=require(process.cwd()+'/node_modules/@playwright/test');
const AxeBuilder=require(process.env.ADMIN_A11Y_AXE_MODULE || '/tmp/claps-admin-a11y/node_modules/@axe-core/playwright').default;
const {Pool}=require(process.cwd()+'/node_modules/pg');const {randomUUID,randomBytes,createHash}=require('crypto');const fs=require('fs');
(async()=>{
 if (!process.env.TEST_DATABASE_URL || new URL(process.env.TEST_DATABASE_URL).pathname !== '/claps_test') throw new Error('TEST_DATABASE_URL must name an isolated claps_test database');
 const db=new Pool({connectionString:process.env.TEST_DATABASE_URL}),id=randomUUID(),token=randomBytes(32).toString('hex'),results=[];
 const original=(await db.query("SELECT enabled FROM locales WHERE code='en'")).rows[0].enabled;
 await db.query("UPDATE locales SET enabled=true WHERE code='en'");
 await db.query("INSERT INTO users(id,email,name,email_verified,status,app_role,profile_completed_at) VALUES($1,$2,'Accessibility fixture',true,'active','admin',now())",[id,id+'@example.test']);await db.query("INSERT INTO auth_sessions(id,user_id,token,expires_at,admin_verified_until) VALUES($1,$2,$3,now()+interval '1 day',now()+interval '15 minutes')",[randomUUID(),id,createHash('sha256').update(token).digest('hex')]);
 const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Seoul'});const page=await context.newPage();await page.context().addCookies([{name:'claps-session',value:token,url:'http://127.0.0.1:3199'},{name:'claps-locale',value:'en',url:'http://127.0.0.1:3199'}]);
 async function scan(name) {await page.waitForTimeout(200);const r=await new AxeBuilder({page}).analyze();results.push({name,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))});console.log(name,results.at(-1).violations);}
 try{
 for(const path of ['/admin','/admin/users','/admin/projects','/admin/partners','/admin/jobs','/admin/monitoring','/admin/audit-logs','/admin/locales',`/admin/users/${id}`,'/admin/partners/new']){await page.goto('http://127.0.0.1:3199'+path);await page.waitForLoadState('networkidle');await scan(path);}
 await page.getByLabel('Name',{exact:true}).fill('Accessible partner');await page.getByLabel('Reason',{exact:true}).fill('Synthetic accessibility check');await page.getByLabel('Visibility',{exact:true}).selectOption('public');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('dialog').waitFor();await scan('visibility confirmation dialog');await page.screenshot({path:'md/evidence/admin-fixes/confirm-dialog.png',fullPage:true});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Cancel',exact:true}).click({noWaitAfter:true}).catch(()=>{});
 }finally{
 fs.mkdirSync('md/evidence/admin-fixes',{recursive:true});fs.writeFileSync('md/evidence/admin-fixes/a11y-results.json',JSON.stringify({axeVersion:'4.10.2',results,seriousCritical:results.flatMap(r=>r.violations).filter(v=>['serious','critical'].includes(v.impact)).length},null,2));await browser.close();await db.query('DELETE FROM admin_audit_logs WHERE actor_id=$1',[id]);await db.query('DELETE FROM auth_sessions WHERE user_id=$1',[id]);await db.query('DELETE FROM users WHERE id=$1',[id]);await db.query("UPDATE locales SET enabled=$1 WHERE code='en'",[original]);await db.end();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
