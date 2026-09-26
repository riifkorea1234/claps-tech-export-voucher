"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/provider";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { criteriaDtoSchema, latestMatchesSchema, partnerDtoSchema, type LatestMatches, type CriteriaDto } from "@/lib/contracts/matching";
import { acceptedJobSchema } from "@/lib/contracts/jobs";
import { factorCodes } from "@/lib/contracts/matching-data";
import { PartnerCatalog } from "@/components/domain/partner-catalog";
type Sort = "overall" | typeof factorCodes[number];
export default function PartnersPage() {
  const { t, locale } = useLanguage(), language = locale;
  const [data, setData] = useState<LatestMatches | null>(null), [criteria, setCriteria] = useState<CriteriaDto | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const [sort, setSort] = useState<Sort>("overall"), [detailId, setDetailId] = useState<string | null>(null), [copied, setCopied] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const [matches, saved] = await Promise.all([apiRequest("/api/matches/latest", { schema: latestMatchesSchema, locale: language, signal: abort.signal }), apiRequest("/api/me/matching-criteria", { schema: criteriaDtoSchema, locale: language, signal: abort.signal })]);
        if (abort.signal.aborted) return;
        setData(matches.data); setCriteria(saved.data);
      } catch (e) {
        if (abort.signal.aborted) return;
        setError(e instanceof Error ? e.message : t("partners.failed"));
        // Do not retain private results after authentication or refresh failure.
        setData(null);
        if (e instanceof ApiClientError && [401, 403].includes(e.status)) return;
      }
      if (!abort.signal.aborted) timer = setTimeout(poll, 3000);
    }
    void poll(); return () => { abort.abort(); clearTimeout(timer); };
  }, [language, refresh, t]);
  const pending = busy || data?.attempt?.status === "queued" || data?.attempt?.status === "running";
  const items = [...(data?.result?.items ?? [])].sort((a, b) => {
    const value = (p: typeof a) => sort === "overall" ? p.score : p.factors.find(f => f.code === sort)?.score ?? -1;
    return value(b) - value(a) || b.score - a.score || a.partnerId.localeCompare(b.partnerId);
  });
  const hero = items[0], detail = items.find(p => p.partnerId === detailId);
  async function recommend() {
    if (!criteria?.revision || lock.current || pending) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await apiRequest("/api/matches", { method: "POST", locale: language, schema: acceptedJobSchema, body: JSON.stringify({ revision: criteria.revision, outputLocale: language, idempotencyKey: crypto.randomUUID() }) });
      const { data: latest } = await apiRequest("/api/matches/latest", { schema: latestMatchesSchema, locale: language });
      setData(latest); setRefresh(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : t("partners.failed")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function copyEmail(id: string) {
    setError("");
    try {
      const { data: p } = await apiRequest(`/api/partners/${id}`, { schema: partnerDtoSchema, locale: language });
      if (!p.contactEmail) throw new Error(t("partners.noContact"));
      try { await navigator.clipboard.writeText(p.contactEmail); setCopied(true); }
      catch { setError(t("partners.copyDenied")); }
    } catch (e) { setError(e instanceof Error ? e.message : t("partners.failed")); setDetailId(null); setRefresh(v => v + 1); }
  }
  function factors(item: NonNullable<LatestMatches['result']>['items'][number]) {
    return <div className="space-y-3">{item.factors.map(f => <div key={f.code}><div className="flex justify-between gap-3 text-sm"><span>{t(`partners.matchFactor.${f.code}`)}</span><strong>{f.score === null ? t("partners.notRated") : `${f.score}%`}</strong></div><div className="my-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-brand" style={{ width: `${f.score ?? 0}%` }} /></div><p className="text-xs text-muted-foreground">{f.score === null ? t("partners.noInput") : t("partners.tokenEvidence", { matched: f.matched.length, total: f.total })}{f.matched.length > 0 && ` · ${f.matched.join(", ")}`}</p></div>)}</div>;
  }
  return <div className="space-y-6 px-6 py-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">{t("partners.resultsTitle")}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("partners.rulesHelp")}</p></div><Button asChild variant="outline"><Link href="/partners/criteria">{t("partners.edit")}</Link></Button></header>
    {criteria && <section className="rounded-xl bg-muted p-4"><h2 className="mb-2 text-sm font-semibold">{t("partners.match_criteria")}</h2><p className="break-words text-sm">{[criteria.criteria.ipName, criteria.criteria.category, criteria.criteria.worldView, ...criteria.criteria.styles, criteria.criteria.licensee, ...criteria.criteria.industries].filter(Boolean).join(" · ") || t("partners.noCriteria")}</p></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button onClick={() => void recommend()} disabled={!criteria?.revision || pending} variant="outline"><RefreshCw className="mr-2 size-4" />{pending ? t("partners.running") : t("partners.match_again")}</Button><label className="flex items-center gap-2 text-sm">{t("partners.sortLabel")}<select aria-label={t("partners.sortLabel")} className="rounded border bg-card p-2" value={sort} onChange={e => setSort(e.target.value as Sort)}>{(["overall", ...factorCodes] as const).map(code => <option key={code} value={code}>{code === "overall" ? t("partners.sort.overall") : t(`partners.matchFactor.${code}`)}</option>)}</select></label></div>
    {pending && <p role="status" className="text-sm">{t("partners.previousKept")}</p>}
    {data?.attempt && ["failed", "canceled"].includes(data.attempt.status) && <p role="status" className="text-sm text-destructive">{t("partners.attemptFailed")}</p>}
    {data?.result && <p className="text-xs text-muted-foreground">{t("partners.resultMeta", { revision: data.result.revision, engine: data.result.engineVersion, language: data.result.outputLocale })}{criteria && criteria.revision !== data.result.revision && ` · ${t("partners.criteriaChanged")}`}</p>}
    {!data && !error && <p>{t("partners.loading")}</p>}
    {data && !hero && <p className="rounded-xl border p-6 text-muted-foreground">{data.result ? t("partners.noResults") : t("partners.startHelp")}</p>}
    {hero && <section data-testid="match-hero" className="rounded-2xl border bg-card p-6"><div className="mb-5 flex flex-wrap justify-between gap-4"><div><p className="text-xs text-muted-foreground">{t("partners.firstInSort")}</p><h2 className="mt-1 text-2xl font-semibold">{hero.partner.name}</h2><p className="mt-2 max-w-2xl text-sm">{hero.partner.description}</p></div><div className="text-right"><p className="text-xs">{t("partners.overall_match")}</p><strong className="text-3xl text-brand">{hero.score}%</strong></div></div><div className="grid gap-6 md:grid-cols-2">{hero.partner.imageCount > 0 && <Image src={`/api/partners/${hero.partnerId}/images/0`} alt={hero.partner.imageAlt} width={480} height={280} unoptimized className="max-h-64 w-full rounded-xl object-contain" />}<div>{factors(hero)}</div></div><Button className="mt-5" onClick={() => { setDetailId(hero.partnerId); setCopied(false); }}>{t("partners.ip_details")}</Button></section>}
    <div data-testid="match-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.slice(1).map((p, i) => <article key={p.partnerId} className="space-y-4 rounded-xl border bg-card p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold">#{i + 2} {p.partner.name}</h2><strong className="text-brand">{p.score}%</strong></div>{factors(p)}<Button variant="outline" onClick={() => { setDetailId(p.partnerId); setCopied(false); }}>{t("partners.ip_details")}</Button></article>)}</div>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetailId(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{detail?.partner.name}</DialogTitle><DialogDescription>{detail?.partner.description}</DialogDescription></DialogHeader>{detail && <><p className="text-sm">{detail.partner.marketDescription}</p>{detail.partner.fallbackUsed && <p className="text-xs">{t("admin.fallback")}: {detail.partner.resolvedLocale}</p>}{factors(detail)}<p className="text-sm">{t("partners.collaboration_email")}: <span className="break-all">{detail.partner.contactEmail ?? t("partners.noContact")}</span></p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={!detail.partner.contactEmail} onClick={() => void copyEmail(detail.partnerId)}>{copied ? t("partners.copied") : t("partners.copy")}</Button></>}</DialogContent></Dialog>
    <PartnerCatalog />
  </div>;
}
