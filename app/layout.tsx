import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";

// 미국·일본 화면에서만 쓰는 서체. 한국어에서는 불러오지 않도록 preload를 끈다.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  variable: "--font-noto-jp",
  display: "swap",
  preload: false,
});

// 첫 그림 이전에 저장된 언어를 <html>에 반영 — 한국어로 한 번 번쩍이는 것을 막는다.
const LOCALE_INIT = `try{var l=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(l==="en"||l==="ja"){var d=document.documentElement;d.setAttribute("data-locale",l);d.lang=l}}catch(e){}`;

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
    <html
      lang="ko"
      data-locale="ko"
      className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT }} />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
