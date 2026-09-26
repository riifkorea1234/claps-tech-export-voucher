// Temporary UI fixture. These rules are not extracted from the selected PDF.
// Keep them out of persisted guides, jobs, and production verification results.
export const guideAnalysisRules = [
  { id: "color", ko: ["브랜드 컬러 유지", "주요 색상은 브랜드의 기본 팔레트를 유지하고, 과도한 색상 변경을 피해주세요."], en: ["Preserve brand colors", "Keep the core brand palette and avoid major color changes."] },
  { id: "shape", ko: ["캐릭터 비율 유지", "캐릭터의 얼굴, 몸체와 주요 특징의 비율을 유지해주세요."], en: ["Preserve character proportions", "Keep the proportions of the character’s face, body, and defining features."] },
  { id: "logo", ko: ["로고 변형 금지", "로고를 늘리거나 기울이지 않고, 주변에 충분한 여백을 확보해주세요."], en: ["Keep the logo intact", "Do not stretch or tilt the logo, and leave sufficient clear space around it."] },
  { id: "expression", ko: ["표정과 분위기 일관성", "브랜드의 성격에 맞는 표정과 분위기를 사용해주세요."], en: ["Keep expressions consistent", "Use expressions and a mood that fit the brand’s personality."] },
  { id: "background", ko: ["배경과 가독성", "주요 캐릭터와 로고가 배경에 묻히지 않도록 대비와 배치를 조정해주세요."], en: ["Maintain contrast and readability", "Keep the main character and logo clearly visible against the background."] },
  { id: "usage", ko: ["부적절한 표현 제한", "폭력적이거나 차별적인 표현, 브랜드 이미지를 훼손하는 연출을 피해주세요."], en: ["Avoid inappropriate content", "Avoid violent or discriminatory content and depictions that undermine the brand."] },
] as const;
