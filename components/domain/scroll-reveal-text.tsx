"use client";

import { useEffect, useRef, useState } from "react";

// 스크롤에 따라 단어가 하나씩 연하게 → 진하게 나타나는 텍스트.
// text에 "\n"을 넣으면 줄바꿈으로 렌더.
export function ScrollRevealText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 요소가 화면 아래(70%)에서 올라와 위쪽(35%)에 닿는 동안 0 → 1
      const start = vh * 0.7;
      const end = vh * 0.35;
      const p = (start - rect.top) / (start - end);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const lines = text.split("\n").map((line) => line.split(/\s+/).filter(Boolean));
  const total = lines.reduce((count, words) => count + words.length, 0);

  return (
    <p ref={ref} className={className}>
      {lines.map((words, li) => {
        const offset = lines.slice(0, li).reduce((count, line) => count + line.length, 0);
        return (
          <span key={li}>
            {words.map((w, wi) => {
              const idx = offset + wi;
              const wp = Math.max(0, Math.min(1, progress * total - idx));
              const opacity = 0.18 + 0.82 * wp;
              return (
                <span
                  key={wi}
                  style={{ opacity, transition: "opacity 0.2s linear" }}
                >
                  {w}
                  {wi < words.length - 1 ? " " : ""}
                </span>
              );
            })}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </p>
  );
}
