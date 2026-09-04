"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AssetRow } from "@/components/domain/asset-row";
import { EmptyState } from "@/components/domain/empty-state";
import { SearchBar } from "@/components/domain/search-bar";
import { ConfirmDeleteDialog } from "@/components/domain/confirm-delete-dialog";
import { getGroups, saveGroups } from "@/lib/assets-store";
import { clearSessionAssets } from "@/lib/session-assets-store";
import { getProjects } from "@/lib/projects-store";
import type { AssetSession, SessionGroup } from "@/lib/mock/assets";

export default function AssetsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetSession | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all"); // "all" | projectId
  const [sort, setSort] = useState<"recent" | "oldest">("recent");

  // 저장소에서 불러오기 (새로고침해도 유지)
  useEffect(() => {
    setGroups(getGroups());
    setProjects(getProjects().map((p) => ({ id: p.id, name: p.name })));
    setLoaded(true);
  }, []);

  const total = groups.reduce((n, g) => n + g.sessions.length, 0);

  // 세션 생성 시각 (id: session-<ms> → 정렬 키)
  function createdMs(id: string) {
    const m = /^session-(\d+)$/.exec(id);
    return m ? Number(m[1]) : 0;
  }

  const projectName = (id?: string) =>
    projects.find((p) => p.id === id)?.name ?? "미연결";

  // 검색 + 프로젝트 필터 + 정렬 적용
  const q = query.trim().toLowerCase();
  const view = groups
    .map((g) => ({
      ...g,
      sessions: g.sessions
        .filter((s) => s.title.toLowerCase().includes(q))
        .filter(
          (s) => projectFilter === "all" || s.projectId === projectFilter,
        )
        .slice()
        .sort((a, b) =>
          sort === "recent"
            ? createdMs(b.id) - createdMs(a.id)
            : createdMs(a.id) - createdMs(b.id),
        ),
    }))
    .filter((g) => g.sessions.length > 0);
  const viewTotal = view.reduce((n, g) => n + g.sessions.length, 0);

  // 변경 후 상태 갱신 + 저장
  function update(next: SessionGroup[]) {
    setGroups(next);
    saveGroups(next);
  }

  function renameSession(id: string, title: string) {
    update(
      groups.map((g) => ({
        ...g,
        sessions: g.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
      })),
    );
  }

  // 새 에셋 생성 — 세션 만들어 저장하고 워크스페이스로 이동
  function createSession() {
    const id = `session-${Date.now()}`;
    const session: AssetSession = {
      id,
      title: "제목 없음",
      timeLabel: "방금",
      createdAt: Date.now(),
    };
    const todayIdx = groups.findIndex((g) => g.label === "오늘");
    const next =
      todayIdx >= 0
        ? groups.map((g, i) =>
            i === todayIdx
              ? { ...g, sessions: [session, ...g.sessions] }
              : g,
          )
        : [{ label: "오늘", sessions: [session] }, ...groups];
    update(next);
    router.push(`/assets/${id}?title=${encodeURIComponent(session.title)}`);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    update(
      groups
        .map((g) => ({
          ...g,
          sessions: g.sessions.filter((s) => s.id !== deleteTarget.id),
        }))
        .filter((g) => g.sessions.length > 0), // 빈 그룹은 숨김
    );
    clearSessionAssets(deleteTarget.id); // 이 세션의 이미지도 함께 삭제
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-5 px-8 py-7">
      {/* 목록 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">생성 목록</h2>
          {total > 0 && (
            <Badge variant="secondary" className="h-auto text-sm">
              {total}
            </Badge>
          )}
        </div>
        <Button className="gap-1.5" onClick={createSession}>
          <Plus className="size-4" />새 에셋 생성
        </Button>
      </div>

      {loaded && total === 0 ? (
        // 생성 내역 없음 (empty)
        <EmptyState
          icon={Sparkles}
          title="아직 생성 내역이 없어요"
          description={
            <>
              &lsquo;새 에셋 생성&rsquo;을 눌러 브랜드 이미지를 만들면
              <br />
              생성한 세션이 여기에 쌓여요.
            </>
          }
          action={
            <Button size="sm" className="mt-1 gap-1.5" onClick={createSession}>
              <Plus className="size-4" />새 에셋 생성
            </Button>
          }
        />
      ) : (
        <>
          {/* 검색 · 필터 */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="생성 목록 검색"
              className="flex-1"
            />

            {/* 프로젝트 필터 */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none">
                {projectFilter === "all"
                  ? "프로젝트 전체"
                  : projectName(projectFilter)}
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem
                  onSelect={() => setProjectFilter("all")}
                  className="justify-between"
                >
                  프로젝트 전체
                  {projectFilter === "all" && (
                    <Check className="size-4 text-brand" />
                  )}
                </DropdownMenuItem>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => setProjectFilter(p.id)}
                    className="justify-between gap-4"
                  >
                    <span className="truncate">{p.name}</span>
                    {projectFilter === p.id && (
                      <Check className="size-4 shrink-0 text-brand" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 정렬 */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none">
                {sort === "recent" ? "최신순" : "오래된순"}
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                <DropdownMenuItem
                  onSelect={() => setSort("recent")}
                  className="justify-between"
                >
                  최신순
                  {sort === "recent" && (
                    <Check className="size-4 text-brand" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSort("oldest")}
                  className="justify-between"
                >
                  오래된순
                  {sort === "oldest" && (
                    <Check className="size-4 text-brand" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 세션 목록 (날짜 그룹) */}
          {viewTotal === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-[14px] border border-dashed border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
              검색 결과가 없어요.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {view.map((group) => (
                <div key={group.label} className="flex flex-col gap-2.5">
                  <span className="px-2 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </span>
                  {group.sessions.map((session) => (
                    <AssetRow
                      key={session.id}
                      session={session}
                      onRename={renameSession}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 삭제 확인 팝업 */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        description={
          <>
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
            </span>{" "}
            생성 세션을 삭제하면 되돌릴 수 없어요.
          </>
        }
      />
    </div>
  );
}
