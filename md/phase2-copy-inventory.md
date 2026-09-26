# Phase 2 문구·이미지 조사

고정 UI는 messages의 의미 기반 key를 사용한다. 사용자 프로젝트명·IP·프롬프트·파트너 소개·연락처·목업 업무 결과는 UI 파일에 복제하지 않는다.

## Namespace 목록

| namespace | ko/en 각각 key 수 | 담당 |
| --- | --- | --- |
| admin | 0 | Phase 6에서 추가 |
| assets | 88 | 기존 UI 연결 |
| auth | 42 | 기존 UI 연결 |
| common | 22 | 기존 UI 연결 |
| email | 0 | Phase 3에서 추가 |
| errors | 13 | Phase 1 오류 계약 |
| landing | 129 | 기존 UI 연결 |
| monitoring | 62 | 기존 UI 연결 |
| navigation | 16 | 기존 UI 연결 |
| partners | 65 | 기존 UI 연결 |
| projects | 81 | 기존 UI 연결 |

## 코드/원문 분리

- 파트너 factor/매칭 기준은 code로 분리하고 표시명만 언어팩으로 이동했다. 업무 값과 추천 원문은 그대로 유지한다.
- 프로젝트 상태: preparing/generating/verifying/needs_fix/completed. 직무 6개, 스타일 8개, 단계 3개, 검증 판정 3개, 파트너 정렬 5개, 탐지 플랫폼 2개를 고정 code로 분리했다.
- 기존 브라우저 저장소의 상태·직무·오늘 그룹·플랫폼은 읽을 때만 정상화한다. 임의 사용자 문자열을 번역하거나 덮어쓰지 않는다. 상대 시간의 이전 저장값은 표시 단계에서만 변환한다.
- 회원 선호는 Phase 3 연결점만 제공한다. 사용자의 원문 입력·생성 결과는 언어 전환으로 다시 작성하지 않는다.
- 한국어 예외는 테스트에서 경로/값으로 한정: 검증 화면의 샘플 프로젝트/가이드 제목 2개, 협업 이력 3개, 기존 탐지 결과 시간 fixture 7종 및 언어 자체 고유명 한국어. 업무 fixture의 실제 DB 번역 연결은 Phase 6~10이다.

## 이미지 검토

| 파일 | 직접 확인 | 처리 |
| --- | --- | --- |
| public/landing-verify.png | 한국어 UI가 이미지에 포함 | ProductPreview의 언어팩 기반 HTML 검증 미리보기로 대체; 원본 파일 보존 |
| public/preview-monitoring.png | 한국어 UI가 이미지에 포함 | 같은 HTML 모니터링 미리보기로 대체; 기울기 효과 유지 |
| public/flow-partner.png | 인물·악수·아이콘, 읽는 문구 없음 | 공통 이미지 유지, alt는 해당 번역 제목 |
| public/flow-asset.png | 그래프·아이콘, 읽는 문구 없음 | 동일 |
| public/flow-monitoring.png | 그래프·아이콘, 읽는 문구 없음 | 동일 |
| public/usecase-branding.jpg | 실물 커피 브랜드·포장 원문(스페인어 등) | 제품 사례의 원문 이미지 보존; UI 안내문이 아님, alt 번역 |
| public/usecase-character.jpg | 캐릭터, 문구 없음 | 공통 이미지 유지·alt 번역 |
| public/usecase-collab.jpg | 완구 협업 사진, 문구 없음 | 공통 이미지 유지·alt 번역 |
| public/claps-logo.svg 및 앱 아이콘 | CLAPS 고유 로고 | 고유명 유지 |
| app/opengraph-image.tsx | 한국어 설명 하드코딩 | 요청 locale의 landing.metaDescription을 그려서 반환 |

## 추출 key 목록

key/변수 및 동적 enum 검증은 tests/i18n/packs.test.ts에서 수행한다. 아래는 ko 파일을 기준으로 생성한 검수 목록이다. 영어 대응본은 동일 경로 messages/en에 있다.

| key | ko 원문 |
| --- | --- |
| `assets.final_assets` | 최종본 |
| `assets.images` | 장 |
| `assets.saved_to_the_project_library` | 프로젝트 라이브러리에 저장됩니다. |
| `assets.download_selected` | 선택 다운로드 |
| `assets.view_project` | 프로젝트 보기 |
| `assets.no_final_assets_yet` | 최종본이 아직 없어요 |
| `assets.assets_that_pass_verification_appear_here_when_you_add` | 가이드 검증에서 통과한 에셋을 '최종본에 추가'하면 여기에 모입니다. |
| `assets.go_to_verification` | 가이드 검증으로 |
| `assets.select_all` | 전체 선택 |
| `assets.newest_first` | 최신순 |
| `assets.remove_from_final_assets` | 최종본에서 제거 |
| `assets.untitled` | 제목 없음 |
| `assets.verification_criteria` | 검증 기준 |
| `assets.view_final_assets` | 최종본 보기 ( |
| `assets.closing_count` | 개) |
| `assets.no_assets_to_review` | 검수할 에셋이 없어요 |
| `assets.adopt_generated_assets_and_select_verify_guidelines_to_review` | 에셋 생성에서 결과물을 채택한 뒤 '가이드 검증하기'를 누르면 채택한 이미지들이 여기에 표시됩니다. |
| `assets.go_to_asset_generation` | 에셋 생성으로 |
| `assets.review_list` | 검수 목록 |
| `assets.add_to_final_assets` | 최종본에 추가 |
| `assets.rejected_assets_cannot_be_added` | 반려 항목은 추가할 수 없어요 |
| `assets.asset` | 에셋 |
| `assets.asset_under_review` | 검수 대상 |
| `assets.download_png` | PNG 다운로드 |
| `assets.remove_from_final_assets_2` | 최종본 취소 |
| `assets.protected_color_violation` | 보호색 위반 |
| `assets.clear_space_violation` | 안전영역 침범 |
| `assets.2_violations` | 위반 2건 |
| `assets.confidence` | 신뢰도 |
| `assets.results_by_rule_rule_dsl` | 규칙별 결과 (Rule DSL) |
| `assets.unlinked` | 미연결 |
| `assets.just_now` | 방금 |
| `assets.today` | 오늘 |
| `assets.generation_sessions` | 생성 목록 |
| `assets.generate_new_assets` | 새 에셋 생성 |
| `assets.no_generation_sessions_yet` | 아직 생성 내역이 없어요 |
| `assets.select_generate_new_assets_to_create_brand_images` | ’새 에셋 생성’을 눌러 브랜드 이미지를 만들면 |
| `assets.your_generation_sessions_will_appear_here` | 생성한 세션이 여기에 쌓여요. |
| `assets.search_generation_sessions` | 생성 목록 검색 |
| `assets.all_projects` | 프로젝트 전체 |
| `assets.oldest_first` | 오래된순 |
| `assets.no_results_found` | 검색 결과가 없어요. |
| `assets.deleting_a_generation_session_cannot_be_undone` | 생성 세션을 삭제하면 되돌릴 수 없어요. |
| `assets.ip_identity` | IP 정체성 |
| `assets.quality` | 품질 |
| `assets.ip_alignment` | IP 정합 |
| `assets.guidelines_passed` | 가이드 통과 |
| `assets.no_linked_project` | 프로젝트 미연결 |
| `assets.rename` | 이름 변경 |
| `assets.delete` | 삭제 |
| `assets.generation_settings` | 생성 설정 |
| `assets.select_project` | 프로젝트 선택 |
| `assets.choose_a_project` | 프로젝트를 선택하세요 |
| `assets.the_selected_project_s_brand_guidelines_ip_and_metadata` | 선택한 프로젝트의 브랜드 가이드·IP·메타데이터가 함께 적용됩니다 |
| `assets.style` | 스타일 |
| `assets.prompt` | 프롬프트 |
| `assets.describe_the_mood_composition_colors_and_details_optional` | 분위기·구도·색감·디테일을 자유롭게 적어주세요 (선택) |
| `assets.aspect_ratio_resolution` | 비율 / 해상도 |
| `assets.asset_generation` | 에셋 생성 |
| `assets.choose_a_project_to_start_generating` | 프로젝트를 선택하면 생성할 수 있어요 |
| `assets.generated_assets` | 생성 결과 |
| `assets.reset` | 초기화 |
| `assets.verify_guidelines` | 가이드 검증하기 |
| `assets.no_generated_assets_yet` | 아직 생성된 에셋이 없어요 |
| `assets.set_the_project_style_and_aspect_ratio_then_select` | 왼쪽에서 프로젝트·스타일·비율을 설정한 뒤 '에셋 생성'을 누르면 결과가 여기에 표시됩니다. |
| `assets.choose_a_project_to_link_this_generation_session_to` | 이 생성 세션을 연결할 프로젝트를 골라주세요. |
| `assets.no_projects_yet` | 아직 만든 프로젝트가 없어요. |
| `assets.create_a_project` | 프로젝트 만들러 가기 |
| `assets.stage.generated` | 생성 |
| `assets.stage.verify` | 검증 |
| `assets.stage.final` | 최종 |
| `assets.verdict.passed` | 통과 |
| `assets.verdict.rejected` | 반려 |
| `assets.verdict.all` | 전체 |
| `assets.verifyCount` | 가이드 검증하기 ({count}개) |
| `assets.finalCount` | 최종본 보기 ({count}개) |
| `assets.sessionSubtitle` | 최종 {count}장 |
| `assets.style.none` | 선택 안함 |
| `assets.style.flat_vector` | 플랫 벡터 |
| `assets.style.line_art` | 라인 아트 |
| `assets.style.pastel` | 파스텔 |
| `assets.style.kitsch` | 키치 |
| `assets.style.chibi` | 치비(SD) |
| `assets.style.figure_3d` | 3D 피규어 |
| `assets.style.watercolor` | 수채 일러스트 |
| `assets.ruleVerdict.Pass` | 통과 |
| `assets.ruleVerdict.Warn` | 주의 |
| `assets.ruleVerdict.Reject` | 반려 |
| `auth.back_to_login` | 로그인으로 돌아가기 |
| `auth.get_started` | 시작하기 |
| `auth.continue_with_email_or_sign_in_with_a_social` | 이메일로 계속하거나 소셜 계정으로 로그인하세요. |
| `auth.continue_with_google` | Google로 계속 |
| `auth.continue_with_kakao` | 카카오로 계속 |
| `auth.or` | 또는 |
| `auth.forgot_your_password` | 비밀번호를 잊으셨나요? |
| `auth.reset_password` | 비밀번호 찾기 |
| `auth.we_ll_send_a_reset_link_to_your_registered` | 가입한 이메일로 재설정 링크를 보내드릴게요. |
| `auth.to` | 으로 |
| `auth.we_sent_a_reset_link` | 재설정 링크를 보냈어요. |
| `auth.if_you_don_t_receive_the_email_check_your` | 메일이 오지 않았다면 스팸함을 확인해 주세요. |
| `auth.send_again` | 다시 보내기 |
| `auth.email` | 이메일 |
| `auth.enter_a_valid_email_address` | 올바른 이메일 주소를 입력해주세요. |
| `auth.send_reset_link` | 재설정 링크 보내기 |
| `auth.continue` | 계속 |
| `auth.my_account` | 마이페이지 |
| `auth.view_and_update_your_account_information` | 계정 정보를 확인하고 수정할 수 있어요. |
| `auth.delete_account` | 회원 탈퇴 |
| `auth.your_account_information_will_be_deleted_this_cannot_be` | 계정 정보가 삭제되며 되돌릴 수 없어요. |
| `auth.delete_my_account` | 탈퇴하기 |
| `auth.cancel` | 취소 |
| `auth.save` | 저장 |
| `auth.are_you_sure_you_want_to_delete_your_account` | 정말 탈퇴할까요? |
| `auth.delete_account_2` | 탈퇴 |
| `auth.name` | 이름 |
| `auth.your_name` | 홍길동 |
| `auth.organization` | 조직명 |
| `auth.company_brand_name` | 회사 / 브랜드명 |
| `auth.industry_role` | 업종 / 직무 |
| `auth.select_an_option` | 선택하세요 |
| `auth.last_step` | 마지막 단계 |
| `auth.set_up_your_profile` | 프로필 설정 |
| `auth.almost_done_enter_your_details_to_get_started` | 거의 다 됐어요. 기본 정보를 입력하면 시작합니다. |
| `auth.role.marketing` | 브랜드/마케팅 |
| `auth.role.design` | 디자인/크리에이티브 |
| `auth.role.merchandising` | MD/상품기획 |
| `auth.role.licensing` | 라이선싱/IP |
| `auth.role.management` | 대표/경영 |
| `auth.role.other` | 기타 |
| `auth.resetSent` | {email}으로 재설정 링크를 보냈어요. |
| `common.are_you_sure_you_want_to_delete_this` | 정말 삭제할까요? |
| `common.cancel` | 취소 |
| `common.delete` | 삭제 |
| `common.close` | 닫기 |
| `common.previous_page` | 이전 페이지 |
| `common.next_page` | 다음 페이지 |
| `common.search` | 검색 |
| `common.unavailable` | 문구를 표시할 수 없습니다. |
| `common.count` | {count}개 |
| `common.images` | {count}장 |
| `common.results` | {count}건 |
| `common.untitled` | 제목 없음 |
| `common.today` | 오늘 |
| `common.justNow` | 방금 |
| `common.relativeMinutes` | {count}분 전 |
| `common.relativeHours` | {count}시간 전 |
| `common.relativeDays` | {count}일 전 |
| `common.all` | 전체 |
| `common.images.one` | {count}장 |
| `common.results.one` | {count}건 |
| `common.last_week` | 지난 7일 |
| `common.earlier` | 이전 |
| `errors.BAD_REQUEST` | 요청을 읽을 수 없습니다. |
| `errors.UNAUTHORIZED` | 로그인이 필요합니다. |
| `errors.FORBIDDEN` | 접근 권한이 없습니다. |
| `errors.NOT_FOUND` | 요청한 항목을 찾을 수 없습니다. |
| `errors.VERSION_CONFLICT` | 항목이 변경되었습니다. 새로고침 후 다시 시도해 주세요. |
| `errors.STATE_CONFLICT` | 현재 상태에서 실행할 수 없습니다. |
| `errors.IDEMPOTENCY_CONFLICT` | 다른 내용으로 이미 사용한 요청 키입니다. |
| `errors.VALIDATION_ERROR` | 입력 내용을 확인해 주세요. |
| `errors.RATE_LIMITED` | 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. |
| `errors.PROVIDER_ERROR` | 외부 서비스가 요청을 처리하지 못했습니다. |
| `errors.SERVICE_UNAVAILABLE` | 일시적으로 서비스를 이용할 수 없습니다. |
| `errors.INTERNAL_ERROR` | 예기치 않은 오류가 발생했습니다. |
| `errors.INVALID_FIELD` | 이 값을 확인해 주세요. |
| `landing.ip_partners` | IP 파트너 |
| `landing.brand_guidelines` | 브랜드 가이드 |
| `landing.asset_generation` | 에셋 생성 |
| `landing.guideline_verification` | 가이드 검증 |
| `landing.monitoring` | 모니터링 |
| `landing.reports` | 리포트 |
| `landing.4_steps` | 4단계 |
| `landing.integrated_workflow` | 통합 워크플로우 |
| `landing.5_checks` | 5대 |
| `landing.guideline_rule_checks` | 가이드 규칙 검증 |
| `landing.unauthorized_use_detection` | 무단 사용 탐지 |
| `landing.10_levels` | 10단계 |
| `landing.similarity_analysis` | 유사도 분석 |
| `landing.find_partners` | 파트너 찾기 |
| `landing.find_collaboration_partners_that_fit_your_ip_industry_and` | IP·업종·팬덤에 맞는 협업 파트너를 추천합니다. |
| `landing.explore_partner_recommendations` | 파트너 추천 알아보기 |
| `landing.generate_and_verify_assets` | 에셋 생성·검증 |
| `landing.create_images_for_your_brand_and_automatically_detect_guideline` | 브랜드에 맞는 이미지를 만들고 가이드 위반을 자동 검출합니다. |
| `landing.explore_asset_generation` | 에셋 생성 알아보기 |
| `landing.protect_your_brand_by_detecting_unauthorized_use_across_the` | 웹 전반에서 무단 사용을 탐지해 브랜드를 보호합니다. |
| `landing.explore_monitoring` | 모니터링 알아보기 |
| `landing.rule_based_verification` | 규칙 기반 검증 |
| `landing.automatically_detect_color_logo_and_typography_violations` | 색·로고·타이포 위반 자동 검출 |
| `landing.instant_feedback` | 즉시 피드백 |
| `landing.see_passes_and_required_changes_immediately` | 통과 / 수정 필요를 바로 확인 |
| `landing.final_asset_management` | 최종본 관리 |
| `landing.collect_approved_images_in_your_project` | 통과한 이미지를 프로젝트에 모음 |
| `landing.verification_history` | 검증 이력 |
| `landing.track_what_was_verified_and_when` | 언제 무엇을 검증했는지 기록 |
| `landing.ip_partner_matching` | IP 파트너 매칭 |
| `landing.find_the_right_partners_using_world_fandom_and_industry` | 세계관·팬덤·업종 데이터로 최적의 협업 파트너를 추천합니다. |
| `landing.ai_asset_generation` | AI 에셋 생성 |
| `landing.easily_create_and_manage_images_that_fit_your_brand` | 브랜드에 맞는 이미지를 손쉽게 생성하고 관리합니다. |
| `landing.automated_guideline_checks` | 가이드 자동 검증 |
| `landing.automatically_check_whether_generated_assets_follow_brand_guidelines` | 생성물이 브랜드 가이드 규칙을 지키는지 자동으로 검증합니다. |
| `landing.unauthorized_use_monitoring` | 무단 사용 모니터링 |
| `landing.merchandise_branding` | 굿즈 브랜딩 |
| `landing.character_ip` | 캐릭터 IP |
| `landing.collaboration_campaigns` | 콜라보 프로모션 |
| `landing.starter` | 스타터 |
| `landing.for_teams_getting_started_with_brand_safe_imagery` | 브랜드 이미지를 안전하게 시작하는 팀을 위해. |
| `landing.project_management` | 프로젝트 관리 |
| `landing.brand_guideline_verification` | 브랜드 가이드 검증 |
| `landing.team` | 팀 |
| `landing.for_teams_that_need_collaboration_and_room_to_grow` | 협업과 규모 확장이 필요한 팀을 위해. |
| `landing.everything_in_starter` | 스타터의 모든 기능 |
| `landing.team_collaboration_and_permissions` | 팀 협업 · 권한 관리 |
| `landing.priority_support` | 우선 지원 |
| `landing.what_is_claps` | CLAPS는 어떤 서비스인가요? |
| `landing.claps_is_ip_safe_ai_middleware_for_generating_and` | 라이선스 규칙에 맞춰 브랜드 이미지를 생성·검증하고, 무단 사용까지 관리하는 IP-Safe AI 미들웨어입니다. |
| `landing.where_are_generated_images_stored` | 생성한 이미지는 어디에 저장되나요? |
| `landing.images_that_pass_verification_are_managed_in_the_project` | 가이드 검증을 통과한 이미지는 프로젝트의 이미지 라이브러리에 모여 관리됩니다. |
| `landing.how_do_i_add_brand_guidelines` | 브랜드 가이드는 어떻게 등록하나요? |
| `landing.add_brand_guidelines_to_a_project_to_use_them` | 프로젝트에 브랜드 가이드를 추가하면 검증 규칙으로 반영됩니다. |
| `landing.how_does_unauthorized_use_monitoring_work` | 무단 사용 모니터링은 어떻게 작동하나요? |
| `landing.add_a_reference_image_to_find_similar_images_on` | 기준 이미지를 등록하면 웹에서 유사 이미지를 탐지해 결과를 보여줍니다. |
| `landing.how_much_does_it_cost` | 요금은 어떻게 되나요? |
| `landing.pricing_is_being_prepared_contact_us_to_discuss_your` | 요금 정책은 준비 중입니다. 도입 문의를 남겨주시면 안내해 드립니다. |
| `landing.product` | 제품 |
| `landing.projects` | 프로젝트 |
| `landing.partner_recommendations` | 파트너 추천 |
| `landing.resources` | 리소스 |
| `landing.about` | 소개 |
| `landing.guide` | 가이드 |
| `landing.updates` | 업데이트 |
| `landing.contact` | 문의 |
| `landing.company` | 회사 |
| `landing.terms_of_service` | 이용약관 |
| `landing.privacy_policy` | 개인정보처리방침 |
| `landing.security` | 보안 |
| `landing.features` | 기능 |
| `landing.use_cases` | 활용 사례 |
| `landing.pricing` | 요금 |
| `landing.claps_studio_2_0_ip_safe_ai_brand_image` | CLAPS Studio 2.0 — IP-Safe AI 브랜드 이미지 미들웨어 |
| `landing.get_started` | 시작하기 |
| `landing.ip_safe_license_safe_ai` | IP-Safe · 라이선스 세이프 AI |
| `landing.keep_your_ip_safe` | IP는 안전하게, |
| `landing.set_your_creativity_free` | 크리에이티브는 자유롭게 |
| `landing.partner_recommendations_image_generation_guideline_checks_and_ip_monitoring` | 파트너 추천부터 이미지 생성, 가이드 검증, IP 모니터링까지 |
| `landing.manage_it_all_with_claps` | CLAPS에서 관리하세요. |
| `landing.view_pricing` | 요금 보기 |
| `landing.get_started_without_a_credit_card` | 카드 등록 없이 시작하세요 |
| `landing.claps_guideline_verification_screen` | CLAPS 가이드 검증 화면 |
| `landing.when_tools_are_scattered` | 도구가 흩어지면 |
| `landing.brand_management_falls_apart` | 브랜드 관리가 무너집니다 |
| `landing.you_don_t_need_separate_tools_for_partner_discovery` | 파트너 찾기·이미지 생성·가이드 검증·무단 사용 감시를 따로 관리할 필요 없어요. |
| `landing.claps_brings_these_steps_together_in_one_workflow` | CLAPS가 흩어진 과정을 하나의 흐름으로 통합합니다. |
| `landing.your_brand_image_work` | 브랜드 이미지 작업을 |
| `landing.in_one_workflow` | 하나의 흐름으로 |
| `landing.from_recommendations_to_generation_verification_and_monitoring` | 추천에서 시작해 생성·검증을 거쳐 모니터링까지, |
| `landing.every_step_connects_in_a_simple_workflow` | 하나의 간단한 흐름으로 이어집니다. |
| `landing.preview` | 미리보기 |
| `landing.brand_guidelines_2` | 브랜드 가이드, |
| `landing.verified_automatically` | 자동으로 검증하세요 |
| `landing.explore_guideline_verification` | 가이드 검증 알아보기 |
| `landing.automatically_check_generated_images_for_color_logo_and_typography` | 생성한 이미지가 색·로고·타이포 규칙을 지키는지 자동으로 확인하고, |
| `landing.keep_approved_images_together_in_your_library` | 통과한 이미지만 라이브러리에 모아 관리하세요. |
| `landing.everything_you_need` | 브랜드 이미지를 다루는 데 |
| `landing.to_work_with_brand_images` | 필요한 모든 것 |
| `landing.designed_for_licensee_workflows_with_no_need_to_piece` | 도구를 이어붙일 필요 없이, 라이선시 실무에 맞춰 설계했습니다. |
| `landing.even_after_publication` | 세상에 나간 뒤에도 |
| `landing.your_brand_stays_protected` | 브랜드는 계속 지켜집니다 |
| `landing.register_a_reference_image_to_detect_unauthorized_use_across` | 기준 이미지를 등록하면 웹 전반에서 무단 사용을 탐지해, |
| `landing.keep_watch_over_how_your_brand_is_used` | 브랜드가 안전하게 쓰이는지 지켜봅니다. |
| `landing.respecting_licenses_is_the_fastest_way_to_protect_your` | 라이선스를 지키는 것이, 브랜드를 지키는 가장 빠른 길입니다. |
| `landing.see_how_it_s_used` | 이렇게 쓰입니다 |
| `landing.from_character_merchandise_to_collaboration_campaigns` | 캐릭터 IP 굿즈부터 콜라보 프로모션까지, |
| `landing.wherever_you_need_brand_imagery` | 브랜드 이미지가 필요한 모든 순간에. |
| `landing.start_small` | 작게 시작하고, |
| `landing.grow_as_you_need` | 필요한 만큼 확장하세요 |
| `landing.pricing_is_being_prepared_contact_us_if_you_re` | 요금 정책은 준비 중입니다. 도입을 검토 중이시면 문의를 남겨주세요. |
| `landing.custom_quote` | / 맞춤 견적 |
| `landing.contact_us` | 문의하기 |
| `landing.frequently_asked_questions` | 자주 묻는 질문 |
| `landing.create_your_brand_imagery_with_licensing_in_mind` | 라이선스를 지키며, 브랜드 이미지를 완성하세요 |
| `landing.generate_verify_and_monitor_in_one_place` | 생성부터 검증·모니터링까지, 도구를 이어붙이지 않고 한 곳에서. |
| `landing.get_started_for_free` | 무료로 시작하기 |
| `landing.ip_safe_ai_brand_image_middleware` | IP-Safe AI 브랜드 이미지 미들웨어. |
| `landing.website` | 웹사이트 |
| `landing.news` | 소식 |
| `landing.messages` | 메시지 |
| `landing.metaDescription` | IP-Safe AI 미들웨어 |
| `landing.new` | 새 소식 |
| `landing.problemSolution` | 문제에서 해결까지 |
| `landing.workflow` | 워크플로우 |
| `landing.engine` | 핵심 기능 |
| `landing.protection` | 브랜드 보호 |
| `landing.useCases` | 활용 사례 |
| `landing.copyright` | © 2026 CLAPS. 모든 권리 보유. |
| `monitoring.10` | 단계 / 10 |
| `monitoring.similarity` | 유사도 |
| `monitoring.extracting_reference_image_features` | 기준 이미지 특징 추출 중 |
| `monitoring.searching_google_images` | 구글 이미지 웹 검색 중 |
| `monitoring.searching_naver_images` | 네이버 이미지 웹 검색 중 |
| `monitoring.comparing_images_and_calculating_similarity` | 유사 이미지 대조·유사도 계산 중 |
| `monitoring.collecting_results` | 결과 취합 중 |
| `monitoring.back_to_list` | 목록 |
| `monitoring.reference_image` | 탐지 기준 |
| `monitoring.remove` | 제거 |
| `monitoring.reference_image_for_detection` | 탐지 기준 이미지 |
| `monitoring.change` | 변경 |
| `monitoring.attach_image` | 이미지 첨부 |
| `monitoring.choose_from_library` | 라이브러리에서 선택 |
| `monitoring.scanning` | 탐지 중… |
| `monitoring.start_scan` | 탐지 시작 |
| `monitoring.scan_results` | 탐지 결과 |
| `monitoring.results` | 건 |
| `monitoring.last_scan` | 마지막 탐지 |
| `monitoring.attach_a_reference_image_first` | 탐지할 기준 이미지를 먼저 첨부하세요 |
| `monitoring.attach_a_reference_image_above_to_start_scanning_for` | 상단에서 기준 이미지를 첨부하면 무단 사용 탐지를 시작할 수 있어요. |
| `monitoring.select_start_scan_to_search` | 탐지 시작을 눌러 검색하세요 |
| `monitoring.select_start_scan_above_to_find_similar_images_on` | 상단의 '탐지 시작'을 누르면 구글·네이버 이미지에서 유사 이미지를 찾습니다. |
| `monitoring.scan_complete` | 탐지 완료 |
| `monitoring.no_matches_detected` | 탐지된 항목이 없습니다 |
| `monitoring.no_images_similar_to_the_current_reference_were_found` | 현재 기준 이미지와 유사한 이미지가 발견되지 않았어요. |
| `monitoring.your_brand_is_being_monitored` | 브랜드가 안전하게 보호되고 있습니다. |
| `monitoring.choose_an_image_to_use_as_a_reference` | 탐지 기준으로 사용할 이미지를 골라주세요. |
| `monitoring.first_choose_the_project_to_get_images_from` | 이미지를 가져올 프로젝트를 먼저 선택하세요. |
| `monitoring.no_projects_yet` | 아직 만든 프로젝트가 없어요. |
| `monitoring.create_a_project` | 프로젝트 만들러 가기 |
| `monitoring.project_list` | 프로젝트 목록 |
| `monitoring.this_project_has_no_images_yet` | 이 프로젝트에 아직 이미지가 없어요. |
| `monitoring.detected_image_details` | 탐지된 이미지 상세 정보 |
| `monitoring.scan_details` | 탐지 상세 |
| `monitoring.platform` | 플랫폼 |
| `monitoring.detected_at` | 탐지 시각 |
| `monitoring.found_at` | 발견 위치 |
| `monitoring.open_source_page` | 원본 페이지 열기 |
| `monitoring.close` | 닫기 |
| `monitoring.newest_first` | 최신순 |
| `monitoring.date_created` | 생성순 |
| `monitoring.scan_history` | 탐지 기록 |
| `monitoring.new_scan` | 새 탐지 |
| `monitoring.no_scan_history_yet` | 아직 탐지 기록이 없어요 |
| `monitoring.scan_an_image_for_unauthorized_use` | 이미지로 무단 사용을 탐지해보세요 |
| `monitoring.start_a_new_scan` | 새 탐지 시작 |
| `monitoring.search_scan_history` | 탐지 기록 검색 |
| `monitoring.reference_image_2` | 기준 이미지 |
| `monitoring.last_scanned` | 최근 탐지 일시 |
| `monitoring.first_scanned` | 최초 탐지일 |
| `monitoring.no_results_found` | 검색 결과가 없어요. |
| `monitoring.rename` | 이름 변경 |
| `monitoring.delete` | 삭제 |
| `monitoring.about_scanning` | 탐지 안내 |
| `monitoring.searches_google_images_and_naver_images_once` | 구글 이미지 및 네이버 이미지를 1회 검색합니다. |
| `monitoring.open_each_link_to_confirm_whether_use_is_unauthorized` | 무단 여부는 링크를 직접 확인하세요. |
| `monitoring.claps_monitoring_screen` | CLAPS 모니터링 화면 |
| `monitoring.platform.google` | 구글 |
| `monitoring.platform.naver` | 네이버 |
| `monitoring.libraryImage` | {project} 이미지 |
| `monitoring.library` | 라이브러리 |
| `navigation.asset_generation` | 에셋 생성 |
| `navigation.guideline_verification` | 가이드 검증 |
| `navigation.final_assets` | 최종본 |
| `navigation.back_to_list` | 목록 |
| `navigation.language` | 언어 |
| `navigation.licensee_contact` | 라이선시 담당자 |
| `navigation.company_name` | 회사명 |
| `navigation.my_account` | 마이페이지 |
| `navigation.log_out` | 로그아웃 |
| `navigation.selected` | 선택됨 |
| `navigation.saveFailed` | 언어를 저장하지 못했습니다. 다시 선택해 주세요. |
| `navigation.projects` | 프로젝트 |
| `navigation.partners` | 파트너 추천 |
| `navigation.assets` | 에셋 생성 |
| `navigation.monitoring` | 모니터링 |
| `navigation.menu` | 메뉴 |
| `partners.add` | + 추가 |
| `partners.matching_criteria` | 매칭 기준 정보 |
| `partners.we_recommend_partners_based_on_your_information_you_can` | 입력한 정보를 기준으로 파트너를 추천해 드립니다. 언제든 수정할 수 있어요. |
| `partners.ip_reference_image` | IP 참조 이미지 |
| `partners.upload_image` | 이미지 업로드 |
| `partners.ip_metadata` | IP 메타 |
| `partners.ip_name_e_g_hello_kitty` | IP 이름 (예: 헬로키티) |
| `partners.category_e_g_character` | 카테고리 (예: 캐릭터) |
| `partners.world_attributes` | 세계관 속성 |
| `partners.cheerful` | 명랑 |
| `partners.friendship` | 우정 |
| `partners.everyday_life` | 일상 |
| `partners.cute` | 귀여움 |
| `partners.licensee_attributes_your_company` | 라이선시 속성 (자사) |
| `partners.your_brand_audience_and_tone` | 자사 브랜드 · 타깃 · 톤앤매너 |
| `partners.industry_and_revenue` | 업종 · 매출 |
| `partners.industry_e_g_stationery_manufacturing` | 업종 (예: 문구 제조) |
| `partners.annual_revenue_e_g_krw_5_billion` | 연매출 (예: 50억) |
| `partners.collaboration_history` | 콜라보 이력 |
| `partners.cancel` | 취소 |
| `partners.save_and_view_matches` | 저장하고 매칭 결과 보기 |
| `partners.match_criteria` | 매칭 기준 |
| `partners.edit` | 수정 |
| `partners.criteria` | 기준 |
| `partners.match_again` | 재매칭 |
| `partners.1_recommendation` | #1 추천 |
| `partners.overall_match` | 종합 매칭 |
| `partners.ai_recommendation_rationale` | AI 추천 근거 |
| `partners.ip_details` | IP 상세 |
| `partners.request_collaboration` | 협업 요청 |
| `partners.ip_details_2` | IP 상세 정보 |
| `partners.recommended` | 추천 |
| `partners.match_rationale` | 매칭 근거 |
| `partners.fandom_and_market` | 팬덤 · 시장 |
| `partners.collaboration_contact` | 협업 담당 |
| `partners.email` | 이메일 |
| `partners.close` | 닫기 |
| `partners.request_collaboration_by_email` | 이메일로 협업을 요청하세요 |
| `partners.does_not_offer_in_app_collaboration_yet_send_a` | 은 아직 앱 내 협업 채널을 제공하지 않아요. 아래 이메일로 제안을 보내면 담당자가 검토 후 회신드려요. |
| `partners.collaboration_email` | 협업 담당 이메일 |
| `partners.copied` | 복사됨 |
| `partners.copy` | 복사 |
| `partners.include_the_following_in_your_email` | 메일에 이런 내용을 담아주세요 |
| `partners.company_and_brand_introduction` | 회사·브랜드 소개 |
| `partners.collaboration_proposal_and_goals` | 협업 제안 내용과 목표 |
| `partners.preferred_schedule_and_scope` | 희망 일정·규모 |
| `partners.sort.overall` | 종합순 |
| `partners.sort.world` | 세계관 적합순 |
| `partners.sort.price` | 가격 적합순 |
| `partners.sort.fandom` | 팬덤 중첩순 |
| `partners.sort.industry` | 업종 연관순 |
| `partners.factor.veryHigh` | 매우 높음 |
| `partners.factor.high` | 높은 편 |
| `partners.factor.moderate` | 보통 |
| `partners.factor.low` | 낮은 편 |
| `partners.collabHelp` | {name}은 아직 앱 내 협업 채널을 제공하지 않아요. 아래 이메일로 제안을 보내면 담당자가 검토 후 회신드려요. |
| `partners.criteria.ip` | IP |
| `partners.criteria.world` | 세계관 |
| `partners.criteria.licensee` | 라이선시 |
| `partners.criteria.industry` | 업종 |
| `partners.criteria.history` | 협업 이력 |
| `partners.factorLabel.world` | 세계관 적합 |
| `partners.factorLabel.price` | 가격 적합 |
| `partners.factorLabel.fandom` | 팬덤 중첩 |
| `partners.factorLabel.industry` | 업종 연관 |
| `projects.back_to_list` | 목록 |
| `projects.edit_project_information` | 프로젝트 정보 편집하기 |
| `projects.change_status` | 상태 변경하기 |
| `projects.delete_project` | 프로젝트 삭제하기 |
| `projects.project_cover` | 프로젝트 커버 |
| `projects.change_thumbnail` | 썸네일 변경 |
| `projects.upload_from_computer` | 내 컴퓨터에서 업로드 |
| `projects.choose_from_library` | 라이브러리에서 선택 |
| `projects.ip_partner` | IP · 파트너 |
| `projects.created_on` | 최초 생성일 |
| `projects.last_updated` | 최근 업데이트 |
| `projects.brand_guide_awaiting_rule_conversion` | 브랜드 가이드 · 검증 규칙 변환 대기 |
| `projects.change` | 변경 |
| `projects.remove_brand_guide` | 브랜드 가이드 제거 |
| `projects.add_brand_guide` | 브랜드 가이드 추가 |
| `projects.upload_a_pdf_to_convert_it_into_verification_e3` | PDF를 올리면 검증(E3) 규칙으로 자동 변환돼요. |
| `projects.choose_file` | 파일 선택 |
| `projects.generation_sessions` | 생성 목록 |
| `projects.view_all` | 전체보기 |
| `projects.no_generation_sessions_yet` | 아직 생성 내역이 없어요 |
| `projects.create_images_in_asset_generation` | 에셋 생성에서 이미지를 만들면 |
| `projects.this_project_s_generation_sessions_will_appear_here` | 이 프로젝트의 생성 목록이 여기에 쌓여요. |
| `projects.generate_assets` | 에셋 생성하러 가기 |
| `projects.image_library` | 이미지 라이브러리 |
| `projects.images` | 장 |
| `projects.select_all` | 전체선택 |
| `projects.download_selected` | 선택 다운로드 |
| `projects.no_generated_images_yet` | 아직 생성된 이미지가 없어요 |
| `projects.adopted_images_that_pass_verification` | 가이드 검증을 통과해 채택한 이미지가 |
| `projects.are_collected_in_this_project_s_library` | 이 프로젝트 라이브러리에 모여요. |
| `projects.choose_an_image_to_use_as_a_thumbnail` | 썸네일로 사용할 이미지를 골라주세요. |
| `projects.no_images_in_the_library_yet` | 라이브러리에 아직 이미지가 없어요. |
| `projects.edit_project_information_2` | 프로젝트 정보 편집 |
| `projects.you_can_edit_the_name_ip_and_description` | 이름 · IP · 설명을 수정할 수 있어요. |
| `projects.project_name` | 프로젝트 이름 |
| `projects.description` | 설명 |
| `projects.optional` | (선택) |
| `projects.briefly_describe_the_work_in_this_project` | 이 프로젝트가 어떤 작업인지 간단히 적어주세요. |
| `projects.cancel` | 취소 |
| `projects.save` | 저장 |
| `projects.deleting_a_project_cannot_be_undone` | 프로젝트를 삭제하면 되돌릴 수 없어요. |
| `projects.overview` | 개요 |
| `projects.see_the_progress_of_your_brand_projects_at_a` | 브랜드 프로젝트의 진행 상황을 한눈에 확인하세요. |
| `projects.active_projects` | 진행 중 프로젝트 |
| `projects.the_number_of_projects_that_are_not_complete` | 완료되지 않은 전체 프로젝트 수예요. |
| `projects.the_number_of_projects_undergoing_guideline_verification` | 가이드 검증이 진행 중인 프로젝트 수예요. |
| `projects.the_number_of_projects_marked_as_needing_changes_during` | 검증에서 수정이 필요하다고 나온 프로젝트 수예요. |
| `projects.all_projects` | 전체 프로젝트 |
| `projects.search_projects` | 프로젝트 검색... |
| `projects.new_project` | 새 프로젝트 |
| `projects.no_projects_yet` | 아직 프로젝트가 없어요 |
| `projects.select_new_project_to_add_your_ip_and_brand` | ’새 프로젝트’를 눌러 IP와 브랜드 가이드를 등록하면 |
| `projects.your_projects_will_appear_here` | 여기에 프로젝트가 쌓여요. |
| `projects.create_a_new_project` | 새 프로젝트 만들기 |
| `projects.project_ip` | 프로젝트 / IP |
| `projects.status` | 상태 |
| `projects.updates` | 업데이트 |
| `projects.created_on_2` | 생성일 |
| `projects.change_status_2` | 상태 변경 |
| `projects.rename` | 이름 변경 |
| `projects.delete` | 삭제 |
| `projects.no_results_found` | 검색 결과가 없어요 |
| `projects.no_matching_projects_were_found` | ’와 일치하는 프로젝트를 찾지 못했어요. |
| `projects.choose_an_ip_and_create_a_project_to_start` | IP를 선택하고 프로젝트를 만들면 에셋 생성·가이드 검증을 시작할 수 있어요. |
| `projects.e_g_summer_capsule_collection` | 예: 썸머 캡슐 컬렉션 |
| `projects.e_g_sanrio_cinnamoroll` | 예: 산리오 · 시나모롤 |
| `projects.i_haven_t_chosen_a_partner_yet` | 아직 파트너가 정해지지 않았어요 (미정) |
| `projects.project_description` | 프로젝트 설명 |
| `projects.after_creating_the_project_upload_your_guidelines` | 브랜드 가이드는 프로젝트를 만든 뒤 |
| `projects.under_brand_guidelines` | ‘브랜드 가이드’ |
| `projects.in_the_project` | 탭에서 업로드할 수 있어요. |
| `projects.create_project` | 프로젝트 생성 |
| `projects.status.preparing` | 준비 중 |
| `projects.status.generating` | 생성 중 |
| `projects.status.verifying` | 검증 중 |
| `projects.status.needs_fix` | 수정 필요 |
| `projects.status.completed` | 완료 |
| `projects.searchEmpty` | ‘{query}’와 일치하는 프로젝트를 찾지 못했어요. |
| `projects.statDescription` | {label} 설명 |
| `projects.undecided` | 미정 |
| `projects.guideUploadHelp` | 프로젝트를 만든 뒤 브랜드 가이드를 업로드할 수 있어요. |
