import "server-only";
import { isDeepStrictEqual } from "node:util";
import type { PoolClient } from "pg";
import type { JobInput } from "../../contracts/jobs";
import { guideRulesSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
export async function activeGuide(c: PoolClient, owner: string, guideId: string, projectId: string | null) {
  const { rows: [g] } = await c.query(`SELECT g.* FROM brand_guides g JOIN projects p ON p.id=g.project_id
    WHERE g.id=$1 AND p.owner_id=$2 AND p.id=$3 AND p.archived_at IS NULL AND p.active_guide_id=g.id AND g.status='published'`, [guideId, owner, projectId]);
  if (!g) throw new AppError("STATE_CONFLICT");
  const rules = guideRulesSchema.parse(g.rules);
  if (!rules.rules.length || new Set(rules.rules.map(r => r.ruleId)).size !== rules.rules.length) throw new AppError("STATE_CONFLICT");
  return { ...g, rules };
}
export async function checkVerificationSnapshot(c: PoolClient, owner: string, input: Extract<JobInput, { kind: "verification" }>, projectId: string | null) {
  const snapshot = input.snapshot;
  if (!snapshot || snapshot.assets.length !== input.assetIds.length || new Set(input.assetIds).size !== input.assetIds.length) throw new AppError("STATE_CONFLICT");
  const guide = await activeGuide(c, owner, input.guideId, projectId);
  // Compare the complete rule structure, including conditions and original evidence.
  if (guide.version !== snapshot.guideVersion || !isDeepStrictEqual(guide.rules, snapshot.rules)) throw new AppError("STATE_CONFLICT");
  const rows = [];
  for (const a of snapshot.assets) {
    if (!input.assetIds.includes(a.id)) throw new AppError("STATE_CONFLICT");
    const { rows: [row] } = await c.query(`SELECT a.* FROM assets a JOIN asset_sessions s ON s.id=a.session_id
      WHERE a.id=$1 AND s.id=$2 AND s.owner_id=$3 AND s.archived_at IS NULL AND a.deleted_at IS NULL FOR UPDATE OF a`, [a.id, snapshot.sessionId, owner]);
    if (!row || row.version !== a.version || !row.adopted || row.finalized_at) throw new AppError("STATE_CONFLICT");
    rows.push(row);
  }
  if (new Set(snapshot.assets.map(a => a.id)).size !== rows.length) throw new AppError("STATE_CONFLICT");
  return rows;
}
