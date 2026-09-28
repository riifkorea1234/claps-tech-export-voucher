// 프로젝트 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)

import type { Project } from "@/lib/mock/projects";
import { formatDate } from "./format-date";
import type { Locale } from "./i18n/config";

const KEY = "claps:projects";

export function getProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function save(list: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 무시 (용량 초과 등)
  }
}

// id로 한 건 조회
export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

// 새 프로젝트를 맨 위에 추가
export function addProject(project: Project) {
  save([project, ...getProjects()]);
}

// 기존 프로젝트 갱신 (이름 변경·상태·커버 등) — 수정 시각 자동 갱신
export function updateProject(id: string, patch: Partial<Project>) {
  const now = Date.now();
  save(
    getProjects().map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: now } : p,
    ),
  );
}

// 최근 수정 시각(ms) → 상대표기. 1주 넘으면 날짜로.
// 문구는 언어별로 다르므로 화면에서 사전(t)을 넘겨받는다.
type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function formatRelativeTime(
  ms: number | undefined,
  t: Translate,
  locale: Locale,
): string {
  if (!ms) return "-";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutesAgo", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time.hoursAgo", { n: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t("time.daysAgo", { n: day });
  // 1주가 넘으면 날짜로 (표기는 화면에서 언어별로 바꾼다)
  return formatDate(ms, locale);
}

// 프로젝트 삭제
export function deleteProject(id: string) {
  save(getProjects().filter((p) => p.id !== id));
}
