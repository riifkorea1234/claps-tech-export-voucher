// 서버·클라이언트 양쪽에서 쓰는 설정값.
// "use client"가 붙은 파일에 두면 서버에서 값이 비어버리므로 여기에 따로 둔다.

// 지원 언어 — 리서치 대상국 기준 (사이트맵의 中은 이번 범위 밖)
export const LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

// 언어 선택 메뉴 표기 — 각 언어의 자기 이름으로
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

// 브라우저에 선택을 기억시킬 열쇠말
export const LOCALE_STORAGE_KEY = "claps.locale";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
