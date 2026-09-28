// 영어 문구 — 담백한 직접 서술. 오류 문구는 대상·사유·조치 3요소 필수.
// 되돌릴 수 없는 조작은 실행 전에 영향 범위를 함께 제시한다. (미국 리서치: 저맥락 소통)
export const en: Record<string, string> = {
  // 공통
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.confirmDeleteTitle": "Delete this item?",
  "common.optional": "(Optional)",
  "common.search": "Search",
  "common.undecided": "Undecided",
  "common.prevPage": "Previous page",
  "common.nextPage": "Next page",
  "common.hintFor": "About {label}",

  // 사이드바 · 헤더
  "app.name": "CLAPS Studio 2.0",
  "nav.projects": "Projects",
  "nav.partners": "Partner matching",
  "nav.assets": "Asset creation",
  "nav.monitoring": "Monitoring",
  "nav.language": "Language",
  "account.fallbackName": "Licensee manager",
  "account.fallbackOrg": "Organization",
  "account.myPage": "My account",
  "account.logout": "Log out",

  // 프로필 설정
  "profile.lastStep": "Last step",
  "profile.title": "Set up your profile",
  "profile.desc": "Almost done. Enter your basic information to get started.",
  "profile.submit": "Get started",

  // 프로필 입력 항목
  "profile.name": "Name",
  "profile.namePlaceholder": "Jane Doe",
  "profile.org": "Organization",
  "profile.orgPlaceholder": "Company or brand name",
  "profile.role": "Industry or role",
  "profile.rolePlaceholder": "Select one",

  // 업종/직무 선택지
  "role.brandMarketing": "Brand and marketing",
  "role.designCreative": "Design and creative",
  "role.merchandising": "Merchandising and product planning",
  "role.licensingIp": "Licensing and IP",
  "role.executive": "Executive and management",
  "role.other": "Other",

  // 마이페이지
  "myPage.title": "My account",
  "myPage.desc": "Review and update your account information.",
  "myPage.email": "Email",
  "myPage.withdraw": "Delete account",
  "myPage.withdrawDesc":
    "Your account information will be deleted. This cannot be undone.",
  "myPage.withdrawAction": "Delete account",
  "myPage.confirmTitle": "Delete your account?",
  "myPage.confirmLabel": "Delete",

  // 상태 (저장값은 코드, 표시만 언어별)
  "status.ready": "Ready",
  "status.generating": "Generating",
  "status.verifying": "Verifying",
  "status.needsFix": "Needs revision",
  "status.done": "Complete",

  // 프로젝트 홈
  "projects.overview": "Overview",
  "projects.overviewDesc": "Track the status of your brand projects at a glance.",
  "projects.kpiActive": "Active projects",
  "projects.kpiActiveHint": "Total projects that are not yet complete.",
  "projects.kpiVerifying": "In verification",
  "projects.kpiVerifyingHint": "Projects with guideline verification in progress.",
  "projects.kpiNeedsFix": "Needs revision",
  "projects.kpiNeedsFixHint": "Projects that verification flagged for revision.",
  "projects.all": "All projects",
  "projects.searchPlaceholder": "Search projects...",
  "projects.new": "New project",
  "projects.emptyTitle": "No projects yet",
  "projects.emptyDesc": "Select New project to register an IP and brand guidelines.\nYour projects will appear here.",
  "projects.emptyAction": "Create a project",
  "projects.colName": "Project / IP",
  "projects.colStatus": "Status",
  "projects.colUpdated": "Updated",
  "projects.colCreated": "Created",
  "projects.changeStatus": "Change status",
  "projects.rename": "Rename",
  "projects.noResultTitle": "No results",
  "projects.noResultDesc": "No projects match \u201c{query}\u201d.",
  "projects.deleteDesc": "Deleting the project {name} cannot be undone.",

  // 새 프로젝트 만들기
  "newProject.title": "Create a project",
  "newProject.desc": "Select an IP and create a project to start generating assets and verifying guidelines.",
  "newProject.name": "Project name",
  "newProject.namePlaceholder": "e.g. Summer Capsule Collection",
  "newProject.ip": "IP and partner",
  "newProject.ipPlaceholder": "e.g. Sanrio, Cinnamoroll",
  "newProject.undecided": "No partner decided yet",
  "newProject.description": "Project description",
  "newProject.descriptionPlaceholder": "Briefly describe what this project covers.",
  "newProject.guideNote": "You can upload brand guidelines from the {tab} tab after creating the project.",
  "newProject.guideTab": "Brand guidelines",
  "newProject.submit": "Create project",

  // 상대 시각
  "time.justNow": "Just now",
  "time.minutesAgo": "{n} min ago",
  "time.hoursAgo": "{n} hr ago",
  "time.daysAgo": "{n} days ago",
};
