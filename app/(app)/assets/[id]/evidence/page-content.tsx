"use client";
import Link from "next/link";
import { evidenceTime } from "@/lib/evidence-view";
import { useLanguage } from "@/lib/i18n/provider";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { useCertificate, useEvidence } from "@/components/domain/evidence-data";
import { EvidenceBadge } from "@/components/domain/evidence-badge";
import { EvidenceTimeline } from "@/components/domain/evidence-timeline";
import { AssetCertificate } from "@/components/domain/asset-certificate";
import { Button } from "@/components/ui/button";
export default function Content({ sessionId, assets, metadataOnly, initialAsset }: { sessionId: string; assets: { id: string; createdAt: string; deleted: boolean }[]; metadataOnly: boolean; initialAsset: string }) {
  const { locale } = useLanguage();
  const t = useT(), timeline = useEvidence(sessionId), [assetId, setAssetId] = useState(initialAsset), cert = useCertificate(assetId);
  const ready = !timeline.pending && !timeline.error && timeline.nextCursor === null && (!assets.length || !!assetId && !!cert.data && !cert.error);
  function print() {
    if (!ready) return;
    // Include full verification details in this actual print operation, restore screen state afterwards.
    const details = Array.from(document.querySelectorAll<HTMLDetailsElement>(".evidence-document details"));
    const previous = details.map(detail => detail.open);
    details.forEach(detail => { detail.open = true; });
    window.print(); details.forEach((detail, index) => { detail.open = previous[index]; });
  }
  return <div className="evidence-page space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center gap-3 print:hidden"><Link className="underline" href={metadataOnly ? "/assets" : `/assets/${sessionId}/final`}>{t(metadataOnly ? "evidence.backList" : "evidence.back")}</Link><label className="min-w-0">{t("evidence.selectAsset")}<select className="mt-1 block w-full max-w-full rounded border bg-card p-2" value={assetId} onChange={e => setAssetId(e.target.value)}>{!assets.length && <option value="">{t("evidence.empty")}</option>}{assets.map((a, i) => <option key={a.id} value={a.id}>#{i + 1} · {evidenceTime(a.createdAt, locale)}{a.deleted ? ` · ${t("evidence.assetDeleted")}` : ""} · {a.id}</option>)}</select></label><Button className="h-auto max-w-full whitespace-normal" onClick={print} disabled={!ready}>{t("evidence.print")}</Button><p className="text-sm">{t("evidence.printScope")}</p></div>
    <article className="evidence-document min-w-0 space-y-5" data-testid="evidence-document"><header className="space-y-2 break-words"><h1 className="text-2xl font-semibold">{t("evidence.documentTitle")}</h1><p>{t("evidence.source")}</p><p>{t("evidence.sessionId")}: {sessionId}</p><p>{t("evidence.cert.desc")}</p></header>
      <EvidenceBadge resource={timeline} />
      {assetId ? cert.error ? <div role="alert"><p>{t("evidence.readError")}</p><Button onClick={cert.reload}>{t("common.retry")}</Button></div> : cert.data ? <AssetCertificate certificate={cert.data} /> : <p role="status">{t("common.loading")}</p> : <p>{t("evidence.empty")}</p>}
      <EvidenceTimeline resource={timeline} printDocument />
      {!ready && <p role="status">{t("evidence.printIncomplete")}</p>}
      <footer className="text-sm">{t("evidence.printScope")} {t("evidence.source")}</footer>
    </article>
  </div>;
}
