import type { Translator } from "./core";
export function relativeTime(
  ms: number | undefined,
  locale: string,
  now = Date.now(),
) {
  if (!ms) return "—";
  const minutes = Math.max(0, Math.floor((now - ms) / 60000));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return formatter.format(-days, "day");
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}
export function legacyTime(value: string, t: Translator) {
  if (value === "방금" || value === "just_now") return t("common.justNow");
  const match = /^(\d+)(분|시간|일) 전$/.exec(value);
  if (!match) return value;
  const key = {
    분: "relativeMinutes",
    시간: "relativeHours",
    일: "relativeDays",
  }[match[2]];
  return t(`common.${key}`, { count: Number(match[1]) });
}
export function displayDate(
  value: number | string | undefined,
  locale: string,
) {
  if (!value) return "—";
  const date =
    typeof value === "number"
      ? new Date(value)
      : /^\d{4}\.\d{2}\.\d{2}$/.test(value)
        ? new Date(value.replaceAll(".", "-") + "T00:00:00+09:00")
        : /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
