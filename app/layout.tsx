import { uiNamespaces } from "@/lib/i18n/core";
import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";
import {
  requestLanguage,
  loadMessages,
  getTranslator,
} from "@/lib/i18n/server";
import { LanguageProvider } from "@/lib/i18n/provider";
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
  const { locale, direction, available, entries } = await requestLanguage();
  const messages = await loadMessages(locale, entries, uiNamespaces);
  return (
    <html lang={locale} dir={direction} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LanguageProvider
          initialLocale={locale}
          initialMessages={messages}
          locales={available}
        >
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
