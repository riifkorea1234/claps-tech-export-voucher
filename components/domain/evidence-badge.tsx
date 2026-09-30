"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { getEntries } from "@/lib/evidence-store";

/* 기록 중 표시 — 생성 화면에서 "지금 기록되고 있다"를 보이게 한다.
   기록은 눈에 보이지 않는 곳에서 쌓이므로, 화면에 단서가 없으면
   무엇을 증명하는 기능인지 알 수 없다. (적용안 ③ 기록) */

function subscribe() {
  return () => {};
}

export function EvidenceBadge({ sessionId }: { sessionId: string }) {
  const { t } = useLocale();
  const last = useRef(0);
  const read = useCallback(() => {
    const n = getEntries(sessionId).length;
    if (n !== last.current) last.current = n;
    return last.current;
  }, [sessionId]);
  const count = useSyncExternalStore(subscribe, read, () => 0);

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-success" />
        <span className="text-xs font-medium text-foreground">
          {t("evidence.recording", { n: count })}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("evidence.recordingHint")}
      </p>
    </div>
  );
}
