"use client";

import { useRouter } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { sessionSubtitle, type ProjectSession } from "@/lib/mock/project-detail";

// 프로젝트 생성 목록 행 — 클릭 시 해당 세션 워크스페이스로 이동
// backHref/backLabel: 워크스페이스 뒤로가기가 "어디로/무슨 이름"인지 (주소 쿼리로 전달)
export function SessionRow({
  session,
  backHref,
  backLabel,
}: {
  session: ProjectSession;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();

  function go() {
    const base = `/assets/${session.id}`;
    if (!backHref) {
      router.push(base);
      return;
    }
    const q = new URLSearchParams({ from: backHref });
    if (backLabel) q.set("fromLabel", backLabel);
    router.push(`${base}?${q.toString()}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter") go();
      }}
      className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/40"
    >
      <div className="h-14 w-[60px] shrink-0 rounded-lg bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-card-foreground">
          {session.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {sessionSubtitle(session)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {session.timeLabel}
        </span>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <EllipsisVertical className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}
