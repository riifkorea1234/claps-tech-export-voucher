"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, WandSparkles, Check, FolderPlus } from "lucide-react";
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
import { getStageAssets, setStageAssets } from "@/lib/session-assets-store";
import { ImageLightbox } from "./image-lightbox";
import type { Project } from "@/lib/mock/projects";
import { buildBackQuery } from "@/lib/workspace-nav";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { addEntry } from "@/lib/evidence-store";
import { EvidenceBadge } from "./evidence-badge";

// 저장에는 코드를 쓰고, 화면에 보일 이름은 lib/i18n 사전의 style.* 에서 가져온다.
const STYLE_CHIPS = [
  "none",
  "flatVector",
  "lineArt",
  "pastel",
  "kitsch",
  "chibi",
  "figure3d",
  "watercolor",
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
  const { t } = useLocale();
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
  const [style, setStyle] = useState("none");
  // 생성 조건으로 기록해야 하므로 프롬프트를 상태로 잡는다
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  // 전체화면(라이트박스)으로 볼 이미지
  const [lightbox, setLightbox] = useState<GeneratedAsset | null>(null);

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
    const saved = getStageAssets("generated", sessionId);
    if (saved.length > 0) setAssets(saved);
    setReady(true);
  }, [sessionId]);

  // 변경 시 세션별로 저장
  useEffect(() => {
    if (!ready) return;
    setStageAssets("generated", sessionId, assets);
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

    // 무엇을 근거로 만들었는지 남긴다 (권리 발생의 근거)
    addEntry(sessionId, "generate.run", {
      conditions: {
        projectId: selectedProject?.id,
        // 브랜드 가이드는 아직 저장되지 않아(화면 상태뿐) 비워 둔다.
        // 프로젝트에 가이드가 저장되면 여기에 파일명이 들어간다.
        guideName: undefined,
        styleKey: style,
        ratio,
        prompt: prompt.trim() || undefined,
        resultCount: batch.length,
      },
    });
  }

  function toggleAdopt(id: string) {
    // 사람이 후보 중에서 고르고 무르는 행위 자체가 인간 개입의 증거다
    const willAdopt = !assets.find((a) => a.id === id)?.adopted;
    addEntry(sessionId, willAdopt ? "asset.adopted" : "asset.unadopted", {
      assetId: id,
    });
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, adopted: !a.adopted } : a)),
    );
  }

  // 채택한 에셋을 세션에 저장하고 검증 화면으로 이동 (검수 목록 = 채택 이미지)
  function goVerify() {
    setStageAssets(
      "verify",
      sessionId,
      assets.filter((a) => a.adopted),
    );
    router.push(`/assets/${sessionId}/verify${backSuffix}`);
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* 좌: 생성 설정 */}
      <div className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[360px]">
        <h2 className="text-lg font-semibold text-foreground">{t("gen.settings")}</h2>

        {/* 프로젝트 선택 */}
        <div className="flex flex-col gap-2">
          <FieldLabel>
            {t("gen.project")} <span className="text-destructive">*</span>
          </FieldLabel>
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
                  {t("gen.projectPlaceholder")}
                </span>
              </>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">
            {t("gen.projectHint")}
          </span>
        </div>

        {/* 스타일 (선택 가능) */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>{t("gen.style")}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {STYLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setStyle(chip)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  style === chip
                    ? "border-[1.4px] border-brand bg-brand/10 text-brand"
                    : "border border-border bg-card text-foreground hover:bg-muted/50",
                )}
              >
                {t(`style.${chip}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>{t("gen.prompt")}</FieldLabel>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("gen.promptPlaceholder")}
            className="h-16 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
        </div>

        {/* 비율 / 해상도 (선택 가능) */}
        <div className="flex flex-col gap-2.5">
          <FieldLabel>{t("gen.ratio")}</FieldLabel>
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

        {/* 프로젝트를 선택해야 생성 가능 */}
        <div className="flex flex-col gap-2">
          <Button
            className="h-11 w-full"
            onClick={generate}
            disabled={!selectedProject}
          >
            {t("gen.submit")}
          </Button>
          {!selectedProject && (
            <span className="text-center text-xs text-muted-foreground">
              {t("gen.needProject")}
            </span>
          )}

          {/* 지금 기록되고 있다는 표시 — 기록은 눈에 안 보이므로 단서를 둔다 */}
          <EvidenceBadge sessionId={sessionId} />
        </div>
      </div>

      {/* 우: 생성 결과 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t("gen.results")}</h2>
          <div className="flex items-center gap-2">
            {/* 임시 — 결과 전체 삭제 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssets([])}
              disabled={assets.length === 0}
            >
              {t("gen.reset")}
            </Button>
            <Button
              size="sm"
              variant={adoptedCount > 0 ? "default" : "secondary"}
              disabled={adoptedCount === 0}
              className={cn(adoptedCount > 0 && "min-w-[150px]")}
              onClick={goVerify}
            >
              {adoptedCount > 0
                ? t("gen.verifyCount", { n: adoptedCount })
                : t("gen.verify")}
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
                {t("gen.emptyTitle")}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("gen.emptyDesc")}
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
            <DialogTitle>{t("gen.pickProjectTitle")}</DialogTitle>
            <DialogDescription>
              {t("gen.pickProjectDesc")}
            </DialogDescription>
          </DialogHeader>

          {projects.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <FolderPlus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("gen.noProjectYet")}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">{t("gen.goMakeProject")}</Link>
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
                      {p.ip || t("common.undecided")}
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
      <ImageLightbox asset={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
