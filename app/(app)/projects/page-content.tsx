"use client";
import { displayDate, relativeTime } from "@/lib/i18n/format";
import { useLanguage, useT } from "@/lib/i18n/provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folders,
  FolderClock,
  FolderX,
  FolderPlus,
  Info,
  Plus,
  Check,
  EllipsisVertical,
  PencilLine,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/domain/status-badge";
import { CoverThumb } from "@/components/domain/cover-thumb";
import { NewProjectDialog } from "@/components/domain/new-project-dialog";
import { EmptyState } from "@/components/domain/empty-state";
import { SearchBar } from "@/components/domain/search-bar";
import { Pagination } from "@/components/domain/pagination";
import { ConfirmDeleteDialog } from "@/components/domain/confirm-delete-dialog";
import {
  PROJECT_STATUSES,

  type ProjectStatus,
} from "@/lib/mock/projects";
import {
  addProject,
  updateProject,
  deleteProject,
} from "@/lib/projects-store";
import { resolveProjectCover } from "@/lib/project-cover";
import type { ProjectDto as Project, PageResult, ProjectStats } from "@/lib/contracts/workspace";
import { useRemote, useWorkspaceMutation, WorkspaceError, WorkspaceLoading } from "@/components/domain/workspace-data";
import { cn } from "@/lib/utils";



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
  const t = useT();

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-muted p-3">
      {/* 라벨 + 설명 아이콘 */}
      <div className="flex items-center gap-1.5 px-1.5 pt-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("projects.statDescription", { label })}
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
  const { locale } = useLanguage();
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState(false);
  const remote = useRemote<PageResult<Project>>(`/api/projects?q=${encodeURIComponent(query)}&page=${page}&archived=${archived}`);
  const stats = useRemote<ProjectStats>("/api/projects/stats");
  const items = remote.data?.items ?? [];
  const mutation = useWorkspaceMutation(() => { remote.reload(); stats.reload(); });
  function changeStatus(id: string, status: ProjectStatus) {
    const item = items.find(p => p.id === id);
    if (item) void mutation.run(() => updateProject(id, { status, version: item.version }));
  }

  // 이름 변경 (그 자리에서 인라인 편집)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startRename(p: Project) {
    setEditingId(p.id);
    setEditValue(p.name);
  }

  async function saveRename() {
    const item = items.find(p => p.id === editingId);
    if (item && editValue.trim() && await mutation.run(() => updateProject(item.id, { name: editValue.trim(), version: item.version }))) setEditingId(null);
  }
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  async function confirmDelete() {
    if (!deleteTarget) return;
    if (await mutation.run(() => deleteProject(deleteTarget.id, deleteTarget.version))) setDeleteTarget(null);
  }
  const activeCount = stats.data?.activeCount ?? 0;
  const inReviewCount = stats.data?.inReviewCount ?? 0;
  const needsFixCount = stats.data?.needsFixCount ?? 0;
  const filtered = items, paged = items;
  const totalPages = Math.max(1, remote.data?.totalPages ?? 1);
  const safePage = remote.data?.page ?? page;

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <WorkspaceError error={remote.error ?? mutation.error ?? stats.error} retry={() => { remote.reload(); stats.reload(); }} />
      {!remote.data && !remote.error && <WorkspaceLoading />}
      <Button variant="outline" className="self-end" onClick={() => { setArchived(!archived); setPage(1); }}>{t(archived ? "common.active" : "common.archived")}</Button>
      {/* 상단: 제목 + KPI 카드 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pl-2">
          <h1 className="text-2xl font-bold tracking-[-0.3px] text-foreground">
            {t("projects.overview")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("projects.see_the_progress_of_your_brand_projects_at_a")}
          </p>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              icon={Folders}
              label={t("projects.active_projects")}
              value={activeCount}
              tone="green"
              hint={t("projects.the_number_of_projects_that_are_not_complete")}
            />
            <KpiCard
              icon={FolderClock}
              label={t("projects.status.verifying")}
              value={inReviewCount}
              tone="amber"
              hint={t(
                "projects.the_number_of_projects_undergoing_guideline_verification",
              )}
            />
            <KpiCard
              icon={FolderX}
              label={t("projects.status.needs_fix")}
              value={needsFixCount}
              tone="red"
              hint={t(
                "projects.the_number_of_projects_marked_as_needing_changes_during",
              )}
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
              {t("projects.all_projects")}
            </h2>
            {items.length > 0 && (
              <Badge variant="secondary" className="h-auto text-sm">
                {remote.data?.total ?? 0}
              </Badge>
            )}
          </div>

          {/* 검색창 */}
          <SearchBar
            value={query}
            onChange={(value) => { setQuery(value); setPage(1); }}
            placeholder={t("projects.search_projects")}
            className="w-full sm:w-[300px]"
          />

          <Button
            className="shrink-0 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            {t("projects.new_project")}
          </Button>
        </div>

        {remote.data && items.length === 0 && !query && !archived ? (
          // 프로젝트 없음 (empty)
          <EmptyState
            className="mt-8"
            icon={FolderPlus}
            title={t("projects.no_projects_yet")}
            description={
              <>
                {t("projects.select_new_project_to_add_your_ip_and_brand")}
                <br />
                {t("projects.your_projects_will_appear_here")}
              </>
            }
            action={
              <Button
                className="mt-1 gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" />
                {t("projects.create_a_new_project")}
              </Button>
            }
          />
        ) : (
          <>
            {/* 표 — 아주 좁아지면 가로 스크롤 (컬럼 찌그러짐 방지) */}
            <div className="mt-8 overflow-x-auto">
              <div className="min-w-[680px]">
                {/* 컬럼 헤더 */}
                <div className="flex items-center gap-3 border-b border-border px-2 pb-2">
                  <div className="min-w-0 flex-1 pl-1 text-xs font-medium text-muted-foreground">
                    {t("projects.project_ip")}
                  </div>
                  <div className="w-[120px] text-xs font-medium text-muted-foreground">
                    {t("projects.status")}
                  </div>
                  <div className="w-[90px] text-right text-xs font-medium text-muted-foreground">
                    {t("projects.updates")}
                  </div>
                  <div className="w-[100px] text-right text-xs font-medium text-muted-foreground">
                    {t("projects.created_on_2")}
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
                        if (!archived && editingId !== p.id)
                          router.push(`/projects/${p.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !archived && editingId !== p.id)
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
                              disabled={mutation.pending}
                              className="h-7 w-full max-w-[260px] rounded-md border border-input bg-card px-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
                            />
                          ) : (
                            <div className="truncate text-sm font-medium text-card-foreground">
                              {p.name}
                            </div>
                          )}
                          <div className="truncate text-xs text-muted-foreground">
                            {p.ip || t("projects.undecided")}
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
                            <DropdownMenuLabel>
                              {t("projects.change_status_2")}
                            </DropdownMenuLabel>
                            {PROJECT_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={archived || mutation.pending} onSelect={() => changeStatus(p.id, s)}
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
                          ? relativeTime(new Date(p.updatedAt).getTime(), locale)
                          : "—"}
                      </div>
                      <div className="w-[100px] text-right text-sm text-muted-foreground">
                        {displayDate(p.createdAt, locale)}
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
                          <DropdownMenuItem disabled={archived || mutation.pending} onSelect={() => startRename(p)}>
                            <PencilLine className="size-4" />
                            {t("projects.rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={mutation.pending} onSelect={() => archived ? void mutation.run(() => updateProject(p.id, { version: p.version, archived: false })) : setDeleteTarget(p)}
                          >
                            <Trash2 className="size-4" />
                            {t(archived ? "common.restore" : "common.archive")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {/* 검색 결과 없음 */}
                  {remote.data && filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-1 py-12 text-center">
                      <p className="text-sm font-medium text-foreground">
                        {t("projects.no_results_found")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("projects.searchEmpty", { query: query.trim() })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 페이지네이션 (한 페이지 30개) */}
            <div className="mt-6">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </section>

      {/* 새 프로젝트 만들기 팝업 */}
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={async (project) => { await addProject(project); remote.reload(); stats.reload(); }}
      />

      {/* 삭제 확인 팝업 */}
      <ConfirmDeleteDialog
        pending={mutation.pending}
        title={t("common.archive")}
        confirmLabel={t("common.archive")}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        description={
          <>
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            {t("common.archiveHelp")}
          </>
        }
      />
    </div>
  );
}
