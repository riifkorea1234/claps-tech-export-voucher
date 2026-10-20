import type { z } from "zod";
import type { verificationSchema } from "../../contracts/metadata";
export function verificationStale(v: z.infer<typeof verificationSchema>, guide: { id: string; version: number; checksum?: string } | null, recordedChecksum?: string) {
  return !guide || v.guideId !== guide.id || v.guideVersion !== guide.version || (!!recordedChecksum && recordedChecksum !== guide.checksum);
}
