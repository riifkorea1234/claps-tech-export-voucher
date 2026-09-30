// 이력·증빙 기록 (브라우저 localStorage · 백엔드 붙기 전 임시)
//
// 리서치 적용안 ③ "이력 및 증빙 체계" 의 기록 부분.
// AI 단독 생성물에는 저작권이 발생하지 않고, 인간의 개입 이력과 검증 근거가
// 기록된 경우에 한해 자산으로 성립한다. 그래서 이 기록은 부가 기능이 아니라
// 권리 발생의 근거로 다룬다. (미국 저작권청 2025.1 보고서 · 일본 저작권법 제30조의4)
//
// 설계 원칙
//   1) 사건이 일어난 순서대로 한 줄씩 쌓는다(append-only). 나중에 고쳐 쓰지 않는다.
//      -> 타임라인 조회와 "몇 번 고쳤나" 집계가 기록 자체에서 나온다.
//   2) 화면에 보일 글자는 넣지 않고 코드와 열쇠말만 남긴다.
//      -> 언어를 바꿔도 기록은 그대로다.
//   3) 시각은 ISO 8601 로 저장한다. lib/format-date.ts 와 같은 규칙.
//   4) 이 파일의 read/write 만 API 호출로 바꾸면 서버 저장으로 이전된다.
//
// ⚠️ 한계: 브라우저 저장소는 사용자가 고칠 수 있어 법적 증빙으로는 부족하다.
//    실제 저작권 증빙에는 고칠 수 없는 서버 보관이 필요하다.

import { toISODateTime } from "./format-date";
import type { Verdict } from "./mock/verify";

/* ── 사건 종류 ──────────────────────────────────────────────
   리서치가 요구한 "생성 · 선택 · 수정 · 재생성 · 채택" 각 단계에 대응한다. */
export type EvidenceKind =
  | "session.created" // 생성 세션 시작
  | "generate.run" // 조건을 넣고 생성을 실행
  | "asset.adopted" // 후보 중 채택 (인간 개입)
  | "asset.unadopted" // 채택 취소 (인간 개입)
  | "verify.run" // 가이드 검증 실행
  | "final.added" // 최종본에 추가 (채택 확정)
  | "final.removed"; // 최종본에서 제거

/* ── 사건별로 함께 남기는 값 ───────────────────────────────── */

// 생성 조건 — "무엇을 근거로 만들었나"
export type GenerateConditions = {
  projectId?: string; // 대상 프로젝트 (= 대상 IP)
  guideName?: string; // 적용한 브랜드 가이드 파일명
  styleKey: string; // 스타일 (사전 열쇠말용 코드)
  ratio: string; // 비율 "1:1"
  prompt?: string; // 입력 원본
  resultCount: number; // 생성한 후보 수
};

// 검증 결과 — "규칙을 통과했나"
export type VerifySummary = {
  assetId: string;
  verdict: Verdict; // pass | reject
  score: string; // 신뢰도 "0.94"
  passedRules: number; // 통과한 규칙 수
  totalRules: number; // 검사한 규칙 수
};

/* ── 기록 한 줄 ──────────────────────────────────────────── */
export type EvidenceEntry = {
  id: string;
  sessionId: string;
  kind: EvidenceKind;
  at: string; // ISO 8601 "2026-09-30T14:03"
  assetId?: string; // 특정 결과물에 대한 사건일 때
  conditions?: GenerateConditions; // generate.run 일 때
  verify?: VerifySummary; // verify.run 일 때
};

/* ── 증명서 (기록을 집계한 결과) ─────────────────────────────
   리서치의 "에셋 증명서 — 대상 IP · 기준 버전 · 통과 규칙 수 · 수정 횟수" */
export type AssetCertificate = {
  sessionId: string;
  assetId: string;
  projectId?: string; // 대상 IP
  guideName?: string; // 기준 버전
  styleKey?: string;
  ratio?: string;
  prompt?: string;
  candidateCount: number; // 후보 몇 개 중에서 골랐나
  adoptCount: number; // 채택·취소를 몇 번 반복했나 (= 인간 개입 횟수)
  verdict?: Verdict;
  passedRules?: number;
  totalRules?: number;
  createdAt?: string; // 최초 생성 시점
  finalizedAt?: string; // 최종본 확정 시점
};

/* ── 저장소 ─────────────────────────────────────────────── */

const KEY_PREFIX = "claps:evidence:";

function keyOf(sessionId: string) {
  return `${KEY_PREFIX}${sessionId}`;
}

/** 이 세션의 기록 전체 (시간순) */
export function getEntries(sessionId: string): EvidenceEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyOf(sessionId));
    return raw ? (JSON.parse(raw) as EvidenceEntry[]) : [];
  } catch {
    return [];
  }
}

/** 기록 한 줄 추가 — 고쳐 쓰지 않고 뒤에 붙이기만 한다 */
export function addEntry(
  sessionId: string,
  kind: EvidenceKind,
  extra: Omit<EvidenceEntry, "id" | "sessionId" | "kind" | "at"> = {},
): void {
  if (typeof window === "undefined") return;
  const entry: EvidenceEntry = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    kind,
    at: toISODateTime(Date.now()),
    ...extra,
  };
  try {
    const next = [...getEntries(sessionId), entry];
    localStorage.setItem(keyOf(sessionId), JSON.stringify(next));
  } catch {
    // 저장 실패는 무시 (용량 초과 · 프라이빗 모드 등)
  }
}

/** 세션 삭제 시 기록도 함께 정리 */
export function clearEntries(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyOf(sessionId));
  } catch {
    // 무시
  }
}

/* ── 집계 ───────────────────────────────────────────────── */

/** 기록을 모아 결과물 한 장의 증명서를 만든다 */
export function buildCertificate(
  sessionId: string,
  assetId: string,
): AssetCertificate {
  const entries = getEntries(sessionId);
  const mine = entries.filter((e) => !e.assetId || e.assetId === assetId);

  const lastGenerate = [...mine]
    .reverse()
    .find((e) => e.kind === "generate.run");
  const lastVerify = [...mine].reverse().find((e) => e.kind === "verify.run");
  const created = mine.find((e) => e.kind === "session.created");
  const finalized = [...mine].reverse().find((e) => e.kind === "final.added");

  // 채택·취소를 반복한 횟수 = 사람이 판단에 관여한 정도
  const adoptCount = entries.filter(
    (e) =>
      e.assetId === assetId &&
      (e.kind === "asset.adopted" || e.kind === "asset.unadopted"),
  ).length;

  return {
    sessionId,
    assetId,
    projectId: lastGenerate?.conditions?.projectId,
    guideName: lastGenerate?.conditions?.guideName,
    styleKey: lastGenerate?.conditions?.styleKey,
    ratio: lastGenerate?.conditions?.ratio,
    prompt: lastGenerate?.conditions?.prompt,
    candidateCount: lastGenerate?.conditions?.resultCount ?? 0,
    adoptCount,
    verdict: lastVerify?.verify?.verdict,
    passedRules: lastVerify?.verify?.passedRules,
    totalRules: lastVerify?.verify?.totalRules,
    createdAt: created?.at ?? lastGenerate?.at,
    finalizedAt: finalized?.at,
  };
}
