"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  Check,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceTopBar } from "@/components/domain/workspace-topbar";
import { buildBackQuery } from "@/lib/workspace-nav";
import type { GeneratedAsset } from "@/components/domain/asset-result-card";
import { getStageAssets, setStageAssets } from "@/lib/session-assets-store";
import { findSession } from "@/lib/mock/assets";
import {
  verdictOf,
  rejectRules,
  passRules,
  type Verdict,
  type RuleVerdict,
} from "@/lib/mock/verify";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { addEntry } from "@/lib/evidence-store";

const RULE_STYLE: Record<RuleVerdict, string> = {
  Pass: "bg-green-100 text-green-700",
  Warn: "bg-amber-100 text-amber-700",
  Reject: "bg-red-100 text-red-700",
};

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const { t } = useLocale();

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
        verdict === "pass"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700",
      )}
    >
      {t(`verdict.${verdict}`)}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function VerifyPage() {
  const { t, locale } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;
  const title = findSession(id)?.title ?? "Untitled";
  const from = searchParams.get("from") ?? undefined;
  const fromLabel = searchParams.get("fromLabel") ?? undefined;
  const backSuffix = buildBackQuery(from, fromLabel);

  const [items, setItems] = useState<GeneratedAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [finalIds, setFinalIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | Verdict>("all");

  // 이전 화면에서 채택한 에셋을 세션에서 불러옴
  useEffect(() => {
    const adopted = getStageAssets("verify", id);
    setItems(adopted);
    // 2단계 진입 시 첫 항목(에셋 1)에 포커스
    setSelectedId(adopted[0]?.id ?? null);

    // 이전에 '최종본에 추가'했던 항목 복원
    setFinalIds(new Set(getStageAssets("final", id).map((a) => a.id)));

    // 이 화면에 들어오는 것이 곧 검증 실행이다. 항목마다 판정 결과를 남긴다.
    adopted.forEach((a) => {
      const verdict = verdictOf(a.score);
      const rules = verdict === "pass" ? passRules : rejectRules;
      addEntry(id, "verify.run", {
        assetId: a.id,
        verify: {
          assetId: a.id,
          verdict,
          score: a.score,
          passedRules: rules.filter((r) => r.verdict === "Pass").length,
          totalRules: rules.length,
        },
      });
    });

    setLoaded(true);
  }, [id]);

  // 최종본 추가/취소 변경 시 세션에 계속 동기화 (다른 단계 갔다와도 유지)
  useEffect(() => {
    if (!loaded) return;
    setStageAssets(
      "final",
      id,
      items.filter((a) => finalIds.has(a.id)),
    );
  }, [finalIds, items, loaded, id]);

  const passCount = items.filter((a) => verdictOf(a.score) === "pass").length;
  const rejectCount = items.length - passCount;
  const selected = items.find((a) => a.id === selectedId) ?? null;
  const selectedVerdict = selected ? verdictOf(selected.score) : null;
  const isReject = selectedVerdict === "reject";
  const rules = isReject ? rejectRules : passRules;

  const finalCount = finalIds.size;
  const isFinal = selected ? finalIds.has(selected.id) : false;

  // id로 최종본 추가/취소 (통과 항목만) — 체크박스·버튼 공용
  function toggleFinalById(itemId: string) {
    // 최종본 확정도 인간 개입이므로 기록한다
    addEntry(id, finalIds.has(itemId) ? "final.removed" : "final.added", {
      assetId: itemId,
    });
    setFinalIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  // 선택(우측) 항목을 최종본에 추가/취소
  function toggleFinal() {
    if (!selected) return;
    toggleFinalById(selected.id);
  }

  // 최종본에 담은 에셋을 세션에 저장하고 최종본 화면으로 이동
  function goFinal() {
    setStageAssets(
      "final",
      id,
      items.filter((a) => finalIds.has(a.id)),
    );
    router.push(`/assets/${id}/final${backSuffix}`);
  }

  return (
    <div className="flex flex-col gap-5 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      <WorkspaceTopBar
        title={title}
        activeStep={2}
        sessionId={id}
        from={from}
        fromLabel={fromLabel}
      />

      {/* 검증 기준 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {t("verify.criteria")}
          </span>
          <span className="text-sm font-medium text-foreground">
            {t("verifyMock.target")}
          </span>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
            {t("verify.guideVersion")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 감수 제출 패키지 — 판권사 감수가 계약상 의무인 일본에서만 노출 (적용안 ⑤) */}
          {locale === "ja" && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/assets/${id}/review-package${backSuffix}`}>
                <ClipboardCheck className="size-4" />
                {t("review.button")}
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            className="min-w-[130px] bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={goFinal}
          >
            {t("verify.viewFinal", { n: finalCount })}
          </Button>
        </div>
      </div>

      {/* 채택 에셋이 없는 경우 */}
      {loaded && items.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            {t("verify.emptyTitle")}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("verify.emptyDesc")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href={`/assets/${id}${backSuffix}`}>{t("verify.goGenerate")}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* 좌: 검수 목록 레일 (채택 이미지) */}
          <div className="w-full shrink-0 rounded-[14px] border border-border bg-card p-[var(--pad-card)] lg:w-[280px]">
            <h2 className="text-lg font-semibold text-foreground">{t("verify.listTitle")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", items.length],
                  ["pass", passCount],
                  ["reject", rejectCount],
                ] as const
              ).map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    filter === key
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {key === "all" ? t("verdict.all") : t(`verdict.${key}`)} {count}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-border">
              {items
                .map((item, index) => ({ item, index }))
                .filter(
                  ({ item }) =>
                    filter === "all" || verdictOf(item.score) === filter,
                )
                .map(({ item, index: i }) => {
                const verdict = verdictOf(item.score);
                const active = item.id === selectedId;
                const inFinal = finalIds.has(item.id);
                const canFinal = verdict === "pass"; // 통과만 최종본 가능
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelectedId(item.id);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 px-2 py-3 text-left transition-colors",
                      active
                        ? "rounded-lg border-b border-transparent bg-muted/60"
                        : "border-b border-border hover:bg-muted/30",
                    )}
                  >
                    {/* 항목 체크박스 = 최종본에 추가 여부 (통과만 가능) */}
                    <button
                      type="button"
                      disabled={!canFinal}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canFinal) toggleFinalById(item.id);
                      }}
                      aria-pressed={inFinal}
                      title={
                        canFinal ? t("verify.addToFinal") : t("verify.cannotAdd")
                      }
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors",
                        !canFinal
                          ? "cursor-not-allowed border-border bg-muted text-transparent"
                          : inFinal
                            ? "border-brand bg-brand text-white"
                            : "border-input bg-card text-transparent hover:border-brand",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </button>
                    <span
                      className={cn("size-10 shrink-0 rounded", item.gradient)}
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {t("verify.assetN", { n: pad(i + 1) })}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {item.score}
                        </span>
                      </div>
                      <VerdictPill verdict={verdict} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우: 검수 대상 */}
          <div className="flex min-w-0 flex-1 flex-col gap-6 rounded-[14px] border border-border bg-card p-[var(--pad-card)]">
            {/* 헤더 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("verify.target")}
                </h2>
                <Chip>{t("verify.assetCount", { n: items.length })}</Chip>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  {t("verify.downloadPng")}
                </Button>
                {isFinal ? (
                  <Button size="sm" variant="outline" onClick={toggleFinal}>
                    {t("verify.cancelFinal")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={selected && !isReject ? "default" : "secondary"}
                    disabled={!selected || isReject}
                    onClick={toggleFinal}
                  >
                    {t("verify.addToFinal")}
                  </Button>
                )}
              </div>
            </div>

            {selected && (
              <>
                {/* 미리보기 (선택한 채택 이미지) */}
                <div
                  className={cn(
                    "relative mx-auto w-full max-w-[560px] overflow-hidden rounded-xl",
                    selected.aspectClass,
                    selected.gradient,
                  )}
                >
                  {isReject && (
                    <>
                      <div className="absolute top-[22%] left-[16%] h-[42%] w-[26%] rounded border-2 border-red-500">
                        <span className="absolute -top-6 left-0 rounded bg-red-500 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                          {t("verify.violationColor")}
                        </span>
                      </div>
                      <div className="absolute top-[46%] left-[56%] h-[40%] w-[28%] rounded border-2 border-red-500">
                        <span className="absolute -top-6 left-0 rounded bg-red-500 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                          {t("verify.violationClearSpace")}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* 종합 판정 */}
                {isReject ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CircleAlert className="size-5 text-red-600" />
                      <span className="text-lg font-bold text-red-600">
                        Reject
                      </span>
                      <span className="text-xs text-red-600/80">
                        {t("verify.violationCount", { n: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t("verify.confidence")}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {selected.score}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CircleCheck className="size-5 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        Pass
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t("verify.confidence")}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {selected.score}
                      </span>
                    </div>
                  </div>
                )}

                {/* 규칙별 결과 */}
                <div className="flex flex-col gap-3 px-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("verify.rulesTitle")}
                  </h3>
                  <div className="flex flex-col">
                    {rules.map((rule, i) => (
                      <div
                        key={rule.nameKey}
                        className={cn(
                          "flex items-center justify-between gap-3 py-3.5",
                          i < rules.length - 1 && "border-b border-border",
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-foreground">
                            {t(rule.nameKey)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t(rule.noteKey)}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                            RULE_STYLE[rule.verdict],
                          )}
                        >
                          {rule.verdict}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
