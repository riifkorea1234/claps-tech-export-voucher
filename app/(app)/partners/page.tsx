"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkle,
  Mail,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { FactorBars } from "@/components/domain/factor-bars";
import { PartnerCard } from "@/components/domain/partner-card";
import {
  heroPartner,
  partners,
  matchCriteria,
  type Partner,
  type HeroPartner,
} from "@/lib/mock/partners";

// 근거 값 → 정성 표기
function factorNote(v: number) {
  if (v >= 85) return "매우 높음";
  if (v >= 70) return "높은 편";
  if (v >= 55) return "보통";
  return "낮은 편";
}

// 정렬 옵션 (종합순 = 매칭점수, 나머지는 각 근거 항목값)
const SORT_OPTIONS = [
  "종합순",
  "세계관 적합순",
  "가격 적합순",
  "팬덤 중첩순",
  "업종 연관순",
] as const;
type SortKey = (typeof SORT_OPTIONS)[number];

export default function PartnersPage() {
  // 재매칭 시 이 값이 바뀌면서 바들이 재마운트 → 다시 차오름
  const [runKey, setRunKey] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("종합순");

  // 협업 요청 팝업 — 선택한 파트너 {이름, 이메일} (null = 닫힘)
  const [collab, setCollab] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // IP 상세 패널 — 선택한 파트너 (null = 닫힘)
  const [detail, setDetail] = useState<Partner | HeroPartner | null>(null);

  async function copyEmail() {
    if (!collab) return;
    try {
      await navigator.clipboard.writeText(collab.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 사용 불가 시 무시
    }
  }

  // 선택한 기준으로 파트너 그리드 정렬
  const sortedPartners = useMemo(() => {
    const arr = [...partners];
    if (sortKey === "종합순") {
      return arr.sort((a, b) => b.matchScore - a.matchScore);
    }
    const factorLabel = sortKey.replace(/순$/, ""); // "가격 적합순" → "가격 적합"
    const val = (p: (typeof partners)[number]) =>
      p.factors.find((f) => f.label === factorLabel)?.value ?? 0;
    return arr.sort((a, b) => val(b) - val(a) || b.matchScore - a.matchScore);
  }, [sortKey]);

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {/* 매칭 기준 배너 (다크) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-primary px-6 py-4">
        <span className="shrink-0 text-sm font-medium text-primary-foreground">
          매칭 기준
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {matchCriteria.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
            >
              {c}
            </span>
          ))}
        </div>
        <Link
          href="/partners/criteria"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          수정
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* 툴바 — 재매칭 / 필터 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setRunKey((k) => k + 1)}
        >
          <RefreshCw className="size-4" />
          재매칭
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="size-4" />
              {sortKey}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onSelect={() => setSortKey(opt)}
                className="justify-between gap-4"
              >
                {opt}
                {opt === sortKey && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 1위 추천 히어로 카드 */}
      <div className="flex flex-col gap-6 rounded-[15px] border border-border bg-card p-6 lg:flex-row">
        <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-[10px] bg-muted lg:h-auto lg:w-[234px] lg:self-stretch">
          <Image
            src={heroPartner.imageUrl}
            alt={heroPartner.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 상단 */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground">
                  #1 추천
                </span>
                <span className="text-lg font-semibold text-card-foreground">
                  {heroPartner.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {heroPartner.stats.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground">종합 매칭</span>
              <span className="text-3xl font-bold tracking-tight text-brand">
                {heroPartner.matchScore}%
              </span>
            </div>
          </div>

          {/* AI 근거 + 매칭 바 */}
          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-muted px-5 py-3">
              <div className="flex items-center gap-1.5">
                <Sparkle className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  AI 추천 근거
                </span>
              </div>
              <p className="text-sm text-card-foreground">
                {heroPartner.aiSummary}
              </p>
            </div>
            <div className="flex-1">
              <FactorBars key={runKey} factors={heroPartner.factors} />
            </div>
          </div>

          {/* 액션 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setDetail(heroPartner)}
            >
              IP 상세
            </Button>
            <Button
              size="sm"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() =>
                setCollab({ name: heroPartner.name, email: heroPartner.email })
              }
            >
              협업 요청
            </Button>
          </div>
        </div>
      </div>

      {/* 파트너 그리드 (#2~) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPartners.map((p) => (
          <PartnerCard
            key={`${p.id}-${runKey}`}
            partner={p}
            onCollab={() => setCollab({ name: p.name, email: p.email })}
            onDetail={() => setDetail(p)}
          />
        ))}
      </div>

      {/* IP 상세 — 우측 슬라이드 패널 */}
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]"
        >
          {detail && (
            <>
              <SheetHeader className="gap-4 border-b border-border p-6">
                <SheetDescription className="sr-only">
                  {detail.name} IP 상세 정보
                </SheetDescription>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
                  {"imageUrl" in detail && detail.imageUrl && (
                    <Image
                      src={detail.imageUrl}
                      alt={detail.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      #{detail.rank} 추천
                    </span>
                    <SheetTitle className="text-lg">{detail.name}</SheetTitle>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      종합 매칭
                    </span>
                    <span className="text-2xl font-bold text-brand">
                      {detail.matchScore}%
                    </span>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                {/* AI 추천 근거 (있을 때) */}
                {"aiSummary" in detail && detail.aiSummary && (
                  <section className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkle className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        AI 추천 근거
                      </span>
                    </div>
                    <p className="rounded-lg bg-muted px-4 py-3 text-sm text-card-foreground">
                      {detail.aiSummary}
                    </p>
                  </section>
                )}

                {/* 매칭 근거 상세 */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    매칭 근거
                  </h3>
                  <div className="flex flex-col gap-3.5 rounded-xl bg-muted p-5 pt-4">
                    {detail.factors.map((f) => (
                      <div key={f.label} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{f.label}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {factorNote(f.value)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {f.value}%
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#6B0096] to-brand"
                            style={{ width: `${f.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 팬덤·시장 (hero stats 있을 때) */}
                {"stats" in detail && detail.stats && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      팬덤 · 시장
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.stats.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 협업 담당 */}
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    협업 담당
                  </h3>
                  <div className="rounded-lg bg-muted p-3.5">
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="text-sm font-medium text-foreground">
                      {detail.email}
                    </p>
                  </div>
                </section>
              </div>

              <SheetFooter className="flex-row gap-2 border-t border-border p-6">
                <SheetClose asChild>
                  <Button variant="outline" className="flex-1">
                    닫기
                  </Button>
                </SheetClose>
                <Button
                  className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => {
                    const d = detail;
                    setDetail(null);
                    setCollab({ name: d.name, email: d.email });
                  }}
                >
                  협업 요청
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* 협업 요청 — 이메일 연락 유도 팝업 (선택한 파트너 기준) */}
      <Dialog
        open={collab !== null}
        onOpenChange={(open) => {
          if (!open) setCollab(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader className="gap-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand/5">
              <Mail className="size-6 text-brand" />
            </div>
            <div className="flex flex-col gap-4">
              <DialogTitle className="text-base font-semibold">
                이메일로 협업을 요청하세요
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">
                  {collab?.name}
                </span>
                은 아직 앱 내 협업 채널을 제공하지 않아요. 아래 이메일로 제안을
                보내면 담당자가 검토 후 회신드려요.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* 이메일 카드 */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3.5">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">
                협업 담당 이메일
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {collab?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={copyEmail}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-brand" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  복사
                </>
              )}
            </button>
          </div>

          {/* 포함하면 좋은 내용 */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              메일에 이런 내용을 담아주세요
            </span>
            <ul className="flex flex-col gap-1.5 px-2">
              {[
                "회사·브랜드 소개",
                "협업 제안 내용과 목표",
                "희망 일정·규모",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* 본문과 16px 간격 (카드 기본 24px에서 -8px) */}
          <DialogFooter className="-mt-2">
            <DialogClose asChild>
              <Button variant="outline">닫기</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
