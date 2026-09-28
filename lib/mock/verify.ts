// 검증 결과 타입/규칙 — 실제 검증엔진 붙기 전까지 점수 기반 임시 판정
// 판정·규칙 이름은 저장에 코드를 쓰고, 화면에 보일 글자는 lib/i18n 사전에서 가져온다.

export type Verdict = "pass" | "reject";
export type RuleVerdict = "Pass" | "Warn" | "Reject"; // 배지에 그대로 쓰는 영문 약어

export interface RuleResult {
  nameKey: string; // 규칙 이름 (사전 열쇠말)
  noteKey: string; // 교차검증 설명 (사전 열쇠말)
  verdict: RuleVerdict;
}

// 점수로 임시 판정 (나중에 실제 검증 결과로 교체)
export function verdictOf(score: string | number): Verdict {
  return Number(score) < 0.88 ? "reject" : "pass";
}

// 반려 케이스 규칙 결과
export const rejectRules: RuleResult[] = [
  { nameKey: "rule.color", noteKey: "ruleNote.bothAgree", verdict: "Reject" },
  {
    nameKey: "rule.clearSpace",
    noteKey: "ruleNote.dslStronger",
    verdict: "Reject",
  },
  {
    nameKey: "rule.typography",
    noteKey: "ruleNote.vlmOnly",
    verdict: "Warn",
  },
  {
    nameKey: "rule.noDeformation",
    noteKey: "ruleNote.pass",
    verdict: "Pass",
  },
  { nameKey: "rule.context", noteKey: "ruleNote.pass", verdict: "Pass" },
];

// 통과 케이스 규칙 결과
export const passRules: RuleResult[] = [
  { nameKey: "rule.color", noteKey: "ruleNote.pass", verdict: "Pass" },
  { nameKey: "rule.clearSpace", noteKey: "ruleNote.pass", verdict: "Pass" },
  { nameKey: "rule.typography", noteKey: "ruleNote.pass", verdict: "Pass" },
  {
    nameKey: "rule.noDeformation",
    noteKey: "ruleNote.pass",
    verdict: "Pass",
  },
  { nameKey: "rule.context", noteKey: "ruleNote.pass", verdict: "Pass" },
];
