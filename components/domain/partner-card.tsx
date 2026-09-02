import { Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FactorBars } from "@/components/domain/factor-bars";
import type { Partner } from "@/lib/mock/partners";

// 추천 파트너 카드 (#2~) — 아바타·랭크·이름·매칭%·근거바·액션
export function PartnerCard({
  partner,
  onCollab,
  onDetail,
}: {
  partner: Partner;
  onCollab?: () => void;
  onDetail?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-card p-5">
      {/* 상단: 아바타 + 랭크/이름 + 매칭 */}
      <div className="flex items-center gap-3">
        <div className="size-[52px] shrink-0 overflow-hidden rounded-lg bg-muted" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            #{partner.rank}
          </span>
          <span className="w-full truncate text-sm font-medium text-card-foreground">
            {partner.name}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-xs text-muted-foreground">종합 매칭</span>
          <span className="text-lg font-semibold text-card-foreground">
            {partner.matchScore}%
          </span>
        </div>
      </div>

      {/* AI 추천 근거 */}
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center gap-1 px-2">
          <Sparkle className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">AI 추천 근거</span>
        </div>
        <FactorBars factors={partner.factors} />
      </div>

      {/* 액션 */}
      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1"
          onClick={onDetail}
        >
          IP 상세
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1"
          onClick={onCollab}
        >
          협업 요청
        </Button>
      </div>
    </div>
  );
}
