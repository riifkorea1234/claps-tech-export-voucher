"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { LOCALE_STORAGE_KEY, isLocale, type Locale } from "./config";
import { ko } from "./ko";
import { en } from "./en";
import { ja } from "./ja";

export { LOCALES, LOCALE_LABEL, LOCALE_STORAGE_KEY, isLocale } from "./config";
export type { Locale } from "./config";

const DICTS: Record<Locale, Record<string, string>> = { ko, en, ja };

/* ── 브라우저 저장소를 하나의 출처로 두고 화면이 구독하는 구조 ──
   서버에는 저장소가 없으므로 서버 그림은 항상 한국어.
   화면이 살아난 뒤 저장된 값으로 한 번 맞춘다. */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 다른 탭에서 언어를 바꾼 경우도 따라가도록
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : "ko";
  } catch {
    // 저장소를 막아둔 브라우저에서도 화면은 떠야 한다
    return "ko";
  }
}

function serverLocale(): Locale {
  return "ko";
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, readLocale, serverLocale);

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // 저장이 막혀도 이번 방문 동안은 바뀐 상태로 쓸 수 있게 둔다
    }
    listeners.forEach((notify) => notify());
  }, []);

  // 문구 사전에서 꺼내기. 없으면 한국어로, 그것도 없으면 열쇠말을 그대로 보여준다.
  // 두 번째 인자로 값을 넘기면 문구 안의 {이름} 자리에 끼워넣는다.
  // 언어마다 어순이 달라도 사전 쪽에서 자리를 정할 수 있다.
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const text = DICTS[locale][key] ?? DICTS.ko[key] ?? key;
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (whole, name) =>
        name in vars ? String(vars[name]) : whole,
      );
    },
    [locale],
  );

  return { locale, setLocale, t };
}

// 선택한 언어를 <html>에 반영 — CSS의 로케일 토큰이 이 표식을 본다
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.setAttribute("data-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return children;
}
