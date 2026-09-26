import "server-only";
import { z } from "zod";
import { MAX_METADATA_BYTES } from "../../contracts/common";
import { AppError } from "./http";

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AppError("BAD_REQUEST");
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_METADATA_BYTES)) throw new AppError("BAD_REQUEST");
  if (!request.body) throw new AppError("BAD_REQUEST");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_METADATA_BYTES) { await reader.cancel(); throw new AppError("BAD_REQUEST"); }
      chunks.push(value);
    }
  } catch { throw new AppError("BAD_REQUEST"); } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input: unknown;
  try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new AppError("BAD_REQUEST"); }
  return schema.parse(input);
}
