"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { History, ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format-date";
import { getEntries, type EvidenceEntry } from "@/lib/evidence-store";
import { cn } from "@/lib/utils";

/* 버전 이력 타임라인 — 생성부터 채택까지를 시간순으로 보여준다.
   리서치 적용안 ③: 편의 기능이 아니라 권리 확보의 요건으로 다룬다.

   같은 단계가 잇달아 일어나면(생성 3회, 채택 여러 장 등) 한 줄로 묶고
   눌러서 펼친다. 100건이 넘어가면 그냥 나열해서는 읽을 수가 없다. */

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

function subscribe() {
  return () => {};
}

/** 잇달아 일어난 같은 단계를 한 묶음으로 */
type Group = { kind: string; entries: EvidenceEntry[] };

function groupRuns(entries: EvidenceEntry[]): Group[] {
  const out: Group[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.kind === e.kind) last.entries.push(e);
    else out.push({ kind: e.kind, entries: [e] });
  }
  return out;
}

/** 한 건의 상세 (생성 조건 · 검증 결과 · 대상 결과물) */
function EntryDetail({ e }: { e: EvidenceEntry }) {
  const { t } = useLocale();

  if (e.conditions) {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {t("evidence.condStyle")} {t(`style.${e.conditions.styleKey}`)}
        </span>
        <span>
          {t("evidence.condRatio")} {e.conditions.ratio}
        </span>
        <span>
          {t("evidence.condCandidates", { n: e.conditions.resultCount })}
        </span>
        {e.conditions.guideName && (
          <span className="min-w-0 truncate">
            {t("evidence.condGuide")} {e.conditions.guideName}
          </span>
        )}
        {e.conditions.prompt && (
          <span className="min-w-0 truncate">
            {t("evidence.condPrompt")} {e.conditions.prompt}
          </span>
        )}
      </div>
    );
  }
  if (e.verify) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("evidence.verifyResult", {
          verdict: t(`verdict.${e.verify.verdict}`),
          passed: e.verify.passedRules,
          total: e.verify.totalRules,
        })}
      </span>
    );
  }
  if (e.assetId) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("evidence.assetShort", { id: e.assetId.slice(0, 8) })}
      </span>
    );
  }
  return null;
}

export function EvidenceTimeline({ sessionId }: { sessionId: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
  const groups = groupRuns(entries);

  function toggleGroup(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

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
            {groups.map((g, gi) => {
              const many = g.entries.length > 1;
              const isOpen = expanded.has(gi);
              const first = g.entries[0];
              const last = g.entries[g.entries.length - 1];
              const lastGroup = gi === groups.length - 1;

              return (
                <li key={`${g.kind}-${first.id}`} className="flex gap-3">
                  {/* 점 + 잇는 선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        KIND_TONE[g.kind] ?? "bg-muted-foreground",
                      )}
                    />
                    {!lastGroup && <span className="w-px flex-1 bg-border" />}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
                    {many ? (
                      <>
                        {/* 묶음 머리 — 눌러서 펼친다 */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(gi)}
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen
                              ? t("evidence.collapseGroup")
                              : t("evidence.expandGroup")
                          }
                          className="flex flex-wrap items-baseline gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {t(KIND_KEY[g.kind] ?? g.kind)}
                          </span>
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {t("evidence.groupCount", { n: g.entries.length })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {first.at === last.at
                              ? formatDateTime(first.at, locale)
                              : t("evidence.timeRange", {
                                  from: formatDateTime(first.at, locale),
                                  to: formatDateTime(last.at, locale),
                                })}
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-3.5 text-muted-foreground transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {/* 펼쳤을 때만 낱건을 보여준다 */}
                        {isOpen && (
                          <ul className="mt-1 flex flex-col gap-2 border-l border-border pl-3">
                            {g.entries.map((e) => (
                              <li key={e.id} className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(e.at, locale)}
                                </span>
                                <EntryDetail e={e} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {t(KIND_KEY[g.kind] ?? g.kind)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(first.at, locale)}
                          </span>
                        </div>
                        <EntryDetail e={first} />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
    </section>
  );
}
