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
import { MonitoringInfo } from "@/components/domain/monitoring-info";
import { CoverThumb } from "@/components/domain/cover-thumb";
import { StatusBadge } from "@/components/domain/status-badge";
import {
  addRecord,
  updateRecord,
  getRecord,
  type ScanResult,
} from "@/lib/monitoring-store";
import { getProjects } from "@/lib/projects-store";
import { getProjectLibrary, resolveProjectCover } from "@/lib/project-cover";
import type { Project } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";

// 탐지 진행 단계 (UX 연출용 · 실제 검색엔진 붙기 전)
// 단계마다 소요 시간을 다르게 (합계 ≈ 4.5초)
const SCAN_STEPS = [
  { label: "기준 이미지 특징 추출 중", ms: 700 },
  { label: "구글 이미지 웹 검색 중", ms: 1200 },
  { label: "네이버 이미지 웹 검색 중", ms: 900 },
  { label: "유사 이미지 대조·유사도 계산 중", ms: 1300 },
  { label: "결과 취합 중", ms: 1000 },
];

// 임시 탐지 결과 (실제 검색엔진 붙기 전)
const MOCK_RESULTS: ScanResult[] = [
  { id: 1, platform: "구글", similarity: 96, timeLabel: "방금", url: "marketplace-x.com/item/8842" },
  { id: 2, platform: "구글", similarity: 93, timeLabel: "방금", url: "blog.naver.com/goodsshop/223" },
  { id: 3, platform: "네이버", similarity: 91, timeLabel: "1분 전", url: "smartstore.naver.com/p/9921" },
  { id: 4, platform: "구글", similarity: 88, timeLabel: "2분 전", url: "marketplace-x.com/item/7710" },
  { id: 5, platform: "네이버", similarity: 85, timeLabel: "3분 전", url: "cafe.naver.com/handmade/48" },
  { id: 6, platform: "구글", similarity: 82, timeLabel: "5분 전", url: "aliexpress.com/item/1002" },
  { id: 7, platform: "네이버", similarity: 79, timeLabel: "6분 전", url: "blog.naver.com/kitty/771" },
  { id: 8, platform: "구글", similarity: 76, timeLabel: "8분 전", url: "etsy.com/listing/33421" },
];

function formatNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

function ResultCard({ r, onOpen }: { r: ScanResult; onOpen?: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
      <span
        className={cn(
          "absolute top-3 left-3 rounded-full px-2 py-1 text-sm text-white",
          r.platform === "구글" ? "bg-[#055dff]" : "bg-[#03994a]",
        )}
      >
        {r.platform}
      </span>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-[#f0f0f3] px-2 py-1 text-xs font-medium text-[#33333d]">
            유사도 {r.similarity}%
          </span>
          <span className="text-xs text-muted-foreground">{r.timeLabel}</span>
        </div>
        <a
          href={`https://${r.url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-sm text-[#1a76e9] hover:underline"
        >
          <span className="truncate">{r.url}</span>
          <SquareArrowOutUpRight className="size-4 shrink-0" />
        </a>
      </div>
    </div>
  );
}

export default function MonitoringDetailPage() {
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
    setFileName(`${pickProject?.name ?? "라이브러리"} 이미지`);
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
    <div className="flex flex-col gap-6 px-8 py-7">
      <Link
        href="/monitoring"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        목록
      </Link>

      {/* 탐지 기준 (다크 배너) */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[14px] bg-[#282828] p-5">
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
              <div className="relative h-[100px] w-40 overflow-hidden rounded-[10px]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt="탐지 기준"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className={cn("size-full", gradient)} />
                )}
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={removeImage}
                    aria-label="제거"
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white/60">탐지 기준 이미지</span>
                <span className="text-sm font-semibold text-white">
                  {fileName}
                </span>
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 w-fit text-xs text-white/70 underline-offset-2 hover:underline"
                  >
                    변경
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-[100px] w-40 items-center justify-center rounded-[10px] bg-[#4d4d4d]">
                <ImagePlus className="size-6 text-white/70" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-all hover:bg-white active:scale-[0.97] active:bg-zinc-200"
                >
                  이미지 첨부
                </button>
                <button
                  type="button"
                  onClick={() => setLibOpen(true)}
                  className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-all hover:bg-white active:scale-[0.97] active:bg-zinc-200"
                >
                  라이브러리에서 선택
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
              탐지 중…
            </>
          ) : (
            "탐지 시작"
          )}
        </button>
      </div>

      {/* 결과 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">탐지 결과</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
                {resultCount}건
              </span>
            </div>
            {lastScan && (
              <span className="text-sm text-muted-foreground">
                마지막 탐지 {lastScan}
              </span>
            )}
          </div>
        </div>

        {!hasBase ? (
          <EmptyBox>
            <ImagePlus className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                탐지할 기준 이미지를 먼저 첨부하세요
              </p>
              <p className="text-sm text-muted-foreground">
                상단에서 기준 이미지를 첨부하면 무단 사용 탐지를 시작할 수
                있어요.
              </p>
            </div>
          </EmptyBox>
        ) : status === "idle" ? (
          <EmptyBox>
            <Search className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                탐지 시작을 눌러 검색하세요
              </p>
              <p className="text-sm text-muted-foreground">
                상단의 &apos;탐지 시작&apos;을 누르면 구글·네이버 이미지에서 유사
                이미지를 찾습니다.
              </p>
            </div>
          </EmptyBox>
        ) : status === "scanning" ? (
          // 탐지 로딩 화면 (상태 텍스트 + 진행바 + 단계)
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-7 rounded-[14px] border border-dashed border-border px-6 py-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-full transition-colors",
                  scanDone ? "bg-green-100" : "bg-brand/10",
                )}
              >
                {scanDone ? (
                  <Check
                    className="size-6 text-green-600 animate-in zoom-in-50 fade-in duration-500 ease-out"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Loader2 className="size-6 animate-spin text-brand" />
                )}
              </div>
              <p className="text-base font-semibold text-foreground">
                {scanDone ? "탐지 완료" : "무단 사용을 탐지하고 있어요"}
              </p>
            </div>

            {/* 진행바 (막대만) */}
            <div className="w-full max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6B0096] to-brand transition-[width] duration-500 ease-out"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>

            {/* 단계 표시 */}
            <ol className="flex w-full max-w-sm flex-col gap-2.5 px-4">
              {SCAN_STEPS.map((step, i) => {
                const state =
                  i < scanStep ? "done" : i === scanStep ? "active" : "pending";
                return (
                  <li
                    key={step.label}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        state === "done"
                          ? "border-brand bg-brand text-white"
                          : state === "active"
                            ? "border-brand text-brand"
                            : "border-border text-transparent",
                      )}
                    >
                      {state === "done" ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : state === "active" ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-brand" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        state === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground",
                        state === "active" && "font-medium",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : status === "empty" ? (
          <EmptyBox>
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
              <Check className="size-6 text-green-600" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">
                탐지된 항목이 없습니다
              </p>
              <p className="text-sm text-muted-foreground">
                현재 기준 이미지와 유사한 이미지가 발견되지 않았어요.
                <br />
                브랜드가 안전하게 보호되고 있습니다.
              </p>
            </div>
          </EmptyBox>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((r) => (
              <ResultCard key={r.id} r={r} onOpen={() => setDetail(r)} />
            ))}
          </div>
        )}
      </div>

      {/* 라이브러리에서 선택 모달: 프로젝트 → 이미지 */}
      <Dialog open={libOpen} onOpenChange={setLibOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {pickProject ? pickProject.name : "라이브러리에서 선택"}
            </DialogTitle>
            <DialogDescription>
              {pickProject
                ? "탐지 기준으로 사용할 이미지를 골라주세요."
                : "이미지를 가져올 프로젝트를 먼저 선택하세요."}
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
                        {p.ip}
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
                프로젝트 목록
              </button>
              {libTiles.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <ImageOff className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    이 프로젝트에 아직 이미지가 없어요.
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
                  탐지된 이미지 상세 정보
                </SheetDescription>
                <SheetTitle className="text-lg">탐지 상세</SheetTitle>
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
                        <span className="text-muted-foreground">유사도</span>
                        <span className={cn("font-semibold", textClass)}>
                          {level}단계 / 10
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

                {/* 상세 정보 */}
                <dl className="flex flex-col gap-3 rounded-xl bg-muted p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">플랫폼</dt>
                    <dd className="font-medium text-foreground">
                      {detail.platform}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">탐지 시각</dt>
                    <dd className="font-medium text-foreground">
                      {detail.timeLabel}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <dt className="text-muted-foreground">발견 위치</dt>
                    <dd>
                      <a
                        href={`https://${detail.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 break-all text-[#1a76e9] hover:underline"
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
                    원본 페이지 열기
                  </a>
                </Button>
                <SheetClose asChild>
                  <Button variant="outline">닫기</Button>
                </SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
