"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionRow } from "@/components/domain/session-row";
import {
  sampleProjectDetail as project,
  type ProjectSession,
} from "@/lib/mock/project-detail";
import { getProject } from "@/lib/projects-store";
import { getAllSessions } from "@/lib/assets-store";
import { getStageAssets } from "@/lib/session-assets-store";

// 이 프로젝트에 등록된 생성 목록만 모아 보는 페이지
export default function ProjectSessionsPage() {
  const params = useParams();
  const id = String(params.id);
  const [name, setName] = useState(project.name);
  const [sessions, setSessions] = useState<ProjectSession[]>([]);

  useEffect(() => {
    const saved = getProject(id);
    if (saved) setName(saved.name);

    // 이 프로젝트에 연결된 세션들 (생성 장수 = 1단계, 최종 장수 = 3단계 최종본)
    const linked = getAllSessions().filter((s) => s.projectId === id);
    setSessions(
      linked.map((s) => ({
        id: s.id,
        title: s.title,
        generated: getStageAssets("generated", s.id).length,
        adopted: getStageAssets("final", s.id).length,
        timeLabel: s.timeLabel,
      })),
    );
  }, [id]);

  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      {/* 서브 헤더: 프로젝트로 돌아가기 + 현재 위치 */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1 truncate text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4 shrink-0" />
          {name}
        </Link>
        <span className="h-4 w-px shrink-0 bg-border" />
        <span className="shrink-0 font-semibold text-foreground">생성 목록</span>
      </div>

      {/* 생성 목록 전체 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">생성 목록</h2>
          <Badge variant="secondary" className="h-auto text-sm">
            {sessions.length}
          </Badge>
        </div>

        {sessions.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <Sparkles className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                아직 생성 내역이 없어요
              </p>
              <p className="text-sm text-muted-foreground">
                에셋 생성에서 이미지를 만들면
                <br />이 프로젝트의 생성 목록이 여기에 쌓여요.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/assets">에셋 생성하러 가기</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                backHref={`/projects/${id}/sessions`}
                backLabel="전체보기"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
