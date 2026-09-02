// 임시 목업 데이터 — 나중에 백엔드 API 응답으로 교체 (구조는 유지)

// 프로젝트 5단계 상태 (기획 흐름: 준비 → E2 생성 → E3 검증 → (수정) → 완료)
export type ProjectStatus =
  | "준비 중"
  | "생성 중"
  | "검증 중"
  | "수정 필요"
  | "완료";

// 상태 선택 UI에서 쓰는 순서 목록
export const PROJECT_STATUSES: ProjectStatus[] = [
  "준비 중",
  "생성 중",
  "검증 중",
  "수정 필요",
  "완료",
];

// 커버 썸네일 = 라이브러리 그라디언트(클래스) 또는 로컬 업로드 이미지(dataURL)
export type ProjectCover = { kind: "gradient" | "local"; value: string };

// 커버 미지정 시 기본값 (라이브러리 최신 느낌의 그라디언트)
export const DEFAULT_COVER: ProjectCover = {
  kind: "gradient",
  value: "bg-gradient-to-br from-pink-200 to-rose-300",
};

export interface Project {
  id: string;
  name: string;
  ip: string; // "산리오 · 시나모롤"
  status: ProjectStatus;
  description?: string; // 프로젝트 설명 (선택 · 없으면 생략)
  createdAt?: string; // 최초 생성일 "2026.08.28" (옛 데이터엔 없을 수 있음)
  updatedAt?: number; // 최근 수정 시각 (ms) — 변경마다 자동 갱신
  updatedLabel?: string; // (구버전 호환) 상대표기 문자열
  cover?: ProjectCover; // 커버 썸네일 (없으면 라이브러리 최신으로 대체)
  thumbnailUrl?: string;
}

export interface ProjectStats {
  activeCount: number; // 진행 중 프로젝트
  activeDelta: number; // 이번 주 증가분 (+2)
  pendingReview: number; // 검증 대기
  needsFix: number; // 수정 필요
}

export const projectStats: ProjectStats = {
  activeCount: 0,
  activeDelta: 0,
  pendingReview: 0,
  needsFix: 0,
};

// 프로젝트 없음(empty)이 기본. 나중에 백엔드 API 응답으로 채워짐.
// 데이터가 들어오면 아래 형태로 배열에 담김 (테스트용 예시):
//   { id: "1", name: "썸머 캡슐 컬렉션", ip: "산리오 · 시나모롤",
//     status: "검증 대기", updatedLabel: "2일 전" }
export const projects: Project[] = [];
