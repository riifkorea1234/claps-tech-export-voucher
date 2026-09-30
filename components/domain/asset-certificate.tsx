"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { BadgeCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format-date";
import { buildCertificate, type AssetCertificate } from "@/lib/evidence-store";
import { getProjects } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

/* 에셋 증명서 — 결과물 한 장이 어떤 근거로 만들어졌는지 보여주는 패널.
   리서치 적용안 ③: 대상 IP · 기준 버전 · 통과 규칙 수 · 수정 횟수를 패널로 표시.
   편의 기능이 아니라 권리 확보의 요건으로 규정한다.

   저장하지 않고 기록에서 집계한다. 기록이 원본이고 증명서는 결과다. */

function subscribe() {
  return () => {};
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-sm",
          strong ? "font-semibold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function AssetCertificatePanel({
  sessionId,
  assetIds,
}: {
  sessionId: string;
  assetIds: string[];
}) {
  const { t, locale } = useLocale();

  // 기록이 바뀌면 다시 집계한다. 같은 내용이면 같은 값을 돌려줘 다시 그리지 않는다.
  const cache = useRef<{ raw: string; value: AssetCertificate[] }>({
    raw: "",
    value: [],
  });
  const read = useCallback(() => {
    const next = assetIds.map((id) => buildCertificate(sessionId, id));
    const raw = JSON.stringify(next);
    if (raw !== cache.current.raw) cache.current = { raw, value: next };
    return cache.current.value;
  }, [sessionId, assetIds]);
  const certs = useSyncExternalStore(subscribe, read, () => []);

  // 대상 IP 는 프로젝트 이름으로 보여준다
  const projectName = useCallback((id?: string) => {
    if (!id) return undefined;
    return getProjects().find((p) => p.id === id)?.name;
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-[var(--pad-card)]">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("cert.title")}
        </h3>
      </div>
      <p className="max-w-[var(--measure-body)] text-xs text-muted-foreground">
        {t("cert.desc")}
      </p>

      {certs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("cert.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {certs.map((c) => (
            <dl
              key={c.assetId}
              className="flex flex-col rounded-xl border border-border bg-muted/40 px-4 py-2"
            >
              <div className="border-b border-border py-2 text-sm font-semibold text-foreground">
                {t("cert.asset", { id: c.assetId.slice(0, 8) })}
              </div>

              <Row
                label={t("cert.targetIp")}
                value={projectName(c.projectId) ?? t("cert.notRecorded")}
                strong
              />
              <Row
                label={t("cert.guideVersion")}
                value={c.guideName ?? t("cert.notRecorded")}
              />
              <Row
                label={t("cert.conditions")}
                value={
                  c.styleKey
                    ? `${t(`style.${c.styleKey}`)} · ${c.ratio ?? "-"}`
                    : t("cert.notRecorded")
                }
              />
              <Row
                label={t("cert.candidates")}
                value={
                  c.candidateCount
                    ? t("cert.candidatesValue", { n: c.candidateCount })
                    : t("cert.notRecorded")
                }
              />
              {/* 인간이 판단에 관여한 정도 — 권리 발생의 핵심 근거 */}
              <Row
                label={t("cert.humanEdits")}
                value={t("cert.humanEditsValue", { n: c.adoptCount })}
                strong
              />
              <Row
                label={t("cert.passedRules")}
                value={
                  c.totalRules
                    ? t("cert.passedRulesValue", {
                        passed: c.passedRules ?? 0,
                        total: c.totalRules,
                      })
                    : t("cert.notRecorded")
                }
                strong
              />
              <Row
                label={t("cert.createdAt")}
                value={
                  c.createdAt
                    ? formatDateTime(c.createdAt, locale)
                    : t("cert.notRecorded")
                }
              />
              <Row
                label={t("cert.finalizedAt")}
                value={
                  c.finalizedAt
                    ? formatDateTime(c.finalizedAt, locale)
                    : t("cert.notRecorded")
                }
              />
            </dl>
          ))}
        </div>
      )}
    </section>
  );
}
