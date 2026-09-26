import { withApi, AppError } from "@/lib/server/errors/http";
import { authService } from "@/lib/server/auth/service";
import { rawSession } from "@/lib/server/auth/http";
import { readPartnerImage } from "@/lib/server/admin/images";
import { adminServices } from "@/lib/server/admin/runtime";
import { audit } from "@/lib/server/admin/access";
export const GET=withApi(async(request,context)=>{
  const parts=new URL(request.url).pathname.split('/'),id=parts[3],index=Number(parts[5]),raw=await rawSession();
  if(!Number.isInteger(index)||index<0||index>19)throw new AppError("NOT_FOUND");
  const isAdmin=new URL(request.url).searchParams.get('admin')==='1';
  const read=async(c: import('pg').PoolClient)=>{
    const row=(await c.query("SELECT visibility,profile FROM partners WHERE id=$1 FOR SHARE",[id])).rows[0];
    if(!row || !isAdmin && row.visibility!=='public' || !row.profile.images[index])throw new AppError("NOT_FOUND");
    return readPartnerImage(row.profile.images[index]);
  };
  const file=isAdmin?await adminServices(context.requestId).access.run(raw,async(c,u)=>{const result=await read(c);await audit(c,u.id,'partner.image.read','partner',id,'Administrative image access');return result;}):await authService().authenticated(raw,async(c,u)=>{if(u.status!=='active')throw new AppError("FORBIDDEN");return read(c);});
  return new Response(new Uint8Array(file.bytes),{headers:{'X-Request-ID':context.requestId,'Content-Type':file.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
});
