// 탐지 기록 저장소 (브라우저 localStorage · 백엔드 붙기 전 임시)

// 탐지된 항목 (검색 결과 1건)
export interface ScanResult {
  id: number;
  platform: "구글" | "네이버";
  similarity: number;
  timeLabel: string;
  url: string;
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
