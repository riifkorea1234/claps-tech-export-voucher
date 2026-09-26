import "server-only";
import type { Pool } from "pg";
// Idempotent, bounded, concurrent-worker-safe maintenance. No physical file deletion is authorized.
export async function maintainStorage(pool: Pool, batch = 100) {
  if (!Number.isInteger(batch) || batch < 1 || batch > 1000) throw new Error("INVALID_BATCH");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const downloads = await c.query(`WITH expired AS (SELECT id FROM storage_tickets WHERE kind='download' AND expires_at<=now()
      ORDER BY expires_at,id LIMIT $1 FOR UPDATE SKIP LOCKED) DELETE FROM storage_tickets t USING expired e WHERE t.id=e.id`, [batch]);
    const uploads = await c.query(`WITH expired AS (SELECT id FROM storage_tickets WHERE kind='upload' AND state IN ('reserved','ready') AND expires_at<=now()
      ORDER BY expires_at,id LIMIT $1 FOR UPDATE SKIP LOCKED) UPDATE storage_tickets t SET state='cleanup_pending',updated_at=now() FROM expired e WHERE t.id=e.id`, [batch]);
    const { rows: [retained] } = await c.query("SELECT count(*)::int count FROM storage_tickets WHERE state='cleanup_pending'");
    await c.query("COMMIT");
    return { expiredDownloads: downloads.rowCount ?? 0, scheduledUploads: uploads.rowCount ?? 0, retainedFiles: retained.count, physicalDeletes: 0 };
  } catch (error) { await c.query("ROLLBACK"); throw error; } finally { c.release(); }
}
