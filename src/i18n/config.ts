export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// The cookie that remembers a visitor's language.
export const LOCALE_COOKIE = "lang";

// How each language names itself (shown in the language switcher).
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", fr: "Français" };

// The BCP 47 tag used for dates and plural rules.
export const INTL_TAGS: Record<Locale, string> = { en: "en-GB", fr: "fr-FR" };

export function toLocale(value: unknown): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}
