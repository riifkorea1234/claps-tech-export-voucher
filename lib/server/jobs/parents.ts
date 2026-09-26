import "server-only";
import { checkVerificationSnapshot } from "../verifications/guards";
import { exportAssets } from "../exports/guards";
import type { PoolClient } from "pg";
import type { JobInput } from "../../contracts/jobs";
import { AppError } from "../errors/http";
import { lockActiveSession } from "../assets/lifecycle";
// Caller holds users lock first, shared with all workspace mutations and withdrawal.
export async function lockJobParents(c: PoolClient, owner: string, input: JobInput): Promise<string | null> {
  async function project(id: string) {
    const { rows: [p] } = await c.query("SELECT id FROM projects WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL FOR UPDATE", [id, owner]);
    if (!p) throw new AppError("NOT_FOUND"); return id;
  }
  async function guide(id: string) {
    const { rows: [g] } = await c.query("SELECT g.project_id FROM brand_guides g JOIN projects p ON p.id=g.project_id WHERE g.id=$1 AND p.owner_id=$2", [id, owner]);
    if (!g) throw new AppError("NOT_FOUND"); return project(g.project_id);
  }
  switch (input.kind) {
    case "generation": {
      const s = await lockActiveSession(c, owner, input.sessionId);
      if (input.guideId && await guide(input.guideId) !== s.project_id) throw new AppError("STATE_CONFLICT");
      return s.project_id;
    }
    case "guide_extraction": return guide(input.guideId);
    case "verification":
    case "export": {
      if (!input.assetIds.length || new Set(input.assetIds).size !== input.assetIds.length) throw new AppError("VALIDATION_ERROR");
      let parent: string | null | undefined;
      for (const id of [...input.assetIds].sort()) {
        const { rows: [a] } = await c.query("SELECT a.session_id FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE a.id=$1 AND s.owner_id=$2 AND a.deleted_at IS NULL", [id, owner]);
        if (!a) throw new AppError("NOT_FOUND");
        const s = await lockActiveSession(c, owner, a.session_id);
        if (parent !== undefined && parent !== s.project_id) throw new AppError("STATE_CONFLICT");
        parent = s.project_id;
      }
      if (input.kind === "verification" && await guide(input.guideId) !== parent) throw new AppError("STATE_CONFLICT");
      if (input.kind === "verification" && input.snapshot) await checkVerificationSnapshot(c, owner, input, parent ?? null);
      if (input.kind === "export" && input.assets) await exportAssets(c, owner, input);
      return parent ?? null;
    }
    case "monitoring": {
      const { rows: [r] } = await c.query("SELECT source_asset_id FROM monitoring_records WHERE id=$1 AND owner_id=$2 AND archived_at IS NULL FOR UPDATE", [input.recordId, owner]);
      if (!r) throw new AppError("NOT_FOUND");
      if (r.source_asset_id) return lockJobParents(c, owner, { schemaVersion: 1, kind: "export", outputLocale: input.outputLocale, assetIds: [r.source_asset_id] });
      return null;
    }
    case "matching": return null;
  }
}
