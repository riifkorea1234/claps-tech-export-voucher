import "server-only";
import type { PoolClient } from "pg";
import type { JobInput } from "../../contracts/jobs";
import { fileSchema } from "../../contracts/metadata";
import { MAX_EXPORT_BYTES, MAX_EXPORT_FILES } from "../../contracts/exports";
import { MAX_UPLOAD_BYTES } from "../storage/config";
import { AppError } from "../errors/http";
export async function exportAssets(c: PoolClient, owner: string, input: Extract<JobInput, { kind: "export" }>) {
  if (!input.assets || !input.assets.length || input.assets.length > MAX_EXPORT_FILES || input.assets.length !== input.assetIds.length || new Set(input.assetIds).size !== input.assetIds.length || new Set(input.assets.map(a => a.id)).size !== input.assets.length) throw new AppError("STATE_CONFLICT");
  let total = 0, project: string | undefined;
  const assets = [];
  for (const expected of input.assets) {
    if (!input.assetIds.includes(expected.id)) throw new AppError("STATE_CONFLICT");
    const { rows: [a] } = await c.query(`SELECT a.*,s.project_id FROM assets a JOIN asset_sessions s ON s.id=a.session_id JOIN projects p ON p.id=s.project_id
      WHERE a.id=$1 AND s.owner_id=$2 AND p.owner_id=$2 AND s.archived_at IS NULL AND p.archived_at IS NULL AND a.deleted_at IS NULL FOR UPDATE OF a`, [expected.id, owner]);
    if (!a) throw new AppError("NOT_FOUND");
    if (!a.finalized_at || a.version !== expected.version || (project && project !== a.project_id)) throw new AppError("STATE_CONFLICT");
    project = a.project_id;
    const file = fileSchema.parse(a.file);
    total += file.size;
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES || total > MAX_EXPORT_BYTES || !["image/png", "image/jpeg", "image/webp"].includes(file.mimeType)) throw new AppError("VALIDATION_ERROR");
    assets.push({ id: a.id as string, file });
  }
  return { assets, project: project! };
}
