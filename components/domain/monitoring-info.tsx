"use client";
import { useT } from "@/lib/i18n/provider";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 탐지 안내 툴팁 (모니터링 다크 배너 우상단 info 아이콘)
export function MonitoringInfo({ className }: { className?: string }) {
  const t = useT();
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={className}
            aria-label={t("monitoring.about_scanning")}
          >
            <Info className="size-4 text-white/50 transition-colors hover:text-white/90" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <span className="whitespace-nowrap">
            {t("monitoring.searches_google_images_and_naver_images_once")}
            <br />
            {t(
              "monitoring.open_each_link_to_confirm_whether_use_is_unauthorized",
            )}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
