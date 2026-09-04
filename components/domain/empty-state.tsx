import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 목록이 비었을 때 보여주는 공통 안내 박스
// size: "default" = 목록 전체가 빈 경우 / "sm" = 카드 안의 작은 영역
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode; // 버튼 등 (선택)
  size?: "default" | "sm";
  className?: string;
}) {
  const small = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border px-6 text-center",
        small ? "min-h-[180px] gap-3 py-8" : "min-h-[300px] gap-4 py-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted",
          small ? "size-12" : "size-14",
        )}
      >
        <Icon
          className={cn("text-muted-foreground", small ? "size-5" : "size-6")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p
          className={cn(
            "font-semibold text-foreground",
            small ? "text-sm" : "text-base",
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
