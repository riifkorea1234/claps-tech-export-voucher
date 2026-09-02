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
      // 요소가 화면 아래(85%)에서 올라와 위쪽(35%)에 닿는 동안 0 → 1
      const start = vh * 0.85;
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

  const lines = text.split("\n");
  const total = text.split(/\s+/).filter(Boolean).length;
  let idx = -1;

  return (
    <p ref={ref} className={className}>
      {lines.map((line, li) => {
        const words = line.split(/\s+/).filter(Boolean);
        return (
          <span key={li}>
            {words.map((w, wi) => {
              idx += 1;
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
