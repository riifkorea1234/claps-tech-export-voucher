"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n";

// 탐지 안내 툴팁 (모니터링 다크 배너 우상단 info 아이콘)
export function MonitoringInfo({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={className} aria-label={t("monitoring.infoLabel")}>
            <Info className="size-4 text-white/50 transition-colors hover:text-white/90" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <span className="whitespace-nowrap">
            {t("monitoring.infoLine1")}
            <br />
            {t("monitoring.infoLine2")}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
