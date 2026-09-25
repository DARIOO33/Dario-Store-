"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALES, toLocale } from "../i18n/config";

// The language switcher: remember the choice for a year and re-render the pages.
export async function setLocaleAction(locale: string) {
  if (!LOCALES.some((known) => known === locale)) return;

  (await cookies()).set(LOCALE_COOKIE, toLocale(locale), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
