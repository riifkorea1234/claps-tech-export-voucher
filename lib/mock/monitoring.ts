// 임시 목업 — 나중에 탐지 기록 API로 교체 (구조 유지)

export interface MonitoringRecord {
  id: string;
  imageName: string; // 기준 이미지 파일명
  scannedAt: string; // 탐지 일시
  resultCount: number; // 탐지된 건수
  platforms: string; // 검색한 플랫폼
}

// 기본값 = 빈 목록 (탐지 기록 없음). 실제 데이터는 백엔드 연동 시 채워짐.
export const monitoringRecords: MonitoringRecord[] = [];

export function findMonitoringRecord(id: string) {
  return monitoringRecords.find((r) => r.id === id);
}
