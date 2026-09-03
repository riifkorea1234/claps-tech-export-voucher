"use client";

import { useRef } from "react";

// 기본 상태: 살짝 기울어진 사다리꼴(원근) 모양
const REST_TRANSFORM =
  "perspective(1400px) rotateX(0deg) rotateY(-6deg) scale(0.96)";

/**
 * 모니터링 미리보기 이미지.
 * - 기본: 원근(perspective)으로 살짝 기운 사다리꼴 형태
 * - 마우스 호버: 커서 위치에 따라 기울기가 부드럽게 밀려 따라옴
 */
export function TiltMonitorPreview() {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 중앙(0,0) 기준 -0.5 ~ 0.5
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    // 커서 방향으로 밀리는 기울기 (기본 기울기에 더해짐)
    const rotY = -9 + px * 16;
    const rotX = 4 - py * 16;
    el.style.transition = "transform 250ms cubic-bezier(0.22,1,0.36,1)";
    el.style.transform = `perspective(1400px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.99)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.22,1,0.36,1)";
    el.style.transform = REST_TRANSFORM;
  }

  return (
    <div className="[perspective:1400px]">
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ transform: REST_TRANSFORM }}
        className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/preview-monitoring.png"
          alt="CLAPS 모니터링 화면"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
