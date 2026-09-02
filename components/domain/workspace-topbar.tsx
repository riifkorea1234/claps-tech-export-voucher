import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBackQuery } from "@/lib/workspace-nav";

const STEPS = [
  { n: 1, label: "에셋 생성" },
  { n: 2, label: "가이드 검증" },
  { n: 3, label: "최종본" },
];

// 단계 번호 → 라우트
function stepHref(sessionId: string, n: number) {
  if (n === 1) return `/assets/${sessionId}`;
  if (n === 2) return `/assets/${sessionId}/verify`;
  return `/assets/${sessionId}/final`;
}

// 에셋 생성 세션 공용 상단 바 (목록 · 제목 · 스텝퍼)
// 스텝퍼는 이전 단계로만 이동 가능. 미래 단계는 액션 버튼으로만 이동.
export function WorkspaceTopBar({
  title,
  activeStep,
  sessionId,
  from,
  fromLabel,
}: {
  title: string;
  activeStep: number;
  sessionId: string;
  from?: string; // 어디서 왔는지 (없으면 에셋 생성 목록)
  fromLabel?: string; // 뒤로가기 라벨 (없으면 "목록")
}) {
  const backHref = from ?? "/assets";
  const backLabel = fromLabel ?? "목록";
  const suffix = buildBackQuery(from, fromLabel); // 스텝 이동에도 계속 붙임

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <span className="h-4 w-px bg-border" />
        <span className="text-base font-semibold text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = s.n === activeStep;
          const clickable = s.n < activeStep; // 이전 단계만 이동 가능
          return (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <span className="h-0.5 w-8 bg-border" />}
              {clickable ? (
                <Link
                  href={stepHref(sessionId, s.n) + suffix}
                  className="group flex items-center gap-2"
                >
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                    {s.n}
                  </span>
                  <span className="text-sm whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground">
                    {s.label}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-[22px] items-center justify-center rounded-full text-xs font-medium",
                      isActive
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.n}
                  </span>
                  <span
                    className={cn(
                      "text-sm whitespace-nowrap",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
