"use server";

// Server actions for the shop's availability (admin dashboard): check the caller, call the
// service, refresh the pages that show it.

import { revalidatePath } from "next/cache";
import { requireRole } from "../lib/session";
import { safely } from "../lib/result";
import { AvailabilityService } from "../services/availability";

export async function setAvailableAction(responseMinutes: number) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await AvailabilityService.setAvailable(responseMinutes);
    revalidatePath("/", "layout");
  });
}

export async function setAwayAction(backAt: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await AvailabilityService.setAway(backAt);
    revalidatePath("/", "layout");
  });
}
