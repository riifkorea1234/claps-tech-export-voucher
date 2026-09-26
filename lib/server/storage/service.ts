import "server-only";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, open, constants } from "node:fs/promises";
import type { PoolClient, QueryResultRow } from "pg";
import { exportDownloadFile } from "../exports/download";
import { readStoredFile } from "./read-file";
import { MAX_EXPORT_BYTES } from "../../contracts/exports";
import sharp, { type Metadata } from "sharp";
import { z } from "zod";
import { idSchema } from "@/lib/contracts/common";
import { fileSchema, preferencesSchema } from "@/lib/contracts/metadata";
import { AppError } from "../errors/http";
import { digest } from "../auth/service";
import type { WorkspaceService } from "../projects/service";
import { MAX_UPLOAD_BYTES, storageRoot as root, storagePath } from "./config";
export { MAX_UPLOAD_BYTES, storagePath } from "./config";
export const uploadInput = z.strictObject({ projectId: idSchema, name: z.string().min(1).max(200).regex(/^[^/\\\x00-\x1f\x7f]+$/), mime: z.enum(["image/png", "image/jpeg", "image/webp"]), size: z.number().int().positive().max(MAX_UPLOAD_BYTES) });
const extensions: Record<string, string[]> = { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"] };
const formats: Record<string, string> = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" };
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export async function issueFileUrl(c: PoolClient, owner: string, type: "project" | "asset" | "job", id: string, variant: "original" | "thumbnail") {
  const token = randomBytes(32).toString("hex");
  await c.query(`INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,variant,state,expires_at) VALUES($1,$2,'download',$3,$4,$5,'ready',now()+interval '5 minutes')`, [digest(token), owner, type, id, variant]);
  return `/api/files/${token}`;
}
export async function reserveCleanup(c: PoolClient, owner: string, type: string, id: string, file: unknown) {
  await c.query(`INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at) VALUES($1,$2,'cleanup',$3,$4,'cleanup_pending',$5,now())`, [randomUUID(), owner, type, id, file]);
}
export async function projectFile(c: PoolClient, row: QueryResultRow) {
  if (row.cover.kind === "upload") return fileSchema.parse(row.cover.file);
  const params = row.cover.kind === "asset" ? [row.id, row.cover.assetId] : [row.id];
  const { rows } = await c.query(`SELECT a.file FROM assets a JOIN asset_sessions s ON s.id=a.session_id WHERE s.project_id=$1 AND s.archived_at IS NULL AND a.deleted_at IS NULL AND a.finalized_at IS NOT NULL ${params.length === 2 ? "AND a.id=$2" : ""} ORDER BY a.finalized_at DESC,a.id LIMIT 1`, params);
  return rows[0] ? fileSchema.parse(rows[0].file) : null;
}
export class StorageService {
  constructor(readonly workspace: WorkspaceService) {}
  async reserveMatching(raw: string | undefined, input: unknown) { return this.reserveReference(raw, input, "matching"); }
  async reserveMonitoring(raw: string | undefined, input: unknown) { return this.reserveReference(raw, input, "monitoring"); }
  private async reserveReference(raw: string | undefined, input: unknown, target: "matching" | "monitoring") {
    const d = uploadInput.omit({ projectId: true }).parse(input);
    if (!extensions[d.mime].includes(d.name.split(".").at(-1)!.toLowerCase())) throw new AppError("VALIDATION_ERROR");
    return this.workspace.run(raw, async (c, owner) => {
      const pending = await c.query("SELECT count(*)::int n FROM storage_tickets WHERE owner_id=$1 AND kind='upload' AND (state IN ('reserved','ready') AND expires_at>now() OR created_at>now()-interval '1 hour')", [owner]);
      if (pending.rows[0].n >= 20) throw new AppError("RATE_LIMITED");
      const token = randomBytes(32).toString("hex"), id = randomUUID();
      await c.query(`INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,metadata,expires_at) VALUES($1,$2,'upload',$5,$3,$4,now()+interval '15 minutes')`, [digest(token), owner, id, { ...d, storageKey: `${id}-original`, thumbnailKey: `${id}-thumbnail` }, target]);
      return { ticket: token, referenceId: id, uploadUrl: `/api/uploads/${token}`, maxBytes: MAX_UPLOAD_BYTES, expiresIn: 900 };
    });
  }
  matchingImage(raw: string | undefined, id: string) {
    idSchema.parse(id);
    return this.workspace.run(raw, async (c, owner) => {
      const { rows: [u] } = await c.query("SELECT preferences FROM users WHERE id=$1", [owner]);
      let file = preferencesSchema.parse(u.preferences).matching?.references?.find(r => r.id === id)?.file;
      if (!file) {
        const { rows: [ticket] } = await c.query("SELECT metadata FROM storage_tickets WHERE owner_id=$1 AND target_type='matching' AND target_id=$2 AND kind='upload' AND state='ready' AND expires_at>now()", [owner, id]);
        if (!ticket) throw new AppError("NOT_FOUND");
        file = fileSchema.parse(ticket.metadata);
      }
      return { bytes: await readStoredFile(file, MAX_UPLOAD_BYTES), mime: file.mimeType, name: file.originalName };
    });
  }
  async reserve(raw: string | undefined, input: unknown) {
    const d = uploadInput.parse(input);
    if (!extensions[d.mime].includes(d.name.split(".").at(-1)!.toLowerCase())) throw new AppError("VALIDATION_ERROR");
    return this.workspace.run(raw, async (c, owner) => {
      await this.workspace.projectRow(c, owner, d.projectId);
      const pending = await c.query("SELECT count(*)::int n FROM storage_tickets WHERE owner_id=$1 AND kind='upload' AND state IN ('reserved','ready') AND expires_at>now()", [owner]);
      if (pending.rows[0].n >= 20) throw new AppError("RATE_LIMITED");
      const token = randomBytes(32).toString("hex"), id = randomUUID();
      const metadata = { ...d, storageKey: `${id}-original`, thumbnailKey: `${id}-thumbnail` };
      await c.query(`INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,metadata,expires_at) VALUES($1,$2,'upload','project',$3,$4,now()+interval '15 minutes')`, [digest(token), owner, d.projectId, metadata]);
      return { ticket: token, uploadUrl: `/api/uploads/${token}`, maxBytes: MAX_UPLOAD_BYTES, expiresIn: 900 };
    });
  }
  async upload(raw: string | undefined, token: string, bytes: Buffer, mime: string) {
    tokenSchema.parse(token);
    // Reservation is committed before any IO; crashes leave tracked planned paths.
    const ticket = await this.workspace.run(raw, async (c, owner) => {
      const { rows: [r] } = await c.query("SELECT * FROM storage_tickets WHERE id=$1 AND owner_id=$2 AND kind='upload' AND state='reserved' AND expires_at>now() FOR UPDATE", [digest(token), owner]);
      if (!r) throw new AppError("NOT_FOUND");
      if (r.target_type === "project") await this.workspace.projectRow(c, owner, r.target_id);
      else if (!["matching", "monitoring"].includes(r.target_type)) throw new AppError("NOT_FOUND");
      if (bytes.length !== r.metadata.size || bytes.length > MAX_UPLOAD_BYTES || mime !== r.metadata.mime) throw new AppError("VALIDATION_ERROR");
      // Claim IO once. Any decode/write error remains cleanup_pending.
      await c.query("UPDATE storage_tickets SET state='cleanup_pending',updated_at=now() WHERE id=$1", [r.id]);
      return r;
    });
    let thumbnail: Buffer, info: Metadata;
    try {
      const input = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", animated: true });
      info = await input.metadata();
      if (info.format !== formats[mime] || (info.pages ?? 1) !== 1) throw new Error("format");
      thumbnail = await input.rotate().resize(320, 320, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch { throw new AppError("VALIDATION_ERROR"); }
    const m = ticket.metadata;
    await mkdir(root(), { recursive: true, mode: 0o700 });
    await writeFile(storagePath(m.storageKey), bytes, { flag: "wx", mode: 0o600 });
    await writeFile(storagePath(m.thumbnailKey), thumbnail, { flag: "wx", mode: 0o600 });
    const file = fileSchema.parse({ schemaVersion: 1, storageKey: m.storageKey, thumbnailKey: m.thumbnailKey, originalName: m.name, mimeType: mime, size: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"), width: info.width, height: info.height });
    return this.workspace.run(raw, async (c, owner) => {
      if (ticket.target_type === "project") await this.workspace.projectRow(c, owner, ticket.target_id);
      const updated = await c.query("UPDATE storage_tickets SET state='ready',metadata=$3,updated_at=now() WHERE id=$1 AND owner_id=$2 AND state='cleanup_pending' AND expires_at>now() RETURNING id", [ticket.id, owner, file]);
      if (!updated.rowCount) throw new AppError("STATE_CONFLICT");
      return { ticket: token };
    });
  }
  download(raw: string | undefined, token: string, attachment = false) {
    tokenSchema.parse(token);
    return this.workspace.run(raw, async (c, owner) => {
      const { rows: [t] } = await c.query("SELECT * FROM storage_tickets WHERE id=$1 AND owner_id=$2 AND kind='download' AND state='ready' AND expires_at>now()", [digest(token), owner]);
      if (!t) throw new AppError("NOT_FOUND");
      if (t.target_type === "job") {
        const { file } = await exportDownloadFile(c, owner, t.target_id);
        return { bytes: await readStoredFile(file, MAX_EXPORT_BYTES + 64 * 1024), mime: file.mimeType, name: file.originalName };
      }
      if (attachment && t.target_type === "asset" && !(await this.workspace.assetRow(c, owner, t.target_id)).finalized_at) throw new AppError("STATE_CONFLICT");
      const file = t.target_type === "project" ? await projectFile(c, await this.workspace.projectRow(c, owner, t.target_id)) : fileSchema.parse((await this.workspace.assetRow(c, owner, t.target_id)).file);
      if (!file) throw new AppError("NOT_FOUND");
      const key = t.variant === "thumbnail" ? file.thumbnailKey : file.storageKey;
      if (!key) throw new AppError("NOT_FOUND");
      if (t.variant === "original") return { bytes: await readStoredFile(file, MAX_UPLOAD_BYTES), mime: file.mimeType, name: file.originalName };
      let handle;
      try { handle = await open(storagePath(key), constants.O_RDONLY | constants.O_NOFOLLOW); }
      catch { throw new AppError("NOT_FOUND"); }
      try {
        const stat = await handle.stat(); if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) throw new AppError("NOT_FOUND");
        const bytes = await handle.readFile();
        return { bytes, mime: t.variant === "thumbnail" ? "image/webp" : file.mimeType, name: file.originalName };
      } finally { await handle.close(); }
    });
  }
}
export async function readUpload(request: Request) {
  if (!request.body) throw new AppError("BAD_REQUEST");
  const size = Number(request.headers.get("content-length"));
  if (size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION_ERROR");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; total += value.length; if (total > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new AppError("VALIDATION_ERROR"); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
