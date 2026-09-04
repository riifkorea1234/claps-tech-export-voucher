// 계정(프로필) 저장소 — 백엔드 연동 전 임시(localStorage)
// 이메일별 프로필을 저장하고, 현재 로그인한 계정을 기억한다.
// 실서버 연동 시 이 파일만 API 호출로 교체하면 된다.

export type Account = {
  email: string;
  name: string;
  org: string;
  role?: string;
};

// 업종/직무 선택지 (프로필 설정 · 마이페이지 공용 · 추후 조정)
export const ROLES = [
  "브랜드/마케팅",
  "디자인/크리에이티브",
  "MD/상품기획",
  "라이선싱/IP",
  "대표/경영",
  "기타",
];

const ACCOUNTS_KEY = "claps:accounts"; // { [email]: Account }
const CURRENT_KEY = "claps:current-email"; // string

function readAccounts(): Record<string, Account> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, Account>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // 저장 실패는 무시 (프라이빗 모드 등)
  }
}

// 이 브라우저에 해당 이메일로 가입한 적이 있는지 (신규/기존 판별)
export function isRegistered(email: string): boolean {
  return Boolean(readAccounts()[email.trim().toLowerCase()]);
}

// 프로필 저장 + 현재 로그인 계정으로 설정
export function upsertAccount(account: Account) {
  const key = account.email.trim().toLowerCase();
  const accounts = readAccounts();
  accounts[key] = { ...account, email: key };
  writeAccounts(accounts);
  setCurrentEmail(key);
}

// 현재 로그인 이메일 설정 (기존 회원 로그인 시)
export function setCurrentEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENT_KEY, email.trim().toLowerCase());
  } catch {
    // 무시
  }
}

// 현재 로그인 계정
export function getAccount(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const email = localStorage.getItem(CURRENT_KEY);
    if (!email) return null;
    return readAccounts()[email] ?? null;
  } catch {
    return null;
  }
}

// 회원 탈퇴 (계정 정보 삭제 + 세션 해제)
export function deleteAccount() {
  if (typeof window === "undefined") return;
  try {
    const email = localStorage.getItem(CURRENT_KEY);
    if (email) {
      const accounts = readAccounts();
      delete accounts[email];
      writeAccounts(accounts);
    }
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    // 무시
  }
}

// 로그아웃 (계정 정보는 남기고 현재 세션만 해제)
export function clearCurrent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    // 무시
  }
}
