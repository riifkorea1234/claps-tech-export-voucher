// 검증 결과 타입/규칙 — 실제 검증엔진 붙기 전까지 점수 기반 임시 판정

export type Verdict = "통과" | "반려";
export type RuleVerdict = "Pass" | "Warn" | "Reject";

export interface RuleResult {
  name: string;
  note: string; // 교차검증 설명
  verdict: RuleVerdict;
}

// 점수로 임시 판정 (나중에 실제 검증 결과로 교체)
export function verdictOf(score: string | number): Verdict {
  return Number(score) < 0.88 ? "반려" : "통과";
}

// 반려 케이스 규칙 결과
export const rejectRules: RuleResult[] = [
  { name: "보호색 (color)", note: "교차검증: DSL·VLM 일치", verdict: "Reject" },
  { name: "로고 안전영역 (clear-space)", note: "교차검증: DSL 우세", verdict: "Reject" },
  { name: "타이포·폰트 (typography)", note: "교차검증: VLM만 감지", verdict: "Warn" },
  { name: "로고 변형 금지 (no-deformation)", note: "교차검증: 통과", verdict: "Pass" },
  { name: "배경·문맥 (context)", note: "교차검증: 통과", verdict: "Pass" },
];

// 통과 케이스 규칙 결과
export const passRules: RuleResult[] = [
  { name: "보호색 (color)", note: "교차검증: 통과", verdict: "Pass" },
  { name: "로고 안전영역 (clear-space)", note: "교차검증: 통과", verdict: "Pass" },
  { name: "타이포·폰트 (typography)", note: "교차검증: 통과", verdict: "Pass" },
  { name: "로고 변형 금지 (no-deformation)", note: "교차검증: 통과", verdict: "Pass" },
  { name: "배경·문맥 (context)", note: "교차검증: 통과", verdict: "Pass" },
];
