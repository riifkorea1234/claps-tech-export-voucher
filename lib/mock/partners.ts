// 임시 목업 데이터 — 나중에 E1 추천엔진 API 응답으로 교체 (구조 유지)

// 매칭 근거 4항목. 저장에는 코드를 쓰고, 화면에 보일 이름은
// lib/i18n 사전의 factor.* 에서 가져온다.
export type FactorKey = "worldview" | "price" | "fandom" | "industry";
export type Factor = { key: FactorKey; value: number };

export interface Partner {
  id: string;
  rank: number;
  nameKey: string; // 파트너 이름 (사전 열쇠말)
  matchScore: number; // 종합 매칭 %
  email: string; // 협업 담당 이메일 (파트너별)
  summaryKey?: string; // AI 추천 근거 (사전 열쇠말)
  statKeys?: string[]; // 팬덤·시장 요약 칩 (사전 열쇠말)
  avatarUrl?: string;
  factors: Factor[]; // SHAP 근거 바
}

export interface HeroPartner extends Partner {
  imageUrl: string;
  statKeys: string[];
  summaryKey: string;
}

// 근거 4항목을 파트너별로 다르게 (정렬 시 순서가 실제로 바뀌도록)
function makeFactors(
  worldview: number,
  price: number,
  fandom: number,
  industry: number,
): Factor[] {
  return [
    { key: "worldview", value: worldview },
    { key: "price", value: price },
    { key: "fandom", value: fandom },
    { key: "industry", value: industry },
  ];
}

const baseFactors: Factor[] = makeFactors(95, 70, 90, 62);

export const heroPartner: HeroPartner = {
  id: "1",
  rank: 1,
  nameKey: "partnerMock.1.name",
  matchScore: 92,
  email: "partnership@sanriokorea.com",
  imageUrl: "/partner-hero.png",
  summaryKey: "partnerMock.1.summary",
  statKeys: [
    "partnerMock.1.stat1",
    "partnerMock.1.stat2",
    "partnerMock.1.stat3",
    "partnerMock.1.stat4",
  ],
  factors: baseFactors,
};

export const partners: Partner[] = [
  {
    id: "2", rank: 2, nameKey: "partnerMock.2.name", matchScore: 88,
    email: "partner@kakaofriends.com",
    factors: makeFactors(90, 65, 88, 60),
    summaryKey: "partnerMock.2.summary",
    statKeys: [
      "partnerMock.2.stat1",
      "partnerMock.2.stat2",
      "partnerMock.2.stat3",
      "partnerMock.2.stat4",
    ],
  },
  {
    id: "3", rank: 3, nameKey: "partnerMock.3.name", matchScore: 85,
    email: "biz@linefriends.com",
    factors: makeFactors(82, 78, 80, 72),
    summaryKey: "partnerMock.3.summary",
    statKeys: [
      "partnerMock.3.stat1",
      "partnerMock.3.stat2",
      "partnerMock.3.stat3",
      "partnerMock.3.stat4",
    ],
  },
  {
    id: "4", rank: 4, nameKey: "partnerMock.4.name", matchScore: 81,
    email: "collab@zanmang.co.kr",
    factors: makeFactors(88, 60, 72, 55),
    summaryKey: "partnerMock.4.summary",
    statKeys: [
      "partnerMock.4.stat1",
      "partnerMock.4.stat2",
      "partnerMock.4.stat3",
    ],
  },
  {
    id: "5", rank: 5, nameKey: "partnerMock.5.name", matchScore: 79,
    email: "partnership@cinnamoroll.jp",
    factors: makeFactors(76, 85, 68, 64),
    summaryKey: "partnerMock.5.summary",
    statKeys: [
      "partnerMock.5.stat1",
      "partnerMock.5.stat2",
      "partnerMock.5.stat3",
    ],
  },
  {
    id: "6", rank: 6, nameKey: "partnerMock.6.name", matchScore: 76,
    email: "contact@mashimaro.co.kr",
    factors: makeFactors(70, 72, 60, 80),
    summaryKey: "partnerMock.6.summary",
    statKeys: [
      "partnerMock.6.stat1",
      "partnerMock.6.stat2",
      "partnerMock.6.stat3",
    ],
  },
  {
    id: "7", rank: 7, nameKey: "partnerMock.7.name", matchScore: 74,
    email: "licensing@moomin.com",
    factors: makeFactors(84, 58, 55, 50),
    summaryKey: "partnerMock.7.summary",
    statKeys: [
      "partnerMock.7.stat1",
      "partnerMock.7.stat2",
      "partnerMock.7.stat3",
    ],
  },
  {
    id: "8", rank: 8, nameKey: "partnerMock.8.name", matchScore: 71,
    email: "partner@kuromi.jp",
    factors: makeFactors(66, 90, 74, 48),
    summaryKey: "partnerMock.8.summary",
    statKeys: [
      "partnerMock.8.stat1",
      "partnerMock.8.stat2",
      "partnerMock.8.stat3",
    ],
  },
  {
    id: "9", rank: 9, nameKey: "partnerMock.9.name", matchScore: 68,
    email: "biz@apeach.kakao.com",
    factors: makeFactors(72, 63, 66, 86),
    summaryKey: "partnerMock.9.summary",
    statKeys: [
      "partnerMock.9.stat1",
      "partnerMock.9.stat2",
      "partnerMock.9.stat3",
    ],
  },
  {
    id: "10", rank: 10, nameKey: "partnerMock.10.name", matchScore: 65,
    email: "biz@brown.linefriends.com",
    factors: makeFactors(60, 80, 58, 70),
    summaryKey: "partnerMock.10.summary",
    statKeys: [
      "partnerMock.10.stat1",
      "partnerMock.10.stat2",
      "partnerMock.10.stat3",
    ],
  },
];

// 매칭 기준 요약 칩 (상단 다크 배너)
// 매칭 기준 요약 카드. 라벨은 사전에서, 값은 사용자가 입력한 내용(지금은 목업).
// keywords 가 있으면 칩 여러 개로, 없으면 값 한 줄로 그린다.
export type MatchCriterion = {
  labelKey: string;
  valueKey?: string;
  keywordKeys?: string[];
};

export const matchCriteria: MatchCriterion[] = [
  { labelKey: "criteria.ip", valueKey: "criteriaMock.ip" },
  {
    labelKey: "criteria.worldview",
    keywordKeys: [
      "criteriaMock.worldview1",
      "criteriaMock.worldview2",
      "criteriaMock.worldview3",
    ],
  },
  { labelKey: "criteria.licensee", valueKey: "criteriaMock.licensee" },
  { labelKey: "criteria.industry", valueKey: "criteriaMock.industry" },
  { labelKey: "criteria.collabHistory", valueKey: "criteriaMock.collabs" },
];
