"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, WandSparkles, Check, FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AssetResultCard, type GeneratedAsset } from "./asset-result-card";
import { CoverThumb } from "./cover-thumb";
import { resolveProjectCover } from "@/lib/project-cover";
import { StatusBadge } from "./status-badge";
import { getProjects } from "@/lib/projects-store";
import { getAllSessions, setSessionProject } from "@/lib/assets-store";
import type { Project } from "@/lib/mock/projects";
import { buildBackQuery } from "@/lib/workspace-nav";
import { cn } from "@/lib/utils";

const STYLE_CHIPS = [
  "선택 안함",
  "플랫 벡터",
  "라인 아트",
  "파스텔",
  "키치",
  "치비(SD)",
  "3D 피규어",
  "수채 일러스트",
];

const RATIOS = ["1:1", "16:9", "4:5"];

// 비율 → aspect 클래스 (설정한 비율대로 결과 이미지 비율 결정)
const ASPECT: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-[16/9]",
  "4:5": "aspect-[4/5]",
};

// 카드 상대 높이 (같은 열폭 기준 height/width) — 메이슨리 열 배분용
const HEIGHT_FACTOR: Record<string, number> = {
  "aspect-square": 1,
  "aspect-[16/9]": 9 / 16,
  "aspect-[4/5]": 5 / 4,
};

// 이미지 placeholder 그라디언트 (실제 생성 이미지 대신)
const GRADIENTS = [
  "bg-gradient-to-br from-pink-200 to-rose-300",
  "bg-gradient-to-br from-violet-200 to-fuchsia-300",
  "bg-gradient-to-br from-rose-200 to-pink-300",
  "bg-gradient-to-br from-fuchsia-200 to-violet-300",
];


function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-foreground">{children}</span>
  );
}

export function AssetWorkspaceBody({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 다음 스텝으로 이동할 때도 "어디서 왔는지"를 계속 유지
  const backSuffix = buildBackQuery(
    searchParams.get("from"),
    searchParams.get("fromLabel"),
  );
  // 새 세션은 빈 상태로 시작 (저장된 결과물이 있으면 아래 effect가 불러옴)
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState("선택 안함");
  const [ratio, setRatio] = useState("1:1");
  // 전체화면(라이트박스)으로 볼 이미지
  const [lightbox, setLightbox] = useState<GeneratedAsset | null>(null);

  // Esc로 라이트박스 닫기
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // 프로젝트 선택 (기존 프로젝트에서만 · 모달)
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  // 프로젝트 목록 불러오기 + 이 세션에 연결된 프로젝트 복원
  useEffect(() => {
    const list = getProjects();
    setProjects(list);
    const session = getAllSessions().find((s) => s.id === sessionId);
    if (session?.projectId) {
      const found = list.find((p) => p.id === session.projectId);
      if (found) setSelectedProject(found);
    }
  }, [sessionId]);

  // 프로젝트 선택 → 이 세션을 해당 프로젝트에 실제 연결(저장)
  function selectProject(p: Project) {
    setSelectedProject(p);
    setSessionProject(sessionId, p.id, title);
    setProjectPickerOpen(false);
  }

  // 세션별 저장된 상태 불러오기 (없으면 시드 유지)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`claps:session:${sessionId}`);
      if (raw) setAssets(JSON.parse(raw));
    } catch {
      // 무시
    }
    setReady(true);
  }, [sessionId]);

  // 변경 시 세션별로 저장
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        `claps:session:${sessionId}`,
        JSON.stringify(assets),
      );
    } catch {
      // 무시
    }
  }, [assets, ready, sessionId]);

  const adoptedCount = assets.filter((a) => a.adopted).length;

  // 화면 폭에 따라 열 개수 (좁으면 1열, 넓으면 2열)
  const [columnCount, setColumnCount] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setColumnCount(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 각 카드를 "가장 짧은 열"에 배치 → 좌우 균등 누적 (메이슨리)
  const columns: GeneratedAsset[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  const colHeights = new Array(columnCount).fill(0);
  for (const a of assets) {
    let min = 0;
    for (let i = 1; i < columnCount; i++) {
      if (colHeights[i] < colHeights[min]) min = i;
    }
    columns[min].push(a);
    colHeights[min] += HEIGHT_FACTOR[a.aspectClass] ?? 1;
  }

  // 에셋 생성 — 4개씩 만들어 맨 위에 누적 (설정 바꿔도 결과는 유지됨)
  function generate() {
    const batch: GeneratedAsset[] = Array.from({ length: 4 }, () => ({
      id: crypto.randomUUID(),
      score: (0.85 + Math.random() * 0.14).toFixed(2),
      gradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
      aspectClass: ASPECT[ratio],
      adopted: false,
    }));
    setAssets((prev) => [...batch, ...prev]);
  }

  function toggleAdopt(id: string) {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, adopted: !a.adopted } : a)),
    );
  }

  // 채택한 에셋을 세션에 저장하고 검증 화면으로 이동 (검수 목록 = 채택 이미지)
  function goVerify() {
    const adopted = assets.filter((a) => a.adopted);
    try {
      sessionStorage.setItem(
        `claps:verify:${sessionId}`,
        JSON.stringify(adopted),
      );
    } catch {
      // sessionStorage 사용 불가 시 무시 (검증 화면이 빈 상태로 처리)
    }
    router.push(`/assets/${sessionId}/verify${backSuffix}`);
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* 좌: 생성 설정 */}
      <div className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[360px]">
        <h2 className="text-lg font-semibold text-foreground">생성 설정</h2>

        {/* 프로젝트 선택 */}
        <div className="flex flex-col gap-2">
          <FieldLabel>프로젝트 선택</FieldLabel>
          <button
            type="button"
            onClick={() => setProjectPickerOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-input bg-card py-2.5 pr-3 pl-2.5 transition-colors hover:bg-muted/40"
          >
            {selectedProject ? (
              <>
                <CoverThumb
                  cover={resolveProjectCover(
                    selectedProject.id,
                    selectedProject.cover,
                    sessionId,
                  )}
                  className="size-6 shrink-0"
                />
                <span className="flex-1 truncate text-left text-sm text-foreground">
                  {selectedProject.name}
                </span>
              </>
            ) : (
              <>
                <span className="size-6 shrink-0 rounded-md bg-muted" />
                <span className="flex-1 text-left text-sm text-muted-foreground">
                  프로젝트를 선택하세요
                </span>
              </>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">
            선택한 프로젝트의 브랜드 가이드·IP·메타데이터가 함께 적용됩니다
          </span>
        </div>

        {/* 스타일 (선택 가능) */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>스타일</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {STYLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setStyle(chip)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  style === chip
                    ? "border-[1.4px] border-brand bg-[#feeff6] text-brand"
                    : "border border-border bg-card text-foreground hover:bg-muted/50",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>프롬프트</FieldLabel>
          <textarea
            placeholder="분위기·구도·색감·디테일을 자유롭게 적어주세요 (선택)"
            className="h-16 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
        </div>

        {/* 비율 / 해상도 (선택 가능) */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>비율 / 해상도</FieldLabel>
          <div className="flex w-full rounded-lg bg-muted p-[3px]">
            {RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRatio(r)}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-md py-2 text-sm font-medium transition-colors",
                  ratio === r
                    ? "border border-border bg-card text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Button className="h-11 w-full" onClick={generate}>
          에셋 생성
        </Button>
      </div>

      {/* 우: 생성 결과 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">생성 결과</h2>
          <div className="flex items-center gap-2">
            {/* 임시 — 결과 전체 삭제 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssets([])}
              disabled={assets.length === 0}
            >
              초기화
            </Button>
            <Button
              size="sm"
              variant={adoptedCount > 0 ? "default" : "secondary"}
              disabled={adoptedCount === 0}
              className={cn(adoptedCount > 0 && "min-w-[150px]")}
              onClick={goVerify}
            >
              {adoptedCount > 0
                ? `가이드 검증하기 (${adoptedCount}개)`
                : "가이드 검증하기"}
            </Button>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="flex min-h-[440px] flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 py-10">
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <WandSparkles className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-base font-semibold text-foreground">
                아직 생성된 에셋이 없어요
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                왼쪽에서 프로젝트·스타일·비율을 설정한 뒤 &apos;에셋 생성&apos;을
                누르면 결과가 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            {columns.map((col, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
                {col.map((a) => (
                  <AssetResultCard
                    key={a.id}
                    asset={a}
                    onToggle={() => toggleAdopt(a.id)}
                    onOpen={() => setLightbox(a)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 프로젝트 선택 모달 (기존 프로젝트에서만) */}
      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>프로젝트 선택</DialogTitle>
            <DialogDescription>
              이 생성 세션을 연결할 프로젝트를 골라주세요.
            </DialogDescription>
          </DialogHeader>

          {projects.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <FolderPlus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                아직 만든 프로젝트가 없어요.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">프로젝트 만들러 가기</Link>
              </Button>
            </div>
          ) : (
            <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <CoverThumb
                    cover={resolveProjectCover(p.id, p.cover, sessionId)}
                    className="h-10 w-[52px] shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-card-foreground">
                      {p.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.ip}
                    </span>
                  </div>
                  <StatusBadge status={p.status} />
                  {selectedProject?.id === p.id && (
                    <Check className="size-4 shrink-0 text-brand" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 전체화면 라이트박스 */}
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
              "w-[min(90vw,720px)] max-h-[85vh] overflow-hidden rounded-xl shadow-2xl",
              lightbox.aspectClass,
              lightbox.gradient,
            )}
          />
        </div>
      )}
    </div>
  );
}
