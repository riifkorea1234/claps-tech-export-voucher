# 실행·재실행 안내

운영 경로는 서버 `/home/arcreation/deployments/claps`, Compose project는 `claps-prod`이다. 적용한 웹/워커 태그는 `20261020-evidence-v1`, 기존 migrate 이미지와 DB 마이그레이션은 유지했다.

1. 실제 변경 전에 web/worker를 정지하고 `scripts/backup-restore.py`로 DB·uploads를 함께 백업한다. 기존 DB를 덮어쓰는 복원은 하지 않는다. `scripts/evidence-backup.sh`는 이번 최초 백업의 실행 기록이며 같은 이름 디렉터리가 있으면 실패한다.
2. `Dockerfile`의 web/worker를 빌드하고 이미지 아카이브를 전송한다. 전송 프로세스 exit0과 최종 SHA-256 일치를 확인한 뒤에만 load한다. `deploy/remote/compose.evidence.yaml`은 증빙 모드를 명시한다.
3. `scripts/deploy-evidence.sh`는 백업 확인, 이미지 적용, 기존 worker 정지, 시드, 복구 trap, 기존 관리자 digest 대조를 수행한다. 최신 시드는 릴리스의 `seed-evidence.ts`를 단일 파일 read-only mount로 사용한다.
4. 시드에는 `EVIDENCE_SAMPLE_MODE=claps-evidence-v1`, `EVIDENCE_TARGET_CONFIRM=https://claps.arcreation.work`, 동일 APP_ORIGIN, DB 이름 claps가 필요하다. 서버의 private `uploads/evidence-v1-private.json`에는 생성 비밀번호와 원자적 완료 체크포인트가 있다. 이를 보존해야 동일 계정/단계를 재사용한다. 기존 `seed-demo.ts`의 격리 DB guard는 변경하지 않았다.
5. `node --conditions=react-server --import tsx scripts/seed-evidence.ts`를 실행한다. 실제 메일 대신 AuthService의 메모리 수신으로 링크를 consume한다. 기존 계정이 있는데 대응하는 private state를 잃었다면 비밀번호를 임의로 덮어쓰지 말고 중지하고 복구 절차를 정한다.
6. 브라우저 캡처: `node scripts/capture-evidence.mjs`, 전체 클릭 흐름: `node scripts/verify-evidence-ui.mjs`, 보완: `node scripts/supplement-evidence.mjs`, 경계 상태: `node scripts/edge-evidence.mjs`. 이 스크립트들은 보호된 로컬 private-state.json의 새 증빙 자격 정보만 읽는다. 클릭 검증은 새 SAMPLE 프로젝트를 만들므로 반복 실행하면 추가 합성 프로젝트가 생긴다.
7. 관리자 재인증은 계정별 15분5회다. 반복 언어 캡처 시 같은 검증 세션을 재사용하거나 제한 만료 후 수행한다. 제한값을 변경하지 않는다. 최초 실행의 원본 하네스 실패와 보완 결과를 함께 읽는다.
8. `scripts/audit-evidence.ts`는 계정 상태·테이블 집계·파일 크기/체크섬·잔여 작업을 검사한다. `scripts/report-evidence.py`는 실제 JSON들을 합쳐 HTML/CSV/커버리지/보고서를 만든다. `scripts/sync-evidence.py`로 부모 md에 결과를 복사한다.

시드의 완료 체크포인트는 원자적으로 저장된다. DB 커밋 직후 체크포인트 저장 이전에 프로세스가 강제 종료되는 극단적인 구간은 수동 확인이 필요하며, 해당 경우 동일 SAMPLE 리소스가 있는지 확인한 후 재개한다. 기존 실데이터를 삭제하는 정리 스크립트는 제공하지 않는다.

일반 사용자 공급자는 연결하지 않았다. 증빙 모드를 끄려면 compose의 EVIDENCE_SAMPLE_MODE를 제거하고 web/worker를 재생성한다. 기존 계정·파일·증빙은 남는다. 이전 compose는 서버 `releases/20261020-evidence-v1/previous-compose.yaml`에 보존했다.

부모 F: 드라이브는 WSL에서 파일모드가777로 합성 표시된다. 하위 ext4 계정 원본은0600이다. 부모의 새 ACCOUNTS.md 하나에만 scripts/protect-evidence-accounts.ps1로 현재 Windows 사용자+SYSTEM ACL을 설정하며, 상속 차단·허용 SID를 검증한다. 드라이브 mount나 다른 파일·OS 사용자 권한은 변경하지 않는다.
