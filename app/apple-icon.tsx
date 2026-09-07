import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * iOS 홈 화면에 추가했을 때 쓰는 아이콘.
 * iOS는 SVG 파비콘을 못 읽어서 PNG 한 장을 따로 만들어 준다.
 * 모양은 app/icon.svg를 그대로 쓴다 (한 곳만 고치면 둘 다 바뀜).
 * 배경을 꽉 채운 이유: iOS가 알아서 모서리를 둥글게 깎기 때문.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const markSvg = readFileSync(join(process.cwd(), "app/icon.svg"), "utf8");
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} width={180} height={180} alt="CLAPS" />
      </div>
    ),
    size,
  );
}
