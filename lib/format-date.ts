// 날짜 형식 — 저장은 ISO 8601 하나로, 표시할 때만 언어별로 바꾼다.
// 한국   2026.09.28        2026.09.28 14:03
// 미국   09/28/2026        09/28/2026 2:03 PM
// 일본   2026年9月28日      2026年9月28日 14:03
//
// 서버·화면 양쪽에서 쓰므로 "use client" 를 붙이지 않는다.
// 로케일은 화면에서 넘겨받는다.

import type { Locale } from "./i18n/config";

const pad = (n: number) => String(n).padStart(2, "0");

/** 시각(ms) → 저장용 ISO 날짜 "2026-09-28" */
export function toISODate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 시각(ms) → 저장용 ISO 날짜시각 "2026-09-28T14:03" */
export function toISODateTime(ms: number): string {
  const d = new Date(ms);
  return `${toISODate(ms)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* 저장된 값을 Date 로 되돌린다.
   ISO 말고도 예전에 저장된 형식들이 남아 있어 함께 받아준다.
   되돌릴 수 없으면 null 을 주고, 화면에서는 저장된 글자를 그대로 보여준다. */
function parse(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return new Date(value);

  // ISO: 2026-09-28 또는 2026-09-28T14:03
  let m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
    );
  }
  // 예전 한국어 표기: 2026.09.28
  m = value.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  return null;
}

/** 저장값 → 언어별 날짜 표기 */
export function formatDate(
  value: string | number | undefined | null,
  locale: Locale,
): string {
  const d = parse(value);
  if (!d) return typeof value === "string" && value ? value : "-";

  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();

  if (locale === "en") return `${pad(mo)}/${pad(day)}/${y}`;
  if (locale === "ja") return `${y}年${mo}月${day}日`;
  return `${y}.${pad(mo)}.${pad(day)}`;
}

/** 저장값 → 언어별 날짜시각 표기 */
export function formatDateTime(
  value: string | number | undefined | null,
  locale: Locale,
): string {
  const d = parse(value);
  if (!d) return typeof value === "string" && value ? value : "-";

  const date = formatDate(value, locale);
  const h = d.getHours();
  const min = pad(d.getMinutes());

  // 미국은 12시간제 + 오전/오후 표기가 관행
  if (locale === "en") {
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${date} ${h12}:${min} ${suffix}`;
  }
  return `${date} ${pad(h)}:${min}`;
}
