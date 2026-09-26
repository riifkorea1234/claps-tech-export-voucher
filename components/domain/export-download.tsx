"use client";
import { useT } from "@/lib/i18n/provider";
import { workspaceRequest } from "@/lib/api/workspace";
import { Button } from "@/components/ui/button";
import { useWorkspaceMutation, WorkspaceError } from "./workspace-data";
export function ExportDownload({ id }: { id: string }) {
  const t = useT(), m = useWorkspaceMutation();
  return <div className="space-y-2"><WorkspaceError error={m.error} /><Button disabled={m.pending} onClick={() => m.run(async () => {
    const { downloadUrl } = await workspaceRequest<{ downloadUrl: string }>(`/api/exports/${id}`);
    const a = document.createElement("a"); a.href = downloadUrl; a.click();
  })}>{t("assets.export.download")}</Button><p className="text-sm text-muted-foreground">{t("assets.export.expiry")}</p></div>;
}
