import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getDatabase } from "../db";
import type { AuthService } from "../auth/service";
import { EXPORT_TTL_MS } from "../../contracts/exports";
import { JobFailure, type JobHandler, type JobFile } from "../jobs/types";
import { exportAssets } from "./guards";
import { readStoredFile } from "../storage/read-file";
import { MAX_UPLOAD_BYTES, storagePath } from "../storage/config";
import { createZip } from "./zip";
// The pool is resolved lazily, so importing the production registry needs no runtime secrets.
export function exportHandler(auth?: Pick<AuthService, "pool">): JobHandler {
  return {
    async run(context) {
      const input = context.job.input;
      if (input.kind !== "export") throw new JobFailure("INVALID_RESULT");
      const c = await (auth?.pool ?? getDatabase().pool).connect();
      let snapshot;
      try {
        await c.query("BEGIN");
        const { rows: [u] } = await c.query("SELECT status FROM users WHERE id=$1 FOR UPDATE", [context.job.owner_id]);
        if (u?.status !== "active") throw new JobFailure("PARENT_INACTIVE");
        snapshot = await exportAssets(c, context.job.owner_id, input);
        await c.query("COMMIT");
      } catch (error) { await c.query("ROLLBACK"); throw error; } finally { c.release(); }
      const entries = [];
      const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
      for (const a of snapshot.assets) {
        context.signal.throwIfAborted();
        entries.push({ name: `${a.id}.${extensions[a.file.mimeType]}`, bytes: await readStoredFile(a.file, MAX_UPLOAD_BYTES) });
      }
      context.signal.throwIfAborted();
      const bytes = createZip(entries);
      const file: JobFile = { schemaVersion: 1, storageKey: `${randomUUID()}-original`, originalName: `assets-${context.job.id}.zip`, mimeType: "application/zip", size: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex") };
      await context.reserveFile(file);
      context.signal.throwIfAborted();
      const path = storagePath(file.storageKey);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(path, bytes, { flag: "wx", mode: 0o600, signal: context.signal });
      return { output: { schemaVersion: 1, kind: "export", file, expiresAt: new Date(Date.now() + EXPORT_TTL_MS).toISOString() } };
    },
    async apply(c, job) {
      if (job.input.kind !== "export") throw new JobFailure("INVALID_RESULT");
      await exportAssets(c, job.owner_id, job.input);
    },
  };
}
