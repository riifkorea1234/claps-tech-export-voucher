// Local demo only: complete the same signup, sandbox verification and profile APIs as the UI.
import { readFile, readdir } from 'node:fs/promises';
const config = Object.fromEntries((await readFile('.env.seed.local', 'utf8')).trim().split('\n').map(line => { const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]; }));
const base=config.APP_ORIGIN;
if (new URL(base).hostname !== '127.0.0.1' || config.POSTGRES_DB !== 'claps_demo' || config.MAIL_ADAPTER !== 'sandbox') throw new Error('LOCAL_DEMO_REQUIRED');
let cookie='';
async function api(route,data,method='POST') {
 const response=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
 if(!response.ok) throw new Error(`Bootstrap ${route} returned ${response.status}`);
 const session=response.headers.getSetCookie().find(c=>c.startsWith('claps-session='));if(session)cookie=session.split(';')[0];
 return (await response.json()).data;
}
const result=await api('/api/auth/lookup',{email:config.DEMO_EMAIL});
if(result.nextStep==='sign-up') {
 await api('/api/auth/sign-up',{email:config.DEMO_EMAIL,password:config.DEMO_PASSWORD});
 const mail=[];
 for(const file of await readdir('/tmp/claps-content-mail'))mail.push(JSON.parse(await readFile('/tmp/claps-content-mail/'+file,'utf8')));
 const verification=mail.find(m=>m.to===config.DEMO_EMAIL&&m.kind==='verify');if(!verification)throw new Error('SANDBOX_MAIL_REQUIRED');
 await api('/api/auth/verify-email',{token:new URL(verification.url).searchParams.get('token')});
 await api('/api/me',{name:'샘플 사용자',org:'가상 샘플 스튜디오',role:'design'},'PATCH');
} else await api('/api/auth/sign-in',{email:config.DEMO_EMAIL,password:config.DEMO_PASSWORD});
await api('/api/auth/sign-out',{});
console.log('Local demo account ready; credentials stay in .env.seed.local.');
