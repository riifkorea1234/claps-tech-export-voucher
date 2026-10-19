# CLAPS 개발서버 배포

2026-10-20에 현재 작업 트리(미커밋 변경 포함)의 영어 기본값·일본어 지원 버전을 Docker로 배포했다.
기준 Git HEAD는 `b4749eb851c6cfef28f207adfca5f3f1ee942f66`이다.

- 공개 URL: https://claps.arcreation.work
- SSH: `ssh arcreation@ssh.arcreation.work` (이번 배포는 동일 서버의 내부 경로 `100.120.69.30` 사용)
- 서버 경로: `/home/arcreation/deployments/claps`
- Compose project: `claps-prod`
- 진입점: `127.0.0.1:39081` → web 컨테이너의 3000
- Cloudflare Tunnel: `arcreation-home-server`
- DB/업로드: `claps-prod_db-data`, `claps-prod_uploads-data`
- 이미지: `claps-web:20261020-i18n`, `claps-worker:20261020-i18n`, `claps-migrate:20261020-i18n`
- 배포 기록·소스·이미지 아카이브: `releases/20261020-i18n/`
- 교체 전 DB·업로드 백업: `backup/pre-20261020-i18n/`

기존 DB의 마이그레이션 14개가 현재 소스와 일치하는 것을 확인한 뒤
`0014_english_default_locales`만 추가 적용했다. 일반 화면은 영어·일본어,
어드민은 한국어·영어·일본어를 지원한다. UI 기본값과 fallback은 영어이며,
어드민의 언어 쿠키는 일반 화면과 별도로 저장한다.

서비스 교체 직전에 web/worker를 중지하고 DB와 업로드를 함께 백업했다.
기존 사용자 계정의 권한·상태·비밀번호 해시가 교체 전후 동일함을 검증했다.
실제 메일, OAuth, AI 생성·검증·검색 공급자는 연결되지 않았다.
메일이 비활성화되어 공개 가입의 이메일 확인과 비밀번호 복구는 사용할 수 없다.
기존 최고 관리자 계정 `admin@claps.arcreation.work`를 유지했다. 비밀번호는 저장소에 기록하지 않는다.

검증: Docker production build/TypeScript 및 단위·언어팩 검사 90개 통과,
migration/seed exit 0, DB/web/worker healthy. 전송한 세 이미지의 파일시스템
layer hash가 로컬과 서버에서 동일했다. 공개 사이트에서 일본어 전환·새로고침,
최고 관리자 로그인·비밀번호 재확인·화면 간 독립된 언어 설정을 검증했고
브라우저 오류는 0건이었다. 결과는 `releases/20261020-i18n/verification.json`에 보관한다.

## 서버 관리

```bash
cd ~/deployments/claps
docker compose ps -a
docker compose logs --tail=100 web worker
curl -fsS http://127.0.0.1:39081/api/health
docker compose up -d --wait
```

서버 `.env`는 mode 600이며 공개 origin과 생성한 DB 비밀번호를 포함한다.
DB는 호스트 포트로 노출하지 않는다. MasterPlan/cloud2cad의 구성은 변경하지 않았다.

서버 `backup/`에 최초 배포 소스(`source-20261003.tar.gz`), 이미지 ID,
Cloudflare 변경 전 Tunnel/DNS 응답을 보관했다. 소스 아카이브에는 `.env`,
로컬 업로드, Git, node_modules, 테스트 산출물을 포함하지 않는다.
아카이브는 배포 재현 자료이며 DB/업로드 백업을 대체하지 않는다.

이번 배포의 원본 소스 아카이브 SHA-256은
`a4c71e44a85ece3265b11c337a945221eaea0727ce449588589d749a47b93833`이다.
DB·업로드 백업 파일의 검증값은 `backup/pre-20261020-i18n/manifest.json`에 있다.

## 업데이트

로컬 `Dockerfile`로 web/worker/migrate를 빌드하고 새 태그로 서버에 전송한다.
`remote/compose.yaml`의 세 이미지 태그를 함께 갱신한 뒤 서버에서
`docker compose up -d --wait`를 실행한다. migration 실패 시 web/worker는
실행되지 않는다. DB 변경 전 DB와 업로드의 일관된 백업을 준비한다.

## 이전 이미지로 복귀

이번 배포 전 Compose 설정은 `releases/20261020-i18n/previous-compose.yaml`에 보관했다.
다음 명령은 이전 web/worker 이미지를 기동하며 DB와 업로드를 보존한다.

```bash
cp releases/20261020-i18n/previous-compose.yaml compose.yaml
docker compose up -d --no-deps --wait web worker
```

## 이번 배포 중지

서버에서 `docker compose stop`을 실행하면 저장된 DB와 업로드를 유지하며
CLAPS 서비스만 중지한다. 공개 경로까지 제거하려면 Cloudflare에서
`claps.arcreation.work` Tunnel 경로와 해당 CNAME만 제거한다.
다른 서비스의 이후 변경을 덮어쓰지 않도록 전체 Tunnel 설정을 과거 백업으로
일괄 복원하지 않는다. `docker compose down -v`는 데이터 삭제이므로 사용하지 않는다.
