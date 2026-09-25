// The shop's availability: the admin says "we answer in about 15 min" or "we're away until
// tomorrow 07:00", and customers see it at checkout, on their order page and in the
// "payment confirmed" message. Being away ends by itself once the date has passed.

import { SupportStatusRepository } from "../prisma/support-status";
import { UserError } from "../lib/result";
import { now } from "../lib/time";
import { SUPPORT_TIME_ZONE } from "../lib/store";
import type { Availability } from "../lib/availability";

const DEFAULT_RESPONSE_MINUTES = 15;
const MAX_AWAY_DAYS = 60;

function checkMinutes(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) {
    throw new UserError("Response time must be between 1 minute and 24 hours.");
  }
  return minutes;
}

// "2026-09-26T07:00" from the admin's date picker is Tunisian time.
function parseBackAt(text: string) {
  try {
    return Temporal.PlainDateTime.from(text).toZonedDateTime(SUPPORT_TIME_ZONE).toInstant();
  } catch {
    throw new UserError("Pick the date and time you'll be back.");
  }
}

export const AvailabilityService = {
  current: async (): Promise<Availability> => {
    const row = await SupportStatusRepository.find();
    const awayUntil = row?.awayUntil && Temporal.Instant.compare(row.awayUntil, now()) > 0 ? row.awayUntil : null;
    return { responseMinutes: row?.responseMinutes ?? DEFAULT_RESPONSE_MINUTES, awayUntilMs: awayUntil?.epochMilliseconds ?? null };
  },

  // The admin's "back at" suggestion: the next 07:00 in Tunisia, as the date picker wants it.
  nextMorning: () => {
    const here = Temporal.Now.zonedDateTimeISO(SUPPORT_TIME_ZONE);
    const day = here.hour < 7 ? here.toPlainDate() : here.toPlainDate().add({ days: 1 });
    return day.toPlainDateTime({ hour: 7 }).toString({ smallestUnit: "minute" });
  },

  setAvailable: async (responseMinutes: number) => {
    await SupportStatusRepository.save({ responseMinutes: checkMinutes(responseMinutes), awayUntil: null });
  },

  // Keeps the usual response time, so it applies again as soon as the admin is back.
  setAway: async (backAtText: string) => {
    const backAt = parseBackAt(backAtText);
    if (Temporal.Instant.compare(backAt, now()) <= 0) throw new UserError("The return time must be in the future.");
    if (Temporal.Instant.compare(backAt, now().add({ hours: MAX_AWAY_DAYS * 24 })) > 0) {
      throw new UserError(`You can be away for ${MAX_AWAY_DAYS} days at most.`);
    }

    const { responseMinutes } = await AvailabilityService.current();
    await SupportStatusRepository.save({ responseMinutes, awayUntil: backAt });
  },
};
