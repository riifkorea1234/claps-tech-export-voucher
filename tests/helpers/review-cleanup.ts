import type { Pool } from "pg";
import { phase15DatabaseUrl } from "../../scripts/phase15-db-guard";
export async function cleanupReview(pool:Pool,owners:string[]) {
 phase15DatabaseUrl(process.env.TEST_DATABASE_URL); if(!owners.length)return;
 const c=await pool.connect();try{await c.query("BEGIN");await c.query("ALTER TABLE review_package_snapshots DISABLE TRIGGER review_snapshot_immutable");await c.query("DELETE FROM review_package_snapshots WHERE owner_id=ANY($1)",[owners]);await c.query("ALTER TABLE review_package_snapshots ENABLE TRIGGER review_snapshot_immutable");await c.query("DELETE FROM review_checks WHERE owner_id=ANY($1)",[owners]);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}
