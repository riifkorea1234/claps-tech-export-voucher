import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, open, constants } from "node:fs/promises";
import sharp, { type Metadata } from "sharp";
import { z } from "zod";
import { AdminAccess, audit } from "./access";
import { storagePath, MAX_UPLOAD_BYTES } from "../storage/service";
import { reasonSchema } from "../../contracts/admin";
import { idSchema, versionSchema } from "../../contracts/common";
import { fileSchema } from "../../contracts/metadata";
import { AppError } from "../errors/http";
export const partnerImageInput = z.strictObject({
  version: z.coerce.number().pipe(versionSchema),
  reason: reasonSchema,
  name: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[^/\\\x00-\x1f\x7f]+$/),
});
export async function uploadPartnerImage(
  access: AdminAccess,
  raw: string | undefined,
  id: string,
  input: unknown,
  mime: string,
  bytes: Buffer,
) {
  idSchema.parse(id);
  const data = partnerImageInput.parse(input);
  const formats: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };
  if (
    !formats[mime] ||
    !bytes.length ||
    bytes.length > MAX_UPLOAD_BYTES ||
    !{
      "image/png": ["png"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/webp": ["webp"],
    }[mime]?.includes(data.name.split(".").at(-1)!.toLowerCase())
  )
    throw new AppError("VALIDATION_ERROR");
  const key = randomUUID(),
    storageKey = `${key}-original`,
    thumbnailKey = `${key}-thumbnail`,
    ledger = randomUUID();
  await access.run(raw, async (c, u) => {
    const row = (
      await c.query(
        "SELECT version,profile FROM partners WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!row) throw new AppError("NOT_FOUND");
    if (row.version !== data.version) throw new AppError("VERSION_CONFLICT");
    if (row.profile.images.length >= 20) throw new AppError("STATE_CONFLICT");
    await c.query(
      "INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at) VALUES($1,$2,'cleanup','partner',$3,'cleanup_pending',$4,now())",
      [ledger, u.id, id, { schemaVersion: 1, storageKey, thumbnailKey }],
    );
  });
  let info: Metadata, thumbnail: Buffer;
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40000000,
      failOn: "warning",
      animated: true,
    });
    info = await image.metadata();
    if (info.format !== formats[mime] || (info.pages ?? 1) !== 1)
      throw new Error("format");
    thumbnail = await image
      .rotate()
      .resize(320, 320, { fit: "inside", withoutEnlargement: true })
      .webp()
      .toBuffer();
  } catch {
    throw new AppError("VALIDATION_ERROR");
  }
  const originalPath = storagePath(storageKey),
    thumbPath = storagePath(thumbnailKey);
  await mkdir(process.env.UPLOADS_DIR!, { recursive: true });
  await writeFile(originalPath, bytes, { flag: "wx", mode: 0o600 });
  await writeFile(thumbPath, thumbnail, { flag: "wx", mode: 0o600 });
  const file = fileSchema.parse({
    schemaVersion: 1,
    storageKey,
    thumbnailKey,
    originalName: data.name,
    mimeType: mime,
    size: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    width: info.width,
    height: info.height,
  });
  return access.run(raw, async (c, u) => {
    const row = (
      await c.query(
        "SELECT version,profile FROM partners WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!row) throw new AppError("NOT_FOUND");
    if (row.version !== data.version) throw new AppError("VERSION_CONFLICT");
    await c.query(
      "UPDATE partners SET profile=$2,version=version+1,updated_at=now() WHERE id=$1",
      [id, { ...row.profile, images: [...row.profile.images, file] }],
    );
    await c.query(
      "UPDATE storage_tickets SET state='claimed',metadata=$2,updated_at=now() WHERE id=$1",
      [ledger, file],
    );
    await audit(c, u.id, "partner.image.add", "partner", id, data.reason, [
      {
        field: "imageCount",
        before: String(row.profile.images.length),
        after: String(row.profile.images.length + 1),
      },
    ]);
    return { version: row.version + 1 };
  });
}
export async function readPartnerImage(file: unknown) {
  const meta = fileSchema.parse(file),
    handle = await open(
      storagePath(meta.thumbnailKey ?? meta.storageKey),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
  try {
    return {
      bytes: await handle.readFile(),
      mime: meta.thumbnailKey ? "image/webp" : meta.mimeType,
    };
  } finally {
    await handle.close();
  }
}

export async function removePartnerImage(
  access: AdminAccess,
  raw: string | undefined,
  id: string,
  index: string,
  input: unknown,
) {
  idSchema.parse(id);
  const position = z.coerce.number().int().min(0).max(19).parse(index);
  const d = z
    .strictObject({ version: versionSchema, reason: reasonSchema })
    .parse(input);
  return access.run(raw, async (c, u) => {
    const row = (
      await c.query(
        "SELECT version,profile FROM partners WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!row) throw new AppError("NOT_FOUND");
    if (row.version !== d.version) throw new AppError("VERSION_CONFLICT");
    const file = row.profile.images[position];
    if (!file) throw new AppError("NOT_FOUND");
    await c.query(
      "UPDATE partners SET profile=$2,version=version+1,updated_at=now() WHERE id=$1",
      [
        id,
        {
          ...row.profile,
          images: row.profile.images.filter(
            (_: unknown, i: number) => i !== position,
          ),
        },
      ],
    );
    await c.query(
      "INSERT INTO storage_tickets(id,owner_id,kind,target_type,target_id,state,metadata,expires_at) VALUES($1,$2,'cleanup','partner',$3,'cleanup_pending',$4,now())",
      [randomUUID(), u.id, id, file],
    );
    await audit(c, u.id, "partner.image.remove", "partner", id, d.reason, [
      {
        field: "imageCount",
        before: String(row.profile.images.length),
        after: String(row.profile.images.length - 1),
      },
    ]);
    return { version: row.version + 1 };
  });
}
