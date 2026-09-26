"use client";
import { relativeTime } from "@/lib/i18n/format";
import { useLanguage, useT } from "@/lib/i18n/provider";

import { useState } from "react";
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
} from "./session-row-shell";
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
  const t = useT();
  const { locale } = useLanguage();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);
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
    router.push(
      `/assets/${session.id}?title=${encodeURIComponent(session.title)}`,
    );
  }

  return (
    <SessionRowShell
      cover={undefined}
      onOpen={open}
      timeLabel={
        session.createdAt
          ? relativeTime(session.createdAt, locale)
          : session.timeLabel
      }
      stage={<StageBadge stage="generated" />}
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
            {session.title || t("common.untitled")}
          </p>
        )
      }
      subtitle={
        !editing && (
          <span className="truncate text-sm text-muted-foreground">
            {t("assets.no_linked_project")}
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
              {t("assets.rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(session)}
            >
              <Trash2 className="size-4" />
              {t("assets.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
