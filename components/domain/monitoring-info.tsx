"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 탐지 안내 툴팁 (모니터링 다크 배너 우상단 info 아이콘)
export function MonitoringInfo({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={className} aria-label="탐지 안내">
            <Info className="size-4 text-white/50 transition-colors hover:text-white/90" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <span className="whitespace-nowrap">
            구글 이미지 및 네이버 이미지를 1회 검색합니다.
            <br />
            무단 여부는 링크를 직접 확인하세요.
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
