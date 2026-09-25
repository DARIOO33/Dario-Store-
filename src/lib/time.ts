import { DEFAULT_LOCALE, INTL_TAGS, type Locale } from "../i18n/config";

// Timestamptz columns read and write `Temporal.Instant` values.
export function now() {
  return Temporal.Now.instant();
}

export function daysAgo(days: number) {
  return now().subtract({ hours: days * 24 });
}

function zoned(instant: Temporal.Instant) {
  return instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

// Dates follow the visitor's language; the admin area always passes "en" (the default).
export function formatDate(instant: Temporal.Instant, locale: Locale = DEFAULT_LOCALE) {
  return zoned(instant).toLocaleString(INTL_TAGS[locale], { dateStyle: "medium" });
}

export function formatDateTime(instant: Temporal.Instant, locale: Locale = DEFAULT_LOCALE) {
  return zoned(instant).toLocaleString(INTL_TAGS[locale], { dateStyle: "medium", timeStyle: "short" });
}

// "YYYY-MM-DD" in the server's timezone — used to bucket orders per day.
export function dayKey(instant: Temporal.Instant) {
  return zoned(instant).toPlainDate().toString();
}
