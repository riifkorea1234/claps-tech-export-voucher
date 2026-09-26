"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  createTranslator,
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
export function LanguageProvider({
  children,
  initialLocale,
  initialMessages,
  locales,
}: {
  children: React.ReactNode;
  initialLocale: string;
  initialMessages: Messages;
  locales: LocaleEntry[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState({
    locale: initialLocale,
    messages: initialMessages,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const t = useMemo(
    () => createTranslator(current.messages, current.locale),
    [current.messages, current.locale],
  );
  useEffect(() => {
    document.documentElement.lang = current.locale;
    document.documentElement.dir =
      locales.find((l) => l.code === current.locale)?.direction ?? "ltr";
  }, [current.locale, locales]);
  async function changeLocale(locale: string) {
    if (busy.current || locale === current.locale) return;
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
        body: JSON.stringify({ locale }),
      });
      if (!response.ok) throw new Error("Locale persistence failed");
      const { data } = await response.json();
      setCurrent({ locale: data.locale, messages: data.messages });
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
