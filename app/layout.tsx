import { uiNamespaces } from "@/lib/i18n/core";
import localFont from "next/font/local";
import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";
import {
  requestLanguage,
  loadMessages,
  getTranslator,
} from "@/lib/i18n/server";
import { LanguageProvider } from "@/lib/i18n/provider";
import { currentUser } from "@/lib/server/auth/session";
const inter = localFont({ src: "./fonts/Inter-variable.woff2", variable: "--font-inter", preload: false, weight: "100 900", display: "swap" });
const notoSansJP = localFont({ src: "./fonts/NotoSansJP-variable.woff2", variable: "--font-noto-jp", preload: false, weight: "100 900", display: "swap" });
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLanguage();
  const t = await getTranslator(["landing"]);
  const description = t("landing.metaDescription");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ??
        "https://claps-tech-export-voucher.vercel.app",
    ),
    title: "CLAPS Studio 2.0",
    description,
    openGraph: {
      title: "CLAPS Studio 2.0",
      description,
      siteName: "CLAPS Studio 2.0",
      locale: locale.replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "CLAPS Studio 2.0",
      description,
    },
  };
}
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = await requestLanguage();
  const { locale, direction } = language;
  const publicLanguage = language.scope === "public" ? language : await requestLanguage("public");
  const user = await currentUser();
  const adminLanguage = user?.app_role === "admin" && user.status === "active"
    ? language.scope === "admin" ? language : await requestLanguage("admin") : undefined;
  const snapshot = async (language: typeof publicLanguage) => ({
    locale: language.locale,
    locales: language.available,
    messages: await loadMessages(language.locale, language.entries, uiNamespaces),
  });
  const [publicSnapshot, adminSnapshot] = await Promise.all([
    snapshot(publicLanguage),
    adminLanguage ? snapshot(adminLanguage) : undefined,
  ]);
  return (
    <html lang={locale} dir={direction} data-locale={locale} className={`h-full antialiased ${inter.variable} ${notoSansJP.variable}`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider
          languages={{ public: publicSnapshot, admin: adminSnapshot }}
        >
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
