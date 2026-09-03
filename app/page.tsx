import Link from "next/link";
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
} from "@phosphor-icons/react/dist/ssr";
import { ScrollRevealText } from "@/components/domain/scroll-reveal-text";
import { TiltMonitorPreview } from "@/components/domain/tilt-monitor-preview";

// 통합 허브 노드 (클랩스 기능명 · 타사 로고 대체)
const HUB_LEFT = [
  { label: "IP 파트너", icon: Users },
  { label: "브랜드 가이드", icon: FileText },
  { label: "에셋 생성", icon: ImageIcon },
];
const HUB_RIGHT = [
  { label: "가이드 검증", icon: ShieldCheck },
  { label: "모니터링", icon: Radar },
  { label: "리포트", icon: BarChart3 },
];

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
const STATS = [
  { k: "4단계", v: "통합 워크플로우", icon: StackSimple },
  { k: "5대", v: "가이드 규칙 검증", icon: ListChecks },
  { k: "24/7", v: "무단 사용 탐지", icon: Broadcast },
  { k: "10단계", v: "유사도 분석", icon: MagnifyingGlass },
];

// 워크플로우 3단계
const FLOW = [
  {
    title: "파트너 찾기",
    desc: "IP·업종·팬덤에 맞는 협업 파트너를 추천합니다.",
    link: "파트너 추천 알아보기",
    img: "/flow-partner.png",
  },
  {
    title: "에셋 생성·검증",
    desc: "브랜드에 맞는 이미지를 만들고\n가이드 위반을 자동 검출합니다.",
    link: "에셋 생성 알아보기",
    img: "/flow-asset.png",
  },
  {
    title: "모니터링",
    desc: "웹 전반에서 무단 사용을 탐지해\n브랜드를 보호합니다.",
    link: "모니터링 알아보기",
    img: "/flow-monitoring.png",
  },
];

// 가이드 검증 스포트라이트 체크리스트
const SPOTLIGHT_POINTS = [
  { k: "규칙 기반 검증", v: "색·로고·타이포 위반 자동 검출" },
  { k: "즉시 피드백", v: "통과 / 수정 필요를 바로 확인" },
  { k: "최종본 관리", v: "통과한 이미지를 프로젝트에 모음" },
  { k: "검증 이력", v: "언제 무엇을 검증했는지 기록" },
];

// 핵심 기능 4개 (엔진)
const ENGINE = [
  {
    icon: Users,
    title: "IP 파트너 매칭",
    desc: "세계관·팬덤·업종 데이터로\n최적의 협업 파트너를 추천합니다.",
  },
  {
    icon: Sparkles,
    title: "AI 에셋 생성",
    desc: "브랜드에 맞는 이미지를 손쉽게 생성하고 관리합니다.",
  },
  {
    icon: ShieldCheck,
    title: "가이드 자동 검증",
    desc: "생성물이 브랜드 가이드 규칙을 지키는지\n자동으로 검증합니다.",
  },
  {
    icon: Radar,
    title: "무단 사용 모니터링",
    desc: "웹 전반에서 무단 사용을 탐지해 브랜드를 보호합니다.",
  },
];

// 활용 사례
const USECASES = [
  { label: "굿즈 브랜딩", img: "/usecase-branding.jpg" },
  { label: "캐릭터 IP", img: "/usecase-character.jpg" },
  { label: "콜라보 프로모션", img: "/usecase-collab.jpg" },
];

// 요금 플랜 (실제 가격 미정 → 문의 기반)
const PLANS = [
  {
    name: "스타터",
    note: "브랜드 이미지를 안전하게 시작하는 팀을 위해.",
    features: [
      "프로젝트 관리",
      "AI 에셋 생성",
      "브랜드 가이드 검증",
      "무단 사용 모니터링",
    ],
    highlight: false,
  },
  {
    name: "팀",
    note: "협업과 규모 확장이 필요한 팀을 위해.",
    features: [
      "스타터의 모든 기능",
      "IP 파트너 매칭",
      "팀 협업 · 권한 관리",
      "우선 지원",
    ],
    highlight: true,
  },
];

// FAQ
const FAQS = [
  {
    q: "CLAPS는 어떤 서비스인가요?",
    a: "라이선스 규칙에 맞춰 브랜드 이미지를 생성·검증하고, 무단 사용까지 관리하는 IP-Safe AI 미들웨어입니다.",
  },
  {
    q: "생성한 이미지는 어디에 저장되나요?",
    a: "가이드 검증을 통과한 이미지는 프로젝트의 이미지 라이브러리에 모여 관리됩니다.",
  },
  {
    q: "브랜드 가이드는 어떻게 등록하나요?",
    a: "프로젝트에 브랜드 가이드를 추가하면 검증 규칙으로 반영됩니다.",
  },
  {
    q: "무단 사용 모니터링은 어떻게 작동하나요?",
    a: "기준 이미지를 등록하면 웹에서 유사 이미지를 탐지해 결과를 보여줍니다.",
  },
  {
    q: "요금은 어떻게 되나요?",
    a: "요금 정책은 준비 중입니다. 도입 문의를 남겨주시면 안내해 드립니다.",
  },
];

// 푸터 링크 (placeholder)
const FOOTER_COLS = [
  {
    title: "제품",
    links: ["프로젝트", "파트너 추천", "에셋 생성", "가이드 검증", "모니터링"],
  },
  { title: "리소스", links: ["소개", "가이드", "업데이트", "문의"] },
  { title: "회사", links: ["이용약관", "개인정보처리방침", "보안"] },
];

// 랜딩 페이지 — 레퍼런스(Framer) 실측 스펙에 맞춤:
//   헤드라인 700 / line-height .9 / letter-spacing -.03em / 최대 60px
//   서브텍스트 18px / line-height 1.4
//   진입: opacity 0→1 + translateY 10px→0, ease-out, stagger
//   버튼: hover -1px / active +1px, transition .2s
// 문구/로고는 클랩스용으로 새로 채움.

const NAV_LINKS = [
  { label: "기능", href: "#features" },
  { label: "활용 사례", href: "#usecases" },
  { label: "요금", href: "#pricing" },
  { label: "문의", href: "#contact" },
];


export default function LandingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-[#F5F5F5] text-[#0a0a0a]">
      {/* 상단 공지바 */}
      <Link
        href="/login"
        className="group relative flex h-9 w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 text-sm text-white"
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
            NEW
          </span>
          <span className="font-medium">
            CLAPS Studio 2.0 — IP-Safe AI 브랜드 이미지 미들웨어
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
            <Link
              href="/login"
              className="rounded-[10px] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
            >
              시작하기
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-8">
          <div className="h-px w-full bg-black/10" />
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
            <span className="text-[16px] text-[#0a0a0a]/60">
              IP-Safe · 라이선스 세이프 AI
            </span>
          </div>

          {/* 헤드라인 — 700 / lh .9 / ls -.03em / 최대 60px */}
          <h1 className="mt-7 max-w-[15ch] animate-in fade-in slide-in-from-bottom-2.5 text-[40px] leading-[1.3] font-bold tracking-[-0.03em] delay-100 duration-500 ease-out sm:text-[52px] md:text-[60px]">
            IP는 안전하게,
            <br />
            크리에이티브는 자유롭게
          </h1>

          {/* 서브텍스트 */}
          <p className="mt-7 max-w-lg animate-in fade-in slide-in-from-bottom-2.5 text-[18px] leading-[1.6] text-[#0a0a0a]/60 delay-200 duration-500 ease-out">
            파트너 추천부터 이미지 생성, 가이드 검증, IP 모니터링까지
            <br />
            CLAPS에서 관리하세요.
          </p>

          {/* CTA */}
          <div className="mt-9 flex animate-in fade-in slide-in-from-bottom-2.5 flex-wrap items-center justify-center gap-3 delay-300 duration-500 ease-out">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-[10px] bg-[#0a0a0a] px-5 py-3 text-[15px] font-medium text-white transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
            >
              <ArrowUpRight className="size-[18px]" />
              시작하기
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-[10px] border border-black/10 bg-white px-5 py-3 text-[15px] font-medium shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
            >
              <ArrowUpRight className="size-[18px]" />
              요금 보기
            </Link>
          </div>
          <p className="mt-4 animate-in fade-in text-[13px] text-[#0a0a0a]/40 delay-500 duration-500 ease-out">
            카드 등록 없이 시작하세요
          </p>
        </section>

        {/* 앱 미리보기 — 가이드 검증(2단계) 화면 mock + 플로팅 기능 배지 */}
        <section className="mx-auto w-full max-w-[1200px] px-8 pb-24">
          <div className="relative mx-auto max-w-[860px]">
            {/* 앱 화면 스크린샷 (에셋 생성 · 가이드 검증 2단계) */}
            <div className="overflow-hidden rounded-2xl border border-black/20 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.28)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing-verify.png"
                alt="CLAPS 가이드 검증 화면"
                className="block h-auto w-full"
              />
            </div>

            {/* 플로팅 기능 배지 (lg+) — 앱 가장자리에 걸쳐 앞으로 */}
            <div className="hidden lg:block">
              <FloatBadge
                icon={Palette}
                label="브랜드 가이드"
                className="left-0 top-[10%] ml-[20px] -translate-x-1/2"
                delay={0}
              />
              <FloatBadge
                icon={Sparkle}
                label="AI 에셋 생성"
                className="left-0 top-[46%] mt-[-20px] ml-[-20px] -translate-x-1/2"
                delay={200}
              />
              <FloatBadge
                icon={UsersThree}
                label="IP 파트너 매칭"
                className="left-0 top-[86%] mt-[50px] ml-[110px] -translate-x-1/2"
                delay={400}
              />
              <FloatBadge
                icon={SealCheck}
                label="가이드 자동 검증"
                className="right-0 top-[14%] mt-[-10px] mr-[30px] translate-x-1/2"
                delay={100}
              />
              <FloatBadge
                icon={MagnifyingGlass}
                label="유사도 분석"
                className="right-0 top-[52%] translate-x-1/2"
                delay={300}
              />
              <FloatBadge
                icon={Broadcast}
                label="무단 사용 탐지"
                className="right-0 top-[88%] mr-[35px] translate-x-1/2"
                delay={500}
              />
            </div>
          </div>
        </section>

        {/* 문제 → 해결 (2단) */}
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-8 px-2 md:grid-cols-2 md:gap-16">
            <div>
              <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
                PROBLEM → SOLUTION
              </span>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                도구가 흩어지면
                <br />
                브랜드 관리가 무너집니다
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-[#0a0a0a]/55">
              파트너 찾기·이미지 생성·가이드 검증·무단 사용 감시를 따로 관리할
              필요 없어요.
              <br />
              CLAPS가 흩어진 과정을 하나의 흐름으로 통합합니다.
            </p>
          </div>

          {/* 다크 통합 허브 카드 */}
          <div className="relative mt-10 overflow-hidden rounded-3xl bg-[#0a0a0a] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.4)]">
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
                    <HubConnector d={HUB_CURVE_RIGHT[i]} delay={i * 0.4 + 0.2} />
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
        </section>

        {/* 지표 4개 — 브랜드 컬러 아이콘 + 큰 숫자 + 라벨 */}
        <section className="pb-16 md:pb-24">
          <div className="mx-auto w-full max-w-[1200px] px-8 pt-16 md:pt-20">
            <div className="grid grid-cols-2 gap-y-14 md:grid-cols-4">
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.v}
                    className={
                      "flex flex-col items-center gap-5 text-center md:border-black/10" +
                      (i > 0 ? " md:border-l" : "")
                    }
                  >
                    <Icon weight="duotone" className="size-12 text-brand/70" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                        {s.k}
                      </span>
                      <span className="text-sm text-[#0a0a0a]/55">{s.v}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 워크플로우 */}
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
                THE WORKFLOW
              </span>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                브랜드 이미지 작업을
                <br />
                하나의 흐름으로
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-[#0a0a0a]/55">
              추천에서 시작해 생성·검증을 거쳐 모니터링까지,
              <br />
              하나의 간단한 흐름으로 이어집니다.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 border-t border-black/10 md:grid-cols-3">
            {FLOW.map((f, i) => (
              <div
                key={f.title}
                className={
                  "flex flex-col gap-4 py-8 md:px-8 md:py-10" +
                  (i > 0 ? " border-t border-black/10 md:border-t-0 md:border-l" : "")
                }
              >
                {/* 미니 미리보기 */}
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-black/15 bg-[#f4f4f5]">
                  {f.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.img}
                      alt={f.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-black/30">미리보기</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-lg font-semibold">{f.title}</span>
                  <span className="text-sm leading-[1.5] whitespace-pre-line text-[#0a0a0a]/55">
                    {f.desc}
                  </span>
                </div>
                <Link
                  href="/login"
                  className="mt-auto flex items-center gap-1 text-sm font-medium text-[#0a0a0a] transition-opacity hover:opacity-60"
                >
                  {f.link}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 기능 스포트라이트 (다크) — 가이드 검증 */}
        <section className="bg-[#0a0a0a] text-white">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-20 md:py-28">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <span className="inline-block rounded bg-gradient-to-r from-brand to-orange-400 px-2 py-0.5 text-[11px] font-semibold text-white">
                  NEW
                </span>
                <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
                  브랜드 가이드,
                  <br />
                  자동으로 검증하세요
                </h2>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-white px-5 py-3 text-[15px] font-medium text-[#0a0a0a] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
                >
                  <ArrowUpRight className="size-[18px]" />
                  가이드 검증 알아보기
                </Link>
              </div>
              <div className="flex flex-col gap-5 self-center">
                <p className="text-[17px] leading-[1.5] text-white/60">
                  생성한 이미지가 색·로고·타이포 규칙을 지키는지 자동으로 확인하고,
                  <br />
                  통과한 이미지만 라이브러리에 모아 관리하세요.
                </p>
                <ul className="flex flex-col gap-3">
                  {SPOTLIGHT_POINTS.map((p) => (
                    <li key={p.k} className="flex items-start gap-3 text-[15px]">
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
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
            THE ENGINE
          </span>
          <h2 className="mt-4 max-w-2xl text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[48px]">
            브랜드 이미지를 다루는 데
            <br />
            필요한 모든 것
          </h2>
          <p className="mt-5 text-[17px] text-[#0a0a0a]/55">
            도구를 이어붙일 필요 없이, 라이선시 실무에 맞춰 설계했습니다.
          </p>

          <div className="mt-12 grid grid-cols-1 border-t border-black/10 sm:grid-cols-2">
            {ENGINE.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={
                    "flex flex-col items-center gap-3 border-black/10 px-6 py-14 text-center" +
                    (i % 2 === 1 ? " sm:border-l" : "") +
                    (i >= 2 ? " border-t" : "")
                  }
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10">
                    <Icon className="size-7 text-brand" />
                  </div>
                  <span className="text-lg font-semibold">{f.title}</span>
                  <span className="max-w-xs text-sm leading-[1.5] whitespace-pre-line text-[#0a0a0a]/55">
                    {f.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 인게이지먼트 — 2단 교차 */}
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div>
              <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
                BRAND PROTECTION
              </span>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
                세상에 나간 뒤에도
                <br />
                브랜드는 계속 지켜집니다
              </h2>
              <p className="mt-5 max-w-md text-[17px] leading-[1.5] text-[#0a0a0a]/55">
                기준 이미지를 등록하면 웹 전반에서 무단 사용을 탐지해,
                <br />
                브랜드가 안전하게 쓰이는지 지켜봅니다.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-[#0a0a0a] px-5 py-3 text-[15px] font-medium text-white transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
              >
                <ArrowUpRight className="size-[18px]" />
                모니터링 알아보기
              </Link>
            </div>
            <TiltMonitorPreview />
          </div>
        </section>

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
              text={"라이선스를 지키는 것이,\n브랜드를 지키는 가장 빠른 길입니다."}
              className="text-[28px] leading-[1.5] font-bold tracking-[-0.01em] text-[#0a0a0a] [font-family:'BookkMyungjo',serif] md:text-[44px]"
            />
            <span className="mt-8 inline-block text-sm font-medium tracking-wide text-[#0a0a0a]/40">
              CLAPS Studio 2.0
            </span>
          </div>
        </section>

        {/* 활용 사례 */}
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
                USE CASES
              </span>
              <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[42px]">
                이렇게 쓰입니다
              </h2>
            </div>
            <p className="w-fit self-end ml-auto text-right text-[17px] leading-[1.5] text-[#0a0a0a]/55">
              캐릭터 IP 굿즈부터 콜라보 프로모션까지,
              <br />
              브랜드 이미지가 필요한 모든 순간에.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {USECASES.map((u) => (
              <div
                key={u.label}
                className="group relative flex aspect-[3/4] items-end overflow-hidden rounded-2xl bg-zinc-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.img}
                  alt={u.label}
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        </section>

        {/* 요금 */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24"
        >
          <div className="max-w-xl">
            <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
              PRICING
            </span>
            <h2 className="mt-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[44px]">
              작게 시작하고,
              <br />
              필요한 만큼 확장하세요
            </h2>
            <p className="mt-5 text-[17px] text-[#0a0a0a]/55">
              요금 정책은 준비 중입니다. 도입을 검토 중이시면 문의를 남겨주세요.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  "flex flex-col gap-6 rounded-2xl border border-black/10 bg-white p-8 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[#0a0a0a] hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.35)]" +
                  (p.highlight
                    ? " shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]"
                    : "")
                }
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xl font-bold">{p.name}</span>
                  <span className="text-sm text-[#0a0a0a]/55">{p.note}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">문의</span>
                  <span className="text-sm text-[#0a0a0a]/50">/ 맞춤 견적</span>
                </div>
                <div className="h-px w-full bg-black/10" />
                <ul className="flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={
                    "mt-auto flex items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-[15px] font-medium transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px" +
                    (p.highlight
                      ? " bg-[#0a0a0a] text-white"
                      : " border border-black/10 bg-white")
                  }
                >
                  <ArrowUpRight className="size-[18px]" />
                  문의하기
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-[1200px] px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr] md:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.01em]">자주 묻는 질문</h2>
            </div>
            <div className="border-t border-black/10">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group border-b border-black/10 py-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-[#0a0a0a]/40 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-[#0a0a0a]/55">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 다크 푸터 */}
      <footer className="relative overflow-hidden bg-[#0a0a0a] text-white">
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
          <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-14 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.01em] md:text-[28px]">
                라이선스를 지키며, 브랜드 이미지를 완성하세요
              </h2>
              <p className="mt-2 max-w-lg text-sm text-white/55">
                생성부터 검증·모니터링까지, 도구를 이어붙이지 않고 한 곳에서.
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-[10px] bg-white px-5 py-3 text-[15px] font-medium text-[#0a0a0a] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-px"
            >
              무료로 시작하기
            </Link>
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
                IP-Safe AI 브랜드 이미지 미들웨어.
              </p>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-xs font-semibold tracking-wide text-white/40">
                  {col.title}
                </span>
                {col.links.map((l) => (
                  <a
                    key={l}
                    href="#"
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* 하단 바 */}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 py-8 sm:flex-row sm:items-center">
            <span className="text-sm text-white/45">
              © 2026 CLAPS. All rights reserved.
            </span>
            <div className="flex items-center gap-4 text-white/50">
              <a href="#" aria-label="웹사이트" className="hover:text-white">
                <Globe className="size-4" />
              </a>
              <a href="#" aria-label="소식" className="hover:text-white">
                <Rss className="size-4" />
              </a>
              <a href="#" aria-label="메시지" className="hover:text-white">
                <MessageCircle className="size-4" />
              </a>
              <a href="#" aria-label="문의" className="hover:text-white">
                <Send className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 미리보기 주위 플로팅 기능 배지
function FloatBadge({
  icon: Icon,
  label,
  className,
  delay = 0,
}: {
  icon: React.ComponentType<{ weight?: "fill" | "duotone"; className?: string }>;
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
          className="flex items-center gap-2 rounded-full border border-black/20 bg-white py-[6px] pl-2 pr-4 opacity-0 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.28)]"
          style={{
            animation: "badge-pop 0.45s cubic-bezier(0.22,1,0.36,1) both",
            animationDelay: `${popDelay}ms`,
          }}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
            <Icon weight="fill" className="size-3.5" />
          </span>
          <span className="text-[13px] font-medium whitespace-nowrap text-[#0a0a0a]">
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
