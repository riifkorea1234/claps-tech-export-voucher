"use client";

import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/mock/projects";
import { useLocale } from "@/lib/i18n";

// 상태별 색 (피그마: Tailwind color/100 배경 + color/700 글자)
// 색만으로 뜻을 전하지 않도록 글자를 항상 함께 둔다 (WCAG 2.1 AA · 색상 의존 금지)
const STATUS_STYLES: Record<ProjectStatus, string> = {
  ready: "bg-green-100 text-green-700",
  generating: "bg-blue-100 text-blue-700",
  verifying: "bg-violet-100 text-violet-700",
  needsFix: "bg-red-100 text-red-700",
  done: "bg-zinc-100 text-zinc-600",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
