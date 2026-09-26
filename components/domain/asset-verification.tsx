"use client";
import type { AssetDto } from "@/lib/contracts/workspace";
import type { VerificationView } from "@/lib/contracts/verification";
import { useRemote, useWorkspaceMutation, WorkspaceError } from "./workspace-data";
import { workspaceRequest } from "@/lib/api/workspace";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
export function AssetVerification({ asset, reload }: { asset: AssetDto; reload?: () => void }) {
  const t = useT(), view = useRemote<VerificationView>(`/api/assets/${asset.id}/verification`);
  const m = useWorkspaceMutation(() => { view.reload(); reload?.(); });
  const v = view.data?.verification;
  return <div className="space-y-3 border-t p-3 text-sm">
    <WorkspaceError error={view.error ?? m.error} retry={view.reload} />
    {view.data && <>
      <p>{v ? t(`assets.verification.${v.verdict}`) : t("assets.verification.unverified")}</p>
      {view.data.stale && <p>{t("assets.verification.stale")}</p>}
      {v && <details><summary className="cursor-pointer">{t("assets.verification.evidence")}</summary><p className="mt-2 break-words">{t("assets.verification.guideVersion")} {v.guideVersion ?? "—"} · {v.engineVersion}</p><ul className="space-y-2 py-2">{v.ruleResults.map(r => <li key={r.ruleId}><strong>{t(`assets.verification.${r.verdict}`)}</strong> · {r.reason}{r.evidence && <p className="text-muted-foreground">{r.evidence}</p>}</li>)}</ul></details>}
      <Button variant="outline" disabled={m.pending || (!asset.finalizedAt && !view.data.canFinalize)} onClick={() => m.run(() => workspaceRequest(`/api/assets/${asset.id}/finalization`, asset.finalizedAt ? "DELETE" : "PUT", { version: asset.version }))}>{t(asset.finalizedAt ? "assets.verification.cancelFinal" : "assets.verification.finalize")}</Button>
    </>}
  </div>;
}
