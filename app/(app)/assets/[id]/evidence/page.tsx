"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format-date";
import {
  buildCertificate,
  getEntries,
  type AssetCertificate,
  type EvidenceEntry,
} from "@/lib/evidence-store";
import { getStageAssets } from "@/lib/session-assets-store";
import { getProjects } from "@/lib/projects-store";
import { buildBackQuery } from "@/lib/workspace-nav";

/* 증빙 자료 출력 — 리서치 적용안 ③ "제출 · 제3자 증빙의 확보"
   기록을 제3자가 확인할 수 있는 형태로 한 번에 내보낸다.
   미국 저작권청 등록·분쟁 대응과 일본 권리자 감수에 같은 자료를 쓴다.

   브라우저 인쇄로 PDF 저장이 된다. print: 유틸리티로 화면에만 보이는 것과
   종이에만 보이는 것을 나눈다. */

const KIND_KEY: Record<string, string> = {
  "session.created": "evidence.kind.sessionCreated",
  "generate.run": "evidence.kind.generateRun",
  "asset.adopted": "evidence.kind.assetAdopted",
  "asset.unadopted": "evidence.kind.assetUnadopted",
  "verify.run": "evidence.kind.verifyRun",
  "final.added": "evidence.kind.finalAdded",
  "final.removed": "evidence.kind.finalRemoved",
};

function subscribe() {
  return () => {};
}

export default function EvidenceExportPage() {
  const { t, locale } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const backSuffix = buildBackQuery(
    searchParams.get("from"),
    searchParams.get("fromLabel"),
  );

  // 기록 + 최종본 결과물 → 증명서
  const cache = useRef<{
    raw: string;
    value: { entries: EvidenceEntry[]; certs: AssetCertificate[] };
  }>({ raw: "", value: { entries: [], certs: [] } });

  const read = useCallback(() => {
    const entries = getEntries(id);
    const finals = getStageAssets("final", id);
    const certs = finals.map((a) => buildCertificate(id, a.id));
    const raw = JSON.stringify({ entries, certs });
    if (raw !== cache.current.raw)
      cache.current = { raw, value: { entries, certs } };
    return cache.current.value;
  }, [id]);

  const { entries, certs } = useSyncExternalStore(subscribe, read, () => ({
    entries: [],
    certs: [],
  }));

  // 발행 시각은 화면이 열릴 때 한 번만 정한다.
  // 그리는 중에 Date.now() 를 부르면 다시 그릴 때마다 값이 달라진다.
  const [issuedAt] = useState(() => Date.now());

  const projectName = (pid?: string) =>
    pid ? getProjects().find((p) => p.id === pid)?.name : undefined;

  return (
    <div className="flex flex-col gap-5 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      {/* 도구 줄 — 종이에는 안 나온다 */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/assets/${id}/final${backSuffix}`}>
            <ArrowLeft className="size-4" />
            {t("export.back")}
          </Link>
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("export.print")}
        </Button>
      </div>

      {/* 문서 본체 */}
      <article className="mx-auto w-full max-w-[880px] rounded-[14px] border border-border bg-card p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-border pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("export.docTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("export.docSubtitle")}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <dt>{t("export.session")}</dt>
              <dd className="text-foreground">{id}</dd>
            </div>
            <div className="flex gap-2">
              <dt>{t("export.issuedAt")}</dt>
              <dd className="text-foreground">
                {formatDateTime(issuedAt, locale)}
              </dd>
            </div>
          </dl>
        </header>

        {/* 1. 결과물별 증명 */}
        <section className="flex flex-col gap-3 py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("export.sectionCert")}
          </h2>
          {certs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cert.empty")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {certs.map((c) => (
                <table
                  key={c.assetId}
                  className="w-full border-collapse text-sm"
                >
                  <caption className="mb-1 text-left text-sm font-semibold text-foreground">
                    {t("cert.asset", { id: c.assetId.slice(0, 8) })}
                  </caption>
                  <tbody>
                    {(
                      [
                        [
                          t("cert.targetIp"),
                          projectName(c.projectId) ?? t("cert.notRecorded"),
                        ],
                        [
                          t("cert.guideVersion"),
                          c.guideName ?? t("cert.notRecorded"),
                        ],
                        [
                          t("cert.conditions"),
                          c.styleKey
                            ? `${t(`style.${c.styleKey}`)} · ${c.ratio ?? "-"}`
                            : t("cert.notRecorded"),
                        ],
                        [
                          t("cert.candidates"),
                          c.candidateCount
                            ? t("cert.candidatesValue", {
                                n: c.candidateCount,
                              })
                            : t("cert.notRecorded"),
                        ],
                        [
                          t("cert.humanEdits"),
                          t("cert.humanEditsValue", { n: c.adoptCount }),
                        ],
                        [
                          t("cert.passedRules"),
                          c.totalRules
                            ? t("cert.passedRulesValue", {
                                passed: c.passedRules ?? 0,
                                total: c.totalRules,
                              })
                            : t("cert.notRecorded"),
                        ],
                        [
                          t("cert.createdAt"),
                          c.createdAt
                            ? formatDateTime(c.createdAt, locale)
                            : t("cert.notRecorded"),
                        ],
                        [
                          t("cert.finalizedAt"),
                          c.finalizedAt
                            ? formatDateTime(c.finalizedAt, locale)
                            : t("cert.notRecorded"),
                        ],
                      ] as const
                    ).map(([label, value]) => (
                      <tr key={label} className="border-b border-border">
                        <th
                          scope="row"
                          className="w-[38%] py-1.5 text-left align-top text-xs font-normal text-muted-foreground"
                        >
                          {label}
                        </th>
                        <td className="py-1.5 text-foreground">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          )}
        </section>

        {/* 2. 전체 이력 */}
        <section className="flex flex-col gap-3 border-t border-border py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("export.sectionTimeline")}
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("evidence.empty")}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border align-top">
                    <td className="w-[34%] py-1.5 text-xs text-muted-foreground">
                      {formatDateTime(e.at, locale)}
                    </td>
                    <td className="py-1.5 text-foreground">
                      {t(KIND_KEY[e.kind] ?? e.kind)}
                      {e.verify && (
                        <span className="text-muted-foreground">
                          {" — "}
                          {t("evidence.verifyResult", {
                            verdict: t(`verdict.${e.verify.verdict}`),
                            passed: e.verify.passedRules,
                            total: e.verify.totalRules,
                          })}
                        </span>
                      )}
                      {e.conditions && (
                        <span className="text-muted-foreground">
                          {" — "}
                          {t(`style.${e.conditions.styleKey}`)} ·{" "}
                          {e.conditions.ratio} ·{" "}
                          {t("evidence.condCandidates", {
                            n: e.conditions.resultCount,
                          })}
                          {e.conditions.guideName
                            ? ` · ${t("evidence.condGuide")} ${e.conditions.guideName}`
                            : ""}
                        </span>
                      )}
                      {e.assetId && !e.verify && (
                        <span className="text-muted-foreground">
                          {" — "}
                          {t("evidence.assetShort", {
                            id: e.assetId.slice(0, 8),
                          })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("export.footnote")}
          </p>
        </footer>
      </article>
    </div>
  );
}
