// 프로젝트 상세(개요) 임시 데이터 — 나중에 프로젝트 API 응답으로 교체 (구조 유지)

import type { ProjectStatus } from "./projects";

export interface ProjectSession {
  id: string; // 에셋 생성 세션 id (기존 /assets/[id] 와 연결)
  title: string;
  tag?: string; // "여름 프로모션" (있을 때만)
  generated: number; // 생성 장수
  adopted: number; // 채택 장수
  timeLabel: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  ip: string;
  status: ProjectStatus;
  updatedLabel: string;
  sessions: ProjectSession[];
}

// 화면 확인용 샘플 (지금은 어떤 프로젝트를 눌러도 이 내용을 보여줌 · 나중에 id로 조회)
export const sampleProjectDetail: ProjectDetail = {
  id: "sample",
  name: "썸머 캡슐 컬렉션",
  ip: "산리오 · 시나모롤",
  status: "검증 중",
  updatedLabel: "2일 전",
  sessions: [
    {
      id: "3",
      title: "산리오 캐릭터즈 여름 굿즈 패키지",
      tag: "여름 프로모션",
      generated: 20,
      adopted: 6,
      timeLabel: "2일 전",
    },
    {
      id: "4",
      title: "헬로키티 3D 피규어 콘셉트",
      tag: "헬로키티 굿즈",
      generated: 5,
      adopted: 0,
      timeLabel: "3일 전",
    },
    {
      id: "5",
      title: "마이멜로디 라인아트 문구류",
      tag: "문구 라인",
      generated: 15,
      adopted: 4,
      timeLabel: "5일 전",
    },
  ],
};

// "여름 프로모션 · 최종 6장" 형태로 조립 (tag 없으면 생략)
export function sessionSubtitle(s: ProjectSession): string {
  const parts: string[] = [];
  if (s.tag) parts.push(s.tag);
  parts.push(`최종 ${s.adopted}장`);
  return parts.join(" · ");
}
