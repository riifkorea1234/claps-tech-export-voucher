"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { AssetVerification } from "./asset-verification";
import { useLanguage } from "@/lib/i18n/provider";
import type { AssetDto } from "@/lib/contracts/workspace";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { workspaceRequest } from "@/lib/api/workspace";
import { useWorkspaceMutation, WorkspaceError } from "./workspace-data";
export function AssetGallery({ items, pending, onAdopt, onDelete, onCover, showVerification, reload }: { showVerification?: boolean; reload?: () => void; items: AssetDto[]; pending?: boolean; onAdopt?: (asset: AssetDto) => unknown; onDelete?: (asset: AssetDto) => unknown; onCover?: (asset: AssetDto) => unknown }) {
  const t = useT(); const { locale } = useLanguage(); const m = useWorkspaceMutation();
  const [selected, setSelected] = useState<string[]>([]), [jobId, setJobId] = useState<string>();
  const finalIds = selected.filter(id => items.some(a => a.id === id && a.finalizedAt));
  const exportAttempt = useRef<{ signature: string; key: string } | null>(null);
  async function exportZip() {
    const signature = JSON.stringify({ assetIds: [...finalIds].sort(), locale });
    if (exportAttempt.current?.signature !== signature) exportAttempt.current = { signature, key: crypto.randomUUID() };
    const result = await workspaceRequest<{ jobId: string }>("/api/exports", "POST", { assetIds: finalIds, outputLocale: locale, idempotencyKey: exportAttempt.current.key });
    setJobId(result.jobId);
  }
  async function download(id: string) { const a = await workspaceRequest<AssetDto>(`/api/assets/${id}`); const link = document.createElement("a"); link.href = `${a.imageUrl}?download=1`; link.click(); }
  return <><WorkspaceError error={m.error} />{items.some(a => a.finalizedAt) && <div className="mb-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={m.pending || !finalIds.length || finalIds.length > 50} onClick={() => m.run(exportZip)}>{t("assets.export.selected")} ({finalIds.length}/50)</Button>{jobId && <Link className="text-sm underline" href={`/jobs/${jobId}`}>{t("assets.export.status")}</Link>}</div>}{items.length === 0 ? <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{t("common.empty")}</p> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(a => <div key={a.id} className="overflow-hidden rounded-xl border bg-card">
    {/* Authenticated originals bypass the public image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={a.thumbnailUrl} alt={t("assets.generated_images")} className="aspect-square w-full object-contain" />
    <div className="flex flex-wrap items-center gap-2 p-3">{a.finalizedAt && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={finalIds.includes(a.id)} onChange={e => setSelected(old => e.target.checked ? [...old.filter(id => id !== a.id), a.id] : old.filter(id => id !== a.id))} />{t("assets.export.select")}</label>}{onAdopt && <Button variant={a.adopted ? "default" : "outline"} disabled={pending || !!a.finalizedAt} aria-pressed={a.adopted} onClick={() => onAdopt(a)}>{t("assets.adopt")}</Button>}{a.finalizedAt && <Button variant="outline" disabled={m.pending} onClick={() => m.run(() => download(a.id))}>{t("common.download")}</Button>}{onDelete && <Button variant="ghost" disabled={pending || !!a.finalizedAt} onClick={() => onDelete(a)}>{t("assets.delete")}</Button>}{onCover && <Button variant="ghost" disabled={pending} onClick={() => onCover(a)}>{t("projects.set_as_cover")}</Button>}</div>{showVerification && <AssetVerification key={`${a.id}-${a.version}`} asset={a} reload={reload} />}</div>)}</div>}</>;
}
