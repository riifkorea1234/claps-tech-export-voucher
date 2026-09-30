// 탐지 기록 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)

// 탐지된 항목 (검색 결과 1건)
export interface ScanResult {
  id: number;
  // 저장에는 코드를 쓰고, 화면에 보일 이름은 lib/i18n 사전의 platform.* 에서 가져온다
  platform: "google" | "naver";
  similarity: number;
  // 탐지 시각 표기. 저장된 옛 데이터는 timeLabel(문자열), 새 목업은 열쇠말을 쓴다.
  timeLabel?: string;
  timeLabelKey?: string;
  timeLabelN?: number;
  url: string;
  // 유사도 산출에 기여한 속성별 값. 수치 하나만 보여주면 무엇이 부족한지
  // 알 수 없다는 미국 리서치 지적에 따른 것. (적용안 ④ AI 근거 표시)
  factors?: ScanFactor[];
  // 사용자가 오탐으로 신고했는지. 결과를 거부할 수단을 결과 화면 안에 둔다.
  reportedFalse?: boolean;
}

// 유사도 근거 4항목 — 무단 사용 판단의 실제 근거가 되는 것들
export type ScanFactorKey = "character" | "color" | "composition" | "logo";

export interface ScanFactor {
  key: ScanFactorKey;
  value: number;
}

/* 자동 판정이 애매한 구간은 단정하지 않고 "확인 필요"로 둔다.
   리서치: 판정이 불명확한 경우 확인 필요 상태로 분류 */
export type ScanVerdict = "high" | "review" | "low";

export function scanVerdictOf(similarity: number): ScanVerdict {
  if (similarity >= 90) return "high";
  if (similarity >= 80) return "review";
  return "low";
}

export interface SavedMonitoringRecord {
  id: string;
  imageName: string; // 첨부한 이미지 파일명
  imageData?: string; // 업로드 이미지(데이터 URL)
  imageGradient?: string; // 라이브러리에서 고른 이미지(그라디언트 클래스)
  firstScannedAt?: string; // 최초 탐지 일시 (옛 데이터엔 없을 수 있음)
  scannedAt: string; // 최근 탐지 일시
  resultCount: number; // 탐지된 건수
  results?: ScanResult[]; // 탐지된 항목 목록
  status?: "results" | "empty"; // 마지막 탐지 상태
}

const KEY = "claps:monitoring:records";

export function getRecords(): SavedMonitoringRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedMonitoringRecord[]) : [];
  } catch {
    return [];
  }
}

// id로 한 건 조회 (기록 상세 복원용)
export function getRecord(id: string): SavedMonitoringRecord | undefined {
  return getRecords().find((r) => r.id === id);
}

function save(records: SavedMonitoringRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // 무시 (용량 초과 등)
  }
}

// 새 기록을 맨 위에 추가
export function addRecord(rec: SavedMonitoringRecord) {
  save([rec, ...getRecords()]);
}

// 기존 기록 갱신 (재탐지 시 일시·건수 · 이름 변경)
export function updateRecord(
  id: string,
  patch: Partial<SavedMonitoringRecord>,
) {
  save(getRecords().map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

// 기록 삭제
export function deleteRecord(id: string) {
  save(getRecords().filter((r) => r.id !== id));
}
