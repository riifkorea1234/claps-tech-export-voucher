"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/provider";
import { apiRequest } from "@/lib/api/client";
import { criteriaDtoSchema, matchingCriteriaSchema, type CriteriaDto, type MatchingCriteria } from "@/lib/contracts/matching";
import { acceptedJobSchema } from "@/lib/contracts/jobs";
const inputClass = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";
export default function PartnersCriteriaPage() {
  const t = useT(), { locale } = useLanguage(), router = useRouter(), lock = useRef(false);
  const [data, setData] = useState<CriteriaDto | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [chips, setChips] = useState({ styles: "", industries: "" });
  const language = locale;
  useEffect(() => {
    const abort = new AbortController();
    apiRequest("/api/me/matching-criteria", { schema: criteriaDtoSchema, signal: abort.signal }).then(r => setData(r.data)).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  function change(key: keyof MatchingCriteria, value: string | string[]) { setData(d => d && ({ ...d, criteria: { ...d.criteria, [key]: value } })); }
  function addChip(key: "styles" | "industries") {
    const value = chips[key].trim();
    if (!data || !value || data.criteria[key].some(v => v.toLowerCase() === value.toLowerCase()) || data.criteria[key].length >= 20) return;
    change(key, [...data.criteria[key], value]); setChips(s => ({ ...s, [key]: "" }));
  }
  async function upload(file?: File) {
    if (!file || !data || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (file.size > 10 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error(t("partners.imageLimit"));
      const { data: ticket } = await apiRequest("/api/me/matching-images", { method: "POST", locale: language, schema: z.object({ referenceId: z.string(), uploadUrl: z.string() }), body: JSON.stringify({ name: file.name, mime: file.type, size: file.size }) });
      await apiRequest(ticket.uploadUrl, { method: "PUT", locale: language, schema: z.object({ ticket: z.string() }), headers: { "Content-Type": file.type }, body: file });
      setData(d => d && ({ ...d, references: [...d.references, { id: ticket.referenceId, name: file.name, url: `/api/me/matching-images/${ticket.referenceId}` }] }));
    } catch (e) { setError(e instanceof z.ZodError ? t("partners.invalidCriteria") : e instanceof Error ? e.message : t("partners.failed")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save() {
    if (!data || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const criteria = matchingCriteriaSchema.parse({ ...data.criteria, ...Object.fromEntries((["styles", "industries"] as const).map(key => [key, [...new Set([...data.criteria[key], ...(chips[key].trim() ? [chips[key].trim()] : [])])]])) });
      const { data: saved } = await apiRequest("/api/me/matching-criteria", { method: "PUT", locale: language, schema: criteriaDtoSchema, body: JSON.stringify({ revision: data.revision, criteria, referenceIds: data.references.map(r => r.id) }) });
      setData(saved); setChips({ styles: "", industries: "" });
      await apiRequest("/api/matches", { method: "POST", locale: language, schema: acceptedJobSchema, body: JSON.stringify({ revision: saved.revision, outputLocale: language, idempotencyKey: crypto.randomUUID() }) });
      router.push("/partners");
    } catch (e) { setError(e instanceof z.ZodError ? t("partners.invalidCriteria") : e instanceof Error ? e.message : t("partners.failed")); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="px-6 py-10"><form onSubmit={e => { e.preventDefault(); void save(); }} className="mx-auto max-w-[800px] rounded-2xl border bg-card">
    <header className="rounded-t-2xl bg-primary p-6 text-primary-foreground"><h1 className="text-xl font-semibold">{t("partners.matching_criteria")}</h1><p className="mt-2 text-sm">{t("partners.rulesHelp")}</p></header>
    {error && <p role="alert" className="p-6 text-destructive">{error} <Link href="/partners">{t("partners.viewResults")}</Link></p>}
    {!data ? <p className="p-6">{t("partners.loading")}</p> : <fieldset disabled={busy} className="flex flex-col gap-5 p-6">
      <div><p className="text-sm font-medium">{t("partners.ip_reference_image")}</p><p className="my-2 text-xs text-muted-foreground">{t("partners.imageLimit")}</p><div className="flex flex-wrap gap-3">{data.references.map(r => <div key={r.id} className="w-28"><Image src={r.url} alt={r.name} width={112} height={112} unoptimized className="h-28 rounded-lg object-cover" /><button type="button" className="text-xs underline" onClick={() => setData(d => d && ({ ...d, references: d.references.filter(x => x.id !== r.id) }))}>{t("partners.remove")}: {r.name}</button></div>)}</div><label className="mt-3 block text-sm">{t("partners.upload_image")}<input aria-label={t("partners.upload_image")} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || data.references.length >= 3} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} className="mt-2 block w-full text-sm" /></label></div>
      {([['ipName', 'ip_name_e_g_hello_kitty'], ['category', 'category_e_g_character'], ['worldView', 'world_attributes'], ['licensee', 'licensee_attributes_your_company'], ['revenue', 'annual_revenue_e_g_krw_5_billion'], ['collaborationHistory', 'collaboration_history']] as const).map(([key, label]) => <label key={key} className="flex flex-col gap-2 text-sm font-medium">{t(`partners.${label}`)}<input className={inputClass} value={data.criteria[key]} maxLength={500} onChange={e => change(key, e.target.value)} /></label>)}
      {([['styles', 'styleTags'], ['industries', 'industry_and_revenue']] as const).map(([key, label]) => <div key={key}><label className="text-sm font-medium" htmlFor={key}>{t(`partners.${label}`)}</label><div className="my-2 flex flex-wrap gap-2">{data.criteria[key].map(chip => <button type="button" key={chip} aria-label={`${t("partners.remove")} ${chip}`} className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => change(key, data.criteria[key].filter(x => x !== chip))}>{chip} ×</button>)}</div><div className="flex gap-2"><input id={key} className={inputClass} value={chips[key]} maxLength={80} onChange={e => setChips(s => ({ ...s, [key]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip(key); } }} /><Button type="button" variant="outline" onClick={() => addChip(key)}>{t("partners.add")}</Button></div></div>)}
      <p className="text-xs text-muted-foreground">{t("partners.unscoredHelp")}</p>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-5"><Button variant="outline" asChild><Link href="/partners">{t("partners.cancel")}</Link></Button><Button type="submit">{busy ? t("partners.loading") : t("partners.save_and_view_matches")}</Button></div>
    </fieldset>}
  </form></div>;
}
