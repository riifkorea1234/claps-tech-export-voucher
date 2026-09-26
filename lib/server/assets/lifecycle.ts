import "server-only";
import type { PoolClient } from "pg";
import { AppError } from "../errors/http";
// Worker transactions must lock in this order before attaching any output.
// On rejection retain the output in storage_tickets cleanup_pending, never reactivate its parent.
export async function lockActiveSession(c: PoolClient, owner: string, sessionId: string) {
  const { rows: [u] } = await c.query("SELECT status FROM users WHERE id=$1 FOR UPDATE", [owner]);
  if (u?.status !== "active") throw new AppError("STATE_CONFLICT");
  const { rows: [s] } = await c.query("SELECT * FROM asset_sessions WHERE id=$1 AND owner_id=$2 FOR UPDATE", [sessionId, owner]);
  if (!s || s.archived_at) throw new AppError("STATE_CONFLICT");
  if (s.project_id) {
    const { rows: [p] } = await c.query("SELECT archived_at FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE", [s.project_id, owner]);
    if (!p || p.archived_at) throw new AppError("STATE_CONFLICT");
  }
  return s;
}
// This is only a reference check, never permission to delete. Retention policy is still pending.
export async function hasStoredFileReferences(c: PoolClient, storageKey: string) {
  const { rowCount } = await c.query(`SELECT 1 FROM projects WHERE cover->'file'->>'storageKey'=$1
    UNION ALL SELECT 1 FROM partners p WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(p.profile->'images') image WHERE image->>'storageKey'=$1 OR image->>'thumbnailKey'=$1)
    UNION ALL SELECT 1 FROM users u WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(u.preferences->'matching'->'references','[]'::jsonb)) r WHERE r->'file'->>'storageKey'=$1 OR r->'file'->>'thumbnailKey'=$1)
    UNION ALL SELECT 1 FROM jobs j WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(j.input->'preferences'->'matching'->'references','[]'::jsonb)) r WHERE r->'file'->>'storageKey'=$1 OR r->'file'->>'thumbnailKey'=$1)
    UNION ALL SELECT 1 FROM assets WHERE file->>'storageKey'=$1
    UNION ALL SELECT 1 FROM brand_guides WHERE file->>'storageKey'=$1
    UNION ALL SELECT 1 FROM monitoring_records WHERE source_file->>'storageKey'=$1 OR source_file->>'thumbnailKey'=$1
    UNION ALL SELECT 1 FROM jobs WHERE output->'file'->>'storageKey'=$1 OR output->'resultFile'->>'storageKey'=$1 LIMIT 1`, [storageKey]);
  return !!rowCount;
}
