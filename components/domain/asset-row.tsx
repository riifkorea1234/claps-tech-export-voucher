"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical, PencilLine, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  SessionRowShell,
  StageBadge,
  resolveStage,
  type Stage,
} from "./session-row-shell";
import { resolveSessionCover } from "@/lib/project-cover";
import { getProject, formatRelativeTime } from "@/lib/projects-store";
import type { ProjectCover } from "@/lib/mock/projects";
import type { AssetSession } from "@/lib/mock/assets";

// 에셋 생성 목록 행 — 클릭 시 워크스페이스로 이동. ⋮는 이름 변경/삭제.
export function AssetRow({
  session,
  onRename,
  onDelete,
}: {
  session: AssetSession;
  onRename: (id: string, title: string) => void;
  onDelete: (session: AssetSession) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);
  // 썸네일 = 이 세션 최종본의 최근 이미지 (마운트 후 로드 · 없으면 기본 썸네일)
  const [cover, setCover] = useState<ProjectCover | undefined>(undefined);
  // 연결된 프로젝트명 · 진행 단계 (마운트 후 로드)
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("생성");
  useEffect(() => {
    setCover(resolveSessionCover(session.id));
    setStage(resolveStage(session.id));
    setProjectName(
      session.projectId ? getProject(session.projectId)?.name : undefined,
    );
  }, [session.id, session.projectId]);

  function startRename() {
    setValue(session.title);
    setEditing(true);
  }

  function saveRename() {
    const t = value.trim();
    if (t) onRename(session.id, t);
    setEditing(false);
  }

  // 워크스페이스 제목이 목록과 맞도록 제목을 주소에 담아 이동
  function open() {
    if (editing) return;
    router.push(`/assets/${session.id}?title=${encodeURIComponent(session.title)}`);
  }

  return (
    <SessionRowShell
      cover={cover}
      onOpen={open}
      timeLabel={
        session.createdAt
          ? formatRelativeTime(session.createdAt)
          : session.timeLabel
      }
      stage={<StageBadge stage={stage} />}
      title={
        editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={saveRename}
            className="h-8 min-w-0 rounded-md border border-input bg-card px-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
        ) : (
          <p className="truncate text-sm font-medium text-card-foreground">
            {session.title}
          </p>
        )
      }
      subtitle={
        !editing && (
          <span className="truncate text-sm text-muted-foreground">
            {projectName ?? "프로젝트 미연결"}
          </span>
        )
      }
      menu={
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="flex size-6 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground"
          >
            <EllipsisVertical className="size-[18px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={startRename}>
              <PencilLine className="size-4" />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(session)}
            >
              <Trash2 className="size-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
