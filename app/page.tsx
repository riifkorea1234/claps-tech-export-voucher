"use client";
import { useT } from "@/lib/i18n/provider";
import { ProductPreview } from "@/components/domain/product-preview";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  ImageIcon,
  ShieldCheck,
  Radar,
  BarChart3,
  Check,
  ChevronDown,
  Globe,
  Send,
  MessageCircle,
  Rss,
} from "lucide-react";
import {
  StackSimple,
  ListChecks,
  Broadcast,
  MagnifyingGlass,
  Sparkle,
  UsersThree,
  SealCheck,
  Palette,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollRevealText } from "@/components/domain/scroll-reveal-text";
import { TiltMonitorPreview } from "@/components/domain/tilt-monitor-preview";

// 통합 허브 노드 (클랩스 기능명 · 타사 로고 대체)

// 허브 행별 곡선 (연결선 SVG viewBox 300x46 · 행 간격 78px 기준)
// 좌측: 노드 오른쪽(0,23) → 센터 왼쪽 가장자리(300, 센터중심)
const HUB_CURVE_LEFT = [
  "M0 23 C 140 23 160 101 300 101", // 위 행: 아래로
  "M0 23 L 300 23", // 가운데: 직선
  "M0 23 C 140 23 160 -55 300 -55", // 아래 행: 위로
];
// 우측: 센터 오른쪽 가장자리(0, 센터중심) → 노드 왼쪽(300,23)
const HUB_CURVE_RIGHT = [
  "M0 101 C 140 101 160 23 300 23",
  "M0 23 L 300 23",
  "M0 -55 C 140 -55 160 23 300 23",
];

// 지표 (성과 수치 대신 기능 사실 기반 · 과장 없음)
// 아이콘 = Phosphor 듀오톤

// 워크플로우 3단계

// 가이드 검증 스포트라이트 체크리스트

// 핵심 기능 4개 (엔진)

// 활용 사례

// 요금 플랜 (실제 가격 미정 → 문의 기반)

// FAQ

// 푸터 링크 (placeholder)

// 랜딩 페이지 — 레퍼런스(Framer) 실측 스펙에 맞춤:
//   헤드라인 700 / line-height .9 / letter-spacing -.03em / 최대 60px
//   서브텍스트 18px / line-height 1.4
//   진입: opacity 0→1 + translateY 10px→0, ease-out, stagger
//   버튼: hover -1px / active +1px, transition .2s
// 문구/로고는 클랩스용으로 새로 채움.

export default function LandingPage() {
  const t = useT();
  const HUB_LEFT = [
    { label: t("landing.ip_partners"), icon: Users },
    { label: t("landing.brand_guidelines"), icon: FileText },
    { label: t("landing.asset_generation"), icon: ImageIcon },
  ];
  const HUB_RIGHT = [
    { label: t("landing.guideline_verification"), icon: ShieldCheck },
    { label: t("landing.monitoring"), icon: Radar },
    { label: t("landing.reports"), icon: BarChart3 },
  ];
  const STATS = [
    {
      k: t("landing.4_steps"),
      v: t("landing.integrated_workflow"),
      icon: StackSimple,
    },
    {
      k: t("landing.5_checks"),
      v: t("landing.guideline_rule_checks"),
      icon: ListChecks,
    },
    { k: "24/7", v: t("landing.unauthorized_use_detection"), icon: Broadcast },
    {
      k: t("landing.10_levels"),
      v: t("landing.similarity_analysis"),
      icon: MagnifyingGlass,
    },
  ];
  const FLOW = [
    {
      title: t("landing.find_partners"),
      desc: t(
        "landing.find_collaboration_partners_that_fit_your_ip_industry_and",
      ),
      link: t("landing.explore_partner_recommendations"),
      img: "/flow-partner.png",
    },
    {
      title: t("landing.generate_and_verify_assets"),
      desc: t(
        "landing.create_images_for_your_brand_and_automatically_detect_guideline",
      ),
      link: t("landing.explore_asset_generation"),
      img: "/flow-asset.png",
    },
    {
      title: t("landing.monitoring"),
      desc: t(
        "landing.protect_your_brand_by_detecting_unauthorized_use_across_the",
      ),
      link: t("landing.explore_monitoring"),
      img: "/flow-monitoring.png",
    },
  ];
  const SPOTLIGHT_POINTS = [
    {
      k: t("landing.rule_based_verification"),
      v: t("landing.automatically_detect_color_logo_and_typography_violations"),
    },
    {
      k: t("landing.instant_feedback"),
      v: t("landing.see_passes_and_required_changes_immediately"),
    },
    {
      k: t("landing.final_asset_management"),
      v: t("landing.collect_approved_images_in_your_project"),
    },
    {
      k: t("landing.verification_history"),
      v: t("landing.track_what_was_verified_and_when"),
    },
  ];
  const ENGINE = [
    {
      icon: Users,
      title: t("landing.ip_partner_matching"),
      desc: t(
        "landing.find_the_right_partners_using_world_fandom_and_industry",
      ),
    },
    {
      icon: Sparkles,
      title: t("landing.ai_asset_generation"),
      desc: t("landing.easily_create_and_manage_images_that_fit_your_brand"),
    },
    {
      icon: ShieldCheck,
      title: t("landing.automated_guideline_checks"),
      desc: t(
        "landing.automatically_check_whether_generated_assets_follow_brand_guidelines",
      ),
    },
    {
      icon: Radar,
      title: t("landing.unauthorized_use_monitoring"),
      desc: t(
        "landing.protect_your_brand_by_detecting_unauthorized_use_across_the",
      ),
    },
  ];
  const USECASES = [
    { label: t("landing.merchandise_branding"), img: "/usecase-branding.jpg" },
    { label: t("landing.character_ip"), img: "/usecase-character.jpg" },
    { label: t("landing.collaboration_campaigns"), img: "/usecase-collab.jpg" },
  ];
  const PLANS = [
    {
      name: t("landing.starter"),
      note: t("landing.for_teams_getting_started_with_brand_safe_imagery"),
      features: [
        t("landing.project_management"),
        t("landing.ai_asset_generation"),
        t("landing.brand_guideline_verification"),
        t("landing.unauthorized_use_monitoring"),
      ],
      highlight: false,
    },
    {
      name: t("landing.team"),
      note: t("landing.for_teams_that_need_collaboration_and_room_to_grow"),
      features: [
        t("landing.everything_in_starter"),
        t("landing.ip_partner_matching"),
        t("landing.team_collaboration_and_permissions"),
        t("landing.priority_support"),
      ],
      highlight: true,
    },
  ];
  const FAQS = [
    {
      q: t("landing.what_is_claps"),
      a: t("landing.claps_is_ip_safe_ai_middleware_for_generating_and"),
    },
    {
      q: t("landing.where_are_generated_images_stored"),
      a: t("landing.images_that_pass_verification_are_managed_in_the_project"),
    },
    {
      q: t("landing.how_do_i_add_brand_guidelines"),
      a: t("landing.add_brand_guidelines_to_a_project_to_use_them"),
    },
    {
      q: t("landing.how_does_unauthorized_use_monitoring_work"),
      a: t("landing.add_a_reference_image_to_find_similar_images_on"),
    },
    {
      q: t("landing.how_much_does_it_cost"),
      a: t("landing.pricing_is_being_prepared_contact_us_to_discuss_your"),
    },
  ];
  const FOOTER_COLS = [
    {
      title: t("landing.product"),
      links: [
        t("landing.projects"),
        t("landing.partner_recommendations"),
        t("landing.asset_generation"),
        t("landing.guideline_verification"),
        t("landing.monitoring"),
      ],
    },
    {
      title: t("landing.resources"),
      links: [
        t("landing.about"),
        t("landing.guide"),
        t("landing.updates"),
        t("landing.contact"),
      ],
    },
    {
      title: t("landing.company"),
      links: [
        t("landing.terms_of_service"),
        t("landing.privacy_policy"),
        t("landing.security"),
      ],
    },
  ];
  const NAV_LINKS = [
    { label: t("landing.features"), href: "#features" },
    { label: t("landing.use_cases"), href: "#usecases" },
    { label: t("landing.pricing"), href: "#pricing" },
    { label: t("landing.contact"), href: "#contact" },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-landing-bg text-landing-ink">
      {/* 상단 공지바 */}
      <Link
        href="/login"
        className="group relative flex h-9 w-full items-center justify-center overflow-hidden bg-landing-ink px-6 text-sm text-white"
      >
        {/* 가로 웜 그라데이션 (양끝 검정 → 앰버/피치 → 가운데 핑크) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #0a0a0a 0%, rgba(140,84,54,0.55) 20%, rgba(224,150,110,0.8) 36%, rgba(233,143,180,0.9) 50%, rgba(224,150,110,0.8) 64%, rgba(140,84,54,0.55) 80%, #0a0a0a 100%)",
          }}
        />
        {/* 가운데 은은한 핑크 글로우 (살짝 움직임) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mx-auto max-w-2xl blur-2xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,150,190,0.5), transparent)",
            animation: "announce-shimmer 6s ease-in-out infinite",
          }}
        />
        <span className="relative flex items-center gap-2">
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide">
            {t("landing.new")}
          </span>
          <span className="font-medium">
            {t("landing.claps_studio_2_0_ip_safe_ai_brand_image")}
          </span>
        </span>
        <ArrowUpRight className="absolute right-6 size-4 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>

      {/* 내비게이션 */}
      <header className="w-full">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/claps-logo.svg"
              alt="CLAPS"
              width={104}
              height={20}
              priority
              className="[filter:brightness(0)]"
            />
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[16px] font-medium tracking-[-0.01em] transition-opacity duration-200 hover:opacity-60"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <LandingButton
              href="/login"
              tone="dark"
              className="px-4 py-2 text-sm"
            >
              {t("landing.get_started")}
            </LandingButton>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-8">
          <div className="h-px w-full bg-border" />
        </div>
      </header>

      {/* 히어로 (좌측 정렬) */}
      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-8 pt-24 pb-16 text-center md:pt-32 md:pb-24">
          {/* 배지 */}
          <div className="flex animate-in fade-in slide-in-from-bottom-2.5 items-center gap-2.5 duration-500 ease-out">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-[16px] text-landing-ink/60">
              {t("landing.ip_safe_license_safe_ai")}
            </span>
          </div>

          {/* 헤드라인 — 700 / lh .9 / ls -.03em / 최대 60px */}
          <h1 className="mt-7 max-w-[15ch] animate-in fade-in slide-in-from-bottom-2.5 text-[40px] leading-[1.3] font-bold tracking-[-0.03em] delay-100 duration-500 ease-out sm:text-[52px] md:text-[60px]">
            {t("landing.keep_your_ip_safe")}
            <br />
            {t("landing.set_your_creativity_free")}
          </h1>

          {/* 서브텍스트 */}
          <p className="mt-7 max-w-lg animate-in fade-in slide-in-from-bottom-2.5 text-[18px] leading-[1.6] text-landing-ink/60 delay-200 duration-500 ease-out">
            {t(
              "landing.partner_recommendations_image_generation_guideline_checks_and_ip_monitoring",
            )}
            <br />
            {t("landing.manage_it_all_with_claps")}
          </p>

          {/* CTA */}
          <div className="mt-9 flex animate-in fade-in slide-in-from-bottom-2.5 flex-wrap items-center justify-center gap-3 delay-300 duration-500 ease-out">
            <LandingButton href="/login" tone="dark">
              <ArrowUpRight className="size-[18px]" />
              {t("landing.get_started")}
            </LandingButton>
            <LandingButton href="/login" tone="outline">
              <ArrowUpRight className="size-[18px]" />
              {t("landing.view_pricing")}
            </LandingButton>
          </div>
          <p className="mt-4 animate-in fade-in text-[13px] text-landing-ink/40 delay-500 duration-500 ease-out">
            {t("landing.get_started_without_a_credit_card")}
          </p>
        </section>

        {/* 앱 미리보기 — 가이드 검증(2단계) 화면 mock + 플로팅 기능 배지 */}
        <section className="mx-auto w-full max-w-[1200px] px-8 pb-24">
          <div className="relative mx-auto max-w-[860px]">
            {/* 앱 화면 스크린샷 (에셋 생성 · 가이드 검증 2단계) */}
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.28)]">
              <ProductPreview kind="verify" />
            </div>

            {/* 플로팅 기능 배지 (lg+) — 앱 가장자리에 걸쳐 앞으로 */}
            <div className="hidden lg:block">
              <FloatBadge
                icon={Palette}
                label={t("landing.brand_guidelines")}
                className="left-0 top-[10%] ml-[20px] -translate-x-1/2"
                delay={0}
              />
              <FloatBadge
                icon={Sparkle}
                label={t("landing.ai_asset_generation")}
                className="left-0 top-[46%] mt-[-20px] ml-[-20px] -translate-x-1/2"
                delay={200}
              />
              <FloatBadge
                icon={UsersThree}
                label={t("landing.ip_partner_matching")}
                className="left-0 top-[86%] mt-[50px] ml-[110px] -translate-x-1/2"
                delay={400}
              />
              <FloatBadge
                icon={SealCheck}
                label={t("landing.automated_guideline_checks")}
                className="right-0 top-[14%] mt-[-10px] mr-[30px] translate-x-1/2"
                delay={100}
              />
              <FloatBadge
                icon={MagnifyingGlass}
                label={t("landing.similarity_analysis")}
                className="right-0 top-[52%] translate-x-1/2"
                delay={300}
              />
              <FloatBadge
                icon={Broadcast}
                label={t("landing.unauthorized_use_detection")}
                className="right-0 top-[88%] mr-[35px] translate-x-1/2"
                delay={500}
              />
            </div>
          </div>
        </section>

        {/* 문제 → 해결 (2단) */}
        <Section>
          <div className="grid grid-cols-1 gap-8 px-2 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>{t("landing.problemSolution")}</Eyebrow>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                {t("landing.when_tools_are_scattered")}
                <br />
                {t("landing.brand_management_falls_apart")}
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-landing-ink/55">
              {t("landing.you_don_t_need_separate_tools_for_partner_discovery")}
              <br />
              {t("landing.claps_brings_these_steps_together_in_one_workflow")}
            </p>
          </div>

          {/* 다크 통합 허브 카드 */}
          <div className="relative mt-10 overflow-hidden rounded-3xl bg-landing-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.4)]">
            {/* 별 점 패턴 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
              }}
            />
            {/* 하단 웜 글로우 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
              style={{
                background:
                  "radial-gradient(60% 100% at 50% 100%, rgba(255,120,150,0.45), rgba(255,170,90,0.22), transparent)",
              }}
            />

            {/* md+ : 행별 곡선 연결선 + 좌우 노드 + 가운데 허브 */}
            <div className="relative hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-0 px-12 py-14 md:grid">
              {/* 좌측 노드 + 연결선 */}
              <div className="flex flex-col gap-8">
                {HUB_LEFT.map((n, i) => (
                  <div key={n.label} className="flex items-center">
                    <HubNode icon={n.icon} label={n.label} />
                    <HubConnector d={HUB_CURVE_LEFT[i]} delay={i * 0.4} />
                  </div>
                ))}
              </div>

              <HubLogo />

              {/* 우측 연결선 + 노드 */}
              <div className="flex flex-col gap-8">
                {HUB_RIGHT.map((n, i) => (
                  <div key={n.label} className="flex items-center justify-end">
                    <HubConnector
                      d={HUB_CURVE_RIGHT[i]}
                      delay={i * 0.4 + 0.2}
                    />
                    <HubNode icon={n.icon} label={n.label} />
                  </div>
                ))}
              </div>
            </div>

            {/* 모바일 : 허브 + 노드 그리드 */}
            <div className="relative flex flex-col items-center gap-8 px-6 py-14 md:hidden">
              <HubLogo />
              <div className="grid w-full grid-cols-2 gap-3">
                {[...HUB_LEFT, ...HUB_RIGHT].map((n) => (
                  <HubNode key={n.label} icon={n.icon} label={n.label} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 지표 4개 — 브랜드 컬러 아이콘 + 큰 숫자 + 라벨 */}
        <section className="pb-16 md:pb-24">
          <div className="mx-auto w-full max-w-[1200px] px-8 pt-16 md:pt-20">
            <div className="grid grid-cols-2 gap-y-14 md:grid-cols-4">
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.v}
                    className={cn(
                      "flex flex-col items-center gap-5 text-center md:border-border",
                      i > 0 && "md:border-l",
                    )}
                  >
                    <Icon weight="duotone" className="size-12 text-brand/70" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                        {s.k}
                      </span>
                      <span className="text-sm text-landing-ink/55">{s.v}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 워크플로우 */}
        <Section>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>{t("landing.workflow")}</Eyebrow>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                {t("landing.your_brand_image_work")}
                <br />
                {t("landing.in_one_workflow")}
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-landing-ink/55">
              {t(
                "landing.from_recommendations_to_generation_verification_and_monitoring",
              )}
              <br />
              {t("landing.every_step_connects_in_a_simple_workflow")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 border-t border-border md:grid-cols-3">
            {FLOW.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "flex flex-col gap-4 py-8 md:px-8 md:py-10",
                  i > 0 && "border-t border-border md:border-t-0 md:border-l",
                )}
              >
                {/* 미니 미리보기 */}
                <div className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {f.img ? (
                    <Image
                      src={f.img}
                      alt={f.title}
                      fill
                      quality={100}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-xs text-landing-ink/30">
                      {t("landing.preview")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-lg font-semibold">{f.title}</span>
                  <span className="text-sm leading-[1.5] whitespace-pre-line text-landing-ink/55">
                    {f.desc}
                  </span>
                </div>
                <Link
                  href="/login"
                  className="mt-auto flex items-center gap-1 text-sm font-medium text-landing-ink transition-opacity hover:opacity-60"
                >
                  {f.link}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </Section>

        {/* 기능 스포트라이트 (다크) — 가이드 검증 */}
        <section className="bg-landing-ink text-white">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-20 md:py-28">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <span className="inline-block rounded bg-gradient-to-r from-brand to-orange-400 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {t("landing.new")}
                </span>
                <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
                  {t("landing.brand_guidelines_2")}
                  <br />
                  {t("landing.verified_automatically")}
                </h2>
                <LandingButton href="/login" tone="light" className="mt-8">
                  <ArrowUpRight className="size-[18px]" />
                  {t("landing.explore_guideline_verification")}
                </LandingButton>
              </div>
              <div className="flex flex-col gap-5 self-center">
                <p className="text-[17px] leading-[1.5] text-white/60">
                  {t(
                    "landing.automatically_check_generated_images_for_color_logo_and_typography",
                  )}
                  <br />
                  {t("landing.keep_approved_images_together_in_your_library")}
                </p>
                <ul className="flex flex-col gap-3">
                  {SPOTLIGHT_POINTS.map((p) => (
                    <li
                      key={p.k}
                      className="flex items-start gap-3 text-[15px]"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span>
                        <span className="font-semibold">{p.k}</span>
                        <span className="block text-white/50">{p.v}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 엔진 — 기능 4개 그리드 */}
        <Section id="features">
          <Eyebrow>{t("landing.engine")}</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[48px]">
            {t("landing.everything_you_need")}
            <br />
            {t("landing.to_work_with_brand_images")}
          </h2>
          <p className="mt-5 text-[17px] text-landing-ink/55">
            {t("landing.designed_for_licensee_workflows_with_no_need_to_piece")}
          </p>

          <div className="mt-12 grid grid-cols-1 border-t border-border sm:grid-cols-2">
            {ENGINE.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={cn(
                    "flex flex-col items-center gap-3 border-border px-6 py-14 text-center",
                    i % 2 === 1 && "sm:border-l",
                    i >= 2 && "border-t",
                  )}
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10">
                    <Icon className="size-7 text-brand" />
                  </div>
                  <span className="text-lg font-semibold">{f.title}</span>
                  <span className="max-w-xs text-sm leading-[1.5] whitespace-pre-line text-landing-ink/55">
                    {f.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 인게이지먼트 — 2단 교차 */}
        <Section>
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div>
              <Eyebrow>{t("landing.protection")}</Eyebrow>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
                {t("landing.even_after_publication")}
                <br />
                {t("landing.your_brand_stays_protected")}
              </h2>
              <p className="mt-5 max-w-md text-[17px] leading-[1.5] text-landing-ink/55">
                {t(
                  "landing.register_a_reference_image_to_detect_unauthorized_use_across",
                )}
                <br />
                {t("landing.keep_watch_over_how_your_brand_is_used")}
              </p>
              <LandingButton href="/login" tone="dark" className="mt-8">
                <ArrowUpRight className="size-[18px]" />
                {t("landing.explore_monitoring")}
              </LandingButton>
            </div>
            <TiltMonitorPreview />
          </div>
        </Section>

        {/* 브랜드 스테이트먼트 (대형 세리프) */}
        <section
          className="relative"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.1) 1.3px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <div className="mx-auto w-full max-w-[1000px] px-8 py-[212px] text-center md:py-[244px]">
            <ScrollRevealText
              text={t(
                "landing.respecting_licenses_is_the_fastest_way_to_protect_your",
              )}
              className="text-[28px] leading-[1.5] font-bold tracking-[-0.01em] text-landing-ink [font-family:'BookkMyungjo',serif] md:text-[44px]"
            />
            <span className="mt-8 inline-block text-sm font-medium tracking-wide text-landing-ink/40">
              CLAPS Studio 2.0
            </span>
          </div>
        </section>

        {/* 활용 사례 */}
        <Section id="usecases">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <Eyebrow>{t("landing.useCases")}</Eyebrow>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                {t("landing.see_how_it_s_used")}
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-landing-ink/55">
              {t(
                "landing.from_character_merchandise_to_collaboration_campaigns",
              )}
              <br />
              {t("landing.wherever_you_need_brand_imagery")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {USECASES.map((u) => (
              <div
                key={u.label}
                className="group relative flex aspect-[3/4] items-end overflow-hidden rounded-2xl bg-muted"
              >
                <Image
                  src={u.img}
                  alt={u.label}
                  fill
                  quality={100}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative flex w-full items-center justify-between p-5">
                  <span className="text-base font-semibold text-white">
                    {u.label}
                  </span>
                  <ArrowUpRight className="size-5 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 요금 */}
        <Section id="pricing">
          <div className="max-w-xl">
            <Eyebrow>{t("landing.pricing")}</Eyebrow>
            <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
              {t("landing.start_small")}
              <br />
              {t("landing.grow_as_you_need")}
            </h2>
            <p className="mt-5 text-[17px] text-landing-ink/55">
              {t("landing.pricing_is_being_prepared_contact_us_if_you_re")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-col gap-6 rounded-2xl border border-border bg-white p-8 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-landing-ink hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.35)]",
                  p.highlight && "shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]",
                )}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xl font-bold">{p.name}</span>
                  <span className="text-sm text-landing-ink/55">{p.note}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {t("landing.contact")}
                  </span>
                  <span className="text-sm text-landing-ink/50">
                    {t("landing.custom_quote")}
                  </span>
                </div>
                <div className="h-px w-full bg-border" />
                <ul className="flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
                <LandingButton
                  href="/login"
                  tone={p.highlight ? "dark" : "outline"}
                  className="mt-auto w-full justify-center"
                >
                  <ArrowUpRight className="size-[18px]" />
                  {t("landing.contact_us")}
                </LandingButton>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr] md:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.01em]">
                {t("landing.frequently_asked_questions")}
              </h2>
            </div>
            <div className="border-t border-border">
              {FAQS.map((f, index) => (
                <details
                  key={index}
                  className="group border-b border-border py-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-landing-ink/40 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-landing-ink/55">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Section>
      </main>

      {/* 다크 푸터 */}
      <footer className="relative overflow-hidden bg-landing-ink text-white">
        {/* 좌하단 웜 글로우 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-[36rem] blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(168,85,247,0.35), rgba(255,120,150,0.3), rgba(255,170,90,0.2), transparent)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1200px] px-8">
          {/* 마무리 CTA */}
          <div
            id="contact"
            className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-14 md:flex-row md:items-center"
          >
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.01em] md:text-[28px]">
                {t("landing.create_your_brand_imagery_with_licensing_in_mind")}
              </h2>
              <p className="mt-2 max-w-lg text-sm text-white/55">
                {t("landing.generate_verify_and_monitor_in_one_place")}
              </p>
            </div>
            <LandingButton href="/login" tone="light" className="shrink-0">
              {t("landing.get_started_for_free")}
            </LandingButton>
          </div>

          {/* 링크 컬럼 */}
          <div className="grid grid-cols-2 gap-8 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Image
                src="/claps-logo.svg"
                alt="CLAPS"
                width={96}
                height={18}
                className="opacity-90 [filter:brightness(0)_invert(1)]"
              />
              <p className="mt-4 max-w-xs text-sm text-white/45">
                {t("landing.ip_safe_ai_brand_image_middleware")}
              </p>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-xs font-semibold tracking-wide text-white/40">
                  {col.title}
                </span>
                {col.links.map((l) => (
                  <span
                    key={l}
                    aria-disabled="true"
                    className="text-sm text-white/45"
                  >
                    {l}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* 하단 바 */}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 py-8 sm:flex-row sm:items-center">
            <span className="text-sm text-white/45">
              {t("landing.copyright")}
            </span>
            <div className="flex items-center gap-4 text-white/50">
              <span
                role="img"
                aria-label={t("landing.website")}
                className="opacity-50"
              >
                <Globe className="size-4" />
              </span>
              <span
                role="img"
                aria-label={t("landing.news")}
                className="opacity-50"
              >
                <Rss className="size-4" />
              </span>
              <span
                role="img"
                aria-label={t("landing.messages")}
                className="opacity-50"
              >
                <MessageCircle className="size-4" />
              </span>
              <span
                role="img"
                aria-label={t("landing.contact")}
                className="opacity-50"
              >
                <Send className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 섹션 그라데이션 라벨 (반복되던 eyebrow 통일)
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
      {children}
    </span>
  );
}

// 표준 콘텐츠 섹션 래퍼 (max-w·좌우 여백·상하 여백 통일)
function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24",
        className,
      )}
    >
      {children}
    </section>
  );
}

// 랜딩 CTA 버튼 (shadcn Button 기반 · tone으로 3종 통일)
function LandingButton({
  href,
  tone = "dark",
  className,
  children,
}: {
  href: string;
  tone?: "dark" | "light" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    dark: "bg-landing-ink text-white hover:bg-landing-ink",
    light: "bg-white text-landing-ink shadow-sm hover:bg-white",
    outline:
      "border border-border bg-white text-landing-ink shadow-sm hover:bg-white",
  };
  return (
    <Button
      asChild
      className={cn(
        "h-auto gap-2 rounded-[10px] px-5 py-3 text-[15px] font-medium transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px",
        tones[tone],
        className,
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

// 미리보기 주위 플로팅 기능 배지
function FloatBadge({
  icon: Icon,
  label,
  className,
  delay = 0,
}: {
  icon: React.ComponentType<{
    weight?: "fill" | "duotone";
    className?: string;
  }>;
  label: string;
  className?: string;
  delay?: number;
}) {
  // 진입 후 0.8초 대기 + 배지별 순차 딜레이, 팝(0.45s) 끝난 뒤 둥둥 시작
  const popDelay = 800 + delay;
  const floatDelay = popDelay + 450;
  return (
    // 바깥: 위치용(translate/margin 유지)
    <div className={"absolute " + (className ?? "")}>
      {/* 둥둥 레이어: 팝 종료 후 무한 반복 (transform 분리를 위해 중첩) */}
      <div
        style={{
          animation: "badge-float 3.6s ease-in-out infinite",
          animationDelay: `${floatDelay}ms`,
        }}
      >
        {/* 안쪽 알약: 뿅 등장 애니메이션 (스케일) */}
        <div
          className="flex items-center gap-2 rounded-full border border-border bg-white py-[6px] pl-2 pr-4 opacity-0 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.28)]"
          style={{
            animation: "badge-pop 0.45s cubic-bezier(0.22,1,0.36,1) both",
            animationDelay: `${popDelay}ms`,
          }}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
            <Icon weight="fill" className="size-3.5" />
          </span>
          <span className="text-[13px] font-medium whitespace-nowrap text-landing-ink">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// 통합 허브 행별 곡선 연결선 (노드↔센터, 흐르는 점)
function HubConnector({ d, delay }: { d: string; delay: number }) {
  return (
    <svg
      aria-hidden
      className="h-[46px] flex-1 overflow-visible"
      viewBox="0 0 300 46"
      preserveAspectRatio="none"
    >
      {/* 은은한 베이스 선 */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* 흐르는 점 */}
      <path
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 180"
        style={{
          animation: "hub-line-dot 3s linear infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </svg>
  );
}

// 통합 허브 노드 칩 (다크 카드용)
function HubNode({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.1] to-white/[0.03] px-4 py-3 text-sm font-medium text-white/90 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <Icon className="size-4 text-white/55" />
      {label}
    </div>
  );
}

// 통합 허브 중앙 로고 (다크 카드용)
function HubLogo() {
  return (
    <div className="relative flex size-36 items-center justify-center rounded-[32px] border border-white/25 bg-gradient-to-b from-white/[0.14] to-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm">
      {/* 하단 웜 글로우 (맥동) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-2 left-1/2 h-20 w-24 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,140,170,0.7), rgba(255,170,90,0.35), transparent)",
          animation: "hub-glow-pulse 4s ease-in-out infinite",
        }}
      />
      <Image
        src="/claps-logo.svg"
        alt="CLAPS"
        width={88}
        height={17}
        className="relative opacity-95 [filter:brightness(0)_invert(1)]"
      />
    </div>
  );
}
