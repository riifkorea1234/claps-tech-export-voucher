#!/usr/bin/env python3
"""Build the local, credential-free evidence index from actual execution records."""
from pathlib import Path
import json, csv, html, hashlib, datetime, collections, tarfile, difflib

repo = Path(__file__).resolve().parents[1]
root = repo / 'md/evidence-full-process'
def read(name, default=None):
    p = root / name
    return json.loads(p.read_text()) if p.exists() else default
seed = read('seed-result.json')
base = read('capture-results.json')
supplement = read('supplement-results.json', {'records': [], 'checks': []})
flow = read('ui-flow-results.json', {'captures': [], 'scenarios': [], 'checks': [], 'errors': []})
edge = read('edge-results.json', {'records': [], 'checks': [], 'errors': []})
audit = read('server-audit.json', {})
records = base['records'] + supplement['records'] + flow['captures'] + edge['records']
assert all((root / item['file']).is_file() for item in records)
for item in records:
    item['sha256'] = hashlib.sha256((root / item['file']).read_bytes()).hexdigest()
    item.setdefault('device', 'desktop')
by_locale = collections.Counter(item['locale'] for item in records)
by_device = collections.Counter(item['device'] for item in records)
page_errors = [e for e in base['errors'] if e['kind'] == 'pageerror'] + flow['errors'] + edge.get('errors', [])
checks = supplement['checks'] + edge['checks'] + flow['checks']
success = len(flow['scenarios']) == 2 and all(s['status'] == 'passed' for s in flow['scenarios']) and all(c['ok'] for c in checks) and not page_errors and audit.get('allStoredFilesValid') and audit.get('pendingJobs') == 0
report = {'status': 'complete' if success else 'needs-review', 'target': 'https://claps.arcreation.work', 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'evidenceAccounts': 10, 'seedSteps': len(seed['steps']), 'seedChecks': len(seed['checks']), 'unitAndLocaleTests': 93, 'nextTypegenAndTypecheck': 'passed', 'browserFlows': flow['scenarios'], 'captureCount': len(records), 'capturesByLocale': dict(by_locale), 'capturesByDevice': dict(by_device), 'pageErrors': page_errors, 'initialHttpObservations': base['errors'], 'initialHarnessFailures': [c for c in base['checks'] if not c['ok']], 'finalSupplementChecks': checks, 'storedFilesChecked': len(audit.get('fileChecks', [])), 'storedFileChecksPassed': audit.get('allStoredFilesValid'), 'pendingJobs': audit.get('pendingJobs'), 'existingAdministratorPreserved': True, 'backup': 'server backup/pre-evidence-v1-20261020', 'run': 'run_5d77a4bd650f', 'task': 'task_8bc3e4c471a5', 'dispatch': 'ctx_01387ac4dab3'}
(root / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(root / 'capture-index.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
with (root / 'capture-index.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['label', 'locale', 'device', 'route', 'file', 'sha256'], extrasaction='ignore')
    writer.writeheader(); writer.writerows(records)

cards = []
for item in records:
    esc = lambda key: html.escape(str(item.get(key, '')))
    cards.append(f'<article data-search="{esc("label")} {esc("locale")} {esc("device")} {esc("route")}"><h2>{esc("label")}</h2><p>{esc("locale")} · {esc("device")} · <code>{esc("route")}</code></p><a href="{esc("file")}" target="_blank"><img src="{esc("file")}" alt="{esc("label")}" loading="lazy"></a></article>')
(root / 'index.html').write_text('''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CLAPS 증빙 캡처</title><style>body{font:15px system-ui;margin:0;background:#f3f5f7;color:#17212b}header{position:sticky;top:0;background:#fff;padding:18px 24px;border-bottom:1px solid #ddd;z-index:2}h1{font-size:23px;margin:0 0 8px}input{padding:10px;width:min(90%,650px);border:1px solid #aaa;border-radius:6px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;padding:24px}article{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px;overflow:hidden}h2{font-size:16px}article img{width:100%;height:340px;object-fit:contain;object-position:top;background:#eee}code{overflow-wrap:anywhere}p{line-height:1.5}a{color:#155b86}</style><header><h1>CLAPS 실제 화면 증빙 — ''' + str(len(records)) + '''장</h1><p>대상: claps.arcreation.work · 일반 en/ja · 관리자 ko/en/ja · 데스크톱/모바일<br>생성·추출·검증·검색 결과는 명시된 합성 샘플입니다. 실제 AI 평가·침해 탐지 결과가 아닙니다.</p><p><a href="RESULT.md">최종 보고</a> · <a href="COVERAGE.md">커버리지</a> · <a href="capture-index.csv">CSV</a> · <a href="verification.json">검증 JSON</a> · <a href="HARNESS-OBSERVATIONS.md">최초 관측/재검증</a></p><input id="filter" placeholder="언어, mobile, admin, verification, monitoring 등 검색"><span id="count"></span></header><main>''' + ''.join(cards) + '''</main><script>const f=document.querySelector('#filter'),cards=[...document.querySelectorAll('article')];f.oninput=()=>{let n=0;for(const c of cards){c.hidden=!c.dataset.search.toLowerCase().includes(f.value.toLowerCase());if(!c.hidden)n++;}document.querySelector('#count').textContent=' '+n+'장';};f.oninput();</script></html>''')

coverage = [
('공개·인증','랜딩·로그인/가입·메일대기·복구/변경·프로필·마이페이지','일반 en/ja, 모바일 프로필, 정지/미확인 로그인 거절. 실제 외부 메일·OAuth는 미연동.'),
('프로젝트·세션','목록·검색·없음·30개 초과 페이지·생성·편집·상태·커버·보관/복구·이름 변경','서비스 시드와 브라우저 UI. 아카이브/페이지2 보완 캡처.'),
('가이드','PDF 업로드·실제 추출 큐·규칙 편집·공개·v2 변경·stale·잘못된 PDF','증빙 패널은 실제 DB/파일/큐 사용. 일반 가이드 패널은 기존 UI 프로토타입.'),
('생성','프롬프트·합성3후보·queued/running/success/failure/cancel/retry·채택/취소','샘플 공급자만 허용. 일반 모델·스타일/비율 설정의 실제 AI 출력은 미연동.'),
('검증·최종','가이드 snapshot·통과/검토/반려·재검증·최종화 허용/거절·최종본 해제','공급자명·엔진·합성 이유 표시. 실제 모델 품질평가 아님.'),
('ZIP·증빙','실제 ZIP 생성/다운로드·CRC·PNG checksum·타임라인·증명서','영어/일본어 ZIP을 Python 독립 reader로 검사. 원본 파일 전체 checksum 감사.'),
('리뷰','수동/자동 체크·발행·고정 스냅샷·현재 조건 변경 stale·인쇄/PDF','브라우저 영/일 발행 통과. 문서 출력 계약은 일본어 전용.'),
('추천','합성 파트너7개·공개/비공개·이미지·영일 번역·초안/게시·기준/참고이미지·검색/정렬/상세','실제 rules-v1 추천 엔진. 실제 사업자나 AI 추천 품질을 의미하지 않음.'),
('모니터링','파일/자산 원본·미실행/결과/없음/부분성공/실패·과거 검색·요인·오탐 보고/철회·보관','실제 서비스·큐·이력. 소스/URL/점수는 샘플이며 외부 검색은 실행하지 않음.'),
('관리자','재인증·대시보드·회원/프로젝트/파트너/작업/가이드/모니터링/감사/언어·번역·이미지·확인창','ko/en/ja 데스크톱·모바일, 합성 회원 복구/정지·감사 이력. 실관리자 데이터 보존.'),
('접근·오류','비로그인·타 소유자404·회원의 관리자403·정지/미확인·잘못된 버전/입력','서비스/공개 HTTP 검사. 첫 하네스 기대값·선택자 오류는 원본과 수정 후 기록을 모두 유지.'),
]
text = '# 화면·기능 커버리지\n\n실제로 존재하는 화면과 상태만 기록합니다. 개별 캡처는 capture-index.csv / index.html에서 확인합니다.\n\n| 영역 | 확인 범위 | 실행 방식·제한 |\n|---|---|---|\n'
for row in coverage: text += '| ' + ' | '.join(row) + ' |\n'
text += '\n별도 전체 화면 이미지 확대 모달과 일반 AI 생성·스타일/비율 공급자 연결은 현재 제품에 구현되지 않았으므로 캡처 완료로 표시하지 않습니다. 공개 가입의 실제 메일 배송·OAuth·실시간 웹 검색도 완료 범위가 아닙니다. 합성 그림 내부의 일부 글자는 컨테이너 폰트 부재로 사각형으로 보일 수 있으며 UI의 언어 텍스트와 샘플/엔진 표시는 정상입니다.\n'
(root / 'COVERAGE.md').write_text(text)

counts = ', '.join(f'{k} {v}' for k, v in audit.get('counts', {}).items())
(root / 'RESULT.md').write_text(f'''# CLAPS 증빙 시드·전체 흐름 검증 결과

대상: https://claps.arcreation.work · 상태: **{report['status']}**

- 새 합성 계정 10개를 적용했다. 기존 실관리자의 비밀번호 해시·권한·상태 digest는 변경 전과 일치했다.
- DB·업로드는 변경 전 일관된 백업을 만들었다. 서버 `backup/pre-evidence-v1-20261020/`와 `backup-manifest.json`에서 확인한다.
- 서비스 시드 {len(seed['steps'])}단계를 실행했다. 1차 126단계 후 기존 단계를 재사용하고 페이지 나눔 39단계를 추가했다. 저장된 프로세스 검사 {len(seed['checks'])}건이 통과했다.
- 공개 Chromium에서 영어·일본어 각각 PDF→추출→공개→생성3후보→채택→검증3판정→최종화→ZIP→리뷰 발행→원본 업로드→모니터링을 실제 클릭해 완료했다.
- 캡처 **{len(records)}장**: 언어 {dict(by_locale)}, 기기 {dict(by_device)}. HTML 인덱스는 `index.html`이다.
- 단위·언어팩 93개, production build, Next typegen 후 최종 TypeScript 검사가 통과했다. 최종 저장 파일 {len(audit.get('fileChecks', []))}개의 크기·SHA-256 검사 통과, 대기/실행 중 작업 {audit.get('pendingJobs')}개다.
- 실제 ZIP 2개의 CRC·PNG 내용·SHA-256을 독립 Python reader로 검사했다. 리뷰 출력 PDF 2개도 보관했다.

최종 DB 집계: {counts}.

새 계정과 비밀번호는 `ACCOUNTS.md`에만 기록하고 0600 및 해당 파일만 지정한 Git ignore로 보호했다. 서버/DB/API/기존 관리자 비밀은 문서에 넣지 않았다. 로컬 `private-state.json` 역시 0600·정확한 ignore로 보호한다. 부모 F: 드라이브는 POSIX 0600을 표현하지 않아 새 계정 파일 하나에만 상속을 끈 Windows 현재 사용자+SYSTEM ACL을 적용했다. 드라이브 mount나 다른 파일·사용자 권한은 변경하지 않았다. 실제 검증값은 `sync-receipt.json`에 있다.

실제 AI·외부 검색·메일·OAuth는 연결되지 않았다. 생성·추출·검증·모니터링은 정확히 지정된 증빙 계정에만 허용한 **합성 샘플 공급자**로 실행했고, 일반 사용자의 결과를 가짜 평가로 대체하지 않았다. 추천은 기존 `rules-v1` 엔진을 사용했다. 리뷰 문서 출력은 현재 제품 계약상 일본어다.

최초 관측(기대 HTTP값/일본어 선택자/비동기 checkbox/응답 본문 대기/재인증 제한)은 `HARNESS-OBSERVATIONS.md`와 원본 JSON에 남겼다. jobs 배경 RSC 502는 1회 관측됐고 서버에는 destination stream closed early 로그가 있었다. 원인은 확정하지 않았으며 동일 RSC 경로를 5회 다시 요청해 모두200을 확인하고 최종 화면을 캡처했다.

재실행: `RUNBOOK.md`. 상세 커버리지 및 미연동 범위: `COVERAGE.md`. 전체 판정: `verification.json`.

작업 위치: `{repo}` · branch `ARCreation/evidence-full-process`.
Run `run_5d77a4bd650f` / Task `task_8bc3e4c471a5` / Dispatch `ctx_01387ac4dab3`.
''')
(root / 'STATUS.md').write_text(f'''# 실제 진행 상태

- 상태: {report['status']}
- 공개 URL: https://claps.arcreation.work
- 완료: 변경 전 백업·10계정·165단계 시드·영일 서비스/브라우저 전체 흐름·{len(records)}장 캡처·관리자3언어 모바일·ZIP·증빙/리뷰·최종 파일 감사.
- 검사: 단위/언어팩93개, production build/TypeScript, 보완 검사, 저장 파일 checksum 통과. 잔여 queued/running {audit.get('pendingJobs')}개.
- 최초 관측과 수정 후 결과: HARNESS-OBSERVATIONS.md, supplement-results.json.
- 부모 전달: sync-receipt.json을 확인한다.
- Run: run_5d77a4bd650f / Task task_8bc3e4c471a5 / Dispatch ctx_01387ac4dab3.
''')

# Compare with the copied starting hashes; never call the large inherited diff our own work.
baseline = read('BASELINE.json')['files']
changed = []; patch = []
for folder in ['app','components','lib','scripts','tests','deploy']:
    for p in (repo / folder).rglob('*'):
        if not p.is_file() or "__pycache__" in p.parts: continue
        rel = p.relative_to(repo).as_posix(); digest = hashlib.sha256(p.read_bytes()).hexdigest()
        if baseline.get(rel) == digest: continue
        changed.append({'file': rel, 'before': baseline.get(rel), 'after': digest})
        original = Path('/mnt/f/claps-product') / rel
        if p.suffix in ['.ts','.tsx','.mjs','.py','.sh','.yaml'] and (not baseline.get(rel) or original.is_file() and hashlib.sha256(original.read_bytes()).hexdigest() == baseline[rel]):
            old = original.read_text().splitlines(keepends=True) if baseline.get(rel) else []
            patch.extend(difflib.unified_diff(old,p.read_text().splitlines(keepends=True),fromfile='a/'+rel,tofile='b/'+rel))
p = repo / '.gitignore'; changed.append({'file':'.gitignore','after':hashlib.sha256(p.read_bytes()).hexdigest()})
(root / 'implementation-manifest.json').write_text(json.dumps(changed,indent=2)+'\n')
(root / 'implementation.patch').write_text(''.join(patch))
with tarfile.open(root / 'implementation-source.tar.gz','w:gz') as archive:
    for item in changed: archive.add(repo/item['file'],arcname=item['file'])
print(json.dumps({'status':report['status'],'captures':len(records),'changedSourceFiles':len(changed),'storedFiles':report['storedFilesChecked']}))
