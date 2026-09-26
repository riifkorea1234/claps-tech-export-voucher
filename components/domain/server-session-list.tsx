"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useLanguage } from "@/lib/i18n/provider";
import { relativeTime } from "@/lib/i18n/format";
import { useRemote, useWorkspaceMutation, WorkspaceError, WorkspaceLoading } from "./workspace-data";
import { createSession, deleteSession, updateSession } from "@/lib/assets-store";
import type { PageResult, ProjectDto, SessionDto } from "@/lib/contracts/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "./pagination";
import { StageBadge } from "./session-row-shell";
import { CoverThumb } from "./cover-thumb";
import { ProjectPicker } from "./server-project-picker";
export function ServerSessionList({ projectId }: { projectId?: string }) {
  const t = useT(), { locale } = useLanguage(), router = useRouter();
  const [query, setQuery] = useState(""), [page, setPage] = useState(1), [archived, setArchived] = useState(false), [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState(projectId ?? ""), [editing, setEditing] = useState<SessionDto>(), [title, setTitle] = useState("");
  const remote = useRemote<PageResult<SessionDto>>(`/api/asset-sessions?q=${encodeURIComponent(query)}&page=${page}&archived=${archived}&sort=${sort}${filter ? `&projectId=${filter}` : ""}`);
  const project = useRemote<ProjectDto | null>(projectId ? `/api/projects/${projectId}` : "/api/projects/stats");
  const m = useWorkspaceMutation(remote.reload);
  return <div className="flex flex-col gap-5 px-6 py-7">
    {projectId && <Link href={`/projects/${projectId}`} className="text-sm text-muted-foreground">{project.data?.name}</Link>}
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">{t("projects.generation_sessions")}</h1><Button disabled={m.pending} onClick={() => m.run(async () => { const s = await createSession(t("assets.untitled"), projectId); router.push(`/assets/${s.id}`); })}>{t("assets.new_asset_generation")}</Button></div>
    <WorkspaceError error={remote.error ?? project.error ?? m.error} retry={remote.reload} />
    <div className="flex flex-wrap gap-3"><Input aria-label={t("assets.search")} placeholder={t("assets.search")} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="max-w-sm" />
      {!projectId && <ProjectPicker value={filter} onChange={id => { setFilter(id); setPage(1); }} />}
      <select aria-label={t("assets.newest_first")} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="rounded-md border p-2 text-sm"><option value="recent">{t("assets.newest_first")}</option><option value="oldest">{t("assets.oldest_first")}</option></select>
      <Button variant="outline" onClick={() => { setArchived(!archived); setPage(1); }}>{t(archived ? "common.active" : "common.archived")}</Button></div>
    {!remote.data && !remote.error && <WorkspaceLoading />}
    {remote.data?.items.length === 0 && <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">{t("common.empty")}</p>}
    {remote.data?.items.map((s, index, items) => <div key={s.id}>
      {(index === 0 || items[index - 1].createdAt.slice(0, 10) !== s.createdAt.slice(0, 10)) && <p className="mb-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(s.createdAt))}</p>}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <CoverThumb cover={s.thumbnailUrl ? { kind: "local", value: s.thumbnailUrl } : undefined} className="h-14 w-20 shrink-0" />
        <div className="min-w-[140px] flex-1">{editing?.id === s.id ? <div className="flex gap-2"><Input aria-label={t("assets.rename")} value={title} onChange={e => setTitle(e.target.value)} /><Button disabled={m.pending || !title.trim()} onClick={async () => { if (await m.run(() => updateSession(s.id, { version: editing.version, title }))) setEditing(undefined); }}>{t("common.save")}</Button></div> : <Link className={`font-medium ${archived ? "pointer-events-none" : ""}`} href={`/assets/${s.id}`}>{s.title}</Link>}<p className="text-sm text-muted-foreground">{s.projectName ?? t("assets.no_linked_project")} · {s.generated} / {s.finalized}</p></div>
        <span className="text-xs text-muted-foreground">{relativeTime(new Date(s.createdAt).getTime(), locale)}</span><StageBadge stage={s.finalized ? "final" : s.adopted ? "verify" : "generated"} />
        {!archived && <Button variant="ghost" disabled={m.pending} onClick={() => { setEditing(s); setTitle(s.title); }}>{t("assets.rename")}</Button>}
        <Button variant="outline" disabled={m.pending} onClick={() => m.run(() => archived ? updateSession(s.id, { version: s.version, archived: false }) : deleteSession(s.id, s.version))}>{t(archived ? "common.restore" : "common.archive")}</Button>
      </div></div>)}
    <Pagination page={remote.data?.page ?? page} totalPages={Math.max(1, remote.data?.totalPages ?? 1)} onChange={setPage} />
  </div>;
}
