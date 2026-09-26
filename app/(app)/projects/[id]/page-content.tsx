"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useT, useLanguage } from "@/lib/i18n/provider";
import { displayDate } from "@/lib/i18n/format";
import type { AssetDto, ProjectDto, SessionDto, PageResult } from "@/lib/contracts/workspace";
import { updateProject, deleteProject, uploadCover } from "@/lib/projects-store";
import { createSession } from "@/lib/assets-store";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/mock/projects";
import { useRemote, useWorkspaceMutation, WorkspaceError, WorkspaceLoading } from "@/components/domain/workspace-data";
import { CoverThumb } from "@/components/domain/cover-thumb";
import { StatusBadge } from "@/components/domain/status-badge";
import { GuideAnalysisPanel } from "@/components/domain/guide-analysis-panel";
import { AssetGallery } from "@/components/domain/server-asset-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>(), router = useRouter(); const t = useT(), { locale } = useLanguage();
  const remote = useRemote<ProjectDto>(`/api/projects/${id}`), library = useRemote<AssetDto[]>(`/api/projects/${id}/library`), sessions = useRemote<PageResult<SessionDto>>(`/api/projects/${id}/sessions`);
  const m = useWorkspaceMutation(remote.reload); const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ProjectDto>();
  const p = remote.data;
  if (!p) return <div className="p-8"><WorkspaceError error={remote.error} retry={remote.reload} />{!remote.error && <WorkspaceLoading />}</div>;
  return <div className="flex flex-col gap-6 px-6 py-7">
    <Link href="/projects" className="text-sm text-muted-foreground">← {t("projects.back_to_list")}</Link>
    <WorkspaceError error={remote.error ?? m.error} retry={remote.reload} />
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
      <CoverThumb cover={p.cover} className="h-28 w-40" />
      <div className="min-w-0 flex-1"><h1 className="break-words text-2xl font-bold">{p.name}</h1><p className="text-muted-foreground">{p.ip || t("projects.undecided")}</p><p className="mt-2 whitespace-pre-wrap text-sm">{p.description}</p><p className="mt-3 text-xs text-muted-foreground">{displayDate(p.createdAt, locale)}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={p.status} />
      <select aria-label={t("projects.change_status_2")} value={p.status} disabled={m.pending} onChange={e => m.run(() => updateProject(id, { version: p.version, status: e.target.value as ProjectStatus }))} className="rounded-md border p-2 text-sm">{PROJECT_STATUSES.map(s => <option key={s} value={s}>{t(`projects.status.${s}`)}</option>)}</select>
      <Button variant="outline" onClick={() => setEditing(p)}>{t("projects.rename")}</Button>
      <Button variant="outline" disabled={m.pending} onClick={() => m.run(async () => { await deleteProject(id, p.version); router.push("/projects"); })}>{t("common.archive")}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={m.pending} onClick={() => input.current?.click()}>{t("projects.upload_image")}</Button><Button variant="ghost" disabled={m.pending} onClick={() => m.run(() => updateProject(id, { version: p.version, cover: { kind: "default" } }))}>{t("projects.remove_cover")}</Button><span className="text-xs text-muted-foreground">{t("common.coverHelp")}</span>
      <input ref={input} aria-label={t("projects.upload_image")} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void m.run(() => uploadCover(id, p.version, file)); }} /></div>
    <GuideAnalysisPanel key={id} />
    <section className="flex flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("projects.generation_sessions")} · {p.sessions}</h2><Button disabled={m.pending} onClick={() => m.run(async () => { const s = await createSession(t("assets.untitled"), id); router.push(`/assets/${s.id}`); })}>{t("projects.generate_assets")}</Button></div>
      <WorkspaceError error={sessions.error} retry={sessions.reload} />
      {sessions.data?.items.slice(0, 5).map(s => <Link key={s.id} className="rounded-xl border bg-card p-4 font-medium hover:bg-muted" href={`/assets/${s.id}`}>{s.title}<span className="ml-4 text-sm text-muted-foreground">{s.generated} / {s.finalized}</span></Link>)}
      {sessions.data?.total === 0 && <p className="p-5 text-muted-foreground">{t("projects.no_generation_sessions_yet")}</p>}
      <Link className="text-sm text-brand" href={`/projects/${id}/sessions`}>{t("projects.view_all")}</Link>
    </section>
    <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">{t("projects.library")} · {p.finalized}</h2><WorkspaceError error={library.error} retry={library.reload} /><AssetGallery items={library.data ?? []} pending={m.pending} onCover={a => m.run(() => updateProject(id, { version: p.version, cover: { kind: "asset", assetId: a.id } }))} /></section>
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !m.pending) setEditing(undefined); }}><DialogContent><DialogTitle>{t("projects.project_name")}</DialogTitle><DialogDescription>{t("projects.project_description")}</DialogDescription>{editing && <form className="flex flex-col gap-4" onSubmit={async e => { e.preventDefault(); if (await m.run(() => updateProject(id, { version: editing.version, name: editing.name, ip: editing.ip, description: editing.description }))) setEditing(undefined); }}><Input aria-label={t("projects.project_name")} value={editing.name} maxLength={200} onChange={e => setEditing({ ...editing, name: e.target.value })} /><Input aria-label={t("projects.ip_partner")} value={editing.ip} maxLength={500} onChange={e => setEditing({ ...editing, ip: e.target.value })} /><textarea aria-label={t("projects.project_description")} className="rounded-md border p-3" value={editing.description} maxLength={10000} onChange={e => setEditing({ ...editing, description: e.target.value })} /><WorkspaceError error={m.error} retry={remote.reload} /><Button disabled={m.pending || !editing.name.trim()}>{t("common.save")}</Button></form>}</DialogContent></Dialog>
  </div>;
}
