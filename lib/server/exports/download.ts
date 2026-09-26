import "server-only";
import type { PoolClient } from "pg";
import { idSchema } from "../../contracts/common";
import { parseJobInput, parseJobOutput } from "../../contracts/jobs";
import { AppError } from "../errors/http";
import { exportAssets } from "./guards";
export async function exportDownloadFile(c: PoolClient, owner: string, id: string) {
  idSchema.parse(id);
  const { rows: [j] } = await c.query("SELECT * FROM jobs WHERE id=$1 AND owner_id=$2 AND kind='export' AND status='succeeded'", [id, owner]);
  if (!j) throw new AppError("NOT_FOUND");
  const output = parseJobOutput("export", j.output), input = parseJobInput(j.input);
  if (output.kind !== "export" || input.kind !== "export" || !output.expiresAt || Date.parse(output.expiresAt) <= Date.now()) throw new AppError("NOT_FOUND");
  await exportAssets(c, owner, input);
  return { file: output.file, expiresAt: output.expiresAt };
}
