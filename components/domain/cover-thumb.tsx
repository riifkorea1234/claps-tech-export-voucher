import type { ProjectCover } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";

// 프로젝트 커버 썸네일. 크기는 className으로 지정.
// cover 없으면 = 기본 썸네일(생성 이미지 없는 프로젝트).
export function CoverThumb({
  cover,
  className,
}: {
  cover?: ProjectCover;
  className?: string;
}) {
  if (!cover) {
    // 기본 썸네일 (생성 이미지 없는 프로젝트) — 회색 바탕 + 회색 클랩스 로고
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md bg-muted",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/claps-logo.svg"
          alt="CLAPS"
          className="w-[46%] max-w-[88px] opacity-30"
        />
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden rounded-md bg-muted", className)}>
      {cover.kind === "local" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.value} alt="" className="size-full object-cover" />
      ) : (
        <div className={cn("size-full", cover.value)} />
      )}
    </div>
  );
}
