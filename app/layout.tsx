import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";

export const metadata: Metadata = {
  // 링크 공유용 이미지 주소를 절대 경로로 만들기 위한 기준 도메인
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://claps-tech-export-voucher.vercel.app",
  ),
  title: "CLAPS Studio 2.0",
  description: "IP-Safe AI 미들웨어",
  openGraph: {
    title: "CLAPS Studio 2.0",
    description: "IP-Safe AI 미들웨어",
    siteName: "CLAPS Studio 2.0",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLAPS Studio 2.0",
    description: "IP-Safe AI 미들웨어",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
