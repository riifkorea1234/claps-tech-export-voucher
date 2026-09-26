// Read compatibility for the pre-i18n browser store. Only known enum fields are
// normalized; project names, prompts, descriptions, and other user text are untouched.
const statuses: Record<string, string> = {
  "준비 중": "preparing",
  "생성 중": "generating",
  "검증 중": "verifying",
  "수정 필요": "needs_fix",
  완료: "completed",
};
const roles: Record<string, string> = {
  "브랜드/마케팅": "marketing",
  "디자인/크리에이티브": "design",
  "MD/상품기획": "merchandising",
  "라이선싱/IP": "licensing",
  "대표/경영": "management",
  기타: "other",
};
export function normalizeStatus(value: string) {
  return statuses[value] ?? value;
}
export function normalizeRole(value: string) {
  return roles[value] ?? value;
}
export function normalizeGroup(value: string) {
  return (
    (
      { 오늘: "today", "지난 7일": "last_week", 이전: "earlier" } as Record<
        string,
        string
      >
    )[value] ?? value
  );
}
export function normalizePlatform(value: string) {
  return value === "구글" ? "google" : value === "네이버" ? "naver" : value;
}
