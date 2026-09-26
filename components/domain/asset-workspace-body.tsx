"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import type { AssetDto, SessionDto } from "@/lib/contracts/workspace";
import { updateSession } from "@/lib/assets-store";
import { deleteAsset, updateAsset } from "@/lib/session-assets-store";
import { useRemote, useWorkspaceMutation, WorkspaceError, WorkspaceLoading } from "./workspace-data";
import { ProjectPicker } from "./server-project-picker";
import { AssetGallery } from "./server-asset-gallery";
import { Button } from "@/components/ui/button";
export function AssetWorkspaceBody({ sessionId, step = 1 }: { sessionId: string; title?: string; step?: number }) {
  const t = useT();
  const session = useRemote<SessionDto>(`/api/asset-sessions/${sessionId}`), assets = useRemote<AssetDto[]>(`/api/asset-sessions/${sessionId}/assets`);
  const m = useWorkspaceMutation(() => { session.reload(); assets.reload(); });
  const [prompt, setPrompt] = useState(""), [style, setStyle] = useState("none"), [ratio, setRatio] = useState("1:1");
  const items = assets.data?.filter(a => step === 1 || (step === 2 ? a.adopted : a.finalizedAt)).sort((a, b) => step === 3 ? (b.finalizedAt ?? "").localeCompare(a.finalizedAt ?? "") : 0) ?? [];
  return <div className="flex flex-col gap-6">
    <WorkspaceError error={session.error ?? assets.error ?? m.error} retry={() => { session.reload(); assets.reload(); }} />
    {(!session.data || !assets.data) && !session.error && !assets.error && <WorkspaceLoading />}
    <div className="flex flex-col gap-8 lg:flex-row">
      {step === 1 && <section className="flex w-full shrink-0 flex-col gap-5 lg:w-80"><h2 className="text-lg font-semibold">{t("assets.generation_settings")}</h2>
        <label className="text-sm font-medium">{t("assets.select_project")}</label>
        <ProjectPicker value={session.data?.projectId ?? ""} selectedLabel={session.data?.projectName ?? undefined} disabled={m.pending || !session.data || !!session.data.generated} onChange={projectId => { if (session.data) void m.run(() => updateSession(sessionId, { version: session.data!.version, projectId: projectId || null })); }} />
        <textarea aria-label={t("assets.prompt")} placeholder={t("assets.prompt")} className="min-h-32 rounded-lg border bg-card p-3 text-sm" value={prompt} onChange={e => setPrompt(e.target.value)} />
        <div className="flex flex-wrap gap-2">{["none", "flat_vector", "line_art", "pastel", "kitsch", "chibi", "figure_3d", "watercolor"].map(s => <Button key={s} variant={style === s ? "default" : "outline"} aria-pressed={style === s} onClick={() => setStyle(s)}>{t(`assets.style.${s}`)}</Button>)}</div>
        <select aria-label={t("assets.aspect_ratio")} className="rounded-lg border p-2" value={ratio} onChange={e => setRatio(e.target.value)}>{["1:1", "16:9", "4:5"].map(r => <option key={r}>{r}</option>)}</select>
        <Button disabled>{t("projects.generate_assets")}</Button><p className="text-sm text-muted-foreground">{t("common.futureFeature")}</p>
      </section>}
      <section className="min-w-0 flex-1"><h2 className="mb-4 text-lg font-semibold">{t("assets.generated_images")}</h2>
        {step === 2 && <p className="mb-4 text-sm text-muted-foreground">{t("assets.verification.providerPending")}</p>}
        <AssetGallery showVerification={step !== 1} reload={() => { session.reload(); assets.reload(); }} items={items} pending={m.pending} onAdopt={step === 1 ? a => m.run(() => updateAsset(a.id, a.version, !a.adopted)) : undefined} onDelete={step === 1 ? a => m.run(() => deleteAsset(a.id, a.version)) : undefined} />
      </section>
    </div>
  </div>;
}
