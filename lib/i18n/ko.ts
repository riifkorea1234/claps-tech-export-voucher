// 한국어 문구 — 기준 사전. 다른 언어에 없는 열쇠말은 여기 값으로 대체된다.
// 대응표: md/클랩스_문구_대응표.md
export const ko: Record<string, string> = {
  // 공통
  "common.cancel": "취소",
  "common.save": "저장",
  "common.delete": "삭제",
  "common.confirmDeleteTitle": "정말 삭제할까요?",
  "common.optional": "(선택)",
  "common.search": "검색",
  "common.undecided": "미정",
  "common.prevPage": "이전 페이지",
  "common.nextPage": "다음 페이지",
  "common.hintFor": "{label} 설명",

  // 사이드바 · 헤더
  "app.name": "CLAPS Studio 2.0",
  "nav.projects": "프로젝트",
  "nav.partners": "파트너 추천",
  "nav.assets": "에셋 생성",
  "nav.monitoring": "모니터링",
  "nav.language": "언어",
  "account.fallbackName": "라이선시 담당자",
  "account.fallbackOrg": "회사명",
  "account.myPage": "마이페이지",
  "account.logout": "로그아웃",

  // 프로필 설정 (신규 가입 마지막 단계)
  "profile.lastStep": "마지막 단계",
  "profile.title": "프로필 설정",
  "profile.desc": "거의 다 됐어요. 기본 정보를 입력하면 시작합니다.",
  "profile.submit": "시작하기",

  // 프로필 입력 항목 (프로필 설정 · 마이페이지 공용)
  "profile.name": "이름",
  "profile.namePlaceholder": "홍길동",
  "profile.org": "조직명",
  "profile.orgPlaceholder": "회사 / 브랜드명",
  "profile.role": "업종 / 직무",
  "profile.rolePlaceholder": "선택하세요",

  // 업종/직무 선택지
  "role.brandMarketing": "브랜드/마케팅",
  "role.designCreative": "디자인/크리에이티브",
  "role.merchandising": "MD/상품기획",
  "role.licensingIp": "라이선싱/IP",
  "role.executive": "대표/경영",
  "role.other": "기타",

  // 마이페이지
  "myPage.title": "마이페이지",
  "myPage.desc": "계정 정보를 확인하고 수정할 수 있어요.",
  "myPage.email": "이메일",
  "myPage.withdraw": "회원 탈퇴",
  "myPage.withdrawDesc": "계정 정보가 삭제되며 되돌릴 수 없어요.",
  "myPage.withdrawAction": "탈퇴하기",
  "myPage.confirmTitle": "정말 탈퇴할까요?",
  "myPage.confirmLabel": "탈퇴",

  // 상태 (저장값은 코드, 표시만 언어별)
  "status.ready": "준비 중",
  "status.generating": "생성 중",
  "status.verifying": "검증 중",
  "status.needsFix": "수정 필요",
  "status.done": "완료",

  // 프로젝트 홈
  "projects.overview": "개요",
  "projects.overviewDesc": "브랜드 프로젝트의 진행 상황을 한눈에 확인하세요.",
  "projects.kpiActive": "진행 중 프로젝트",
  "projects.kpiActiveHint": "완료되지 않은 전체 프로젝트 수예요.",
  "projects.kpiVerifying": "검증 중",
  "projects.kpiVerifyingHint": "가이드 검증이 진행 중인 프로젝트 수예요.",
  "projects.kpiNeedsFix": "수정 필요",
  "projects.kpiNeedsFixHint": "검증에서 수정이 필요하다고 나온 프로젝트 수예요.",
  "projects.all": "전체 프로젝트",
  "projects.searchPlaceholder": "프로젝트 검색...",
  "projects.new": "새 프로젝트",
  "projects.emptyTitle": "아직 프로젝트가 없어요",
  "projects.emptyDesc": "\u2018새 프로젝트\u2019를 눌러 IP와 브랜드 가이드를 등록하면\n여기에 프로젝트가 쌓여요.",
  "projects.emptyAction": "새 프로젝트 만들기",
  "projects.colName": "프로젝트 / IP",
  "projects.colStatus": "상태",
  "projects.colUpdated": "업데이트",
  "projects.colCreated": "생성일",
  "projects.changeStatus": "상태 변경",
  "projects.rename": "이름 변경",
  "projects.noResultTitle": "검색 결과가 없어요",
  "projects.noResultDesc": "\u2018{query}\u2019와 일치하는 프로젝트를 찾지 못했어요.",
  "projects.deleteDesc": "{name} 프로젝트를 삭제하면 되돌릴 수 없어요.",

  // 새 프로젝트 만들기
  "newProject.title": "새 프로젝트 만들기",
  "newProject.desc": "IP를 선택하고 프로젝트를 만들면 에셋 생성·가이드 검증을 시작할 수 있어요.",
  "newProject.name": "프로젝트 이름",
  "newProject.namePlaceholder": "예: 썸머 캡슐 컬렉션",
  "newProject.ip": "IP · 파트너",
  "newProject.ipPlaceholder": "예: 산리오 · 시나모롤",
  "newProject.undecided": "아직 파트너가 정해지지 않았어요 (미정)",
  "newProject.description": "프로젝트 설명",
  "newProject.descriptionPlaceholder": "이 프로젝트가 어떤 작업인지 간단히 적어주세요.",
  "newProject.guideNote": "브랜드 가이드는 프로젝트를 만든 뒤 {tab} 탭에서 업로드할 수 있어요.",
  "newProject.guideTab": "\u2018브랜드 가이드\u2019",
  "newProject.submit": "프로젝트 생성",

  // 상대 시각
  "time.justNow": "방금",
  "time.minutesAgo": "{n}분 전",
  "time.hoursAgo": "{n}시간 전",
  "time.daysAgo": "{n}일 전",
};
