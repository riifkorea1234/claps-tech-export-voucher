"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  buildCertificate,
  getEntries,
  type AssetCertificate,
  type EvidenceEntry,
} from "@/lib/evidence-store";
import {
  getChecks,
  setCheck,
  subscribeChecks,
  MANUAL_CHECK_KEYS,
  type ManualCheckKey,
  type ManualChecks,
} from "@/lib/review-package-store";
import {
  passRules,
  rejectRules,
  type RuleVerdict,
} from "@/lib/mock/verify";
import { getStageAssets } from "@/lib/session-assets-store";
import { getProjects } from "@/lib/projects-store";
import { buildBackQuery } from "@/lib/workspace-nav";

/* 감수 제출 패키지 — 리서치 적용안 ⑤
   일본은 판권사 감수가 계약상 의무라, 제출 자료를 매번 손으로 모으는 대신
   기록에서 한 장으로 만들어 낸다. 보고서가 요구한 세 가지를 담는다.
     1) 제출 전 자체 점검  2) 판정 근거 항목화  3) 자료 일괄 출력(인쇄)

   자동으로 알 수 있는 것은 기록에서 계산하고,
   눈으로 봐야 아는 것(저작권 표기 등)만 담당자가 직접 확인한다. */

const RULE_STYLE: Record<RuleVerdict, string> = {
  Pass: "bg-green-100 text-green-700",
  Warn: "bg-amber-100 text-amber-700",
  Reject: "bg-red-100 text-red-700",
};

const SERVER_CHECKS: ManualChecks = {
  copyrightNotice: false,
  thirdPartyAssets: false,
  recipientConfirmed: false,
};

function subscribeNever() {
  return () => {};
}

/* 점검 한 줄
   자동 확인은 기록에서 계산된 결과라 누를 수 없다 — 체크상자와 생김새를 다르게 해서
   눌러도 안 켜지는 항목을 눌러보게 만들지 않는다. 대신 무엇을 하면 채워지는지 적는다. */
function CheckRow({
  label,
  done,
  hint,
  onToggle,
}: {
  label: string;
  done: boolean;
  hint?: string;
  onToggle?: (next: boolean) => void;
}) {
  const { t } = useLocale();
  const state = done ? t("review.checkDone") : t("review.checkTodo");
  const stateEl = (
    <span
      className={cn(
        "shrink-0 text-xs",
        done ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {state}
    </span>
  );

  // 직접 확인 — 글자를 눌러도 켜지도록 label 로 감싼다
  if (onToggle) {
    return (
      <li className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
        <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => onToggle(e.target.checked)}
            className="size-4 shrink-0 cursor-pointer accent-brand"
          />
          <span className="text-sm text-foreground">{label}</span>
        </label>
        {stateEl}
      </li>
    );
  }

  // 자동 확인 — 읽기 전용
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="flex min-w-0 cursor-default items-start gap-2.5">
        {done ? (
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
        ) : (
          <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm text-foreground">{label}</span>
          {!done && hint && (
            <span className="text-xs text-muted-foreground">{hint}</span>
          )}
        </span>
      </span>
      {stateEl}
    </li>
  );
}

export default function ReviewPackagePage() {
  const { t, locale } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const backSuffix = buildBackQuery(
    searchParams.get("from"),
    searchParams.get("fromLabel"),
  );

  // 기록 + 최종본 → 증명서
  const cache = useRef<{
    raw: string;
    value: { entries: EvidenceEntry[]; certs: AssetCertificate[] };
  }>({ raw: "", value: { entries: [], certs: [] } });

  const readRecords = useCallback(() => {
    const entries = getEntries(id);
    const finals = getStageAssets("final", id);
    const certs = finals.map((a) => buildCertificate(id, a.id));
    const raw = JSON.stringify({ entries, certs });
    if (raw !== cache.current.raw)
      cache.current = { raw, value: { entries, certs } };
    return cache.current.value;
  }, [id]);

  const { entries, certs } = useSyncExternalStore(
    subscribeNever,
    readRecords,
    () => ({ entries: [], certs: [] }),
  );

  // 직접 확인 결과 — 체크할 때마다 저장소가 알려준다
  const checkCache = useRef<{ raw: string; value: ManualChecks }>({
    raw: "",
    value: SERVER_CHECKS,
  });

  const readChecks = useCallback(() => {
    const next = getChecks(id);
    const raw = JSON.stringify(next);
    if (raw !== checkCache.current.raw)
      checkCache.current = { raw, value: next };
    return checkCache.current.value;
  }, [id]);

  const checks = useSyncExternalStore(
    subscribeChecks,
    readChecks,
    () => SERVER_CHECKS,
  );

  // 발행 시각은 화면이 열릴 때 한 번만 정한다
  const [issuedAt] = useState(() => Date.now());

  const primary = certs[0];
  const projectName = primary?.projectId
    ? getProjects().find((p) => p.id === primary.projectId)?.name
    : undefined;

  /* ── 자동 확인 ──────────────────────────────────────────── */
  const autoChecks = [
    { key: "finalized", done: certs.length > 0 },
    {
      key: "verified",
      done: certs.length > 0 && certs.every((c) => c.verdict === "pass"),
    },
    { key: "history", done: entries.length > 0 },
    { key: "guideVersion", done: certs.some((c) => Boolean(c.guideName)) },
  ] as const;

  const undoneCount =
    autoChecks.filter((c) => !c.done).length +
    MANUAL_CHECK_KEYS.filter((k) => !checks[k]).length;

  /* ── 판정 근거 ──────────────────────────────────────────── */
  const rules = primary?.verdict
    ? primary.verdict === "pass"
      ? passRules
      : rejectRules
    : [];

  /* ── 생성 이력 요약 ─────────────────────────────────────── */
  const countOf = (...kinds: EvidenceEntry["kind"][]) =>
    entries.filter((e) => kinds.includes(e.kind)).length;

  const historyRows: [string, string][] = [
    [
      t("review.historyRuns"),
      t("review.countTimes", { n: countOf("generate.run") }),
    ],
    [
      t("review.historyEdits"),
      t("review.countTimes", {
        n: countOf("asset.adopted", "asset.unadopted"),
      }),
    ],
    [
      t("review.historyVerifies"),
      t("review.countTimes", { n: countOf("verify.run") }),
    ],
    [
      t("review.historyFirst"),
      entries[0] ? formatDateTime(entries[0].at, locale) : "-",
    ],
    [
      t("review.historyLast"),
      entries.length
        ? formatDateTime(entries[entries.length - 1].at, locale)
        : "-",
    ],
  ];

  return (
    <div className="flex flex-col gap-5 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      {/* 도구 줄 — 종이에는 안 나온다 */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/assets/${id}/final${backSuffix}`}>
            <ArrowLeft className="size-4" />
            {t("review.back")}
          </Link>
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("review.print")}
        </Button>
      </div>

      {/* 문서 본체 */}
      <article className="mx-auto w-full max-w-[880px] rounded-[14px] border border-border bg-card p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-border pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("review.docTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("review.docSubtitle")}
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

        {/* 제출 준비 상태 — 빠진 것이 있으면 문서 맨 위에서 알린다 */}
        <div
          className={cn(
            "mt-5 flex items-start gap-2 rounded-[10px] border p-3 text-sm",
            undoneCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-green-200 bg-green-50 text-green-800",
          )}
        >
          {undoneCount > 0 ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
          )}
          <span>
            {undoneCount > 0
              ? t("review.warnIncomplete", { n: undoneCount })
              : t("review.readyAll")}
          </span>
        </div>

        {/* 1. 제출 대상 */}
        <section className="flex flex-col gap-3 py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("review.sectionTarget")}
          </h2>
          {certs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("review.noFinal")}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {(
                  [
                    [
                      t("cert.targetIp"),
                      projectName ?? t("cert.notRecorded"),
                    ],
                    [
                      t("cert.guideVersion"),
                      primary?.guideName ?? t("cert.notRecorded"),
                    ],
                    [
                      t("review.targetCount"),
                      t("review.assetCount", { n: certs.length }),
                    ],
                    [
                      t("cert.finalizedAt"),
                      primary?.finalizedAt
                        ? formatDateTime(primary.finalizedAt, locale)
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
          )}
        </section>

        {/* 2. 제출 전 자체 점검 */}
        <section className="flex flex-col gap-4 border-t border-border py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("review.sectionCheck")}
          </h2>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t("review.autoGroup")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("review.autoHint")}
            </p>
            <ul className="flex flex-col">
              {autoChecks.map((c) => (
                <CheckRow
                  key={c.key}
                  label={t(`review.auto.${c.key}`)}
                  done={c.done}
                  hint={t(`review.hint.${c.key}`)}
                />
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t("review.manualGroup")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("review.manualHint")}
            </p>
            <ul className="flex flex-col">
              {MANUAL_CHECK_KEYS.map((k: ManualCheckKey) => (
                <CheckRow
                  key={k}
                  label={t(`review.manual.${k}`)}
                  done={checks[k]}
                  onToggle={(next) => setCheck(id, k, next)}
                />
              ))}
            </ul>
          </div>
        </section>

        {/* 3. 판정 근거 항목화 */}
        <section className="flex flex-col gap-3 border-t border-border py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("review.sectionRules")}
          </h2>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("review.rulesEmpty")}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="w-[38%] py-1.5 text-left text-xs font-normal text-muted-foreground"
                  >
                    {t("review.ruleName")}
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] py-1.5 text-left text-xs font-normal text-muted-foreground"
                  >
                    {t("review.ruleVerdict")}
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 text-left text-xs font-normal text-muted-foreground"
                  >
                    {t("review.ruleBasis")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={rule.nameKey}
                    className="border-b border-border align-top"
                  >
                    <td className="py-2 text-foreground">{t(rule.nameKey)}</td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          RULE_STYLE[rule.verdict],
                        )}
                      >
                        {rule.verdict}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {t(rule.noteKey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 4. 생성 이력 요약 — 사람이 얼마나 개입했는지 (권리 발생의 근거) */}
        <section className="flex flex-col gap-3 border-t border-border py-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("review.sectionHistory")}
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {historyRows.map(([label, value]) => (
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
        </section>

        <footer className="border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("review.footnote")}
          </p>
        </footer>
      </article>
    </div>
  );
}
