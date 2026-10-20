import { apiRequest } from "./client";
import { evidencePageSchema, certificateSchema } from "../contracts/evidence";
export async function getEvidence(sessionId: string, cursor?: string, limit = 30, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) });
  return (await apiRequest(`/api/asset-sessions/${encodeURIComponent(sessionId)}/evidence?${query}`, { schema: evidencePageSchema, signal })).data;
}
export async function getCertificate(assetId: string, signal?: AbortSignal) {
  return (await apiRequest(`/api/assets/${encodeURIComponent(assetId)}/certificate`, { schema: certificateSchema, signal })).data;
}
