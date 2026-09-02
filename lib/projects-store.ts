// 프로젝트 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)

import type { Project } from "@/lib/mock/projects";

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

// 시각(ms) → "2026.10.30" 날짜 포맷
export function formatDate(ms?: number): string {
  if (!ms) return "-";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// 최근 수정 시각(ms) → 상대표기. 1주 넘으면 날짜로.
export function formatRelativeTime(ms?: number): string {
  if (!ms) return "-";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// 프로젝트 삭제
export function deleteProject(id: string) {
  save(getProjects().filter((p) => p.id !== id));
}
