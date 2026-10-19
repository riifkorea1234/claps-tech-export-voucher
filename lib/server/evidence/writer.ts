import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { evidencePayloadSchema, type EvidencePayload, guideProvenanceSchema } from "../../contracts/evidence";
import { assertDatabaseMetadata } from "./size";
import { AppError } from "../errors/http";
import type { JobRow } from "../jobs/types";
// Caller holds the owner lock in its business transaction. Terminal failures are
// deliberately recorded even after suspension/archive; they never attach files.
export async function appendEvidence(c: PoolClient, owner: string, sessionId: string, payload: EvidencePayload, assetId: string | null = null, jobId: string | null = null, actorId: string = owner) {
  const parsed = evidencePayloadSchema.parse(payload);
  await assertDatabaseMetadata(c, parsed);
  const key = jobId ? `${jobId}:${parsed.kind}:${assetId ?? "session"}` : null;
  const { rows: [session] } = await c.query("SELECT id FROM asset_sessions WHERE id=$1 AND owner_id=$2 FOR UPDATE", [sessionId, owner]);
  if (!session) throw new AppError("STATE_CONFLICT");
  if (assetId && !(await c.query("SELECT 1 FROM assets WHERE id=$1 AND session_id=$2", [assetId, sessionId])).rowCount) throw new AppError("STATE_CONFLICT");
  if (jobId && !(await c.query("SELECT 1 FROM jobs WHERE id=$1 AND owner_id=$2 AND (input->>'sessionId'=$3 OR input->'snapshot'->>'sessionId'=$3 OR input->'assetIds' ? $4)", [jobId, owner, sessionId, assetId ?? ""])).rowCount) throw new AppError("STATE_CONFLICT");
  if (key && (await c.query("SELECT 1 FROM evidence_events WHERE dedupe_key=$1", [key])).rowCount) return;
  await c.query(`INSERT INTO evidence_events(id,owner_id,session_id,asset_id,job_id,kind,actor_id,sequence,payload,dedupe_key)
    SELECT $1,$2,$3,$4,$5,$6,$9,COALESCE(max(sequence),0)+1,$7,$8 FROM evidence_events WHERE session_id=$3`, [randomUUID(), owner, sessionId, assetId, jobId, parsed.kind, parsed, key, actorId]);
}
export async function guideProvenance(c: PoolClient, guideId: string) {
  const { rows: [g] } = await c.query("SELECT id,version,file->>'checksum' checksum FROM brand_guides WHERE id=$1", [guideId]);
  if (!g) throw new AppError("STATE_CONFLICT");
  return guideProvenanceSchema.parse(g);
}
export async function generationTerminal(c: PoolClient, row: JobRow, actorId?: string) {
  if (row.input.kind !== "generation") return;
  if (row.status === "failed") await appendEvidence(c, row.owner_id, row.input.sessionId, { schemaVersion: 1, actorType: "worker", kind: "generate.failed", errorCode: row.error_code! }, null, row.id);
  if (row.status === "canceled") await appendEvidence(c, row.owner_id, row.input.sessionId, { schemaVersion: 1, actorType: row.cancel_requested_actor_type ?? (actorId ? "user" : "worker"), kind: "generate.canceled", errorCode: "CANCELED" }, null, row.id, row.cancel_requested_actor_id ?? actorId);
}
export async function generationSucceeded(c: PoolClient, row: JobRow, assetIds: string[]) {
  if (row.input.kind !== "generation") return;
  const { rows } = await c.query("SELECT id FROM assets WHERE generation_job_id=$1 AND session_id=$2 ORDER BY id", [row.id, row.input.sessionId]);
  if (rows.length !== assetIds.length || new Set(assetIds).size !== assetIds.length || rows.some(a => !assetIds.includes(a.id))) throw new AppError("STATE_CONFLICT");
  await appendEvidence(c, row.owner_id, row.input.sessionId, { schemaVersion: 1, actorType: "worker", kind: "generate.succeeded", resultCount: rows.length }, null, row.id);
}
