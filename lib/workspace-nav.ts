// 워크스페이스 스텝 이동 시 "어디서 왔는지"(from·fromLabel)를 주소에 계속 붙이기 위한 헬퍼

export function buildBackQuery(
  from?: string | null,
  fromLabel?: string | null,
): string {
  if (!from) return "";
  const q = new URLSearchParams({ from });
  if (fromLabel) q.set("fromLabel", fromLabel);
  return `?${q.toString()}`;
}
