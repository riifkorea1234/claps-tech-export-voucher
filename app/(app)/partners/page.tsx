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
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import {
  heroPartner,
  partners,
  matchCriteria,
  type Partner,
  type HeroPartner,
} from "@/lib/mock/partners";

// 근거 값 → 정성 표기의 열쇠말
function factorNoteKey(v: number) {
  if (v >= 85) return "factorNote.veryHigh";
  if (v >= 70) return "factorNote.high";
  if (v >= 55) return "factorNote.medium";
  return "factorNote.low";
}

// 정렬 옵션 — overall = 매칭점수, 나머지는 같은 이름의 근거 항목값
const SORT_OPTIONS = [
  "overall",
  "worldview",
  "price",
  "fandom",
  "industry",
] as const;
type SortKey = (typeof SORT_OPTIONS)[number];

export default function PartnersPage() {
  // 재매칭 시 이 값이 바뀌면서 바들이 재마운트 → 다시 차오름
  const { t } = useLocale();
  const [runKey, setRunKey] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("overall");

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
    if (sortKey === "overall") {
      return arr.sort((a, b) => b.matchScore - a.matchScore);
    }
    const val = (p: (typeof partners)[number]) =>
      p.factors.find((f) => f.key === sortKey)?.value ?? 0;
    return arr.sort((a, b) => val(b) - val(a) || b.matchScore - a.matchScore);
  }, [sortKey]);

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {/* 매칭 기준 요약 (회색 바깥 + 흰 안쪽 박스) */}
      <div className="flex flex-col gap-3 rounded-[14px] bg-muted p-3">
        {/* 제목 줄 */}
        <div className="flex items-center justify-between gap-3 px-1.5 pt-1">
          <span className="text-sm font-medium text-foreground">
            {t("partners.criteria")}
          </span>
          <Link
            href="/partners/criteria"
            className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("partners.criteriaEdit")}
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* 항목마다 개별 흰 카드 */}
        <div className="flex flex-wrap gap-2">
          {matchCriteria.map((c) => {
            const label = t(c.labelKey);
            const keywords = c.keywords ?? [];
            return (
              <div
                key={c.labelKey}
                className="flex min-w-[140px] flex-1 flex-col gap-1.5 rounded-[10px] border border-border bg-card px-4 py-3"
              >
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    // 칩은 자체 좌우 여백이 있어 라벨을 2px 맞춰줌
                    keywords.length > 1 && "pl-0.5",
                  )}
                >
                  {label || t("partners.criteriaFallback")}
                </span>
                {keywords.length > 1 ? (
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-card-foreground">
                    {c.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
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
          {t("partners.rematch")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="size-4" />
              {t(`sort.${sortKey}`)}
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
                {t(`sort.${opt}`)}
                {opt === sortKey && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 1위 추천 히어로 카드 */}
      <div className="flex flex-col gap-6 rounded-[15px] border border-border bg-card p-[var(--pad-card)] lg:flex-row">
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
                  {t("partners.rank1")}
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
              <span className="text-xs text-muted-foreground">
                {t("partners.matchScore")}
              </span>
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
                  {t("partners.aiReason")}
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
              {t("partners.ipDetail")}
            </Button>
            <Button
              size="sm"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() =>
                setCollab({ name: heroPartner.name, email: heroPartner.email })
              }
            >
              {t("partners.collab")}
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
                  {t("partners.detailSr", { name: detail.name })}
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
                      {t("partners.rankN", { n: detail.rank })}
                    </span>
                    <SheetTitle className="text-lg">{detail.name}</SheetTitle>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {t("partners.matchScore")}
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
                        {t("partners.aiReason")}
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
                    {t("partners.factorsTitle")}
                  </h3>
                  <div className="flex flex-col gap-3.5 rounded-xl bg-muted p-5 pt-4">
                    {detail.factors.map((f) => (
                      <div key={f.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {t(`factor.${f.key}`)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {t(factorNoteKey(f.value))}
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
                      {t("partners.fandomMarket")}
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
                    {t("partners.contact")}
                  </h3>
                  <div className="rounded-lg bg-muted p-3.5">
                    <p className="text-xs text-muted-foreground">{t("partners.email")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {detail.email}
                    </p>
                  </div>
                </section>
              </div>

              <SheetFooter className="flex-row gap-2 border-t border-border p-6">
                <SheetClose asChild>
                  <Button variant="outline" className="flex-1">
                    {t("common.close")}
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
                  {t("partners.collab")}
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
                {t("partners.collabTitle")}
              </DialogTitle>
              <DialogDescription>
                {/* 언어마다 어순이 달라서 사전 문구를 {name} 자리에서 잘라 강조를 준다 */}
                {(() => {
                  const [before, after] = t("partners.collabDesc").split(
                    "{name}",
                  );
                  return (
                    <>
                      {before}
                      <span className="font-medium text-foreground">
                        {collab?.name}
                      </span>
                      {after}
                    </>
                  );
                })()}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* 이메일 카드 */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3.5">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">
                {t("partners.contactEmail")}
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
                  {t("partners.copied")}
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  {t("partners.copy")}
                </>
              )}
            </button>
          </div>

          {/* 포함하면 좋은 내용 */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              {t("partners.mailChecklist")}
            </span>
            <ul className="flex flex-col gap-1.5 px-2">
              {[
                "partners.mailItem1",
                "partners.mailItem2",
                "partners.mailItem3",
              ].map((key) => (
                <li
                  key={key}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {/* 본문과 16px 간격 (카드 기본 24px에서 -8px) */}
          <DialogFooter className="-mt-2">
            <DialogClose asChild>
              <Button variant="outline">{t("common.close")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
