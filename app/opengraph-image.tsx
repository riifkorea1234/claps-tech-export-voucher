import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * 링크 공유 미리보기 이미지 (카톡·슬랙·트위터 등).
 * 빌드할 때 한 장 그려서 저장해두므로 접속할 때마다 다시 그리지 않는다.
 * 문구·색을 바꾸고 싶으면 아래 상수만 고치면 된다.
 */
export const alt = "CLAPS Studio 2.0 - IP-Safe AI 미들웨어";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "IP-Safe AI 미들웨어";
const BG = "#0a0a0a"; // 랜딩 먹색
const BRAND = "#ca0060"; // 브랜드 마젠타

export default async function OpengraphImage() {
  // CLAPS 워드마크를 흰색으로 바꿔서 이미지로 심는다 (원본 SVG는 회색)
  const logoSvg = readFileSync(
    join(process.cwd(), "public/claps-logo.svg"),
    "utf8",
  ).replaceAll("#4B4B4B", "#ffffff");
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  // 한글을 그리려면 폰트 파일이 필요하다 (빌드할 때만 읽는다)
  const pretendard = readFileSync(join(process.cwd(), "app/og-font-semibold.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: BG,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={420} height={78} alt="CLAPS" />
        <div
          style={{
            marginTop: 48,
            fontSize: 44,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            marginTop: 28,
            width: 120,
            height: 5,
            backgroundColor: BRAND,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 600, style: "normal" }],
    },
  );
}
