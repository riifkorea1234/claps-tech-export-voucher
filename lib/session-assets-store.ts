// 생성 세션의 이미지 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)
//
// 세션 하나는 3단계로 진행되고, 단계마다 이미지 묶음을 갖는다.
//   1단계 generated : 생성한 이미지 전체        (claps:session:{id})
//   2단계 verify    : 검증으로 넘긴 이미지      (claps:verify:{id})
//   3단계 final     : 최종본으로 확정한 이미지  (claps:final:{id})
//
// 저장소 접근은 이 파일에만 두고, 화면에서는 아래 함수만 쓴다.
// 실서버 연동 시 이 파일의 read/write만 API 호출로 교체하면 된다.

import type { GeneratedAsset } from "@/components/domain/asset-result-card";

export type SessionStage = "generated" | "verify" | "final";

const KEY_PREFIX: Record<SessionStage, string> = {
  generated: "claps:session:",
  verify: "claps:verify:",
  final: "claps:final:",
};

function keyOf(stage: SessionStage, sessionId: string): string {
  return `${KEY_PREFIX[stage]}${sessionId}`;
}

// 해당 단계의 이미지 목록 (없으면 빈 배열)
export function getStageAssets(
  stage: SessionStage,
  sessionId: string,
): GeneratedAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyOf(stage, sessionId));
    if (raw) return JSON.parse(raw) as GeneratedAsset[];
  } catch {
    // 저장소 접근 불가(프라이빗 모드 등) → 빈 목록으로 처리
  }
  return [];
}

// 해당 단계의 이미지 목록 저장
export function setStageAssets(
  stage: SessionStage,
  sessionId: string,
  assets: GeneratedAsset[],
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyOf(stage, sessionId), JSON.stringify(assets));
  } catch {
    // 용량 초과 등은 무시
  }
}

// 해당 단계에 이미지가 1장이라도 있는지 (진행 단계 판별용)
// 키만 있고 목록이 비어 있으면 그 단계에 도달하지 않은 것으로 본다.
export function hasStageAssets(
  stage: SessionStage,
  sessionId: string,
): boolean {
  return getStageAssets(stage, sessionId).length > 0;
}

// 세션의 모든 단계 이미지 삭제 (세션 삭제 시)
export function clearSessionAssets(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    (Object.keys(KEY_PREFIX) as SessionStage[]).forEach((stage) =>
      localStorage.removeItem(keyOf(stage, sessionId)),
    );
  } catch {
    // 무시
  }
}
