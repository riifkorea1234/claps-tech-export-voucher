"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ImagePlus,
  ChevronLeft,
  ChevronDown,
  Search,
  Check,
  SquareArrowOutUpRight,
  ImageOff,
  FolderPlus,
  Loader2,
  X,
  Flag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitoringInfo } from "@/components/domain/monitoring-info";
import { CoverThumb } from "@/components/domain/cover-thumb";
import { StatusBadge } from "@/components/domain/status-badge";
import {
  addRecord,
  updateRecord,
  getRecord,
  scanVerdictOf,
  type ScanResult,
  type ScanVerdict,
} from "@/lib/monitoring-store";
import { getProjects } from "@/lib/projects-store";
import { getProjectLibrary, resolveProjectCover } from "@/lib/project-cover";
import type { Project } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { toISODateTime, formatDateTime } from "@/lib/format-date";
import { ScanFactorBars } from "@/components/domain/scan-factor-bars";

// 탐지 진행 단계 (UX 연출용 · 실제 검색엔진 붙기 전)
// 단계마다 소요 시간을 다르게 (합계 ≈ 4.5초)
const SCAN_STEPS = [
  { labelKey: "scan.step1", ms: 700 },
  { labelKey: "scan.step2", ms: 1200 },
  { labelKey: "scan.step3", ms: 900 },
  { labelKey: "scan.step4", ms: 1300 },
  { labelKey: "scan.step5", ms: 1000 },
];

// 임시 탐지 결과 (실제 검색엔진 붙기 전)
// 임시 탐지 결과 (실제 검색엔진 붙기 전)
// factors = 유사도 산출에 기여한 속성별 값 (적용안 ④)
const MOCK_RESULTS: ScanResult[] = [
  {
    id: 1, platform: "google", similarity: 96,
    timeLabelKey: "time.justNow", url: "marketplace-x.com/item/8842",
    factors: [
      { key: "character", value: 98 },
      { key: "color", value: 97 },
      { key: "composition", value: 95 },
      { key: "logo", value: 94 },
    ],
  },
  {
    id: 2, platform: "google", similarity: 93,
    timeLabelKey: "time.justNow", url: "blog.naver.com/goodsshop/223",
    factors: [
      { key: "character", value: 97 },
      { key: "color", value: 94 },
      { key: "composition", value: 90 },
      { key: "logo", value: 88 },
    ],
  },
  {
    id: 3, platform: "naver", similarity: 91,
    timeLabelKey: "time.minutesAgo", timeLabelN: 1, url: "smartstore.naver.com/p/9921",
    factors: [
      { key: "character", value: 95 },
      { key: "color", value: 92 },
      { key: "composition", value: 89 },
      { key: "logo", value: 86 },
    ],
  },
  {
    id: 4, platform: "google", similarity: 88,
    timeLabelKey: "time.minutesAgo", timeLabelN: 2, url: "marketplace-x.com/item/7710",
    factors: [
      { key: "character", value: 92 },
      { key: "color", value: 90 },
      { key: "composition", value: 85 },
      { key: "logo", value: 72 },
    ],
  },
  {
    id: 5, platform: "naver", similarity: 85,
    timeLabelKey: "time.minutesAgo", timeLabelN: 3, url: "cafe.naver.com/handmade/48",
    factors: [
      { key: "character", value: 90 },
      { key: "color", value: 86 },
      { key: "composition", value: 82 },
      { key: "logo", value: 68 },
    ],
  },
  {
    id: 6, platform: "google", similarity: 82,
    timeLabelKey: "time.minutesAgo", timeLabelN: 5, url: "aliexpress.com/item/1002",
    factors: [
      { key: "character", value: 88 },
      { key: "color", value: 84 },
      { key: "composition", value: 79 },
      { key: "logo", value: 64 },
    ],
  },
  {
    id: 7, platform: "naver", similarity: 79,
    timeLabelKey: "time.minutesAgo", timeLabelN: 6, url: "blog.naver.com/kitty/771",
    factors: [
      { key: "character", value: 84 },
      { key: "color", value: 80 },
      { key: "composition", value: 76 },
      { key: "logo", value: 58 },
    ],
  },
  {
    id: 8, platform: "google", similarity: 76,
    timeLabelKey: "time.minutesAgo", timeLabelN: 8, url: "etsy.com/listing/33421",
    factors: [
      { key: "character", value: 80 },
      { key: "color", value: 78 },
      { key: "composition", value: 73 },
      { key: "logo", value: 52 },
    ],
  },
];

// 탐지 일시는 ISO 로 저장하고, 표기는 화면에서 언어별로 바꾼다
function formatNow() {
  return toISODateTime(Date.now());
}

// 업로드 이미지를 작게 줄여 저장 (localStorage 용량 초과 방지 · 썸네일 안정 표시)
function makeThumb(dataUrl: string, max = 320): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-border px-6 py-10 text-center">
      {children}
    </div>
  );
}

const VERDICT_TONE: Record<ScanVerdict, string> = {
  high: "bg-destructive/10 text-destructive",
  review: "bg-warning/15 text-warning",
  low: "bg-muted text-muted-foreground",
};

function ResultCard({
  r,
  onOpen,
  onToggleReport,
}: {
  r: ScanResult;
  onOpen?: () => void;
  onToggleReport?: () => void;
}) {
  const { t } = useLocale();
  const verdict = scanVerdictOf(r.similarity);

  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
    >
      {/* 이미지 영역 — 4:3 비율, 좁아져도 최소 높이 유지 */}
      <div className="relative aspect-[4/3] min-h-[140px] bg-gradient-to-br from-zinc-100 to-zinc-200">
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full px-2 py-1 text-sm text-white",
            r.platform === "google" ? "bg-platform-google" : "bg-platform-naver",
          )}
        >
          {t(`platform.${r.platform}`)}
        </span>
      </div>
      {/* 정보 영역 */}
      <div className="flex flex-col gap-2 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
              {t("scan.similarityPct", { n: r.similarity })}
            </span>
            {/* 자동 판정 — 애매하면 단정하지 않고 확인 필요로 둔다 */}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                VERDICT_TONE[verdict],
              )}
            >
              {t(`scanVerdict.${verdict}`)}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {r.timeLabelKey ? t(r.timeLabelKey, { n: r.timeLabelN ?? 0 }) : r.timeLabel}
          </span>
        </div>

        {/* 유사도 근거 — 무엇이 얼마나 기여했는지 */}
        {r.factors && r.factors.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-md bg-muted/50 px-2.5 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("scan.factorsTitle")}
            </span>
            <ScanFactorBars factors={r.factors} compact />
          </div>
        )}
        <a
          href={`https://${r.url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-sm text-info hover:underline"
        >
          <span className="truncate">{r.url}</span>
          <SquareArrowOutUpRight className="size-4 shrink-0" />
        </a>

        {/* 확인 필요일 때는 무엇을 해야 하는지 함께 알린다 */}
        {verdict === "review" && !r.reportedFalse && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("scanVerdict.reviewHint")}
          </p>
        )}

        {/* 결과를 거부하는 수단을 결과 화면 안에 둔다 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleReport?.();
          }}
          className={cn(
            "mt-0.5 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            r.reportedFalse
              ? "border-border bg-muted text-muted-foreground"
              : "border-input bg-card text-foreground hover:bg-muted",
          )}
        >
          <Flag className="size-3.5" />
          {r.reportedFalse ? t("scan.reported") : t("scan.reportFalse")}
        </button>
      </div>
    </div>
  );
}

export default function MonitoringDetailPage() {
  const { t, locale } = useLocale();
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanCountRef = useRef(0);
  const [image, setImage] = useState<string | null>(null);
  // 라이브러리에서 고른 이미지(그라디언트)는 URL이 아니라 CSS 클래스로 보관
  const [gradient, setGradient] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "scanning" | "results" | "empty"
  >("idle");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);

  /* 오탐 신고 — 결과를 거부하는 수단을 결과 화면 안에 둔다 (적용안 ④).
     지우지 않고 표시만 남겨, 무엇을 걸렀는지도 기록으로 남게 한다. */
  function toggleReport(resultId: number) {
    setResults((prev) => {
      const next = prev.map((r) =>
        r.id === resultId ? { ...r, reportedFalse: !r.reportedFalse } : r,
      );
      if (recordId) updateRecord(recordId, { results: next });
      return next;
    });
  }
  // 탐지 결과 상세 (사이드 패널)
  const [detail, setDetail] = useState<ScanResult | null>(null);
  // 탐지 로딩 연출 상태
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDone, setScanDone] = useState(false); // 마지막 완료(체크) 순간
  const scanTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasBase = !!image || !!gradient;

  function clearScanTimers() {
    scanTimers.current.forEach((t) => clearTimeout(t));
    scanTimers.current = [];
  }
  // 언마운트 시 타이머 정리
  useEffect(() => () => clearScanTimers(), []);

  // 저장된 기록 열기 → 기준 이미지·탐지 결과 복원
  useEffect(() => {
    if (routeId === "new") return;
    const rec = getRecord(routeId);
    if (!rec) return;
    setImage(rec.imageData ?? null);
    setGradient(rec.imageGradient ?? null);
    setFileName(rec.imageName);
    setResults(rec.results ?? []);
    setStatus(rec.status ?? "idle");
    setLastScan(rec.scannedAt ?? null);
    setRecordId(rec.id);
  }, [routeId]);

  // 라이브러리 선택 모달
  const [libOpen, setLibOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickProject, setPickProject] = useState<Project | null>(null);
  const [libTiles, setLibTiles] = useState<{ id: string; gradient: string }[]>(
    [],
  );

  // 모달 열릴 때 프로젝트 목록 로드 + 단계 초기화
  useEffect(() => {
    if (libOpen) {
      setProjects(getProjects());
      setPickProject(null);
    }
  }, [libOpen]);

  function chooseProject(p: Project) {
    setPickProject(p);
    setLibTiles(getProjectLibrary(p.id));
  }

  // 라이브러리 이미지 선택 → 탐지 기준으로 설정
  function chooseLibraryImage(tile: { id: string; gradient: string }) {
    setImage(null);
    setGradient(tile.gradient);
    setFileName(
      t("scan.libraryImage", {
        project: pickProject?.name ?? t("scan.libraryFallback"),
      }),
    );
    setStatus("idle");
    setResults([]);
    setLastScan(null);
    setRecordId(null);
    setLibOpen(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const thumb = await makeThumb(reader.result as string);
      setImage(thumb);
      setGradient(null);
      setFileName(file.name);
      setStatus("idle");
      setResults([]);
      setLastScan(null);
      setRecordId(null); // 새 이미지 → 새 기록
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    clearScanTimers();
    setScanDone(false);
    setImage(null);
    setGradient(null);
    setFileName("");
    setStatus("idle");
    setResults([]);
    setLastScan(null);
    setRecordId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // 로딩 연출 종료 → 결과 확정 + 기록 저장
  function finalizeScan(found: ScanResult[], when: string) {
    const nextStatus = found.length ? "results" : "empty";
    setStatus(nextStatus);
    setResults(found);
    setLastScan(when);

    // 기록 저장: 기준 이미지 + 탐지 결과까지 함께 (재탐지 시 갱신)
    const payload = {
      imageName: fileName,
      imageData: image ?? undefined,
      imageGradient: gradient ?? undefined,
      scannedAt: when,
      resultCount: found.length,
      results: found,
      status: nextStatus,
    } as const;

    if (recordId) {
      updateRecord(recordId, payload);
    } else {
      const id = crypto.randomUUID();
      addRecord({ id, firstScannedAt: when, ...payload });
      setRecordId(id);
    }
  }

  function detect() {
    if (!hasBase || status === "scanning") return;
    // 이번 탐지 결과를 미리 결정 (기존 홀짝 규칙 유지)
    scanCountRef.current += 1;
    const isResults = scanCountRef.current % 2 === 1;
    const when = formatNow();
    const found = isResults ? MOCK_RESULTS : [];

    // 로딩 화면 시작
    clearScanTimers();
    setStatus("scanning");
    setScanStep(0);
    setScanProgress(0);
    setScanDone(false);

    // 단계별 진행 연출 (단계마다 소요 시간이 다름)
    let acc = 0;
    SCAN_STEPS.forEach((step, i) => {
      const at = acc;
      const t = setTimeout(() => {
        setScanStep(i);
        setScanProgress(Math.round(((i + 1) / SCAN_STEPS.length) * 100));
      }, at);
      scanTimers.current.push(t);
      acc += step.ms;
    });
    // 모든 단계 완료 → 스피너가 체크로 (모든 단계 체크·100%)
    const complete = setTimeout(() => {
      setScanStep(SCAN_STEPS.length);
      setScanProgress(100);
      setScanDone(true);
    }, acc);
    scanTimers.current.push(complete);
    // 잠깐 완료 표시 후 결과 화면으로 전환
    const done = setTimeout(() => {
      finalizeScan(found, when);
    }, acc + 700);
    scanTimers.current.push(done);
  }

  const resultCount = status === "results" ? results.length : 0;

  return (
    <div className="flex flex-col gap-6 px-[var(--pad-page-x)] py-[var(--pad-page-y)]">
      <Link
        href="/monitoring"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("scan.back")}
      </Link>

      {/* 탐지 기준 (다크 배너) */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[14px] bg-banner p-5">
        <Image src="/kpi-banner-bg.png" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black to-black/30" />
        <MonitoringInfo className="absolute top-4 right-4 z-10" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />

        <div className="relative flex flex-wrap items-center gap-5">
          {hasBase ? (
            <>
              {/* 세로만 고정, 가로는 원본 비율대로 (너무 넓으면 max-w에서 멈춤) */}
              <div className="relative h-[100px] overflow-hidden rounded-[10px]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={t("scan.baseImageAlt")}
                    className="h-full w-auto max-w-[280px] object-contain"
                  />
                ) : (
                  <div className={cn("h-full w-40", gradient)} />
                )}
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={removeImage}
                    aria-label={t("scan.remove")}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white/60">
                  {t("scan.baseImage")}
                </span>
                <span className="text-sm font-semibold text-white">
                  {fileName}
                </span>
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 w-fit text-xs text-white/70 underline-offset-2 hover:underline"
                  >
                    {t("scan.change")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-[100px] w-40 items-center justify-center rounded-[10px] bg-banner-muted">
                <ImagePlus className="size-6 text-white/70" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-all hover:bg-white active:scale-[0.97] active:bg-zinc-200"
                >
                  {t("scan.attach")}
                </button>
                <button
                  type="button"
                  onClick={() => setLibOpen(true)}
                  className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-all hover:bg-white active:scale-[0.97] active:bg-zinc-200"
                >
                  {t("scan.pickFromLibrary")}
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={detect}
          disabled={!hasBase || status === "scanning"}
          className={cn(
            "relative flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors sm:w-[210px]",
            hasBase && status !== "scanning"
              ? "bg-brand text-brand-foreground hover:bg-brand/90"
              : status === "scanning"
                ? "cursor-not-allowed bg-brand/70 text-brand-foreground"
                : "cursor-not-allowed bg-white/15 text-white/40",
          )}
        >
          {status === "scanning" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("scan.running")}
            </>
          ) : (
            t("scan.start")
          )}
        </button>
      </div>

      {/* 결과 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{t("scan.results")}</h2>
              <Badge variant="secondary" className="h-auto text-sm">
                {t("monitoring.resultCount", { n: resultCount })}
              </Badge>
            </div>
            {lastScan && (
              <span className="text-sm text-muted-foreground">
                {t("scan.lastScan", { when: formatDateTime(lastScan, locale) })}
              </span>
            )}
          </div>
        </div>

        {!hasBase ? (
          <EmptyBox>
            <ImagePlus className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                {t("scan.needImageTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("scan.needImageDesc")}
              </p>
            </div>
          </EmptyBox>
        ) : status === "idle" ? (
          <EmptyBox>
            <Search className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                {t("scan.readyTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("scan.readyDesc")}
              </p>
            </div>
          </EmptyBox>
        ) : status === "scanning" ? (
          // 탐지 로딩 화면 (기준 이미지 스캔 연출 + 현재 단계 한 줄 + 진행바)
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-8 rounded-[14px] border border-border bg-card px-6 py-12">
            {/* 스캔 중인 기준 이미지 (세로만 고정, 가로는 원본 비율대로) */}
            <div className="relative h-[164px] overflow-hidden rounded-xl border border-border">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={t("scan.baseImageAlt")}
                  className="h-full w-auto max-w-[380px] object-contain"
                />
              ) : (
                <div className={cn("h-full w-[260px]", gradient)} />
              )}

              {/* 스캔 중에는 살짝 어둡게 깔아서 빛줄이 도드라지게 */}
              <div
                className={cn(
                  "absolute inset-0 bg-banner/45 transition-opacity duration-500",
                  scanDone && "opacity-0",
                )}
              />

              {/* 위에서 아래로 훑고 지나가는 빛줄 */}
              {!scanDone && (
                <div className="pointer-events-none absolute inset-x-0 h-[45%] animate-[scan-sweep_1.9s_ease-in-out_infinite] motion-reduce:hidden">
                  <div className="size-full bg-gradient-to-b from-transparent to-brand/35" />
                  <div className="h-0.5 w-full bg-brand" />
                </div>
              )}

              {/* 완료 순간 체크 */}
              {scanDone && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-success text-white shadow-lg animate-in zoom-in-50 fade-in duration-500 ease-out">
                    <Check className="size-6" strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </div>

            {/* 현재 단계 + 진행바 */}
            <div className="flex w-full max-w-sm flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                {/* key를 바꿔서 단계가 넘어갈 때마다 부드럽게 교체 */}
                <p
                  key={scanDone ? "done" : scanStep}
                  className="text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  {scanDone
                    ? t("scan.done")
                    : t(SCAN_STEPS[scanStep]?.labelKey ?? "scan.step5")}
                </p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {Math.min(scanStep + 1, SCAN_STEPS.length)} /{" "}
                  {SCAN_STEPS.length}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
                    scanDone ? "bg-success" : "bg-brand",
                  )}
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : status === "empty" ? (
          <EmptyBox>
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
              <Check className="size-6 text-green-600" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                {t("scan.noneTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("scan.noneDesc1")}
                <br />
                {t("scan.noneDesc2")}
              </p>
            </div>
          </EmptyBox>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((r) => (
              <ResultCard
                key={r.id}
                r={r}
                onOpen={() => setDetail(r)}
                onToggleReport={() => toggleReport(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 라이브러리에서 선택 모달: 프로젝트 → 이미지 */}
      <Dialog open={libOpen} onOpenChange={setLibOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {pickProject ? pickProject.name : t("scan.pickFromLibrary")}
            </DialogTitle>
            <DialogDescription>
              {pickProject
                ? t("scan.pickDescWithProject")
                : t("scan.pickDescNoProject")}
            </DialogDescription>
          </DialogHeader>

          {!pickProject ? (
            // 1단계: 프로젝트 선택
            projects.length === 0 ? (
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
                    onClick={() => chooseProject(p)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <CoverThumb
                      cover={resolveProjectCover(p.id, p.cover)}
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
                    <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )
          ) : (
            // 2단계: 프로젝트 이미지 선택
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPickProject(null)}
                className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                {t("scan.projectList")}
              </button>
              {libTiles.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <ImageOff className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("scan.projectNoImages")}
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[360px] grid-cols-3 gap-3 overflow-y-auto">
                  {libTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => chooseLibraryImage(tile)}
                      className={cn(
                        "aspect-square overflow-hidden rounded-lg outline-none ring-brand ring-inset transition hover:ring-2 focus-visible:ring-2",
                        tile.gradient,
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 탐지 결과 상세 사이드 패널 */}
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent
          side="right"
          overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]"
        >
          {detail && (
            <>
              <SheetHeader className="gap-3 border-b border-border p-6">
                <SheetDescription className="sr-only">
                  {t("scan.detailSr")}
                </SheetDescription>
                <SheetTitle className="text-lg">{t("scan.detailTitle")}</SheetTitle>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                {/* 발견 이미지 미리보기 */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
                </div>

                {/* 유사도 (10단계 · 1~2 초록 · 3~7 주황 · 8~10 빨강) */}
                {(() => {
                  const level = Math.max(
                    1,
                    Math.min(10, Math.ceil(detail.similarity / 10)),
                  );
                  const barClass =
                    level <= 2
                      ? "bg-green-500"
                      : level <= 7
                        ? "bg-orange-500"
                        : "bg-red-500";
                  const textClass =
                    level <= 2
                      ? "text-green-600"
                      : level <= 7
                        ? "text-orange-600"
                        : "text-red-600";
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("scan.similarity")}</span>
                        <span className={cn("font-semibold", textClass)}>
                          {t("scan.level", { n: level })}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 flex-1 rounded-full",
                              i < level ? barClass : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 유사도 근거 — 수치가 무엇으로 이루어졌는지 (적용안 ④) */}
                {detail.factors && detail.factors.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("scan.factorsTitle")}
                    </h3>
                    <div className="rounded-xl bg-muted p-4">
                      <ScanFactorBars factors={detail.factors} />
                    </div>
                  </section>
                )}

                {/* 상세 정보 */}
                <dl className="flex flex-col gap-3 rounded-xl bg-muted p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{t("scan.platform")}</dt>
                    <dd className="font-medium text-foreground">
                      {detail.platform}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{t("scan.foundAt")}</dt>
                    <dd className="font-medium text-foreground">
                      {detail.timeLabelKey
                        ? t(detail.timeLabelKey, { n: detail.timeLabelN ?? 0 })
                        : detail.timeLabel}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <dt className="text-muted-foreground">{t("scan.location")}</dt>
                    <dd>
                      <a
                        href={`https://${detail.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 break-all text-info hover:underline"
                      >
                        <span className="break-all">{detail.url}</span>
                        <SquareArrowOutUpRight className="size-4 shrink-0" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <SheetFooter className="flex-row gap-2 border-t border-border p-6">
                <Button
                  asChild
                  className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <a
                    href={`https://${detail.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SquareArrowOutUpRight className="size-4" />
                    {t("scan.openOriginal")}
                  </a>
                </Button>
                {/* 결과를 거부하는 수단 (적용안 ④) */}
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    toggleReport(detail.id);
                    setDetail((d) =>
                      d ? { ...d, reportedFalse: !d.reportedFalse } : d,
                    );
                  }}
                >
                  <Flag className="size-4" />
                  {detail.reportedFalse
                    ? t("scan.undoReport")
                    : t("scan.reportFalse")}
                </Button>
                <SheetClose asChild>
                  <Button variant="outline">{t("common.close")}</Button>
                </SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
