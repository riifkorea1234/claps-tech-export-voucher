import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDatabase } from "../lib/server/db";
import sharp from "sharp";
async function main() {
  const {pool}=createDatabase(process.env.DATABASE_URL!,3);
  try {
    const accountStates=(await pool.query("SELECT id,email,app_role,status,email_verified,preferences->>'locale' locale FROM users WHERE email LIKE 'evidence.v1.%@example.com' ORDER BY email")).rows;
    const counts:Record<string,number>={};for(const table of ['users','projects','asset_sessions','brand_guides','assets','jobs','partners','localized_contents','monitoring_records','monitoring_feedback_events','evidence_events','review_package_snapshots','admin_audit_logs']) counts[table]=(await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;
    const jobs=(await pool.query("SELECT j.kind,j.status,j.provider,count(*)::int count FROM jobs j JOIN users u ON u.id=j.owner_id WHERE u.email LIKE 'evidence.v1.%@example.com' GROUP BY j.kind,j.status,j.provider ORDER BY j.kind,j.status")).rows;
    const files=(await pool.query(`SELECT a.file FROM assets a JOIN asset_sessions s ON s.id=a.session_id JOIN users u ON u.id=s.owner_id WHERE u.email LIKE 'evidence.v1.%@example.com'
      UNION ALL SELECT g.file FROM brand_guides g JOIN projects p ON p.id=g.project_id JOIN users u ON u.id=p.owner_id WHERE u.email LIKE 'evidence.v1.%@example.com'
      UNION ALL SELECT source_file AS file FROM monitoring_records m JOIN users u ON u.id=m.owner_id WHERE u.email LIKE 'evidence.v1.%@example.com' AND source_file IS NOT NULL
      UNION ALL SELECT output->'file' AS file FROM jobs j JOIN users u ON u.id=j.owner_id WHERE u.email LIKE 'evidence.v1.%@example.com' AND j.kind='export' AND j.status='succeeded'
      UNION ALL SELECT jsonb_array_elements(profile->'images') AS file FROM partners
      UNION ALL SELECT reference->'file' AS file FROM users u CROSS JOIN LATERAL jsonb_array_elements(u.preferences->'matching'->'references') reference WHERE u.email LIKE 'evidence.v1.%@example.com'`)).rows;
    const fileChecks=[];for(const {file} of files){const bytes=await readFile(join(process.env.UPLOADS_DIR!,file.storageKey));const actual=createHash('sha256').update(bytes).digest('hex');let thumbnail=null;if(file.thumbnailKey){const thumb=await readFile(join(process.env.UPLOADS_DIR!,file.thumbnailKey));const meta=await sharp(thumb).metadata();if(meta.format!=='webp'||!thumb.length)throw Error('INVALID_THUMBNAIL');thumbnail={size:thumb.length,sha256:createHash('sha256').update(thumb).digest('hex'),format:meta.format};}fileChecks.push({storageKey:file.storageKey,size:bytes.length,checksumMatch:actual===file.checksum,sizeMatch:bytes.length===file.size,thumbnail});}
    const pending=(await pool.query("SELECT count(*)::int n FROM jobs WHERE status IN ('queued','running')")).rows[0].n;
    const report={at:new Date().toISOString(),target:process.env.APP_ORIGIN,accountStates,counts,jobs,fileChecks,pendingJobs:pending,allStoredFilesValid:fileChecks.every(f=>f.checksumMatch&&f.sizeMatch)};
    if(accountStates.length!==10||!report.allStoredFilesValid||pending!==0)throw Error('EVIDENCE_AUDIT_FAILED');
    await writeFile(join(process.env.UPLOADS_DIR!,'evidence-v1-audit.json'),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify({status:'passed',accounts:10,storedFiles:fileChecks.length,pendingJobs:pending,counts}));
  }finally{await pool.end();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Audit failed');process.exitCode=1;});
