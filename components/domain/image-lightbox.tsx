"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// 이미지 전체화면 보기 (배경·Escape·닫기 버튼 클릭으로 닫힘)
// asset이 null이면 닫힌 상태.
export function ImageLightbox({
  asset,
  onClose,
}: {
  asset: { gradient: string; aspectClass: string } | null;
  onClose: () => void;
}) {
  // Escape로 닫기
  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, onClose]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="size-6" />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[85vh] w-[min(90vw,720px)] overflow-hidden rounded-xl shadow-2xl",
          asset.aspectClass,
          asset.gradient,
        )}
      />
    </div>
  );
}
