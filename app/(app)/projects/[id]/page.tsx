"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  EllipsisVertical,
  Download,
  Check,
  FileUp,
  FileText,
  X,
  ImagePlus,
  Upload,
  Images,
  ImageOff,
  Sparkles,
  PencilLine,
  Trash2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { StatusBadge } from "@/components/domain/status-badge";
import { SessionRow } from "@/components/domain/session-row";
import type { GeneratedAsset } from "@/components/domain/asset-result-card";
import { sampleProjectDetail as project } from "@/lib/mock/project-detail";
import type { ProjectSession } from "@/lib/mock/project-detail";
import {
  getProject,
  updateProject,
  deleteProject,
  formatDate,
} from "@/lib/projects-store";
import { getAllSessions } from "@/lib/assets-store";
import {
  PROJECT_STATUSES,
  type ProjectStatus,
  type ProjectCover,
} from "@/lib/mock/projects";
import { resolveProjectCover } from "@/lib/project-cover";
import { cn } from "@/lib/utils";

// 세션(claps:session:{id})의 생성 이미지 읽기 (생성/채택 수 계산용)
function readSessionImages(sessionId: string): GeneratedAsset[] {
  try {
    const raw = sessionStorage.getItem(`claps:session:${sessionId}`);
    return raw ? (JSON.parse(raw) as GeneratedAsset[]) : [];
  } catch {
    return [];
  }
}

// 세션(claps:final:{id})의 최종본 이미지 읽기 (프로젝트 라이브러리 = 최종본)
function readFinalImages(sessionId: string): GeneratedAsset[] {
  try {
    const raw = sessionStorage.getItem(`claps:final:${sessionId}`);
    return raw ? (JSON.parse(raw) as GeneratedAsset[]) : [];
  } catch {
    return [];
  }
}

type ProjectHeader = {
  name: string;
  ip: string;
  status: ProjectStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: number;
};


export default function ProjectDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 이 프로젝트에 연결된 세션 · 이미지 (에셋 생성에서 프로젝트 선택 시 연결됨)
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [tiles, setTiles] = useState<{ id: string; gradient: string }[]>([]);

  // 브랜드 가이드 (로컬 첨부 · 백엔드 붙기 전 임시)
  const guideInputRef = useRef<HTMLInputElement>(null);
  const [guideName, setGuideName] = useState<string | null>(null);

  function onPickGuide(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setGuideName(file.name);
  }

  function removeGuide() {
    setGuideName(null);
    if (guideInputRef.current) guideInputRef.current.value = "";
  }

  // 커버 썸네일 (undefined = 기본 썸네일) — 목록과 동일 규칙(수동 > 최근이미지 > 기본)
  const [cover, setCover] = useState<ProjectCover | undefined>(undefined);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [libOpen, setLibOpen] = useState(false);
  // 생성 이미지 전체화면(라이트박스) — 그라디언트 값 보관
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // 커버 변경 + 저장소 반영
  function applyCover(next: ProjectCover) {
    setCover(next);
    updateProject(id, { cover: next });
  }

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      applyCover({ kind: "local", value: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
  }

  // 헤더 = 저장된 실제 프로젝트 (없으면 샘플)
  const [header, setHeader] = useState<ProjectHeader>({
    name: project.name,
    ip: project.ip,
    status: project.status,
  });

  useEffect(() => {
    const saved = getProject(id);
    if (saved) {
      setHeader({
        name: saved.name,
        ip: saved.ip,
        status: saved.status,
        description: saved.description,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      });
    }
  }, [id]);

  // 상태 직접 변경 (저장소에도 반영)
  function changeStatus(status: ProjectStatus) {
    setHeader((h) => ({ ...h, status }));
    updateProject(id, { status });
  }

  const router = useRouter();

  // 프로젝트 정보 편집 (이름·IP·설명)
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIp, setEditIp] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function openEdit() {
    setEditName(header.name);
    setEditIp(header.ip);
    setEditDesc(header.description ?? "");
    setEditOpen(true);
  }

  function saveEdit() {
    const patch = {
      name: editName.trim() || header.name,
      ip: editIp.trim() || header.ip,
      description: editDesc.trim() || undefined,
    };
    updateProject(id, patch);
    setHeader((h) => ({ ...h, ...patch }));
    setEditOpen(false);
  }

  // 프로젝트 삭제 (확인 후 목록으로)
  const [deleteOpen, setDeleteOpen] = useState(false);
  function confirmDelete() {
    deleteProject(id);
    setDeleteOpen(false);
    router.push("/projects");
  }

  // 이 프로젝트에 연결된 세션 로드 + 라이브러리 = 여러 세션의 '최종본' 합
  useEffect(() => {
    const linked = getAllSessions().filter((s) => s.projectId === id);
    const mappedSessions: ProjectSession[] = [];
    const finalTiles: { id: string; gradient: string }[] = [];

    for (const s of linked) {
      const imgs = readSessionImages(s.id);
      const adopted = imgs.filter((a) => a.adopted);
      // 프로젝트 '생성 이미지' = 각 세션의 최종본(추가/제거 반영)
      readFinalImages(s.id).forEach((a) =>
        finalTiles.push({ id: a.id, gradient: a.gradient }),
      );
      mappedSessions.push({
        id: s.id,
        title: s.title,
        generated: imgs.length,
        adopted: adopted.length,
        timeLabel: s.timeLabel,
      });
    }

    setSessions(mappedSessions);
    setTiles(finalTiles);

    // 커버 = 공용 규칙 (수동 > 최근 이미지 > 기본 썸네일)
    setCover(resolveProjectCover(id, getProject(id)?.cover));
  }, [id]);

  function toggle(tileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });
  }

  const allSelected = tiles.length > 0 && selected.size === tiles.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tiles.map((t) => t.id)));
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      {/* 서브 헤더: 목록 + 프로젝트 이름 */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          목록
        </Link>
        <span className="h-4 w-px bg-border" />
        <span className="truncate font-semibold text-foreground">
          {header.name}
        </span>
      </div>

      {/* 상단 프로젝트 요약 (다크 배너 · 프로젝트 홈 컨셉) */}
      <section className="relative flex flex-col gap-5 overflow-hidden rounded-[14px] bg-[#282828] p-6">
        <Image src="/kpi-banner-bg.png" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black to-black/30" />
        {/* 배너 전체 흰색 dimmer (살짝 밝게) */}
        <div className="pointer-events-none absolute inset-0 bg-white/10" />

        <DropdownMenu>
          <DropdownMenuTrigger className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-md text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white">
            <EllipsisVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onSelect={openEdit}>
              <PencilLine className="size-4" />
              프로젝트 정보 편집하기
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="size-4" />
                상태 변경하기
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[160px]">
                {PROJECT_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onSelect={() => changeStatus(s)}
                    className="justify-between gap-4"
                  >
                    <StatusBadge status={s} />
                    {s === header.status && (
                      <Check className="size-4 text-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              프로젝트 삭제하기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 요약 (커버 + 정보) */}
        <div className="relative flex flex-wrap items-center gap-6 pr-8">
          {/* 커버 썸네일 — 고정 1:1 정사각형 (호버 시 변경) */}
          <div className="group/cover relative aspect-square w-[150px] shrink-0 overflow-hidden rounded-[10px] bg-muted">
            {!cover ? (
              // 기본 썸네일 (생성 이미지 없음) — 회색 바탕 + 회색 클랩스 로고
              <div className="flex size-full items-center justify-center bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/claps-logo.svg"
                  alt="CLAPS"
                  className="w-[46%] max-w-[88px] opacity-30"
                />
              </div>
            ) : cover.kind === "local" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.value}
                alt="프로젝트 커버"
                className="size-full object-cover"
              />
            ) : (
              <div className={cn("size-full", cover.value)} />
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickCover}
            />

            {/* 호버 오버레이 + 변경 메뉴 */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover/cover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-zinc-900 outline-none transition-colors hover:bg-white">
                  <ImagePlus className="size-4" />
                  썸네일 변경
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[190px]">
                  <DropdownMenuItem
                    onSelect={() => coverInputRef.current?.click()}
                  >
                    <Upload className="size-4" />내 컴퓨터에서 업로드
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLibOpen(true)}>
                    <Images className="size-4" />
                    라이브러리에서 선택
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 프로젝트 정보 */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 py-4">
            {/* 상태 배지(맨 위) + 이름 + IP·파트너 칩 */}
            <div className="flex flex-col gap-3">
              {/* 상태 — 클릭해서 직접 변경 */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-fit cursor-pointer rounded-full outline-none transition-opacity hover:opacity-80">
                  <StatusBadge status={header.status} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[160px]">
                  {PROJECT_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => changeStatus(s)}
                      className="justify-between gap-4"
                    >
                      <StatusBadge status={s} />
                      {s === header.status && (
                        <Check className="size-4 text-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {header.name}
                </h2>
                {/* IP · 파트너 칩 */}
                <div className="flex items-center gap-4 rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                  <span className="font-medium">IP · 파트너</span>
                  <span>{header.ip}</span>
                </div>
              </div>
            </div>

            {/* 설명(있을 때만) + 날짜 메타 */}
            <div className="flex flex-col gap-3">
              {header.description && (
                <p className="text-sm text-white/80">{header.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex gap-2">
                  <span className="text-white/50">최초 생성일</span>
                  <span className="text-white/80">
                    {header.createdAt ?? "-"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/50">최근 업데이트</span>
                  <span className="text-white/80">
                    {formatDate(header.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 브랜드 가이드 추가 영역 */}
        <input
          ref={guideInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onPickGuide}
        />
        {guideName ? (
          // 첨부됨
          <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <FileText className="size-5 text-white/80" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-white">
                  {guideName}
                </span>
                <span className="text-xs text-white/50">
                  브랜드 가이드 · 검증 규칙 변환 대기
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => guideInputRef.current?.click()}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
              >
                변경
              </button>
              <button
                type="button"
                onClick={removeGuide}
                aria-label="브랜드 가이드 제거"
                className="flex size-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          // 비어 있음 (추가 유도)
          <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <FileUp className="size-5 text-white/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  브랜드 가이드 추가
                </span>
                <span className="text-xs text-white/50">
                  PDF를 올리면 검증(E3) 규칙으로 자동 변환돼요.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => guideInputRef.current?.click()}
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white/90"
            >
              파일 선택
            </button>
          </div>
        )}
      </section>

      {/* 생성 목록 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-foreground">생성 목록</h3>
          <Link
            href={`/projects/${id}/sessions`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            전체보기
          </Link>
        </div>
        {sessions.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
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
                backHref={`/projects/${id}`}
                backLabel={header.name}
              />
            ))}
          </div>
        )}
      </section>

      {/* 생성 이미지 */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-foreground">이미지 라이브러리</h3>
            <span className="text-sm text-muted-foreground">
              {tiles.length}장
            </span>
          </div>
          {tiles.length > 0 && (
          <div className="flex items-center gap-3">
            {/* 전체선택 */}
            <button
              type="button"
              role="checkbox"
              aria-checked={allSelected}
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className={cn(
                  "flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
                  allSelected
                    ? "border-brand bg-brand text-white"
                    : "border-input bg-card text-transparent",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              전체선택
            </button>
            <Button
              disabled={selected.size === 0}
              className={cn("gap-1.5", selected.size > 0 && "w-[148px]")}
            >
              <Download className="size-4" />
              선택 다운로드
              {selected.size > 0 && ` (${selected.size})`}
            </Button>
          </div>
          )}
        </div>

        {tiles.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <ImageOff className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                아직 생성된 이미지가 없어요
              </p>
              <p className="text-sm text-muted-foreground">
                가이드 검증을 통과해 채택한 이미지가
                <br />이 프로젝트 라이브러리에 모여요.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((tile) => {
            const isOn = selected.has(tile.id);
            return (
              <div
                key={tile.id}
                onClick={() => setLightbox(tile.gradient)}
                className={cn(
                  "group relative aspect-[272/240] cursor-zoom-in overflow-hidden rounded-lg",
                  tile.gradient,
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(tile.id);
                  }}
                  aria-pressed={isOn}
                  className={cn(
                    "absolute top-3 left-3 z-10 flex size-6 items-center justify-center rounded-[6px] border transition-colors",
                    isOn
                      ? "border-brand bg-brand text-white"
                      : "border-input bg-white text-transparent hover:border-brand",
                  )}
                >
                  {isOn && <Check className="size-4" strokeWidth={3} />}
                </button>
              </div>
            );
            })}
          </div>
        )}
      </section>

      {/* 전체화면 라이트박스 (생성 이미지) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="닫기"
            className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "aspect-[272/240] w-[min(90vw,760px)] overflow-hidden rounded-xl shadow-2xl",
              lightbox,
            )}
          />
        </div>
      )}

      {/* 라이브러리에서 커버 선택 팝업 */}
      <Dialog open={libOpen} onOpenChange={setLibOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>라이브러리에서 선택</DialogTitle>
            <DialogDescription>
              썸네일로 사용할 이미지를 골라주세요.
            </DialogDescription>
          </DialogHeader>
          {tiles.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <ImageOff className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                라이브러리에 아직 이미지가 없어요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => {
                    applyCover({ kind: "gradient", value: tile.gradient });
                    setLibOpen(false);
                  }}
                  className={cn(
                    "aspect-[272/240] rounded-lg outline-none ring-brand ring-offset-2 ring-offset-background transition hover:ring-2 focus-visible:ring-2",
                    tile.gradient,
                  )}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 프로젝트 정보 편집 팝업 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>프로젝트 정보 편집</DialogTitle>
            <DialogDescription>
              이름 · IP · 설명을 수정할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                프로젝트 이름
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                IP · 파트너
              </label>
              <input
                type="text"
                value={editIp}
                onChange={(e) => setEditIp(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                설명
                <span className="text-xs font-normal text-muted-foreground">
                  (선택)
                </span>
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="이 프로젝트가 어떤 작업인지 간단히 적어주세요."
                className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 팝업 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{header.name}</span>{" "}
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
