// Synthetic fixture teardown only, never imported by application code. DDL is
// transactional so a failure restores the immutable trigger automatically.
import type { Pool } from "pg";
export async function cleanupEvidence(pool: Pool, ownerIds: string[]) {
  if (!ownerIds.length) return;
  const db = (await pool.query("SELECT current_database() name")).rows[0].name;
  if (!/^claps_test(?:_[a-z0-9]+)?$/.test(db)) throw new Error("Synthetic claps_test fixture cleanup only");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    // Fixture IDs are the caller's creation manifest; no broad TRUNCATE.
    await c.query("LOCK TABLE evidence_events IN ACCESS EXCLUSIVE MODE");
    await c.query("ALTER TABLE evidence_events DISABLE TRIGGER evidence_immutable");
    await c.query("DELETE FROM evidence_events WHERE owner_id=ANY($1)", [ownerIds]);
    await c.query("ALTER TABLE evidence_events ENABLE TRIGGER evidence_immutable");
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
}
