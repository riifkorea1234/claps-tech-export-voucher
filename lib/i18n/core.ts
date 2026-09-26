export const DEFAULT_LOCALE = "ko";
export const LOCALE_COOKIE = "claps-locale";
export const namespaces = [
  "common",
  "navigation",
  "landing",
  "auth",
  "projects",
  "partners",
  "assets",
  "monitoring",
  "admin",
  "email",
  "errors",
] as const;
export type Namespace = (typeof namespaces)[number];
export type Messages = Record<string, string>;
export type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;
export type LocaleEntry = {
  code: string;
  nativeName: string;
  direction: string;
  fallbackCode: string | null;
  enabled: boolean;
  sortOrder: number;
};
export function matchLocale(
  value: string | undefined | null,
  supported: readonly string[],
): string | undefined {
  if (!value) return;
  try {
    let tag = Intl.getCanonicalLocales(value.trim())[0];
    while (tag) {
      const found = supported.find(
        (code) => code.toLowerCase() === tag.toLowerCase(),
      );
      if (found) return found;
      tag = tag.includes("-") ? tag.slice(0, tag.lastIndexOf("-")) : "";
    }
  } catch {
    /* Invalid locale is not reflected to the UI. */
  }
}
export function resolveLocale(
  supported: readonly string[],
  cookie?: string,
  preference?: string,
  acceptLanguage?: string | null,
) {
  const explicit =
    matchLocale(cookie, supported) ?? matchLocale(preference, supported);
  if (explicit) return explicit;
  const requested = (acceptLanguage ?? "")
    .split(",")
    .map((item, index) => {
      const [tag, ...params] = item.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag, weight: q ? Number(q.trim().slice(2)) : 1, index };
    })
    .filter((item) => item.weight > 0 && item.weight <= 1)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of requested) {
    const found = matchLocale(tag, supported);
    if (found) return found;
  }
  return DEFAULT_LOCALE;
}
export function validateFallbacks(entries: readonly LocaleEntry[]) {
  const registry = new Map(entries.map((entry) => [entry.code, entry]));
  for (const entry of entries) {
    if (Intl.getCanonicalLocales(entry.code)[0] !== entry.code)
      throw new Error("Invalid locale registry");
    const seen = new Set<string>();
    let code: string | null = entry.code;
    while (code) {
      if (seen.has(code) || !registry.has(code))
        throw new Error("Invalid locale fallback");
      seen.add(code);
      code = registry.get(code)!.fallbackCode;
    }
  }
}
export function fallbackChain(locale: string, entries: readonly LocaleEntry[]) {
  validateFallbacks(entries);
  const chain: string[] = [];
  let code: string | null = locale;
  while (code) {
    chain.push(code);
    code = entries.find((entry) => entry.code === code)?.fallbackCode ?? null;
  }
  if (!chain.includes(DEFAULT_LOCALE)) chain.push(DEFAULT_LOCALE);
  return chain;
}
export function createTranslator(
  messages: Messages,
  locale = DEFAULT_LOCALE,
): Translator {
  return (key, values = {}) => {
    const plural =
      typeof values.count === "number"
        ? new Intl.PluralRules(locale).select(values.count)
        : "";
    const text =
      messages[`${key}.${plural}`] ||
      messages[key] ||
      messages["common.unavailable"] ||
      "—";
    return text.replace(/\{([a-zA-Z][\w]*)\}/g, (_, name: string) =>
      typeof values[name] === "number"
        ? new Intl.NumberFormat(locale).format(values[name])
        : String(values[name] ?? "—"),
    );
  };
}
export function variables(value: string) {
  return [
    ...new Set([...value.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map((m) => m[1])),
  ].sort();
}

// Public API error messages are also rendered by WorkspaceError in the client.
// Email templates remain server-only.
export const uiNamespaces = namespaces.filter(
  (ns) => ns !== "email",
);
