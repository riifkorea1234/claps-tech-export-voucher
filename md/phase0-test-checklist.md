# Phase 0 테스트 체크리스트

## 1. 환경·범위

- 실행일: 2026-09-22~23 (Asia/Seoul); 최종 보고 검증 2026-09-23. 기준 브랜치 feature/backend, HEAD 7f488bb.
- Linux/WSL 경로 /mnt/f/claps-product, Node v22.22.0, Python 3.12.3.
- 초기 작업 트리: md/ 안의 사용자 문서 14개가 미추적. tracked diff 없음. 원본 진행 규칙 보존.
- node_modules/next/dist/docs 미설치. Phase 0는 문서만 변경하므로 설치/Next 코드 작성은 제외하며 Phase 1에서 로컬 가이드 읽기가 필수다.
- fixture: 사용자 A/B, 비회원/일반/관리자, 중복 이메일 가입, 정상/충돌/보관/번역 사례를 문서상 대조. 실제 계정·메일·DB 데이터 없음.
- PASS는 문서·계약 검토 통과이며 서비스 인증/런타임 성공이 아니다.

## 2. 필수 검증

| ID | 필수 여부 | 분류·대상 | 실행 명령/절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P0-T01 | 필수 | 저장소·기존 변경 | git status --short; git diff --stat; git log -1 --oneline; rg --files; cat package.json 및 아래 scope 검사 | 사용자 변경 보존, 구현 완료 과장 없음 | 원본 보존·tracked 변경 0·소스 동일 | PASS |
| P0-T02 | 필수 | 결정·도구 | 사용자 최종 지시를 B-01~07과 대조; 공식 문서/npm 메타데이터 조회; decisions 검사 | Phase 1 필수 결정 확정, 이월 담당/기한 존재 | 7개 기반 확정·10개 이월 담당/기한 확인 | PASS |
| P0-T03 | 필수 | DB/API/권한 | 전체 플랜 5.5·6.6의 관계·JSONB·DTO 및 아래 수동 사례 대조; contracts 검사 | 모순 0, 실제 실행과 설계 구분 | 수동 12사례 대조, 필수 계약 누락/모순 0 | PASS |
| P0-T04 | 필수 | 추적·링크·보고 | documents 검사, 보고 생성 후 --reports 재실행 | 요구 32/32·T 24/24·깨진 링크 0·MD/HTML 동일 | 요구 32/32·T 24/24·로컬 링크 112개 정상·MD/HTML 일치 | PASS |

## 3. 수동 계약 리뷰

| 사례 | 계약 검토 결과 | 런타임 검증 Phase |
| --- | --- | --- |
| 신규 이메일 입력 → 비밀번호 설정·가입 | lookup의 nextStep만 사용; credential hash 생성과 이메일 확인·프로필 단계 분리 | 3 |
| 기존 회원/틀린 비밀번호 | 비밀번호 검사 없이는 세션 발급 없음; 프로필 URL의 email은 인증 증거가 아님 | 3 |
| lookup 후 동시에 같은 이메일 가입 | DB UNIQUE와 최종 가입 재검사; 기존 password 덮어쓰기 불가 | 3 |
| 비밀번호 찾기·재설정·변경 | 재설정 메일은 가입 여부 비노출, 토큰 만료/재사용 차단, 성공 후 세션 폐기; 변경은 현재 비밀번호 확인 | 3 |
| 비회원 및 A가 B 객체/파일 조회 | 401 또는 타인 객체 404; nested ID·JSON 참조·다운로드에도 적용 | 3~10 |
| 일반 회원 및 관리자 호출 | 서버 role 검사/403, 관리자 변경과 원본 열람 감사; 직무와 권한 분리 | 3, 6 |
| 다른 프로젝트 가이드/FK 순환 | 테이블 생성 후 복합 FK 추가, 같은 프로젝트 가이드만 활성화 | 1, 7 |
| version 충돌·동일 멱등성 키 재전송 | 조건부 UPDATE/409, hash 일치 시 기존 job·다른 내용이면 409 | 4~10 |
| 보관/탈퇴 중 늦은 worker | 대상 잠금·상태 재검사, 결과 연결 차단·파일 정리 대상으로 기록 | 5, 7~10 |
| 미검증/반려 최종 확정·가이드 교체 | 서버 근거 필수; D-05 버전 정책 확정 전 우회 허용 금지 | 7, 8 |
| 번역 초안/원문 변경/다른 소유자 가이드 | published만 공개·source_revision 비교·원본 권한 재검사 | 6, 7 |
| 언어 seed와 기본 ko 비활성화 금지 | Phase 1 최초 비활성 seed → Phase 2 파일 준비 후 활성화 → 이후 기본 ko 비활성화 금지 | 1, 2, 6 |

수동 리뷰에서 발견한 계획 공백은 비밀번호 흐름, 인증 3개 테이블, version/source_revision/cancel_requested_at, 순환 FK, locale 최초 seed 예외다. 계약에 보완했고 위 사례를 재대조했다. 실제 API/DB가 구현되지 않아 실행 테스트 증거로 취급하지 않는다.

## 4. 적용하지 않는 검증

| 범주 | 상태 | 사유·한계 | 후속 Phase |
| --- | --- | --- | --- |
| lint/formatting·typecheck·build | NOT_APPLICABLE | 앱 코드/의존성 변경 없음; 기존 HANDOFF의 경고 수치는 재검증하지 않음 | 1 이후 |
| 앱 단위·DB 통합·E2E | NOT_APPLICABLE | 실행기/서버/DB 미구현; 아래 Python은 문서 정적 검사만 수행 | 1~11 |
| migration·rollback·seed 멱등 | NOT_APPLICABLE | schema 설계만 작성; 제약의 실제 작동은 미검증 | 1 |
| API 실행·인증/권한 보안 | NOT_APPLICABLE | 계약 사례만 리뷰; 비밀번호/세션 실제 동작 미검증 | 3~10 |
| 성능·부하·timeout·외부 adapter fallback | NOT_APPLICABLE | 공급자/상한 미결정; 호출/과금 없음 | 5, 7~11 |
| 브라우저·접근성·반응형·수동 사용자 흐름 | NOT_APPLICABLE | 화면 변경 없음. 보고서 HTML 구조·반응형/인쇄 CSS 존재만 정적 검증 | 2~11 |
| Docker·백업/복구 | NOT_APPLICABLE | 호스트/볼륨 설계만 확정; 실행/데이터 보존 검증 없음 | 1, 4, 5, 11 |

## 5. 실행 기록

| 명령/절차 | 실제 결과 | 종료 코드 |
| --- | --- | --- |
| git status --short / --porcelain=v1 --untracked-files=all | 시작 시 기존 md 문서 14개만 미추적 | 0 |
| git diff --stat; git diff --exit-code; git diff --check | tracked 변경 없음; md는 미추적이므로 별도 baseline 비교 | 0 |
| git log -1 --oneline; git branch --show-current | 7f488bb, feature/backend | 0 |
| rg --files app components lib; cat package.json; localStorage/type/인증 경로 rg 조사 | UI/store/mock 확인, package scripts 4개, 서버/DB/테스트 없음 | 0 |
| node --version; python3 --version | v22.22.0 / Python 3.12.3 | 0 |
| Python pathlib로 node_modules 존재 검사 | False; Next 로컬 가이드 확보는 Phase 1 | 0 |
| Python urllib.request로 npm package JSON 조회 및 공식 문서 조회 | 전체 플랜 9.2 버전/peer/engine 확인. @types/node ^20 불일치 발견 → Phase 1은 22.20.4로 결정 | 0 (Python), 웹 도구 정상 응답 |
| cmp 진행 규칙과 착수 baseline; sha256sum | 원문 동일, 아래 script hash와 일치 | 0 |
| Python 사전 요구/링크 검사 | 요구 32/32, T ID 24, 깨진 링크 0 | 0 |
| python3 /tmp/claps-phase0-validate.py | suites=1 tests=4 passed=4 failed=0 skipped=0; 로컬 링크 96개 검사 | 0 |
| python3 /tmp/claps-phase0-validate.py --reports | 2026-09-23: suites=1 tests=4 passed=4 failed=0 skipped=0; 로컬 링크 112개·MD/HTML 본문/구조 일치 | 0 |

선정한 패키지의 공개 메타데이터는 https://registry.npmjs.org/ 아래 패키지 이름과 버전 경로에서 조회했다. 정확한 선택값과 공식 문서 링크는 전체 플랜 9.2절에 보존한다. 설치·lockfile 생성·도구 실행 검증은 하지 않았다.

## 6. 재현 가능한 문서 검사

저장소 루트에서 아래 Python 블록을 /tmp/claps-phase0-validate.py로 저장하고 실행한다. --reports는 결과 MD/HTML 생성 후 구조·본문 일치 검증을 추가한다. 원본 규칙 hash 및 HEAD 비교는 이번 Phase 0 시점에 한정된 검증이다. 외부 URL의 살아 있음이나 런타임 계약 준수는 검사하지 않는다.


```python
from pathlib import Path
from html.parser import HTMLParser
import hashlib, re, subprocess, sys
root = Path.cwd()
md = root / 'md'
plan = (md / 'development-plan.md').read_text()
reports = '--reports' in sys.argv

def section(start, end):
    return plan.split(start, 1)[1].split(end, 1)[0]

def ids(text, prefix):
    return re.findall(r'^\| (' + prefix + r'-\d+) \|', text, re.M)

def scope():
    subprocess.run(['git', 'diff', '--exit-code'], check=True, capture_output=True)
    rules = (md / 'phase-development-process-rules.md').read_bytes()
    assert hashlib.sha256(rules).hexdigest() == '54f3ce0ebeecac3cb695fe239c6ca221c2eeaa45a4107ed1983e99b42204aea0'
    for f in ['package.json', 'pnpm-lock.yaml', 'app/login/page.tsx', 'lib/account-store.ts']:
        original = subprocess.check_output(['git', 'show', 'HEAD:' + f])
        assert (root / f).read_bytes() == original, f
    assert not (root / 'node_modules').exists(), 'Phase 0 did not install dependencies'

def decisions():
    base = section('### 9.1', '### 9.2')
    deferred = section('### 9.3', '## 10.')
    assert ids(base, 'B') == [f'B-{i:02}' for i in range(1, 8)]
    assert ids(deferred, 'D') == [f'D-{i:02}' for i in range(1, 11)]
    for line in base.splitlines():
        if re.match(r'^\| B-\d+', line):
            fields = [x.strip() for x in line.strip('|').split('|')]
            assert len(fields) == 6 and all(fields) and fields[4] == '2026-09-22'
    for line in deferred.splitlines():
        if re.match(r'^\| D-\d+', line):
            fields = [x.strip() for x in line.strip('|').split('|')]
            assert len(fields) == 5 and all(fields) and '사용자' in fields[2]
            assert 'Phase' in fields[3] and fields[4]
    for token in ['이메일·비밀번호', '개인 계정 소유', '단일 호스트', '0.45.3', '1.7.5', '5.0.1', '1.63.0']:
        assert token in plan, token

def contracts():
    for table in ['users', 'projects', 'partners', 'asset_sessions', 'assets', 'brand_guides', 'jobs', 'monitoring_records', 'admin_audit_logs', 'locales', 'localized_contents', 'auth_sessions', 'auth_accounts', 'auth_verifications']:
        assert '`' + table + '`' in plan, table
    for token in ['request_hash', 'source_revision', 'row_version', 'VERSION_CONFLICT', 'Idempotency-Key', 'email/lookup', 'sign-up/email', 'sign-in/email', 'request-password-reset', 'change-password', 'nextStep', 'cancel_requested_at']:
        assert token in plan, token
    assert '/api/auth/email/start' not in plan and '/api/auth/email/verify' not in plan
    review = section('#### 권한 표 및 리뷰 사례', '#### 상태 전이')
    assert len([x for x in review.splitlines() if x.startswith('|')]) == 12
    p3 = (md / 'phase3-plan.md').read_text()
    for token in ['회원가입', '비밀번호', '동시 가입', '재설정', '현재 비밀번호', '이메일 확인']:
        assert token in p3, token
    # This checks contract presence only; case semantics are manually reviewed.

def documents():
    source = section('### 2.3', '## 3.')
    trace = section('### 10.3', '## 11.')
    req = ids(source, '[A-Z0-9]+')
    mapped = ids(trace, '[A-Z0-9]+')
    assert len(req) == len(mapped) == 32 and set(req) == set(mapped)
    expected = {f'T-{i:02}' for i in range(1, 25)}
    tests = section('## 10.', '### 10.1')
    responsibilities = section('### 10.1', '### 10.2')
    assert set(ids(tests, 'T')) == set(ids(responsibilities, 'T')) == expected
    for line in trace.splitlines():
        if re.match(r'^\| [A-Z0-9]+-\d+', line):
            fields = [x.strip() for x in line.strip('|').split('|')]
            assert fields[-1] == '11'
            phases = [int(n.strip()) for n in fields[1].split(',')]
            assert all(1 <= n <= 11 for n in phases)
            assert set(re.findall(r'T-\d+', fields[2])) <= expected
            for n in phases:
                assert (md / f'phase{n}-plan.md').exists()
    for n in range(1, 12):
        assert f'Phase {n-1}' in (md / f'phase{n}-plan.md').read_text()
    count = 0
    for file in md.glob('*.md'):
        text = re.sub(r'```.*?```', '', file.read_text(), flags=re.S)
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if '://' in target:
                continue
            assert '#' not in target, 'Anchor links need explicit validation: ' + target
            assert (file.parent / target).exists(), f'{file}: {target}'
            count += 1
    if reports:
        html = (md / 'phase0-result.html').read_text()
        report = (md / 'phase0-result.md').read_text()
        class AuditHTML(HTMLParser):
            def __init__(self):
                super().__init__(convert_charrefs=True)
                self.stack, self.text, self.links = [], [], []
                self.in_main = False
            def handle_starttag(self, tag, attrs):
                assert tag not in ('script', 'iframe'), tag
                attrs = dict(attrs)
                assert not any(k.startswith('on') for k in attrs)
                if tag not in ('meta', 'link', 'br', 'hr', 'img', 'input'):
                    self.stack.append(tag)
                if tag == 'main': self.in_main = True
                if tag == 'a': self.links.append(attrs['href'])
            def handle_endtag(self, tag):
                assert self.stack and self.stack.pop() == tag, tag
                if tag == 'main': self.in_main = False
            def handle_data(self, data):
                if self.in_main: self.text.append(data)
        parser = AuditHTML()
        parser.feed(html)
        parser.close()
        assert not parser.stack
        assert '<!doctype html>' in html.lower() and 'lang="ko"' in html
        assert 'viewport' in html and '@media print' in html and '@media' in html
        assert '<link' not in html and '<script' not in html
        for target in parser.links:
            assert '://' not in target and (md / target).exists()
        def normalize(text): return re.sub(r'\s+', '', text)
        plain = []
        for line in report.splitlines():
            if re.match(r'^\|[\s:|\-]+\|$', line): continue
            line = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)
            line = re.sub(r'^#{1,6}\s+|^-\s+', '', line)
            plain.append(line.replace('|', '').replace('`', '').replace('**', ''))
        assert normalize(''.join(plain)) == normalize(''.join(parser.text)), 'MD/HTML text mismatch'
        assert '| 상태 | COMPLETED |' in report
        assert '| P0-T04 | PASS |' in report
        assert 'phase0-test-checklist.md' in report
    print(f'  requirements=32 common_tests=24 local_links={count} reports={reports}')

checks = [('P0-T01', scope), ('P0-T02', decisions), ('P0-T03', contracts), ('P0-T04', documents)]
failed = 0
for name, check in checks:
    try:
        check()
        print(name, 'PASS')
    except Exception as error:
        failed += 1
        print(name, 'FAIL', type(error).__name__, str(error))
print(f'suites=1 tests=4 passed={4-failed} failed={failed} skipped=0')
raise SystemExit(bool(failed))
```

## 7. 실패·수정·재검증 및 판정

- 본 문서 검사: 1 suite / 4 tests, PASS 4 / FAIL 0 / SKIP 0. 실행한 필수 항목은 문서·계약 검사다.
- 런타임 suite/test: 0개 실행. 적용 제외 7개 범주이며 이를 test skip이나 PASS로 세지 않는다.
- 조사 중 @types/node peer 불일치와 인증 초안 차이를 발견해 계획을 수정했다. 실행 테스트 실패는 없으며, 결과 보고 생성 후 --reports 최종 재검증도 4 PASS, 종료 코드 0이다.
- T-01~24는 매핑만 검증했으며 전체 제품 검증 상태는 PENDING을 유지한다.
- Phase 0 완료 판정은 [결과 보고서](phase0-result.md) 및 [HTML 보고서](phase0-result.html)에 기록한다. Phase 1 차단 결정은 없고 D-01~10은 후속 게이트로 이월한다.
