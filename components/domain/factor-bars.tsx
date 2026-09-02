"use client";

import { useEffect, useRef } from "react";
import type { Factor } from "@/lib/mock/partners";

// 매칭 근거 바 (라벨 + 그라디언트 바 + %) — 히어로/파트너 카드 공용.
// 마운트마다 0%를 그린 뒤 목표값으로 transition (초기 로드 + 재매칭 모두 재생).
export function FactorBars({ factors }: { factors: Factor[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const bars = root.querySelectorAll<HTMLElement>("[data-gauge]");
    bars.forEach((el) => {
      const target = `${el.dataset.value ?? 0}%`;
      el.style.transition = "none"; // 0%로 리셋 (전환 없이)
      el.style.width = "0%";
      void el.offsetWidth; // 강제 reflow → 0% 확정
      el.style.transition = ""; // 스타일시트의 transition 복원
      el.style.width = target; // 목표값으로 차오름
    });
  }, [factors]);

  return (
    <div
      ref={rootRef}
      className="flex h-full w-full flex-col justify-center gap-1.5 rounded-lg bg-muted px-4 py-3"
    >
      {factors.map((f, i) => (
        <div key={f.label} className="flex items-center gap-3">
          <span className="w-[60px] shrink-0 text-xs text-muted-foreground">
            {f.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div
              data-gauge
              data-value={f.value}
              className="h-full rounded-full bg-gradient-to-r from-[#6B0096] to-brand transition-[width] duration-700 ease-out"
              style={{ width: `${f.value}%`, transitionDelay: `${i * 80}ms` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-card-foreground">
            {f.value}%
          </span>
        </div>
      ))}
    </div>
  );
}
