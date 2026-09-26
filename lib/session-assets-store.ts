import { workspaceRequest } from "./api/workspace";
import type { AssetDto } from "./contracts/workspace";
export type SessionStage = "generated" | "verify" | "final";
export async function getStageAssets(stage: SessionStage, id: string) {
  const assets = await workspaceRequest<AssetDto[]>(`/api/asset-sessions/${id}/assets`);
  return assets.filter(a => stage === "generated" || (stage === "verify" ? a.adopted : a.finalizedAt));
}
export const updateAsset = (id: string, version: number, adopted: boolean) => workspaceRequest<AssetDto>(`/api/assets/${id}`, "PATCH", { version, adopted });
export const deleteAsset = (id: string, version: number) => workspaceRequest<AssetDto>(`/api/assets/${id}`, "DELETE", { version });
