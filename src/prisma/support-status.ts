// Database access for the shop's availability (one row, id "main"): plain queries only.
// The rules live in services/availability.ts.
import { db } from "./db";
import { now } from "../lib/time";

const ID = "main";

export const SupportStatusRepository = {
  find: async () => {
    return await db.orm.public.SupportStatus.first({ id: ID });
  },

  save: async (data: { responseMinutes: number; awayUntil: Temporal.Instant | null }) => {
    const existing = await db.orm.public.SupportStatus.first({ id: ID });
    if (existing) return await db.orm.public.SupportStatus.where({ id: ID }).update({ ...data, updatedAt: now() });
    return await db.orm.public.SupportStatus.create({ id: ID, ...data });
  },
};
