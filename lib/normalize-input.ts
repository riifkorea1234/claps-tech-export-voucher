// 일본어 입력값 정규화
// 전각과 반각이 섞여 저장되면 검색·정렬이 어긋나므로 저장 전에 맞춘다.
// (일본 리서치: 전각·반각 혼용에 따른 데이터 정합성 문제가 상시 발생)

/** 전각 영숫자·기호를 반각으로. 전각 공백은 일반 공백으로. */
export function toHalfWidth(value: string): string {
  return value
    .replace(/[！-～]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/　/g, " ");
}

/** 반각 가타카나를 전각으로 (ｱ → ア). 후리가나 입력에서 섞여 들어오는 것을 맞춘다. */
const HALF_KANA = "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ";
const FULL_KANA = "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜";

export function toFullWidthKana(value: string): string {
  return value.replace(/[｡-ﾟ]/g, (c) => {
    const i = HALF_KANA.indexOf(c);
    return i >= 0 ? FULL_KANA[i] : c;
  });
}

/** 저장 직전에 거치는 정리 — 앞뒤 공백 제거 + 폭 정규화 */
export function normalizeName(value: string): string {
  return toFullWidthKana(toHalfWidth(value)).trim();
}
