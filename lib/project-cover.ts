// 프로젝트 썸네일(커버) 계산 — 목록·상세 공통 규칙
// 규칙: 수동 지정 > 최근 라이브러리 이미지 > 기본 썸네일(undefined)

import { getAllSessions } from "@/lib/assets-store";
import { getStageAssets } from "@/lib/session-assets-store";
import type { ProjectCover } from "@/lib/mock/projects";

// 이 프로젝트에 연결된 세션들의 최종본(라이브러리) 이미지 (최근 세션 순)
// excludeSessionId: 지금 연결 중인 세션은 빼고 계산 (썸네일이 선택 따라 흔들리지 않게)
export function getProjectLibrary(
  projectId: string,
  excludeSessionId?: string,
): { id: string; gradient: string }[] {
  const linked = getAllSessions().filter(
    (s) => s.projectId === projectId && s.id !== excludeSessionId,
  );
  return linked.flatMap((s) =>
    getStageAssets("final", s.id).map((a) => ({
      id: a.id,
      gradient: a.gradient,
    })),
  );
}

// 한 세션의 커버 = 그 세션 최종본의 가장 최근 이미지 (없으면 기본 썸네일)
export function resolveSessionCover(
  sessionId: string,
): ProjectCover | undefined {
  const first = getStageAssets("final", sessionId)[0];
  return first ? { kind: "gradient", value: first.gradient } : undefined;
}

// 표시할 커버: 수동 커버 > 최근 이미지 > undefined(기본 썸네일)
// excludeSessionId: 프로젝트 선택 팝업처럼 "지금 연결 중인 세션"은 빼고 볼 때 사용
export function resolveProjectCover(
  projectId: string,
  manual?: ProjectCover,
  excludeSessionId?: string,
): ProjectCover | undefined {
  if (manual) return manual;
  const lib = getProjectLibrary(projectId, excludeSessionId);
  if (lib[0]) return { kind: "gradient", value: lib[0].gradient };
  return undefined; // 라이브러리 비어있음 → 기본 썸네일
}
