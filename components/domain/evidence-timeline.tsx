"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { History } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format-date";
import { getEntries, type EvidenceEntry } from "@/lib/evidence-store";
import { cn } from "@/lib/utils";

/* 버전 이력 타임라인 — 생성부터 채택까지를 시간순으로 보여준다.
   리서치 적용안 ③: 편의 기능이 아니라 권리 확보의 요건으로 다룬다.
   기록 자체는 lib/evidence-store.ts 가 쌓고, 이 부품은 그리기만 한다. */

// 사건 코드 → 문구 열쇠말
const KIND_KEY: Record<string, string> = {
  "session.created": "evidence.kind.sessionCreated",
  "generate.run": "evidence.kind.generateRun",
  "asset.adopted": "evidence.kind.assetAdopted",
  "asset.unadopted": "evidence.kind.assetUnadopted",
  "verify.run": "evidence.kind.verifyRun",
  "final.added": "evidence.kind.finalAdded",
  "final.removed": "evidence.kind.finalRemoved",
};

// 사건 성격별 점 색 — 색만으로 뜻을 전하지 않도록 문구를 항상 함께 둔다
const KIND_TONE: Record<string, string> = {
  "session.created": "bg-muted-foreground",
  "generate.run": "bg-info",
  "asset.adopted": "bg-brand",
  "asset.unadopted": "bg-muted-foreground",
  "verify.run": "bg-warning",
  "final.added": "bg-success",
  "final.removed": "bg-muted-foreground",
};

const EMPTY: EvidenceEntry[] = [];

// 브라우저 저장소는 서버에 없으므로 구독 형태로 읽는다.
// 화면이 살아난 뒤 저장된 기록으로 한 번 맞춰진다.
function subscribe() {
  return () => {};
}

export function EvidenceTimeline({ sessionId }: { sessionId: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);

  // 같은 내용이면 같은 배열을 돌려줘야 다시 그리지 않는다
  const cache = useRef<{ raw: string; value: EvidenceEntry[] }>({
    raw: "",
    value: EMPTY,
  });
  const read = useCallback(() => {
    const next = getEntries(sessionId);
    const raw = JSON.stringify(next);
    if (raw !== cache.current.raw) cache.current = { raw, value: next };
    return cache.current.value;
  }, [sessionId]);

  const entries = useSyncExternalStore(subscribe, read, () => EMPTY);

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-[var(--pad-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("evidence.timeline")}
          </h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {entries.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {open ? t("evidence.hide") : t("evidence.show")}
        </button>
      </div>

      <p className="max-w-[var(--measure-body)] text-xs text-muted-foreground">
        {t("evidence.timelineDesc")}
      </p>

      {open &&
        (entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("evidence.empty")}
          </p>
        ) : (
          <ol className="flex flex-col">
            {entries.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                {/* 점 + 잇는 선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      KIND_TONE[e.kind] ?? "bg-muted-foreground",
                    )}
                  />
                  {i < entries.length - 1 && (
                    <span className="w-px flex-1 bg-border" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {t(KIND_KEY[e.kind] ?? e.kind)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(e.at, locale)}
                    </span>
                  </div>

                  {/* 생성 조건 — 무엇을 근거로 만들었나 */}
                  {e.conditions && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {t("evidence.condStyle")}{" "}
                        {t(`style.${e.conditions.styleKey}`)}
                      </span>
                      <span>
                        {t("evidence.condRatio")} {e.conditions.ratio}
                      </span>
                      <span>
                        {t("evidence.condCandidates", {
                          n: e.conditions.resultCount,
                        })}
                      </span>
                      {e.conditions.prompt && (
                        <span className="min-w-0 truncate">
                          {t("evidence.condPrompt")} {e.conditions.prompt}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 검증 결과 — 규칙을 통과했나 */}
                  {e.verify && (
                    <span className="text-xs text-muted-foreground">
                      {t("evidence.verifyResult", {
                        verdict: t(`verdict.${e.verify.verdict}`),
                        passed: e.verify.passedRules,
                        total: e.verify.totalRules,
                      })}
                    </span>
                  )}

                  {/* 어느 결과물에 대한 일인가 */}
                  {e.assetId && !e.verify && (
                    <span className="text-xs text-muted-foreground">
                      {t("evidence.assetShort", {
                        id: e.assetId.slice(0, 8),
                      })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ))}
    </section>
  );
}
