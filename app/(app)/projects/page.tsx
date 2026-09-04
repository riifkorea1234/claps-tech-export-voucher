"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folders,
  FolderClock,
  FolderX,
  FolderPlus,
  Info,
  Plus,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  PencilLine,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/domain/status-badge";
import { CoverThumb } from "@/components/domain/cover-thumb";
import { NewProjectDialog } from "@/components/domain/new-project-dialog";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from "@/lib/mock/projects";
import {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  formatRelativeTime,
} from "@/lib/projects-store";
import { resolveProjectCover } from "@/lib/project-cover";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20; // 한 페이지에 최대 20개

const KPI_TONES = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-destructive",
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof KPI_TONES;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-muted p-3">
      {/* 라벨 + 설명 아이콘 */}
      <div className="flex items-center gap-1.5 px-1.5 pt-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${label} 설명`}
              className="flex items-center text-muted-foreground outline-none transition-colors hover:text-foreground"
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </div>

      {/* 안쪽 흰 박스 — 아이콘 + 숫자 */}
      <div className="flex items-center justify-center gap-2.5 rounded-[10px] border border-border bg-card px-4 py-5">
        <Icon className={cn("size-[18px]", KPI_TONES[tone])} strokeWidth={2} />
        <span className="text-2xl font-bold tracking-tight text-card-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  // 프로젝트 목록 = 브라우저 저장소(localStorage)에서 불러옴 (새로고침해도 유지)
  const [items, setItems] = useState<Project[]>([]);

  useEffect(() => {
    setItems(getProjects());
  }, []);

  // 목록에서 바로 상태 변경 (저장소 반영)
  function changeStatus(id: string, status: ProjectStatus) {
    updateProject(id, { status });
    setItems(getProjects());
  }

  // 이름 변경 (그 자리에서 인라인 편집)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startRename(p: Project) {
    setEditingId(p.id);
    setEditValue(p.name);
  }

  function saveRename() {
    if (editingId && editValue.trim()) {
      updateProject(editingId, { name: editValue.trim() });
      setItems(getProjects());
    }
    setEditingId(null);
  }

  // 삭제 확인 팝업 대상 (null = 닫힘)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteProject(deleteTarget.id);
    setItems(getProjects());
    if (editingId === deleteTarget.id) setEditingId(null);
    setDeleteTarget(null);
  }

  // KPI 집계 (실제 프로젝트 기준)
  const activeCount = items.filter((p) => p.status !== "완료").length; // 완료만 제외
  const inReviewCount = items.filter((p) => p.status === "검증 중").length;
  const needsFixCount = items.filter((p) => p.status === "수정 필요").length;

  // 이름·IP로 실시간 필터 (대소문자·앞뒤 공백 무시)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.ip.toLowerCase().includes(q),
    );
  }, [query, items]);

  // 검색이 바뀌면 첫 페이지로
  useEffect(() => setPage(1), [query]);

  // 페이지네이션 (한 페이지 30개)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {/* 상단: 제목 + KPI 카드 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pl-2">
          <h1 className="text-2xl font-bold tracking-[-0.3px] text-foreground">
            개요
          </h1>
          <p className="text-sm text-muted-foreground">
            브랜드 프로젝트의 진행 상황을 한눈에 확인하세요.
          </p>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              icon={Folders}
              label="진행 중 프로젝트"
              value={activeCount}
              tone="green"
              hint="완료되지 않은 전체 프로젝트 수예요."
            />
            <KpiCard
              icon={FolderClock}
              label="검증 중"
              value={inReviewCount}
              tone="amber"
              hint="가이드 검증이 진행 중인 프로젝트 수예요."
            />
            <KpiCard
              icon={FolderX}
              label="수정 필요"
              value={needsFixCount}
              tone="red"
              hint="검증에서 수정이 필요하다고 나온 프로젝트 수예요."
            />
          </div>
        </TooltipProvider>
      </div>

      {/* 프로젝트 목록 카드 */}
      <section className="rounded-[14px] border border-border bg-card p-6">
        {/* 카드 헤더 — 좁으면 세로로 쌓임 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-card-foreground">
              전체 프로젝트
            </h2>
            {items.length > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
                {items.length}
              </span>
            )}
          </div>

          {/* 검색창 */}
          <div className="relative w-full sm:w-[300px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로젝트 검색..."
              className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
            />
          </div>

          <Button
            className="shrink-0 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />새 프로젝트
          </Button>
        </div>

        {items.length === 0 ? (
          // 프로젝트 없음 (empty)
          <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <FolderPlus className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                아직 프로젝트가 없어요
              </p>
              <p className="text-sm text-muted-foreground">
                &lsquo;새 프로젝트&rsquo;를 눌러 IP와 브랜드 가이드를 등록하면
                <br />
                여기에 프로젝트가 쌓여요.
              </p>
            </div>
            <Button
              className="mt-1 gap-1.5"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4" />새 프로젝트 만들기
            </Button>
          </div>
        ) : (
          <>
          {/* 표 — 아주 좁아지면 가로 스크롤 (컬럼 찌그러짐 방지) */}
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-[680px]">
            {/* 컬럼 헤더 */}
            <div className="flex items-center gap-3 border-b border-border px-2 pb-2">
              <div className="min-w-0 flex-1 pl-1 text-xs font-medium text-muted-foreground">
                프로젝트 / IP
              </div>
              <div className="w-[120px] text-xs font-medium text-muted-foreground">
                상태
              </div>
              <div className="w-[90px] text-right text-xs font-medium text-muted-foreground">
                업데이트
              </div>
              <div className="w-[100px] text-right text-xs font-medium text-muted-foreground">
                생성일
              </div>
              <div className="w-6" />
            </div>

            {/* 프로젝트 행 */}
            <div className="flex flex-col">
              {paged.map((p, i) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (editingId !== p.id) router.push(`/projects/${p.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editingId !== p.id)
                      router.push(`/projects/${p.id}`);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-2 py-3 transition-colors hover:bg-muted/40",
                    i < paged.length - 1 && "border-b border-border",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <CoverThumb
                      cover={resolveProjectCover(p.id, p.cover)}
                      className="h-10 w-[60px] shrink-0"
                    />
                    <div className="min-w-0">
                      {editingId === p.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={saveRename}
                          className="h-7 w-full max-w-[260px] rounded-md border border-input bg-card px-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
                        />
                      ) : (
                        <div className="truncate text-sm font-medium text-card-foreground">
                          {p.name}
                        </div>
                      )}
                      <div className="truncate text-xs text-muted-foreground">
                        {p.ip}
                      </div>
                    </div>
                  </div>
                  <div className="w-[120px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer rounded-full outline-none transition-opacity hover:opacity-80"
                      >
                        <StatusBadge status={p.status} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
                        {PROJECT_STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onSelect={() => changeStatus(p.id, s)}
                            className="justify-between gap-4"
                          >
                            <StatusBadge status={s} />
                            {s === p.status && (
                              <Check className="size-4 text-foreground" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="w-[90px] text-right text-sm text-muted-foreground">
                    {p.updatedAt
                      ? formatRelativeTime(p.updatedAt)
                      : (p.updatedLabel ?? "-")}
                  </div>
                  <div className="w-[100px] text-right text-sm text-muted-foreground">
                    {p.createdAt ?? "-"}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground"
                    >
                      <EllipsisVertical className="size-[18px]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[160px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onSelect={() => startRename(p)}>
                        <PencilLine className="size-4" />
                        이름 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="size-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* 검색 결과 없음 */}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-1 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">
                    검색 결과가 없어요
                  </p>
                  <p className="text-xs text-muted-foreground">
                    &lsquo;{query.trim()}&rsquo;와 일치하는 프로젝트를 찾지
                    못했어요.
                  </p>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* 페이지네이션 (한 페이지 30개) */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                    n === safePage
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                다음
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
          </>
        )}
      </section>

      {/* 새 프로젝트 만들기 팝업 */}
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(project) => {
          addProject(project); // 저장소에 저장
          setItems(getProjects()); // 화면 갱신
        }}
      />

      {/* 삭제 확인 팝업 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              프로젝트를 삭제하면 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
