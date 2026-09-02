// 에셋 생성 목록 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)
// 최초엔 목업(sessionGroups)으로 시드, 이후 이름 변경·삭제가 저장됨.

import {
  sessionGroups as seed,
  type SessionGroup,
  type AssetSession,
} from "@/lib/mock/assets";

// v2 = 더미 시드 제거 · 빈 목록 기본 (기존 더미 저장분은 버리고 새로 시작)
const KEY = "claps:assets:groups:v2";

export function getGroups(): SessionGroup[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SessionGroup[];
  } catch {
    // 무시
  }
  return seed; // 저장된 게 없으면 목업으로 시작
}

export function saveGroups(groups: SessionGroup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(groups));
  } catch {
    // 무시 (용량 초과 등)
  }
}

// 모든 세션을 평평하게 (그룹 무시)
export function getAllSessions(): AssetSession[] {
  return getGroups().flatMap((g) => g.sessions);
}

// 세션을 프로젝트에 연결 (없는 세션이면 fallbackTitle로 새로 만들어 '오늘'에 추가)
export function setSessionProject(
  id: string,
  projectId: string,
  fallbackTitle?: string,
) {
  const groups = getGroups();
  let found = false;
  const next = groups.map((g) => ({
    ...g,
    sessions: g.sessions.map((s) => {
      if (s.id === id) {
        found = true;
        return { ...s, projectId };
      }
      return s;
    }),
  }));

  if (!found && fallbackTitle) {
    const session: AssetSession = {
      id,
      title: fallbackTitle,
      timeLabel: "방금",
      projectId,
    };
    const todayIdx = next.findIndex((g) => g.label === "오늘");
    if (todayIdx >= 0) {
      next[todayIdx] = {
        ...next[todayIdx],
        sessions: [session, ...next[todayIdx].sessions],
      };
    } else {
      next.unshift({ label: "오늘", sessions: [session] });
    }
  }

  saveGroups(next);
}
