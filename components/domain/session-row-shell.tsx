"use client";

import { CoverThumb } from "./cover-thumb";
import { hasStageAssets } from "@/lib/session-assets-store";
import type { ProjectCover } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";

// 생성 세션 행의 공통 뼈대 (에셋 생성 목록 · 프로젝트 상세에서 함께 사용)
// 레이아웃: [썸네일] [제목/부제] ... [시각] [단계 배지] [⋮]
export function SessionRowShell({
  cover,
  title,
  subtitle,
  timeLabel,
  stage,
  menu,
  onOpen,
}: {
  cover?: ProjectCover;
  title: React.ReactNode; // 제목 (이름 변경 중이면 입력칸이 들어올 수 있음)
  subtitle?: React.ReactNode; // 제목 아래 보조 정보
  timeLabel: string;
  stage?: React.ReactNode; // 진행 단계 배지 (선택)
  menu?: React.ReactNode; // ⋮ 메뉴 (선택)
  onOpen?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.();
      }}
      className="flex h-[96px] cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/40"
    >
      <CoverThumb cover={cover} className="h-[68px] w-[92px] shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title}
        {subtitle}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-muted-foreground">{timeLabel}</span>
        {stage}
        {menu}
      </div>
    </div>
  );
}

// 진행 단계 = 저장된 데이터로 판별 (최종본 > 검증 > 생성)
export type Stage = "생성" | "검증" | "최종";

export function resolveStage(sessionId: string): Stage {
  if (hasStageAssets("final", sessionId)) return "최종";
  if (hasStageAssets("verify", sessionId)) return "검증";
  return "생성";
}

const STAGE_TONES: Record<Stage, string> = {
  생성: "bg-secondary text-secondary-foreground",
  검증: "bg-amber-500/10 text-amber-600",
  최종: "bg-green-500/10 text-green-600",
};

// 진행 단계 배지
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-sm font-medium",
        STAGE_TONES[stage],
      )}
    >
      {stage}
    </span>
  );
}
