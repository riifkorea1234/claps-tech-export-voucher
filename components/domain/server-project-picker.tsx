"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import type { PageResult, ProjectDto } from "@/lib/contracts/workspace";
import { useRemote, WorkspaceError } from "./workspace-data";
import { Pagination } from "./pagination";
import { Input } from "@/components/ui/input";
export function ProjectPicker({ value, onChange, disabled, selectedLabel }: { value: string; onChange: (id: string) => void; disabled?: boolean; selectedLabel?: string }) {
  const t = useT(); const [query, setQuery] = useState(""), [page, setPage] = useState(1);
  const remote = useRemote<PageResult<ProjectDto>>(`/api/projects?q=${encodeURIComponent(query)}&page=${page}`);
  return <div className="flex max-w-sm flex-col gap-2"><Input aria-label={t("projects.search_projects")} placeholder={t("projects.search_projects")} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
    <select className="rounded-md border bg-card p-2 text-sm" aria-label={t("assets.select_project")} disabled={disabled || !remote.data} value={value} onChange={e => onChange(e.target.value)}><option value="">{t("assets.unlinked")}</option>{value && !remote.data?.items.some(p => p.id === value) && <option value={value}>{selectedLabel ?? value}</option>}{remote.data?.items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {(remote.data?.totalPages ?? 0) > 1 && <Pagination page={remote.data?.page ?? page} totalPages={remote.data!.totalPages} onChange={setPage} />}
    <WorkspaceError error={remote.error} retry={remote.reload} /></div>;
}
