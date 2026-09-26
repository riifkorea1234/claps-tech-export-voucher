import "server-only";
import { createHash } from "node:crypto";
import { open, constants } from "node:fs/promises";
import type { JobFile } from "../jobs/types";
import { storagePath } from "./config";
import { AppError } from "../errors/http";
// Read exactly the declared size plus one sentinel byte, never an unbounded changed file.
export async function readStoredFile(file: JobFile, limit: number) {
  if (file.size > limit || file.size <= 0) throw new AppError("VALIDATION_ERROR");
  let handle;
  try { handle = await open(storagePath(file.storageKey), constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch { throw new AppError("NOT_FOUND"); }
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== file.size) throw new AppError("STATE_CONFLICT");
    const bytes = Buffer.alloc(file.size + 1); let offset = 0;
    while (offset < bytes.length) { const r = await handle.read(bytes, offset, bytes.length - offset, offset); if (!r.bytesRead) break; offset += r.bytesRead; }
    const result = bytes.subarray(0, offset);
    if (offset !== file.size || createHash("sha256").update(result).digest("hex") !== file.checksum) throw new AppError("STATE_CONFLICT");
    return result;
  } finally { await handle.close(); }
}
