"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import {
  SessionRowShell,
  StageBadge,
  resolveStage,
  type Stage,
} from "./session-row-shell";
import { resolveSessionCover } from "@/lib/project-cover";
import type { ProjectCover } from "@/lib/mock/projects";
import { sessionSubtitle, type ProjectSession } from "@/lib/mock/project-detail";

// 프로젝트 생성 목록 행 — 클릭 시 해당 세션 워크스페이스로 이동
// 에셋 생성 목록(AssetRow)과 같은 뼈대(SessionRowShell)를 사용해 디자인을 공유한다.
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
  // 썸네일 · 진행 단계 (마운트 후 로드)
  const [cover, setCover] = useState<ProjectCover | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("생성");
  useEffect(() => {
    setCover(resolveSessionCover(session.id));
    setStage(resolveStage(session.id));
  }, [session.id]);

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
    <SessionRowShell
      cover={cover}
      onOpen={go}
      timeLabel={session.timeLabel}
      stage={<StageBadge stage={stage} />}
      title={
        <p className="truncate text-sm font-medium text-card-foreground">
          {session.title}
        </p>
      }
      subtitle={
        <p className="truncate text-sm text-muted-foreground">
          {sessionSubtitle(session)}
        </p>
      }
      menu={
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <EllipsisVertical className="size-[18px]" />
        </button>
      }
    />
  );
}
