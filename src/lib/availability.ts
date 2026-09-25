import type { Translator } from "../i18n/translate";
import { INTL_TAGS, type Locale } from "../i18n/config";
import { SUPPORT_TIME_ZONE } from "./store";

// How fast the shop answers right now (set by the admin, see services/availability.ts).
// Plain values only, so it can be passed to client components.
// `awayUntilMs` is set only while the team is away (the date is still in the future).
export type Availability = { responseMinutes: number; awayUntilMs: number | null };

// The response times offered on the admin dashboard, in minutes.
export const RESPONSE_CHOICES = [5, 10, 15, 30, 45, 60, 120, 180, 360];

// 15 -> "15 min", 60 -> "1 h", 90 -> "1 h 30 min". Reads the same in English and French.
export function formatResponseTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// "Fri 26 Sep, 07:00" — always in Tunisian time, whatever the server's clock says.
export function formatBackAt(ms: number, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_TAGS[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: SUPPORT_TIME_ZONE,
  }).format(ms);
}

// The sentence customers see at checkout and on their order page.
export function availabilityText(t: Translator, availability: Availability) {
  return availability.awayUntilMs
    ? t("availability.away", { date: formatBackAt(availability.awayUntilMs, t.locale) })
    : t("availability.online", { time: formatResponseTime(availability.responseMinutes) });
}
