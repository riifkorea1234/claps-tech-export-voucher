"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceTopBar } from "@/components/domain/workspace-topbar";
import { buildBackQuery } from "@/lib/workspace-nav";
import type { GeneratedAsset } from "@/components/domain/asset-result-card";
import { findSession } from "@/lib/mock/assets";
import { getAllSessions } from "@/lib/assets-store";
import { cn } from "@/lib/utils";

export default function FinalPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const title = findSession(id)?.title ?? "Untitled";

  // 이 세션이 연결된 프로젝트의 라이브러리(프로젝트 상세)로 이동
  function goLibrary() {
    const session = getAllSessions().find((s) => s.id === id);
    router.push(session?.projectId ? `/projects/${session.projectId}` : "/projects");
  }
  const from = searchParams.get("from") ?? undefined;
  const fromLabel = searchParams.get("fromLabel") ?? undefined;
  const backSuffix = buildBackQuery(from, fromLabel);

  const [items, setItems] = useState<GeneratedAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 전체화면(라이트박스)
  const [lightbox, setLightbox] = useState<GeneratedAsset | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // 검증 화면에서 최종본에 담은 에셋을 세션에서 불러옴
  useEffect(() => {
    let list: GeneratedAsset[] = [];
    try {
      const raw = sessionStorage.getItem(`claps:final:${id}`);
      if (raw) list = JSON.parse(raw);
    } catch {
      list = [];
    }
    setItems(list);
    setLoaded(true);
  }, [id]);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(assetId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((a) => a.id)),
    );
  }

  // 최종본에서 제거 (세션에도 반영 · 되돌리려면 검증 단계에서 다시 추가)
  function removeItem(assetId: string) {
    setItems((prev) => {
      const next = prev.filter((a) => a.id !== assetId);
      try {
        sessionStorage.setItem(`claps:final:${id}`, JSON.stringify(next));
      } catch {
        // 무시
      }
      return next;
    });
    setSelected((prev) => {
      if (!prev.has(assetId)) return prev;
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5 px-8 py-7">
      <WorkspaceTopBar
        title={title}
        activeStep={3}
        sessionId={id}
        from={from}
        fromLabel={fromLabel}
      />

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">최종본</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
              {items.length}장
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            프로젝트 라이브러리에 저장됩니다.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" />
            선택 다운로드
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={goLibrary}
          >
            프로젝트 보기
          </Button>
        </div>
      </div>

      {loaded && items.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            최종본이 아직 없어요
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            가이드 검증에서 통과한 에셋을 &apos;최종본에 추가&apos;하면 여기에
            모입니다.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href={`/assets/${id}/verify${backSuffix}`}>
              가이드 검증으로
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 도구행 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded border transition-colors",
                  allSelected
                    ? "border-brand bg-brand text-white"
                    : "border-input bg-card text-transparent",
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              전체 선택
            </button>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            >
              최신순
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </div>

          {/* 그리드 (1:1 미리보기) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((a) => {
              const isSel = selected.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => setLightbox(a)}
                  className={cn(
                    "group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg",
                    a.gradient,
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(a.id);
                    }}
                    aria-pressed={isSel}
                    className={cn(
                      "absolute top-3 left-3 flex size-6 items-center justify-center rounded-[6px] border transition-colors",
                      isSel
                        ? "border-brand bg-brand text-white"
                        : "border-input bg-white text-transparent",
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </button>

                  {/* 최종본에서 제거 (호버 시) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(a.id);
                    }}
                    aria-label="최종본에서 제거"
                    title="최종본에서 제거"
                    className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  >
                    <X className="size-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              "max-h-[85vh] w-[min(90vw,720px)] overflow-hidden rounded-xl shadow-2xl",
              lightbox.aspectClass,
              lightbox.gradient,
            )}
          />
        </div>
      )}
    </div>
  );
}
