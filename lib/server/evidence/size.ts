import "server-only";
import type { PoolClient } from "pg";
import { MAX_METADATA_BYTES } from "../../contracts/common";
import { JobFailure } from "../jobs/types";
// PostgreSQL itself measures the representation used by existing jsonb CHECKs.
export async function assertDatabaseMetadata(c: Pick<PoolClient, "query">, value: unknown) {
  const { rows: [row] } = await c.query("SELECT octet_length($1::jsonb::text) bytes", [JSON.stringify(value)]);
  if (row.bytes > MAX_METADATA_BYTES) throw new JobFailure("INVALID_RESULT");
}
