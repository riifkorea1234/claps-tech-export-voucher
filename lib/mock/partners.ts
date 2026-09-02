// 임시 목업 데이터 — 나중에 E1 추천엔진 API 응답으로 교체 (구조 유지)

export type Factor = { label: string; value: number };

export interface Partner {
  id: string;
  rank: number;
  name: string;
  matchScore: number; // 종합 매칭 %
  email: string; // 협업 담당 이메일 (파트너별)
  aiSummary?: string; // AI 추천 근거 (IP 상세)
  stats?: string[]; // 팬덤·시장 요약 칩 (IP 상세)
  avatarUrl?: string;
  factors: Factor[]; // SHAP 근거 바
}

export interface HeroPartner extends Partner {
  imageUrl: string;
  stats: string[]; // 팬덤 120만 등 요약 칩
  aiSummary: string;
}

// 근거 4항목을 파트너별로 다르게 (정렬 시 순서가 실제로 바뀌도록)
function makeFactors(
  worldview: number,
  price: number,
  fandom: number,
  industry: number,
): Factor[] {
  return [
    { label: "세계관 적합", value: worldview },
    { label: "가격 적합", value: price },
    { label: "팬덤 중첩", value: fandom },
    { label: "업종 연관", value: industry },
  ];
}

const baseFactors: Factor[] = makeFactors(95, 70, 90, 62);

export const heroPartner: HeroPartner = {
  id: "1",
  rank: 1,
  name: "산리오 코리아",
  matchScore: 92,
  email: "partnership@sanriokorea.com",
  imageUrl: "/partner-hero.png",
  stats: ["팬덤 120만", "콜라보 8건", "예상 리드타임 6주", "업종 적합 상위 5%"],
  aiSummary:
    "헬로키티의 명랑·일상 세계관이 자사 굿즈 라인과 높은 정합을 보입니다. 팬덤 중첩과 콜라보 이력에서 상위 매칭을 기록했습니다. 세계관 적합(95%)·팬덤 중첩(90%)이 종합 매칭 점수를 가장 크게 끌어올린 요인입니다.",
  factors: baseFactors,
};

export const partners: Partner[] = [
  {
    id: "2", rank: 2, name: "카카오프렌즈", matchScore: 88,
    email: "partner@kakaofriends.com",
    factors: makeFactors(90, 65, 88, 60),
    aiSummary:
      "카카오프렌즈는 국내 최대 메신저 기반 팬덤을 확보해 세계관 적합(90%)·팬덤 중첩(88%)이 매우 높습니다. 일상·유머 톤이 자사 굿즈 라인과 잘 맞아 초기 반응이 기대됩니다.",
    stats: ["팬덤 900만", "콜라보 15건", "예상 리드타임 5주", "MZ 선호 상위"],
  },
  {
    id: "3", rank: 3, name: "라인프렌즈", matchScore: 85,
    email: "biz@linefriends.com",
    factors: makeFactors(82, 78, 80, 72),
    aiSummary:
      "라인프렌즈는 일본·동남아 등 글로벌 팬덤이 강하고 네 항목이 고르게 높습니다. 해외 판로를 고려한 협업에 특히 유리합니다.",
    stats: ["글로벌 팬덤", "콜라보 12건", "해외 진출 유리", "예상 리드타임 6주"],
  },
  {
    id: "4", rank: 4, name: "잔망루피", matchScore: 81,
    email: "collab@zanmang.co.kr",
    factors: makeFactors(88, 60, 72, 55),
    aiSummary:
      "잔망루피는 밈·SNS 화제성이 높아 세계관 적합(88%)이 강점입니다. 업종 연관은 낮은 편이라 굿즈 카테고리 선정이 중요합니다.",
    stats: ["SNS 화제성 상위", "콜라보 9건", "2030 여성 인기"],
  },
  {
    id: "5", rank: 5, name: "시나모롤", matchScore: 79,
    email: "partnership@cinnamoroll.jp",
    factors: makeFactors(76, 85, 68, 64),
    aiSummary:
      "시나모롤은 가격 적합(85%)이 높아 협업 조건 협의가 수월할 것으로 예상됩니다. 산리오 계열의 안정적인 승인 프로세스가 장점입니다.",
    stats: ["가격 조건 우수", "콜라보 7건", "안정적 승인"],
  },
  {
    id: "6", rank: 6, name: "마시마로", matchScore: 76,
    email: "contact@mashimaro.co.kr",
    factors: makeFactors(70, 72, 60, 80),
    aiSummary:
      "마시마로는 업종 연관(80%)이 높아 자사 제품군과 접점이 큽니다. 레트로 감성 라인에 특히 잘 어울립니다.",
    stats: ["레트로 인기", "업종 접점 높음", "콜라보 6건"],
  },
  {
    id: "7", rank: 7, name: "무민", matchScore: 74,
    email: "licensing@moomin.com",
    factors: makeFactors(84, 58, 55, 50),
    aiSummary:
      "무민은 세계관 적합(84%)이 높은 감성 브랜드로, 프리미엄·라이프스타일 라인에 어울립니다. 팬덤 규모는 중간대입니다.",
    stats: ["감성·프리미엄", "콜라보 5건", "해외 라이선스"],
  },
  {
    id: "8", rank: 8, name: "쿠로미", matchScore: 71,
    email: "partner@kuromi.jp",
    factors: makeFactors(66, 90, 74, 48),
    aiSummary:
      "쿠로미는 가격 적합(90%)이 매우 높아 협업 조건 협의가 가장 유리합니다. 최근 팬덤 상승세로 팬덤 중첩도 준수합니다.",
    stats: ["가격 조건 최상", "팬덤 상승세", "콜라보 8건"],
  },
  {
    id: "9", rank: 9, name: "어피치", matchScore: 68,
    email: "biz@apeach.kakao.com",
    factors: makeFactors(72, 63, 66, 86),
    aiSummary:
      "어피치는 업종 연관(86%)이 매우 높아 제품 적용 범위가 넓습니다. 카카오 생태계와 연계한 프로모션도 가능합니다.",
    stats: ["업종 적합 최상", "카카오 연계", "콜라보 6건"],
  },
  {
    id: "10", rank: 10, name: "브라운", matchScore: 65,
    email: "biz@brown.linefriends.com",
    factors: makeFactors(60, 80, 58, 70),
    aiSummary:
      "브라운은 가격 적합(80%)과 업종 연관(70%)이 균형 잡혀 안정적인 협업이 가능합니다. 세계관 적합은 보통 수준입니다.",
    stats: ["안정적 협업", "라인 계열", "콜라보 5건"],
  },
];

// 매칭 기준 요약 칩 (상단 다크 배너)
export const matchCriteria: string[] = [
  "IP: 헬로키티",
  "세계관: 명랑·우정·일상",
  "라이선시: 자사 굿즈",
  "업종: 문구 제조",
  "콜라보 8건",
];
