import { INTL_TAGS, type Locale } from "../i18n/config";
import { SUPPORT_TIME_ZONE } from "./store";

// An AliExpress pick's offer runs until the start of the day after its last day (Tunisia time, see
// services/products.ts). Shown to customers as that last day: "4 October".
export function offerLastDay(endsAtIso: string, locale: Locale) {
  return new Date(Date.parse(endsAtIso) - 1).toLocaleDateString(INTL_TAGS[locale], { day: "numeric", month: "long", timeZone: SUPPORT_TIME_ZONE });
}
