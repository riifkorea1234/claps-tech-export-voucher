"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleDashed } from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n/provider";
import { createTranslator, type Messages } from "@/lib/i18n/core";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { automaticKeys, manualKeys, reviewIssue, checkSchema, readinessSchema, snapshotSchema, type ReviewReadiness, type ReviewSnapshot } from "@/lib/contracts/review";
import { Button } from "@/components/ui/button";
export default function Content({ sessionId, initial, initialSnapshot, japanese }: { sessionId: string; initial: ReviewReadiness; initialSnapshot: ReviewSnapshot | null; japanese: Messages }) {
  const { locale } = useLanguage();
  const t = useT(), jt = createTranslator(japanese, "ja"), [current, setCurrent] = useState(initial), [snapshot, setSnapshot] = useState(initialSnapshot), [pending, setPending] = useState(false), [error, setError] = useState(""), [retry, setRetry] = useState(false), [lookup, setLookup] = useState("");
  const busy = useRef(false), attempt = useRef<{ version: number; targetHash: string; idempotencyKey: string } | null>(null);
  const storageKey = `claps-review-attempt:${sessionId}`;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) { const parsed = reviewIssue.safeParse(JSON.parse(saved)); if (parsed.success) { attempt.current = parsed.data; setRetry(true); } else sessionStorage.removeItem(storageKey); }
      } catch { /* Browser storage may be unavailable; mounted retry still retains its payload. */ }
    });
    return () => { active = false; };
  }, [storageKey]);
  function clearAttempt() { attempt.current = null; setRetry(false); try { sessionStorage.removeItem(storageKey); } catch {} }
  const path = `/api/asset-sessions/${sessionId}`;
  async function reload() { const r = (await apiRequest(path + "/review-package", { schema: readinessSchema })).data; setCurrent(r); return r; }
  async function action(run: () => Promise<void>) { if (busy.current) return; busy.current = true; setPending(true); setError(""); try { await run(); } catch (e) { setError(e instanceof Error ? e.message : t("common.jobs.loadError")); await reload().catch(() => {}); } finally { busy.current = false; setPending(false); } }
  function toggle(key: typeof manualKeys[number], value: boolean) { void action(async () => {
    await apiRequest(path + "/review-checks", { method: "PATCH", schema: checkSchema, body: JSON.stringify({ version: current.checks.version, targetHash: current.targetHash, manual: { ...(current.checks.stale ? { copyrightNotice: false, thirdPartyAssets: false, recipientConfirmed: false } : current.checks.manual), [key]: value } }) });
    await reload();
  }); }
  function issue() { void action(async () => {
    // Preserve the exact payload across an ambiguous response and readiness reload.
    // A consumed version or another tab's newer basis does not prove this attempt failed.
    if (!attempt.current) attempt.current = { version: current.checks.version, targetHash: current.targetHash, idempotencyKey: crypto.randomUUID() };
    setRetry(true);
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt.current)); } catch {}
    try {
      const receipt = (await apiRequest(path + "/review-package", { method: "POST", schema: snapshotSchema, body: JSON.stringify(attempt.current) })).data;
      setSnapshot(receipt); clearAttempt();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) { clearAttempt(); }
      throw e;
    }
    await reload();
  }); }
  const formatTime = (at: string, language: string) => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(at)) + " UTC";
  async function openSnapshot(id: string) {
    const receipt = (await apiRequest(path + `/review-package/snapshots/${encodeURIComponent(id)}`, { schema: snapshotSchema })).data;
    setSnapshot(receipt);
    const selected = new URL(window.location.href); selected.searchParams.set("snapshot", id); window.history.replaceState(null, "", selected);
  }
  return <main className="review-package min-w-0 space-y-6 p-6">
    <div className="review-controls space-y-4"><Link className="underline" href={`/assets/${sessionId}/final`}>{t("review.back")}</Link><h1 className="text-2xl font-semibold">{t("review.title")}</h1><p>{t("review.outputJapanese")}</p>
      <p role="status">{current.metadataOnly ? t("review.metadataOnly") : current.checks.stale ? t("review.stale") : current.ready ? t("review.readyAll") : t("review.notReady")}</p>
      {error && <p role="alert">{error}</p>}
      <section data-testid="automatic-checks"><h2 className="font-semibold">{t("review.autoGroup")}</h2><p>{t("review.autoHint")}</p><ul>{automaticKeys.map(k => <li key={k} className="flex items-start gap-2 border-b py-3">{current.automatic[k] ? <CircleCheck aria-hidden className="size-5 shrink-0" /> : <CircleDashed aria-hidden className="size-5 shrink-0" />}<div><p>{t(`review.auto.${k}`)} — {t(current.automatic[k] ? "review.checkDone" : "review.checkTodo")}</p>{!current.automatic[k] && <><p className="text-sm">{t(`review.hint.${k}`)}</p><Link className="underline" href={`/assets/${sessionId}/${k === "verified" || k === "guideVersion" ? "verify" : k === "history" ? "evidence" : "final"}`}>{t("review.takeAction")}</Link></>}</div></li>)}</ul></section>
      <section><h2 className="font-semibold">{t("review.manualGroup")}</h2><p>{t("review.manualHint")}</p><div className="space-y-3">{manualKeys.map(k => <label key={k} className="flex items-start gap-3"><input className="mt-1 size-4 shrink-0" type="checkbox" checked={!current.checks.stale && current.checks.manual[k]} disabled={current.metadataOnly} aria-disabled={pending || current.metadataOnly} aria-busy={pending} onChange={e => { if (!busy.current && !current.metadataOnly) toggle(k, e.target.checked); }} /><span>{t(`review.manual.${k}`)}</span></label>)}</div></section>
      <div className="flex flex-wrap gap-3"><Button disabled={pending || current.metadataOnly || (!retry && !current.ready)} onClick={issue}>{t(retry ? "review.retryIssue" : "review.issue")}</Button>{retry && <><p>{t("review.retryHint")}</p><Button variant="outline" disabled={pending || !current.ready} onClick={() => { clearAttempt(); }}>{t("review.newIssueIntent")}</Button></>}<Button variant="outline" disabled={pending} onClick={() => void action(async () => { await reload(); })}>{t("review.refresh")}</Button></div>
      <section className="space-y-2"><h2>{t("review.issued")}</h2><p>{t("review.issuedLimit")}</p>{!current.snapshots.length && <p>{t("review.issuedEmpty")}</p>}<ul>{current.snapshots.map(s => <li key={s.id}><Button className="max-w-full whitespace-normal break-all text-left" variant="link" disabled={pending} onClick={() => void action(async () => { await openSnapshot(s.id); })}>{formatTime(s.issuedAt, locale)} · {s.id}</Button></li>)}</ul><form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (lookup.trim()) void action(() => openSnapshot(lookup.trim())); }}><label className="min-w-0 flex-1">{t("review.snapshotLookup")}<input className="block w-full rounded border p-2" value={lookup} onChange={e => setLookup(e.target.value)} disabled={pending} /></label><Button type="submit" disabled={pending || !lookup.trim()}>{t("review.openSnapshot")}</Button></form></section>
      <Button disabled={!snapshot || pending} onClick={() => window.print()}>{t("review.print")}</Button>
    </div>
    {snapshot && <article lang="ja" data-review-print className="review-print space-y-5 rounded-xl border bg-white p-6 text-black break-words">
      <h2 className="text-xl font-semibold">{jt("review.docTitle")}</h2><p>{jt("review.docSubtitle")}</p><p>{jt("review.snapshotId")}: {snapshot.id}</p><p>{jt("review.issuedAt")}: {formatTime(snapshot.manifest.issuedAt, "ja")}</p><p>SHA-256: <span className="break-all">{snapshot.checksum}</span></p>
      <section><h3>{jt("review.sectionTarget")}</h3><p>{jt("review.assetCount", { n: snapshot.manifest.target.assets.length })}</p><p>{jt("review.basis")}: <span className="break-all">{snapshot.manifest.targetHash}</span></p><p>{jt("review.cutoff")}: {snapshot.manifest.target.cutoff}</p><p>{jt("review.guide")}: {snapshot.manifest.target.guide?.id} / v{snapshot.manifest.target.guide?.version}</p></section>
      <section><h3>{jt("review.sectionCheck")}</h3><ul>{automaticKeys.map(k => <li key={k}>{jt(`review.auto.${k}`)}: {jt(snapshot.manifest.automatic[k] ? "review.checkDone" : "review.checkTodo")}</li>)}{manualKeys.map(k => <li key={k}>{jt(`review.manual.${k}`)}: {jt(snapshot.manifest.manual[k] ? "review.checkDone" : "review.checkTodo")}</li>)}</ul><p>{jt("review.checkedBy")}: {snapshot.manifest.manualActorId} / {formatTime(snapshot.manifest.manualAt, "ja")} / v{snapshot.manifest.checkVersion}</p></section>
      <section><h3>{jt("review.sectionRules")}</h3>{snapshot.manifest.target.assets.map(a => <div key={a.id} className="my-3 space-y-2"><p>{a.id} / v{a.version}</p><p className="break-all">SHA-256: {a.checksum}</p><p>{jt("review.verificationJob")}: {a.verificationJobId}</p>{a.verification?.ruleResults.length ? <table className="w-full table-fixed border-collapse text-left text-sm"><thead><tr>{["ruleName", "ruleVerdict", "ruleBasis"].map(key => <th key={key} className="border p-2 align-top">{jt(`review.${key}`)}</th>)}</tr></thead><tbody>{a.verification.ruleResults.map(rule => <tr key={rule.ruleId}><td data-label={jt("review.ruleName")} className="border p-2 align-top break-words [overflow-wrap:anywhere]">{rule.title || rule.ruleId}</td><td data-label={jt("review.ruleVerdict")} className="border p-2 align-top">{jt(`review.verdict.${rule.verdict}`)}</td><td data-label={jt("review.ruleBasis")} className="border p-2 align-top break-words [overflow-wrap:anywhere]"><p>{rule.reason}</p>{rule.evidence && <p className="whitespace-pre-wrap">{rule.evidence}</p>}</td></tr>)}</tbody></table> : <p>{jt("review.rulesEmpty")}</p>}<p>{jt("review.sectionHistory")}: {a.generationJobId}</p></div>)}</section>
      <p>{jt("review.footnote")}</p><p>{jt("review.printNotice")}</p>
    </article>}
  </main>;
}
