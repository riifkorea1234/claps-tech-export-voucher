"use client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/mock/projects";

// 상태별 색 (피그마: Tailwind color/100 배경 + color/700 글자)
const STATUS_STYLES: Record<ProjectStatus, string> = {
  preparing: "bg-green-100 text-green-700",
  generating: "bg-blue-100 text-blue-700",
  verifying: "bg-violet-100 text-violet-700",
  needs_fix: "bg-red-100 text-red-700",
  completed: "bg-zinc-100 text-zinc-600",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {t(`projects.status.${status}`)}
    </span>
  );
}
