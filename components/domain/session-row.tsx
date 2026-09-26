"use client";
import { useT } from "@/lib/i18n/provider";

import { useRouter } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import {
  SessionRowShell,
  StageBadge,
} from "./session-row-shell";
import { type ProjectSession } from "@/lib/mock/project-detail";

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
  const t = useT();
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
    <SessionRowShell
      cover={undefined}
      onOpen={go}
      timeLabel={session.timeLabel}
      stage={<StageBadge stage={session.adopted ? "final" : "generated"} />}
      title={
        <p className="truncate text-sm font-medium text-card-foreground">
          {session.title || t("common.untitled")}
        </p>
      }
      subtitle={
        <p className="truncate text-sm text-muted-foreground">
          {[
            session.tag,
            t("assets.sessionSubtitle", { count: session.adopted }),
          ]
            .filter(Boolean)
            .join(" · ")}
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
