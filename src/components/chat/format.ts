import { INTL_TAGS, type Locale } from "@/src/i18n/config";

// "14:05" for today's messages, "24 Sept, 14:05" for older ones.
export function timeLabel(iso: string, locale: Locale) {
  const date = new Date(iso);
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString(INTL_TAGS[locale], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString(INTL_TAGS[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// "25 Sept, 11:52" — always with the day, for the order's stage dates.
export function dateTimeLabel(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(INTL_TAGS[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
