import "server-only";
import { resolve, join } from "node:path";
import { AppError } from "../errors/http";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export function storageRoot() {
  const path = process.env.UPLOADS_DIR;
  if (!path || !path.startsWith("/")) throw new AppError("SERVICE_UNAVAILABLE");
  return resolve(path);
}
export function storagePath(key: string) {
  if (!/^[a-f0-9-]{36}-(?:original|thumbnail)$/.test(key)) throw new AppError("VALIDATION_ERROR");
  return join(storageRoot(), key);
}
