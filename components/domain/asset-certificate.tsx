"use client";
import type { ReactNode } from "react";
import { useLanguage, useT } from "@/lib/i18n/provider";
import { evidenceTime } from "@/lib/evidence-view";
import type { CertificateDto } from "@/lib/contracts/evidence";
import { useCertificate } from "./evidence-data";
import { Button } from "@/components/ui/button";
export function AssetCertificate({ certificate: c }: { certificate: CertificateDto }) {
  const t = useT(), { locale } = useLanguage();
  const missing = t("evidence.cert.notRecorded"), v = c.verification;
  const guide = (g: CertificateDto["generation"]["guide"]) => g ? `${g.id} / v${g.version} / ${g.checksum}` : missing;
  const rows: [string, ReactNode][] = [
    ["assetId", c.assetId], ["projectId", c.projectId ?? missing], ["checksum", c.checksum],
    ["generationOrigin", t(`evidence.origin.${c.generation.origin}`)], ["generationStatus", t(`evidence.status.${c.generation.status}`)], ["jobId", c.generation.jobId],
    ["guideVersion", guide(c.generation.guide)], ["outputLocale", c.generation.outputLocale ?? missing], ["candidates", c.generation.candidateCount ?? missing],
    ["selectionHistory", t(`evidence.selection.${c.selection.history}`)], ["humanEdits", c.selection.userSelectionCount ?? missing], ["recordedCount", c.selection.recordedSelectionCount], ["adopted", t(c.selection.adopted ? "evidence.yes" : "evidence.no")],
    ["verificationOrigin", v ? t(`evidence.origin.${v.origin}`) : missing], ["verdict", v ? t(`assets.verification.${v.data.verdict}`) : missing], ["stale", v ? t(v.stale ? "assets.verification.stale" : "evidence.current") : missing], ["verificationGuide", guide(v?.guide ?? null)], ["verificationJob", v?.data.jobId ?? missing],
    ["passedRules", v ? `${v.data.ruleResults.filter(r => r.verdict === "pass").length} / ${v.data.ruleResults.length}` : missing], ["createdAt", evidenceTime(c.createdAt, locale)], ["finalizedAt", c.finalization.finalizedAt ? evidenceTime(c.finalization.finalizedAt, locale) : missing], ["finalizationOrigin", t(`evidence.origin.${c.finalization.origin}`)], ["finalGuide", c.finalization.guideId ?? missing],
  ];
  return <section data-testid="asset-certificate" className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
    <h2 className="text-lg font-semibold">{t("evidence.cert.title")}</h2><p className="text-sm">{t("evidence.cert.desc")}</p>
    {(c.archived || c.deletedAt) && <p>{t("evidence.metadataOnly")}{c.deletedAt && <> · {evidenceTime(c.deletedAt, locale)}</>}</p>}
    <dl className="divide-y">{rows.map(([key, value]) => <div key={key} className="grid min-w-0 gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><dt className="text-sm text-muted-foreground">{t(`evidence.cert.${key}`)}</dt><dd className="min-w-0 break-all text-sm" data-field={key}>{value}</dd></div>)}</dl>
    <p className="text-sm">{t("evidence.selectionScope")}</p>
    {v && <details className="certificate-rules"><summary>{t("evidence.fullVerification")}</summary><p className="py-2 text-sm">{v.data.engineVersion} · {evidenceTime(v.data.checkedAt, locale)}</p><ul>{v.data.ruleResults.map(rule => <li className="break-words py-2 text-sm" key={rule.ruleId}>{rule.ruleId}: {t(`assets.verification.${rule.verdict}`)} · {rule.reason}{rule.evidence && <p>{rule.evidence}</p>}</li>)}</ul></details>}
  </section>;
}
export function AssetCertificatePanel({ assetId }: { assetId: string }) {
  const t = useT(), resource = useCertificate(assetId);
  if (resource.error) return <div role="alert"><p>{t("evidence.readError")}</p><Button onClick={resource.reload}>{t("common.retry")}</Button></div>;
  return resource.data ? <AssetCertificate certificate={resource.data} /> : <p role="status">{t("common.loading")}</p>;
}
