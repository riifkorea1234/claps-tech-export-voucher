// Isolated synthetic fixtures only; production never disables append-only guards.
import type { Pool } from 'pg';
export async function cleanupFeedback(pool:Pool, owners:string[]) {
 if(!owners.length)return;
 const db=(await pool.query('SELECT current_database() name')).rows[0].name;
 if(!/^claps_test(?:_[a-z0-9]+)?$/.test(db))throw Error('Synthetic DB only');
 const c=await pool.connect();try{await c.query('BEGIN');await c.query('LOCK TABLE monitoring_feedback_events IN ACCESS EXCLUSIVE MODE');await c.query('ALTER TABLE monitoring_feedback_events DISABLE TRIGGER feedback_immutable');await c.query('DELETE FROM monitoring_feedback_events WHERE owner_id=ANY($1)',[owners]);await c.query('ALTER TABLE monitoring_feedback_events ENABLE TRIGGER feedback_immutable');await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
