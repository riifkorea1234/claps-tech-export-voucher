// Representative application workflows against an explicitly supplied isolated pool.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AuthService } from '../lib/server/auth/service';
import { AdminAccess } from '../lib/server/admin/access';
import { AdminService } from '../lib/server/admin/service';
import { ContentService } from '../lib/server/localized-contents/service';
import { WorkspaceService } from '../lib/server/projects/service';
import { StorageService, issueFileUrl } from '../lib/server/storage/service';
import { maintainStorage } from '../lib/server/storage/maintenance';
import { JobService } from '../lib/server/jobs/service';
import { HandlerRegistry } from '../lib/server/jobs/types';
import { developmentQueuePolicy } from '../lib/server/jobs/policy';
export async function operationalProof(pool: Pool, origin: string) {
 let link='';const password=randomUUID()+'888',email=randomUUID()+'@example.test';
 const auth=new AuthService(pool,async m=>{link=new URL(m.url).searchParams.get('token')!;},origin);
 await auth.signup({email,password,locale:'ja'});
 const verified=await auth.consume(link,'verify');assert('token' in verified);let session=verified;
 await auth.profile(session.token,{name:'Local synthetic role fixture',org:'Synthetic',role:'design'});
 await auth.logout(session.token);assert.equal(await auth.session(session.token),null);
 session=await auth.login({email,password,locale:'ja'});
 await auth.sendLink(email,'reset','ja');await auth.consume(link,'reset',password+'9');
 assert.equal(await auth.session(session.token),null);
 session=await auth.login({email,password:password+'9',locale:'ja'});
 // Explicit synthetic promotion; operational admin writes below use the actual services.
 await pool.query("UPDATE users SET app_role='admin' WHERE id=$1",[session.user.id]);
 const access=new AdminAccess(auth);await access.verify(session.token,{password:password+'9'});
 const admin=new AdminService(access,new JobService(auth,new HandlerRegistry(),developmentQueuePolicy));
 const receipts=[];
 for(const enabled of [true,false]) {
 const row=(await pool.query("SELECT * FROM locales WHERE code='ja'")).rows[0];
 receipts.push({enabled,at:new Date().toISOString(),method:'AdminService.locale',...await admin.locale(session.token,'ja',{nativeName:row.native_name,displayName:row.display_name,direction:row.direction,fallbackCode:row.fallback_code,sortOrder:row.sort_order,enabled,version:row.version,reason:'Isolated role/recovery proof'})});
 }
 const input={name:'Synthetic rights partner',description:'Role fixture original',contactEmail:null,visibility:'public',tags:['synthetic'],ipNames:['Fixture IP'],reason:'Isolated operational proof'};
 const partner=await admin.partner(session.token,undefined,input);
 const changed=await admin.partner(session.token,partner.id,{...input,description:'Role fixture revised',version:partner.version});
 const content=new ContentService(access),original=await content.get(session.token,'partner',partner.id,'en');
 const entry={resourceType:'partner',resourceKey:partner.id,locale:'en',version:original.version,sourceRevision:changed.sourceRevision,content:{...original.draft,name:'Synthetic localized partner'}};
 await content.import(session.token,{schemaVersion:1,entries:[entry],reason:'Isolated translation proof'});
 const saved=await content.get(session.token,'partner',partner.id,'en');
 await content.publish(session.token,{...entry,version:saved.version,reason:'Isolated publish proof'});
 assert.equal((await content.get(session.token,'partner',partner.id,'en')).published?.resourceType,'partner');
 const storage=new StorageService(new WorkspaceService(auth));const ticket=await storage.reserveMonitoring(session.token,{name:'synthetic.png',mime:'image/png',size:80});
 assert(ticket.ticket);await auth.authenticated(session.token,async(c,u)=>{await issueFileUrl(c,u.id,'asset',randomUUID(),'original');});
 await pool.query("UPDATE storage_tickets SET expires_at=now()-interval '1 second' WHERE owner_id=$1 AND kind='download'",[session.user.id]);
 const maintenance=await maintainStorage(pool);assert(maintenance.expiredDownloads>0);assert.equal(maintenance.physicalDeletes,0);
 await auth.sendLink(email,'reset','ja'); // retained unconsumed synthetic token so recovery auth_verifications is nonempty
 await auth.logout(session.token);
 return {privateCredentials:{email,password:password+'9'},positive:['signup credential (no OAuth)','email verification','profile','logout','login','password reset invalidates session','admin reauthentication','admin ja enable/disable','partner create/update','localized content import/publish','storage reserve/expiry maintenance'],receipts,syntheticPromotion:true,physicalDeletes:0};
}
