import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

function TextInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

function AddChip() {
  return (
    <button
      type="button"
      className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      + 추가
    </button>
  );
}

export default function PartnersCriteriaPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto w-full max-w-[800px] overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_8px_30px_-6px_rgba(0,0,0,0.10)]">
        {/* 다크 헤더 */}
        <div className="border-b border-border bg-primary px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-primary-foreground">
            매칭 기준 정보
          </h2>
          <p className="mt-1.5 text-sm text-primary-foreground/70">
            입력한 정보를 기준으로 파트너를 추천해 드립니다. 언제든 수정할 수
            있어요.
          </p>
        </div>

        {/* 입력 필드 */}
        <div className="flex flex-col gap-5 p-6">
          <Field label="IP 참조 이미지">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                className="flex size-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <ImagePlus className="size-5" />
                <span className="text-xs">이미지 업로드</span>
              </button>
              {[0, 1, 2].map((i) => (
                <div key={i} className="size-24 rounded-lg bg-muted" />
              ))}
            </div>
          </Field>

          <Field label="IP 메타">
            <div className="flex flex-col gap-3.5 sm:flex-row">
              <TextInput placeholder="IP 이름 (예: 헬로키티)" />
              <TextInput placeholder="카테고리 (예: 캐릭터)" />
            </div>
          </Field>

          <Field label="세계관 속성">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>명랑</Chip>
              <Chip>우정</Chip>
              <Chip>일상</Chip>
              <Chip>귀여움</Chip>
              <AddChip />
            </div>
          </Field>

          <Field label="라이선시 속성 (자사)">
            <TextInput placeholder="자사 브랜드 · 타깃 · 톤앤매너" />
          </Field>

          <Field label="업종 · 매출">
            <div className="flex flex-col gap-3.5 sm:flex-row">
              <TextInput placeholder="업종 (예: 문구 제조)" />
              <TextInput placeholder="연매출 (예: 50억)" />
            </div>
          </Field>

          <Field label="콜라보 이력">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>산리오 2023</Chip>
              <Chip>디즈니 2022</Chip>
              <Chip>카카오 2021</Chip>
              <AddChip />
            </div>
          </Field>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-5">
          <Button variant="outline" asChild>
            <Link href="/partners">취소</Link>
          </Button>
          <Button asChild>
            <Link href="/partners">저장하고 매칭 결과 보기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
