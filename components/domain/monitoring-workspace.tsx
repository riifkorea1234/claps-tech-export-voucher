"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated private originals use same-origin cookies and bypass public optimization. */
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/provider";
import { workspaceRequest } from "@/lib/api/workspace";
import type { MonitoringRecord, ScanEntry } from "@/lib/contracts/monitoring";
import type { PageResult, AssetDto } from "@/lib/contracts/workspace";
import { useRemote, useWorkspaceMutation, WorkspaceError, WorkspaceLoading } from "./workspace-data";
import { ProjectPicker } from "./server-project-picker";
import { Pagination } from "./pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const base = "/api/monitoring-records";
export function MonitoringList() {
  const { t, locale } = useLanguage();
  const [q, setQ] = useState(""), [page, setPage] = useState(1), [archived, setArchived] = useState(false), [sort, setSort] = useState("recent");
  const remote = useRemote<PageResult<MonitoringRecord>>(`${base}?q=${encodeURIComponent(q)}&page=${page}&archived=${archived}&sort=${sort}`);
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{t("monitoring.recordsTitle")}</h1><Link className="underline" href="/monitoring/new">{t("monitoring.newRecord")}</Link></div><p className="rounded border p-3 text-sm">{t("monitoring.providerUnavailable")}</p><div className="flex flex-wrap gap-3"><Input className="max-w-sm" aria-label={t("monitoring.searchRecords")} placeholder={t("monitoring.searchRecords")} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /><select aria-label={t("monitoring.sortRecords")} className="rounded border p-2" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="recent">{t("monitoring.newest_first")}</option><option value="created">{t("monitoring.date_created")}</option></select><label className="flex items-center gap-2"><input type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); setPage(1); }} />{t("monitoring.archivedRecords")}</label></div><WorkspaceError error={remote.error} retry={remote.reload} />{!remote.data && !remote.error && <WorkspaceLoading />}{remote.data && <><ul className="divide-y rounded border">{remote.data.items.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><Link className="break-all font-medium underline" href={`/monitoring/${r.id}`}>{r.name}</Link><span className="text-sm text-muted-foreground">{new Date(r.lastScannedAt ?? r.createdAt).toLocaleString(locale)} · {r.lastScannedAt ? `${r.latestResultCount} ${t("monitoring.resultItems")}` : t("monitoring.notScanned")}</span></li>)}</ul>{!remote.data.items.length && <p>{t("monitoring.noRecords")}</p>}<Pagination page={remote.data.page} totalPages={remote.data.totalPages} onChange={setPage} /></>}</main>;
}
function Library({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useLanguage(); const [project, setProject] = useState("");
  return <div className="space-y-3"><ProjectPicker value={project} onChange={id => { setProject(id); onChange(""); }} />{project && <LibraryAssets project={project} value={value} onChange={onChange} />}<p className="text-sm text-muted-foreground">{t("monitoring.libraryHelp")}</p></div>;
}
function LibraryAssets({ project, value, onChange }: { project: string; value: string; onChange: (id: string) => void }) {
  const { t } = useLanguage(); const remote = useRemote<AssetDto[]>(`/api/projects/${project}/library`);
  return <><WorkspaceError error={remote.error} retry={remote.reload} /><div className="grid grid-cols-3 gap-3">{remote.data?.map(a => <button type="button" key={a.id} aria-label={a.id} aria-pressed={value === a.id} className={`rounded border p-2 ${value === a.id ? "ring-2 ring-primary" : ""}`} onClick={() => onChange(a.id)}><img src={a.thumbnailUrl} alt={t("monitoring.reference_image")} className="aspect-square w-full object-contain" /></button>)}</div>{remote.data?.length === 0 && <p>{t("monitoring.noLibraryAssets")}</p>}</>;
}
function CreateRecord() {
  const { t } = useLanguage(), router = useRouter(), mutation = useWorkspaceMutation();
  const [name, setName] = useState(""), [file, setFile] = useState<File>(), [asset, setAsset] = useState(""), [mode, setMode] = useState("upload");
  return <form className="max-w-xl space-y-4" onSubmit={e => { e.preventDefault(); void mutation.run(async () => {
    let source: { kind: "upload"; ticket: string } | { kind: "asset"; assetId: string };
    if (mode === "upload") {
      if (!file || file.size > 10 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error(t("monitoring.uploadHelp"));
      const ticket = await workspaceRequest<{ ticket: string; uploadUrl: string }>(`${base}/uploads`, "POST", { name: file.name, mime: file.type, size: file.size });
      const res = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file, credentials: "same-origin", redirect: "error" });
      if (!res.ok) throw new Error(t("monitoring.uploadFailed")); source = { kind: "upload", ticket: ticket.ticket };
    } else source = { kind: "asset", assetId: asset };
    const record = await workspaceRequest<MonitoringRecord>(base, "POST", { name, source }); router.push(`/monitoring/${record.id}`);
  }); }}><label className="block">{t("monitoring.recordName")}<Input required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label><select aria-label={t("monitoring.sourceType")} className="rounded border p-2" value={mode} onChange={e => setMode(e.target.value)}><option value="upload">{t("monitoring.attach_image")}</option><option value="asset">{t("monitoring.choose_from_library")}</option></select>{mode === "upload" ? <><Input aria-label={t("monitoring.attach_image")} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; setFile(f); if (f && !name) setName(f.name); }} /><p className="text-sm">{t("monitoring.uploadHelp")}</p></> : <Library value={asset} onChange={setAsset} />}<WorkspaceError error={mutation.error} /><Button disabled={mutation.pending || !name.trim() || (mode === "upload" ? !file : !asset)}>{t("monitoring.saveRecord")}</Button></form>;
}
export function ScanHistory({ path }: { path: string }) {
  const { t, locale } = useLanguage(); const [page, setPage] = useState(1);
  const remote = useRemote<PageResult<ScanEntry>>(`${path}?page=${page}`);
  return <section className="space-y-3"><h2 className="text-lg font-semibold">{t("monitoring.executionHistory")}</h2><Button variant="outline" onClick={remote.reload}>{t("common.retry")}</Button><WorkspaceError error={remote.error} retry={remote.reload} />{remote.data?.items.map(({ job, result }) => <details key={job.id} className="rounded border p-3"><summary className="cursor-pointer">{new Date(job.createdAt).toLocaleString(locale)} · {t(`common.jobs.status.${job.status}`)}{result && ` · ${t(`monitoring.outcome.${result.state}`)}`}</summary><Link className="block break-all underline" href={path.startsWith("/api/admin/") ? `/admin/jobs/${job.id}` : `/jobs/${job.id}`}>{job.id}</Link>{result && <><p>{t("monitoring.similarityNotice")}</p><ul>{result.sources.map(s => <li key={s.name}>{s.name}: {t(`common.jobs.status.${s.status}`)}</li>)}</ul><ul>{result.items.map(i => <li key={i.url} className="my-2 break-all"><a className="underline" href={i.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{i.url}</a><p>{i.source} · {i.similarity === null ? t("monitoring.noScore") : `${i.similarity}%`} · {new Date(i.discoveredAt).toLocaleString(locale)}</p></li>)}</ul></>}</details>)}{remote.data && !remote.data.items.length && <p>{t("monitoring.noExecutions")}</p>}{remote.data && <Pagination page={remote.data.page} totalPages={remote.data.totalPages} onChange={setPage} />}</section>;
}
function RecordDetail({ id }: { id: string }) {
  const { t, locale } = useLanguage(), remote = useRemote<MonitoringRecord>(`${base}/${id}`), mutation = useWorkspaceMutation(remote.reload);
  const [name, setName] = useState<string | null>(null);
  const r = remote.data;
  return <><WorkspaceError error={remote.error} retry={remote.reload} /><WorkspaceError error={mutation.error} />{!r && !remote.error && <WorkspaceLoading />}{r && <><h1 className="break-all text-2xl font-semibold">{r.name}</h1>{r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noopener noreferrer"><img src={r.imageUrl} alt={r.sourceName} className="max-h-72 max-w-full rounded border object-contain" /></a>}{!r.sourceAvailable && <p>{t("monitoring.sourceUnavailable")}</p>}<p className="text-sm">{t("monitoring.createdAt")}: {new Date(r.createdAt).toLocaleString(locale)} · {r.lastScannedAt ? new Date(r.lastScannedAt).toLocaleString(locale) : t("monitoring.notScanned")}</p><div className="flex flex-wrap gap-3">{!r.archivedAt && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void mutation.run(() => workspaceRequest(`${base}/${id}`, "PATCH", { version: r.version, name: name ?? r.name })); }}><Input required maxLength={200} aria-label={t("monitoring.recordName")} value={name ?? r.name} onChange={e => setName(e.target.value)} /><Button disabled={mutation.pending}>{t("monitoring.renameRecord")}</Button></form>}<Button variant="outline" disabled={mutation.pending} onClick={() => void mutation.run(() => workspaceRequest(`${base}/${id}`, "PATCH", { version: r.version, archived: !r.archivedAt }))}>{t(r.archivedAt ? "monitoring.restoreRecord" : "monitoring.archiveRecord")}</Button><Button disabled={mutation.pending || !r.scanAvailable} onClick={() => void mutation.run(async () => { await workspaceRequest(`${base}/${id}/scans`, "POST", { outputLocale: locale, idempotencyKey: crypto.randomUUID() }); })}>{t("monitoring.start_scan")}</Button></div><p className="text-sm text-muted-foreground">{t("monitoring.retentionNotice")}</p><ScanHistory path={`${base}/${id}/scans`} /></>}</>;
}
export function MonitoringDetail() {
  const { t } = useLanguage(), { id } = useParams<{ id: string }>();
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><Link className="underline" href="/monitoring">{t("monitoring.back_to_list")}</Link><p className="rounded border p-3 text-sm">{t("monitoring.providerUnavailable")}</p>{id === "new" ? <><h1 className="text-2xl font-semibold">{t("monitoring.newRecord")}</h1><CreateRecord /></> : <RecordDetail key={id} id={id} />}</main>;
}
