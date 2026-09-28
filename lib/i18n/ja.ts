// 일본어 문구 — 정중체 단문, 경어 수준을 일관 유지 (です・ます 체).
// 사양·조건·제약은 접지 말고 최초 화면에 노출한다. (일본 리서치: 정보 부족에 대한 불안)
export const ja: Record<string, string> = {
  // 공통
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.delete": "削除",
  "common.confirmDeleteTitle": "削除しますか。",
  "common.optional": "(任意)",
  "common.search": "検索",
  "common.undecided": "未定",
  "common.prevPage": "前のページ",
  "common.nextPage": "次のページ",
  "common.hintFor": "{label}の説明",

  // 사이드바 · 헤더
  "app.name": "CLAPS Studio 2.0",
  "nav.projects": "プロジェクト",
  "nav.partners": "パートナー推薦",
  "nav.assets": "アセット生成",
  "nav.monitoring": "モニタリング",
  "nav.language": "言語",
  "account.fallbackName": "ライセンシー",
  "account.fallbackOrg": "組織名",
  "account.myPage": "マイページ",
  "account.logout": "ログアウト",

  // 프로필 설정
  "profile.lastStep": "最後のステップ",
  "profile.title": "プロフィール設定",
  "profile.desc": "あと少しです。基本情報を入力すると開始できます。",
  "profile.submit": "開始する",

  // 프로필 입력 항목
  "profile.name": "お名前",
  "profile.namePlaceholder": "山田 太郎",
  "profile.org": "組織名",
  "profile.orgPlaceholder": "会社名またはブランド名",
  "profile.role": "業種・職種",
  "profile.rolePlaceholder": "選択してください",

  // 업종/직무 선택지
  "role.brandMarketing": "ブランド・マーケティング",
  "role.designCreative": "デザイン・クリエイティブ",
  "role.merchandising": "MD・商品企画",
  "role.licensingIp": "ライセンシング・IP",
  "role.executive": "代表・経営",
  "role.other": "その他",

  // 마이페이지
  "myPage.title": "マイページ",
  "myPage.desc": "アカウント情報を確認して変更できます。",
  "myPage.email": "メールアドレス",
  "myPage.withdraw": "退会",
  "myPage.withdrawDesc": "アカウント情報が削除され、元に戻せません。",
  "myPage.withdrawAction": "退会する",
  "myPage.confirmTitle": "退会しますか。",
  "myPage.confirmLabel": "退会",

  // 상태 (저장값은 코드, 표시만 언어별)
  "status.ready": "準備中",
  "status.generating": "生成中",
  "status.verifying": "検証中",
  "status.needsFix": "修正が必要",
  "status.done": "完了",

  // 프로젝트 홈
  "projects.overview": "概要",
  "projects.overviewDesc": "ブランドプロジェクトの進行状況を一目で確認できます。",
  "projects.kpiActive": "進行中",
  "projects.kpiActiveHint": "完了していないプロジェクトの総数です。",
  "projects.kpiVerifying": "検証中",
  "projects.kpiVerifyingHint": "ガイド検証が進行中のプロジェクト数です。",
  "projects.kpiNeedsFix": "修正が必要",
  "projects.kpiNeedsFixHint": "検証で修正が必要と判定されたプロジェクト数です。",
  "projects.all": "すべてのプロジェクト",
  "projects.searchPlaceholder": "プロジェクトを検索...",
  "projects.new": "新規プロジェクト",
  "projects.emptyTitle": "プロジェクトがまだありません",
  "projects.emptyDesc": "「新規プロジェクト」からIPとブランドガイドを登録すると、\nここにプロジェクトが表示されます。",
  "projects.emptyAction": "プロジェクトを作成",
  "projects.colName": "プロジェクト・IP",
  "projects.colStatus": "ステータス",
  "projects.colUpdated": "更新",
  "projects.colCreated": "作成日",
  "projects.changeStatus": "ステータス変更",
  "projects.rename": "名前を変更",
  "projects.noResultTitle": "検索結果がありません",
  "projects.noResultDesc": "「{query}」に一致するプロジェクトが見つかりません。",
  "projects.deleteDesc": "プロジェクト{name}を削除すると元に戻せません。",

  // 새 프로젝트 만들기
  "newProject.title": "新規プロジェクトの作成",
  "newProject.desc": "IPを選択してプロジェクトを作成すると、アセット生成とガイド検証を開始できます。",
  "newProject.name": "プロジェクト名",
  "newProject.namePlaceholder": "例: サマーカプセルコレクション",
  "newProject.ip": "IP・パートナー",
  "newProject.ipPlaceholder": "例: サンリオ・シナモロール",
  "newProject.undecided": "パートナーは未定です",
  "newProject.description": "プロジェクトの説明",
  "newProject.descriptionPlaceholder": "このプロジェクトの内容を簡単にご記入ください。",
  "newProject.guideNote": "ブランドガイドはプロジェクト作成後、{tab}タブからアップロードできます。",
  "newProject.guideTab": "「ブランドガイド」",
  "newProject.submit": "プロジェクトを作成",

  // 상대 시각
  "time.justNow": "たった今",
  "time.minutesAgo": "{n}分前",
  "time.hoursAgo": "{n}時間前",
  "time.daysAgo": "{n}日前",
};
