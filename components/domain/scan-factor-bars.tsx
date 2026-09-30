"use client";

import { useLocale } from "@/lib/i18n";
import type { ScanFactor } from "@/lib/monitoring-store";
import { cn } from "@/lib/utils";

/* 유사도 근거 막대 — 유사도 수치가 무엇으로 이루어졌는지 보여준다.
   리서치 적용안 ④: 점수 단독 표시를 지양하고 산출에 기여한 속성 및 비중을
   함께 노출한다. 37%·89% 같은 숫자만으로는 무엇이 부족한지 알 수 없다. */

export function ScanFactorBars({
  factors,
  compact = false,
}: {
  factors: ScanFactor[];
  compact?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-1">
      {factors.map((f) => (
        <div key={f.key} className="flex items-center gap-2">
          <span
            className={cn(
              "shrink-0 text-xs text-muted-foreground",
              compact ? "w-[var(--scan-label-w)]" : "w-[var(--factor-label-w)]",
            )}
          >
            {t(`scanFactor.${f.key}`)}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: `${f.value}%` }}
            />
          </div>
          <span className="w-7 shrink-0 text-right text-xs tabular-nums text-foreground">
            {f.value}%
          </span>
        </div>
      ))}
    </div>
  );
}
