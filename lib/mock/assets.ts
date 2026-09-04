// 임시 목업 데이터 — 나중에 생성 세션 API로 교체 (구조 유지)

export interface AssetSession {
  id: string;
  title: string; // 자동 생성 제목
  timeLabel: string; // 예전 데이터 호환용 표기 (createdAt 없을 때만 사용)
  createdAt?: number; // 생성 시각 (ms) — 이 값이 있으면 상대시간으로 계산
  projectId?: string; // 소속 프로젝트 (생성 설정에서 프로젝트 선택 시 연결)
  thumbnailUrl?: string;
}

export interface SessionGroup {
  label: string; // 오늘 / 지난 7일 / 이전
  sessions: AssetSession[];
}

// 기본은 빈 목록(더미 없음). 새 에셋 생성으로만 채워짐.
export const sessionGroups: SessionGroup[] = [];

// id로 세션 찾기 (워크스페이스 제목 표시용)
export function findSession(id: string): AssetSession | undefined {
  for (const group of sessionGroups) {
    const found = group.sessions.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}
