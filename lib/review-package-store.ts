// 감수 제출 전 자체 점검 기록 (브라우저 localStorage · 백엔드 붙기 전 임시)
//
// 리서치 적용안 ⑤ "감수 제출 패키지" 의 자체 점검 부분.
// 일본은 판권사 감수가 계약상 의무라, 보내기 전에 빠진 것이 없는지
// 제출자가 스스로 확인하는 절차가 실무에 존재한다. 그 확인 결과를 남긴다.
//
// 설계 원칙
//   1) 자동으로 판정되는 항목(최종본 확정 · 검증 통과 · 이력 유무)은 저장하지 않는다.
//      기록에서 계산되므로 따로 적어두면 어긋난다.
//   2) 사람이 눈으로 봐야 아는 항목만 여기에 저장한다.
//      저작권 표기 검사는 검증엔진이 붙기 전까지 사람이 직접 확인한다.
//   3) 이 파일의 read/write 만 API 호출로 바꾸면 서버 저장으로 이전된다.

/* ── 직접 확인 항목 ────────────────────────────────────────
   화면에 보일 글자는 lib/i18n 사전에서 가져온다. 여기에는 열쇠말만 둔다. */
export type ManualCheckKey =
  | "copyrightNotice" // 저작권 표기가 들어갔는지
  | "thirdPartyAssets" // 권리관계가 불분명한 소재를 쓰지 않았는지
  | "recipientConfirmed"; // 보낼 판권사·담당자가 맞는지

export const MANUAL_CHECK_KEYS: ManualCheckKey[] = [
  "copyrightNotice",
  "thirdPartyAssets",
  "recipientConfirmed",
];

export type ManualChecks = Record<ManualCheckKey, boolean>;

const EMPTY: ManualChecks = {
  copyrightNotice: false,
  thirdPartyAssets: false,
  recipientConfirmed: false,
};

const KEY_PREFIX = "claps:review-checks:";

function keyOf(sessionId: string) {
  return `${KEY_PREFIX}${sessionId}`;
}

/** 이 세션의 직접 확인 결과 */
export function getChecks(sessionId: string): ManualChecks {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(keyOf(sessionId));
    if (!raw) return { ...EMPTY };
    const saved = JSON.parse(raw) as Partial<ManualChecks>;
    return { ...EMPTY, ...saved };
  } catch {
    return { ...EMPTY };
  }
}

/** 항목 하나를 켜고 끈다 */
export function setCheck(
  sessionId: string,
  key: ManualCheckKey,
  value: boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...getChecks(sessionId), [key]: value };
    localStorage.setItem(keyOf(sessionId), JSON.stringify(next));
  } catch {
    // 저장 실패는 무시 (용량 초과 · 프라이빗 모드 등)
  }
  notify();
}

/* ── 변경 알림 ─────────────────────────────────────────────
   저장소는 React 바깥이라 바뀐 것을 화면이 알 수 없다.
   체크를 누를 때 구독자에게 알려서 다시 그리게 한다. */
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/** 확인 결과가 바뀌면 알려준다 (useSyncExternalStore 용) */
export function subscribeChecks(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** 세션 삭제 시 함께 정리 */
export function clearChecks(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyOf(sessionId));
  } catch {
    // 무시
  }
}
