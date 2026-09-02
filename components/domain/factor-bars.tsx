"use client";

import { useEffect, useState } from "react";
import type { Factor } from "@/lib/mock/partners";

// 매칭 근거 바 (라벨 + 그라디언트 바 + %) — 히어로/파트너 카드 공용.
// 마운트 시 0 → 값까지 차오르는 애니메이션. 재매칭 시 부모가 key를 바꿔 재마운트하면 다시 재생됨.
export function FactorBars({ factors }: { factors: Factor[] }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 rounded-lg bg-muted px-4 py-3">
      {factors.map((f, i) => (
        <div key={f.label} className="flex items-center gap-3">
          <span className="w-[60px] shrink-0 text-xs text-muted-foreground">
            {f.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6B0096] to-brand transition-[width] duration-700 ease-out"
              style={{
                width: filled ? `${f.value}%` : "0%",
                transitionDelay: `${i * 80}ms`,
              }}
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
