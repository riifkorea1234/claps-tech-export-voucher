"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createTranslator,
  languageScope,
  type LanguageScope,
  type LocaleEntry,
  type Messages,
  type Translator,
} from "./core";
type LanguageContext = {
  locale: string;
  t: Translator;
  locales: LocaleEntry[];
  pending: boolean;
  error: boolean;
  changeLocale: (locale: string) => Promise<void>;
};
const Context = createContext<LanguageContext | null>(null);
export type LanguageSnapshot = { locale: string; messages: Messages; locales: LocaleEntry[] };
export function LanguageProvider({
  children,
  languages,
}: {
  children: React.ReactNode;
  languages: { public: LanguageSnapshot; admin?: LanguageSnapshot };
}) {
  const router = useRouter();
  const scope = languageScope(usePathname());
  const initial = languages[scope] ?? languages.public;
  const [state, setState] = useState({
    publicLocale: languages.public.locale,
    adminLocale: languages.admin?.locale,
    selections: {} as Partial<Record<LanguageScope, Pick<LanguageSnapshot, "locale" | "messages">>>,
  });
  let selections = state.selections;
  if (state.publicLocale !== languages.public.locale || state.adminLocale !== languages.admin?.locale) {
    selections = {};
    setState({ publicLocale: languages.public.locale, adminLocale: languages.admin?.locale, selections });
  }
  const current = selections[scope] ?? initial;
  const locales = initial.locales;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const t = useMemo(
    () => createTranslator(current.messages, current.locale),
    [current.messages, current.locale],
  );
  useEffect(() => {
    document.documentElement.lang = current.locale;
    document.documentElement.dataset.locale = current.locale;
    document.documentElement.dir =
      locales.find((l) => l.code === current.locale)?.direction ?? "ltr";
  }, [current.locale, locales]);
  async function changeLocale(locale: string) {
    if (busy.current || locale === current.locale || !locales.some((entry) => entry.code === locale)) return;
    busy.current = true;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Claps-Locale": current.locale,
        },
        body: JSON.stringify({ locale, scope }),
      });
      if (!response.ok) throw new Error("Locale persistence failed");
      const { data } = await response.json();
      setState((previous) => ({ ...previous, selections: { ...previous.selections, [scope]: { locale: data.locale, messages: data.messages } } }));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Context.Provider
      value={{
        locale: current.locale,
        t,
        locales,
        pending,
        error,
        changeLocale,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLanguage() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
export function useT() {
  return useLanguage().t;
}
