"use client";
import { ScanHistory } from "@/components/domain/monitoring-workspace";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Content } from "@/lib/server/localized-contents/service";
type Row = {
    id?: string;
    code?: string;
    version?: number;
    name?: string;
    status?: string;
    visibility?: string;
    [key: string]: unknown;
};
type Result = {
    items?: Row[];
    totalPages?: number;
    total?: number;
    [key: string]: unknown;
};
const menus = ["overview", "users", "projects", "partners", "guides", "jobs", "monitoring"];
const endpoint = (section: string) => section === "monitoring" ? "monitoring-records" : section;
export function AdminConsole({ section, id }: {
    section: string;
    id?: string;
}) {
    const { t, locale } = useLanguage(), router = useRouter();
    const [tab, setTab] = useState("overview"), [query, setQuery] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
    const [status, setStatus] = useState(""), [kind, setKind] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
    const [result, setResult] = useState<Result | null>(null), [detail, setDetail] = useState<Row | null>(null), [reauth, setReauth] = useState(false), [password, setPassword] = useState("");
    const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
    const active = section === "overview" ? tab : endpoint(section);
    const localeRef = useRef(locale);
    useEffect(() => { localeRef.current = locale; }, [locale]);
    const request = useCallback(async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
        const response = await apiRequest(`/api/admin/${path}`, { schema: z.unknown(), locale: localeRef.current, method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        return response.data as T;
    }, []);
    const failed = useCallback((e: unknown) => {
        if (e instanceof ApiClientError && e.code === "ADMIN_REAUTH_REQUIRED")
            setReauth(true);
        setError(e instanceof ApiClientError ? e.message : "INTERNAL_ERROR");
    }, []);
    useEffect(() => {
        let alive = true;
        const params = new URLSearchParams({ q: search, page: String(page) });
        if (status)
            params.set("status", status);
        if (kind)
            params.set("kind", kind);
        if (from)
            params.set("from", new Date(from).toISOString());
        if (to)
            params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
        const path = id && id !== "new" ? `${active}/${id}` : `${active}?${params}`;
        if (id === "new")
            return;
        request<Result & Row>(path).then(data => { if (alive) {
            if (id)
                setDetail(data);
            else
                setResult(data);
            setError("");
            setReauth(false);
        } }).catch(e => { if (alive)
            failed(e); });
        return () => { alive = false; };
    }, [active, id, search, page, status, kind, from, to, reload, request, failed]);
    async function act(fn: () => Promise<unknown>) {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await fn();
            setNotice(t("admin.saved"));
            setReload(v => v + 1);
        }
        catch (e) {
            failed(e);
        }
        finally {
            setBusy(false);
        }
    }
    const rowLabel = (row: Row) => row.name ?? row.code ?? String(row.action ?? row.kind ?? row.id ?? "");
    return <div className="min-h-screen bg-muted/20">
    <header className="flex items-center justify-between gap-4 border-b bg-background px-5 py-4"><Link href="/admin" className="font-semibold">CLAPS · {t("admin.title")}</Link><div className="flex items-center gap-3"><Link href="/projects" className="text-sm underline">{t("admin.backApp")}</Link><LanguageSwitcher /></div></header>
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
      <nav aria-label={t("admin.menu")} className="flex shrink-0 gap-1 overflow-x-auto border-b p-3 md:w-48 md:flex-col md:border-b-0 md:border-r">
        {menus.map(menu => <Link key={menu} href={menu === "overview" ? "/admin" : `/admin/${menu}`} aria-current={section === menu ? "page" : undefined} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${section === menu ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t(`admin.${menu}`)}</Link>)}
      </nav>
      <main className="min-w-0 flex-1 space-y-5 p-5 md:p-8">
        <h1 className="text-2xl font-semibold">{t(`admin.${section}`)}</h1>
        {error && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{error === "INTERNAL_ERROR" ? t("admin.error") : error}</p>}
        {notice && <p role="status">{notice}</p>}
        {reauth ? <form className="max-w-md space-y-4 rounded-xl border bg-background p-6" onSubmit={e => { e.preventDefault(); void act(async () => { await request("reauthenticate", "POST", { password }); setPassword(""); setReauth(false); }); }}>
          <h2 className="text-lg font-medium">{t("admin.reauth")}</h2><p className="text-sm text-muted-foreground">{t("admin.reauthHelp")}</p><label className="block space-y-2"><span>{t("admin.password")}</span><Input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label><Button disabled={busy}>{t("admin.confirm")}</Button>
        </form> : <>
          {section === "overview" && <div role="tablist" className="flex flex-wrap gap-2">{["overview", "audit-logs", "locales"].map(item => <Button key={item} role="tab" aria-selected={tab === item} variant={tab === item ? "default" : "outline"} onClick={() => { setTab(item); setPage(1); setResult(null); }}>{t(`admin.${item}`)}</Button>)}</div>}
          {["guides"].includes(section) && <p className="rounded-md border bg-background p-3 text-sm">{t(`admin.${section}Later`)}</p>}
          {!id && active === "overview" && result && <><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{["users", "projects", "queued", "failed", "cleanup"].map(key => <div key={key} className="rounded-xl border bg-background p-4"><p className="text-sm text-muted-foreground">{t(`admin.${key}`)}</p><p className="mt-2 text-3xl font-semibold">{String(result[key] ?? 0)}</p></div>)}</div><h2>{t("admin.usage")}</h2><div className="overflow-auto rounded border bg-background"><table className="w-full text-sm"><thead><tr>{["date", "kind", "status", "requests"].map(k => <th className="p-3 text-left" key={k}>{t(`admin.${k}`)}</th>)}</tr></thead><tbody>{(result.usage as {
            usage_date: string;
            kind: string;
            status: string;
            requests: number;
        }[] ?? []).map((r, i) => <tr key={i}><td className="p-3">{new Date(r.usage_date).toLocaleDateString(locale)}</td><td className="p-3">{t(`common.jobs.kind.${r.kind}`)}</td><td className="p-3">{t(`common.jobs.status.${r.status}`)}</td><td className="p-3">{r.requests}</td></tr>)}</tbody></table></div></>}
          {!id && active !== "overview" && <>
            {active !== "locales" && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }}><Input className="max-w-sm" aria-label={t("admin.search")} value={query} onChange={e => setQuery(e.target.value)}/><Button>{t("admin.search")}</Button><Button type="button" variant="outline" onClick={() => setReload(v => v + 1)}>{t("admin.refresh")}</Button></form>}
            {active === "jobs" && <div className="flex flex-wrap gap-3"><label>{t("admin.status")}<select className="block rounded border p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{t("admin.all")}</option>{["queued", "running", "succeeded", "failed", "canceled"].map(v => <option key={v} value={v}>{t(`common.jobs.status.${v}`)}</option>)}</select></label><label>{t("admin.kind")}<select className="block rounded border p-2" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">{t("admin.all")}</option>{["generation", "guide_extraction", "verification", "matching", "monitoring", "export"].map(v => <option key={v} value={v}>{t(`common.jobs.kind.${v}`)}</option>)}</select></label><label>{t("admin.from")}<Input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>{t("admin.to")}<Input type="date" value={to} onChange={e => setTo(e.target.value)}/></label></div>}
            {active === "partners" && <Button asChild><Link href="/admin/partners/new">{t("admin.create")}</Link></Button>}
            {active === "locales" && <LocaleEditor rows={result?.items ?? []} request={request} act={act} busy={busy}/>}
            {result?.items && <div className="overflow-x-auto rounded-lg border bg-background"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">{t("admin.name")}</th><th className="p-3">{t("admin.status")}</th><th className="p-3">{t("admin.details")}</th></tr></thead><tbody>{result.items.map(row => <tr className="border-b last:border-0" key={row.id ?? row.code}><td className="max-w-64 break-words p-3">{rowLabel(row)}</td><td className="p-3">{(row.status || row.visibility) ? t(`admin.value.${row.status ?? row.visibility}`) : String((row.deployed !== undefined ? `${t(row.deployed ? "admin.deployed" : "admin.notDeployed")} / ${t(row.enabled ? "admin.enabled" : "admin.disabled")}` : row.entity_type ?? ""))}</td><td className="p-3">{active === "audit-logs" ? <details><summary>{t("admin.details")}</summary><pre className="max-w-md overflow-auto text-xs">{JSON.stringify(row, null, 2)}</pre></details> : active === "locales" ? <span>{t("admin.missing")}: {String(row.missing)}</span> : <Link className="underline" href={`/admin/${section}/${row.id}`}>{t("admin.open")}</Link>}</td></tr>)}</tbody></table>{result.items.length === 0 && <p className="p-6">{t("admin.empty")}</p>}</div>}
            {active !== "locales" && <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>{t("admin.previous")}</Button><span>{page} / {Math.max(1, result?.totalPages ?? 1)}</span><Button variant="outline" disabled={page >= (result?.totalPages ?? 1)} onClick={() => setPage(v => v + 1)}>{t("admin.next")}</Button></div>}
          </>}
          {id && <><Link className="underline" href={`/admin/${section}`}>{t("admin.backList")}</Link>{(detail || id === "new") && <ResourceEditor key={`${section}/${id}`} section={section} id={id} row={detail} request={request} act={act} busy={busy} onCreated={key => router.push(`/admin/${section}/${key}`)}/>}</>}
        </>}
      </main>
    </div>
  </div>;
}
type RequestFn = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Act = (fn: () => Promise<unknown>) => Promise<void>;
function Field({ name, value, change, multiline = false, required = false }: {
    name: string;
    value: string;
    change: (value: string) => void;
    multiline?: boolean;
    required?: boolean;
}) {
    const { t } = useLanguage();
    return <label className="block space-y-1 text-sm"><span>{t(`admin.${name}`)}</span>{multiline ? <Textarea required={required} value={value} onChange={e => change(e.target.value)} rows={4}/> : <Input required={required} value={value} onChange={e => change(e.target.value)}/>}</label>;
}
function ResourceEditor({ section, id, row, request, act, busy, onCreated }: {
    section: string;
    id: string;
    row: Row | null;
    request: RequestFn;
    act: Act;
    busy: boolean;
    onCreated: (key: string) => void;
}) {
    const { t, locale } = useLanguage();
    const profile = row?.profile as {
        description: string;
        tags: string[];
        ipNames: string[];
        marketDescription?: string;
        imageAlt?: string;
    } | undefined;
    const [name, setName] = useState(row?.name ?? ""), [description, setDescription] = useState(String(profile?.description ?? row?.description ?? "")), [ipName, setIpName] = useState(String(row?.ip_name ?? ""));
    const [email, setEmail] = useState(String(row?.contact_email ?? "")), [tags, setTags] = useState(profile?.tags.join(", ") ?? ""), [ipNames, setIpNames] = useState(profile?.ipNames.join(", ") ?? "");
    const [marketDescription, setMarketDescription] = useState(profile?.marketDescription ?? ""), [imageAlt, setImageAlt] = useState(profile?.imageAlt ?? "");
    const [visibility, setVisibility] = useState(row?.visibility ?? "private"), [archived, setArchived] = useState(!!row?.archived_at), [reason, setReason] = useState("");
    const [editVersion, setEditVersion] = useState(row?.version);
    const version = ["users", "jobs", "monitoring"].includes(section) ? row?.version : editVersion;
    const editable = ["projects", "partners"].includes(section);
    async function submit() {
        const data = section === "partners" ? { name, description, marketDescription, imageAlt, contactEmail: email || null, tags: tags.split(",").map(s => s.trim()).filter(Boolean), ipNames: ipNames.split(",").map(s => s.trim()).filter(Boolean), visibility, reason } : { name, ipName, description, archived, reason };
        const saved = await request<{
            id: string;
            version: number;
        }>(`${section}${id === "new" ? "" : `/${id}`}`, id === "new" ? "POST" : "PATCH", { ...data, ...(id === "new" ? {} : { version }) });
        setEditVersion(saved.version);
        if (id === "new")
            onCreated(saved.id);
    }
    return <div className="space-y-6">
    {row && <details className="rounded border bg-background p-3"><summary>{t("admin.details")}</summary><RecordView row={row}/></details>}
    <form className="max-w-2xl space-y-4 rounded-xl border bg-background p-5" onSubmit={e => { e.preventDefault(); void act(submit); }}>
      {editable && <><Field name="name" value={name} change={setName} required/><Field name="description" value={description} change={setDescription} multiline/>{section === "projects" ? <><Field name="ipName" value={ipName} change={setIpName} required/><label className="flex gap-2"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}/>{t("admin.archived")}</label></> : <><Field name="marketDescription" value={marketDescription} change={setMarketDescription} multiline/><Field name="imageAlt" value={imageAlt} change={setImageAlt}/><Field name="contactEmail" value={email} change={setEmail}/><Field name="tags" value={tags} change={setTags}/><Field name="ipNames" value={ipNames} change={setIpNames}/><label className="block">{t("admin.visibility")}<select aria-label={t("admin.visibility")} className="ml-3 rounded border p-2" value={visibility} onChange={e => setVisibility(e.target.value)}>{["private", "public"].map(v => <option value={v} key={v}>{t(`admin.${v}`)}</option>)}</select></label></>}</>}
      {["projects", "partners", "users", "jobs", "monitoring"].includes(section) && <Field name="reason" value={reason} change={setReason} required/>}
      {editable && <Button disabled={busy}>{t("admin.save")}</Button>}
      {section === "users" && [row?.status === "suspended" ? "restore" : "suspend", "revoke"].map(action => <Button className="mr-2" type="button" disabled={busy || !reason.trim()} key={action} onClick={() => void act(() => request(`users/${id}`, "PATCH", { version, action, reason }))}>{t(`admin.${action}`)}</Button>)}
      {section === "jobs" && ["retry", "cancel"].map(action => <Button className="mr-2" type="button" disabled={busy || !reason.trim()} key={action} onClick={() => void act(() => request(`jobs/${id}`, "POST", { action, reason }))}>{t(`admin.${action}`)}</Button>)}
      {section === "monitoring" && <><p>{t("monitoring.providerUnavailable")}</p>{[row?.archived_at ? "restore" : "archive", "scan"].map(action => <Button className="mr-2" type="button" key={action} disabled={busy || !reason.trim() || (action === "scan" && !(row?.record as { scanAvailable?: boolean })?.scanAvailable)} onClick={() => void act(() => request(`monitoring-records/${id}`, "POST", { version, action, reason, outputLocale: locale, ...(action === "scan" ? { idempotencyKey: crypto.randomUUID() } : {}) }))}>{t(action === "scan" ? "monitoring.start_scan" : action === "restore" ? "monitoring.restoreRecord" : "monitoring.archiveRecord")}</Button>)}</>}
      {section === "jobs" && <p className="text-sm text-muted-foreground">{t("admin.retryHelp")}</p>}
    </form>
    {section === "monitoring" && <ScanHistory path={`/api/admin/monitoring-records/${id}/scans`} />}
    {section === "partners" && id !== "new" && <section className="space-y-3 rounded border p-4"><h2>{t("admin.images")}</h2><label className="block">{t("admin.uploadImage")}<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !reason.trim()} onChange={e => { const file = e.target.files?.[0]; if (file)
        void act(async () => { const query = new URLSearchParams({ version: String(editVersion), reason, name: file.name }); const response = await apiRequest(`/api/admin/partners/${id}/images?${query}`, { schema: z.object({ version: z.number() }), locale: locale, method: "POST", headers: { "Content-Type": file.type }, body: file }); setEditVersion(response.data.version); }); }}/></label><div className="flex flex-wrap gap-3">{Array.from({ length: Number((row?.profile as {
            imageCount?: number;
        })?.imageCount ?? 0) }, (_, index) => <Image unoptimized width={96} height={96} key={index} className="h-24 w-24 rounded object-contain" src={`/api/partners/${id}/images/${index}?admin=1`} alt={name}/>)}</div></section>}
    {row && ["projects", "users"].includes(section) && ["projects", "jobs", "guides"].map(key => Array.isArray(row[key]) && <div key={key} className="space-y-2"><h2>{t(`admin.${key}`)}</h2>{(row[key] as Row[]).map(item => <Link className="mr-3 inline-block underline" key={item.id} href={`/admin/${key}/${item.id}`}>{item.name ?? item.id}</Link>)}</div>)}
    {section === "projects" && row && ["sessions", "assets"].map(key => <section key={key} className="space-y-2"><h2>{t(`admin.${key}`)}</h2><div className="overflow-auto rounded border"><table className="w-full text-left text-sm"><tbody>{((row[key] as {
        id: string;
        title?: string;
        adopted?: boolean;
        finalized_at?: string;
        verification?: {
            verdict: string;
        };
    }[]) ?? []).map(item => <tr key={item.id} className="border-b"><td className="p-3">{item.title ?? item.id}</td><td className="p-3">{key === "assets" && (item.finalized_at ? t("admin.finalized") : item.adopted ? t("admin.adopted") : t("admin.generated"))}</td><td className="p-3">{item.verification?.verdict ?? ""}</td></tr>)}</tbody></table></div></section>)}
    {section === "jobs" && !!row?.usage && <p>{t("admin.usageUnits")}: {String((row.usage as {
        units: number;
    }).units)} {String((row.usage as {
        unit: string;
    }).unit)}</p>}
    {id !== "new" && ["partners", "guides"].includes(section) && <TranslationEditor type={section === "partners" ? "partner" : "guide"} id={id} request={request} act={act} busy={busy}/>}
  </div>;
}
function LocaleEditor({ rows, request, act, busy }: {
    rows: Row[];
    request: RequestFn;
    act: Act;
    busy: boolean;
}) {
    const { t } = useLanguage();
    const [selected, setSelected] = useState(""), [code, setCode] = useState(""), [nativeName, setNativeName] = useState(""), [displayName, setDisplayName] = useState(""), [direction, setDirection] = useState("ltr"), [fallbackCode, setFallback] = useState("ko"), [enabled, setEnabled] = useState(false), [order, setOrder] = useState(0), [reason, setReason] = useState("");
    const [version, setVersion] = useState<number | undefined>();
    function select(value: string) {
        setSelected(value);
        const row = rows.find(r => r.code === value);
        setCode(value);
        setNativeName(String(row?.native_name ?? ""));
        setDisplayName(String(row?.display_name ?? ""));
        setDirection(String(row?.direction ?? "ltr"));
        setFallback(String(row?.fallback_code ?? (value === "ko" ? "" : "ko")));
        setEnabled(!!row?.enabled);
        setOrder(Number(row?.sort_order ?? 0));
        setVersion(row?.version);
    }
    return <details className="rounded border bg-background p-4"><summary>{t("admin.localeEdit")}</summary><form className="mt-4 max-w-lg space-y-3" onSubmit={e => { e.preventDefault(); void act(async () => { const r = await request<{
        version: number;
    }>(`locales${selected ? `/${selected}` : ""}`, selected ? "PATCH" : "POST", { nativeName, displayName, direction, fallbackCode: fallbackCode || null, enabled, sortOrder: order, reason, ...(selected ? { version } : { code }) }); setVersion(r.version); if (!selected)
        setSelected(code); }); }}>
    <label>{t("admin.localeEdit")}<select className="ml-2 rounded border p-2" value={selected} onChange={e => select(e.target.value)}><option value="">{t("admin.create")}</option>{rows.map(r => <option key={r.code} value={r.code}>{r.code}</option>)}</select></label>
    {!selected && <Field name="code" value={code} change={setCode} required/>}<Field name="nativeName" value={nativeName} change={setNativeName} required/><Field name="displayName" value={displayName} change={setDisplayName} required/><Field name="fallback" value={fallbackCode} change={setFallback}/><label>{t("admin.direction")}<select className="ml-2 rounded border p-2" value={direction} onChange={e => setDirection(e.target.value)}><option value="ltr">{t("admin.ltr")}</option><option value="rtl">{t("admin.rtl")}</option></select></label><label className="block">{t("admin.order")}<Input type="number" min={0} max={10000} value={order} onChange={e => setOrder(Number(e.target.value))}/></label><label className="flex gap-2"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}/>{t("admin.enabled")}</label><Field name="reason" value={reason} change={setReason} required/><Button disabled={busy}>{t("admin.save")}</Button>
  </form></details>;
}
type Translation = {
    resourceType: "partner" | "guide";
    resourceKey: string;
    locale: string;
    original: Content;
    draft: Content;
    published: Content | null;
    version: number;
    sourceRevision: number;
    needsUpdate: boolean;
};
function TranslationEditor({ type, id, request, act, busy }: {
    type: "partner" | "guide";
    id: string;
    request: RequestFn;
    act: Act;
    busy: boolean;
}) {
    const { t } = useLanguage();
    const [language, setLanguage] = useState("en"), [locales, setLocales] = useState<Row[]>([]), [row, setRow] = useState<Translation | null>(null), [content, setContent] = useState<Content | null>(null), [reason, setReason] = useState(""), [json, setJson] = useState(""), [preview, setPreview] = useState<unknown>(null), [previewText, setPreviewText] = useState("");
    const [error, setError] = useState("");
    const path = `localized-contents/${type}/${id}/${language}`;
    useEffect(() => {
        let alive = true;
        Promise.all([request<{
                items: Row[];
            }>("locales"), request<Translation>(path)]).then(([list, data]) => { if (alive) {
            setLocales(list.items);
            setRow(data);
            setContent(data.draft);
            setError("");
        } }).catch(e => { if (alive)
            setError(e instanceof ApiClientError ? e.message : ""); });
        return () => { alive = false; };
    }, [path, request]);
    const entry = () => ({ resourceType: type, resourceKey: id, locale: language, version: row!.version, sourceRevision: row!.sourceRevision, content });
    async function refresh() { const next = await request<Translation>(path); setRow(next); setContent(next.draft); }
    async function save() { await request("localized-contents/import", "POST", { schemaVersion: 1, entries: [entry()], reason }); await refresh(); }
    async function download() {
        const data = await request(`${path}/export`), blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = `${type}-${id}-${language}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    function parsedImport() { const data = JSON.parse(json); return { ...data, reason }; }
    return <section className="space-y-4 rounded-xl border bg-background p-5" aria-label={t("admin.translations")}>
    <h2 className="text-lg font-semibold">{t("admin.translations")}</h2><p className="text-sm text-muted-foreground">{t("admin.translationHelp")}</p>
    <label>{t("admin.contentLanguage")}<select aria-label={t("admin.contentLanguage")} className="ml-3 rounded border p-2" value={language} onChange={e => { setLanguage(e.target.value); setRow(null); setPreview(null); }}>{locales.map(l => <option key={l.code} value={l.code}>{String(l.native_name)} ({l.code})</option>)}</select></label>
    {error && <p role="alert">{error === "INTERNAL_ERROR" ? t("admin.error") : error}</p>}
    {row && content && <>
      {row.needsUpdate && <p role="status" className="text-amber-700">{t("admin.needsUpdate")}</p>}
      <div className="grid gap-5 lg:grid-cols-2"><div><h3>{t("admin.original")}</h3><ContentView content={row.original}/></div><div className="space-y-3"><h3>{t("admin.draft")}</h3>{content.resourceType === "partner" ? <><Field name="name" value={content.name} change={name => setContent({ ...content, name })}/><Field name="description" value={content.description} change={description => setContent({ ...content, description })} multiline/><Field name="ipNames" value={content.ipNames?.join(", ") ?? ""} change={value => setContent({ ...content, ipNames: value.split(",").map(s => s.trim()).filter(Boolean) })}/><Field name="marketDescription" value={content.marketDescription ?? ""} change={marketDescription => setContent({ ...content, marketDescription })} multiline/><Field name="imageAlt" value={content.imageAlt ?? ""} change={imageAlt => setContent({ ...content, imageAlt })}/></> : content.rules.map((rule, index) => <div key={rule.ruleId}><Field name="name" value={rule.title} change={title => setContent({ ...content, rules: content.rules.map((r, i) => i === index ? { ...r, title } : r) })}/><Field name="description" value={rule.description} change={description => setContent({ ...content, rules: content.rules.map((r, i) => i === index ? { ...r, description } : r) })} multiline/></div>)}</div></div>
      <details><summary>{t("admin.published")}</summary>{row.published ? <ContentView content={row.published}/> : <p>{t("admin.notPublished")}</p>}</details>
      <Field name="reason" value={reason} change={setReason} required/>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !reason.trim() || language === "ko"} onClick={() => void act(save)}>{t("admin.saveDraft")}</Button><Button disabled={busy || !reason.trim() || language === "ko" || JSON.stringify(content) !== JSON.stringify(row.draft)} onClick={() => void act(async () => { await request("localized-contents/publish", "POST", { ...entry(), reason }); await refresh(); })}>{t("admin.publish")}</Button><Button variant="outline" disabled={busy} onClick={() => void act(download)}>{t("admin.export")}</Button></div>
      {language === "ko" && <p>{t("admin.editOriginal")}</p>}
      <details className="space-y-3"><summary>{t("admin.import")}</summary><label className="mt-3 block">{t("admin.jsonFile")}<Input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (file)
            void act(async () => { if (file.size > 65536)
                throw new Error("Size"); setJson(await file.text()); setPreview(null); }); }}/></label><label className="block">{t("admin.jsonInput")}<Textarea rows={8} value={json} onChange={e => { setJson(e.target.value); setPreview(null); }}/></label><div className="flex gap-2"><Button variant="outline" disabled={busy || !reason.trim() || !json} onClick={() => void act(async () => { setPreview(await request("localized-contents/import-preview", "POST", parsedImport())); setPreviewText(json); })}>{t("admin.preview")}</Button><Button disabled={busy || !preview || previewText !== json || !reason.trim()} onClick={() => void act(async () => { await request("localized-contents/import", "POST", parsedImport()); setPreview(null); await refresh(); })}>{t("admin.import")}</Button></div>{!!preview && <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(preview, null, 2)}</pre>}</details>
    </>}
  </section>;
}
function ContentView({ content }: {
    content: Content;
}) {
    return <div className="space-y-2 whitespace-pre-wrap break-words rounded bg-muted p-3 text-sm">{content.resourceType === "partner" ? <><p className="font-medium">{content.name}</p><p>{content.description}</p><p>{content.ipNames?.join(" · ")}</p><p>{content.marketDescription}</p><p>{content.imageAlt}</p></> : content.rules.map(rule => <div key={rule.ruleId}><p className="font-medium">{rule.title}</p><p>{rule.description}</p></div>)}</div>;
}
function RecordView({ row }: {
    row: Row;
}) {
    const { t } = useLanguage();
    return <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(row).filter(([, v]) => v === null || typeof v !== "object").map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-muted-foreground">{t(`admin.field.${key}`)}</dt><dd className="break-words">{value === null ? "—" : ["status", "visibility", "app_role", "cost_state"].includes(key) ? t(`admin.value.${value}`) : String(value)}</dd></div>)}</dl>;
}
