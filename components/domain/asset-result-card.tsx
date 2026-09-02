"use client";

import { Check, EllipsisVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type GeneratedAsset = {
  id: string;
  score: string; // "0.94"
  gradient: string; // 이미지 placeholder 그라디언트 클래스
  aspectClass: string; // 생성 당시 비율 (aspect-square 등)
  adopted: boolean;
};

// 툴팁에 보여줄 세부 준수 항목
const COMPLIANCE = ["IP 정체성", "품질", "IP 정합"];

// 생성된 에셋 결과 카드 — 채택 체크박스 + (호버) Compliance 오버레이·⋮
export function AssetResultCard({
  asset,
  onToggle,
  onOpen,
}: {
  asset: GeneratedAsset;
  onToggle: () => void;
  onOpen?: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative cursor-zoom-in overflow-hidden rounded-lg",
        asset.aspectClass,
        asset.gradient,
      )}
    >
      {/* 채택 체크박스 (항상 보임) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-pressed={asset.adopted}
        className={cn(
          "absolute top-3 left-3 z-10 flex size-6 items-center justify-center rounded-[6px] border transition-colors",
          asset.adopted
            ? "border-brand bg-brand text-white"
            : "border-input bg-white text-transparent hover:border-brand",
        )}
      >
        {asset.adopted && <Check className="size-4" strokeWidth={3} />}
      </button>

      {/* ⋮ (호버) */}
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-10 flex size-6 items-center justify-center rounded-full bg-white text-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        <EllipsisVertical className="size-4" />
      </button>

      {/* Compliance 요약 오버레이 (호버) — 한 줄 요약 + 점수 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-none flex min-w-0 items-center gap-1.5 rounded-full bg-[#171717] px-2.5 py-1 text-sm whitespace-nowrap text-white outline-none group-hover:pointer-events-auto"
              >
                <span className="size-2 shrink-0 rounded-full bg-[#1fb21f]" />
                가이드 통과
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="flex flex-col gap-1">
                {COMPLIANCE.map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-[#1fb21f]" />
                    {label}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#1a1a1a]">
          {asset.score}
        </span>
      </div>
    </div>
  );
}
