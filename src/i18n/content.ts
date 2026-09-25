import type { Locale } from "./config";

// Products and categories carry an optional French text next to the English one.
// A missing French text falls back to English, so nothing is ever blank.
export function localized(locale: Locale, english: string, french: string) {
  return locale === "fr" && french.trim() ? french : english;
}
