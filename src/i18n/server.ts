import type { Metadata } from "next";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, toLocale, type Locale } from "./config";
import { createTranslator, type MessageKey, type Translator } from "./translate";

// Both are remembered for the rest of the request (React `cache`), since every component asks.
// The visitor's language: the admin area is always English (src/proxy.ts sets
// the x-locale header there), everything else follows the language cookie.
export const getLocale = cache(async (): Promise<Locale> => {
  const forced = (await headers()).get("x-locale");
  if (forced) return toLocale(forced);

  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
});

// For server components, actions and services: `const t = await getT();`
export const getT = cache(async (): Promise<Translator> => createTranslator(await getLocale()));

// A page whose title is just one translated text:
// `export const generateMetadata = pageTitle("shop.title");`
export function pageTitle(key: MessageKey) {
  return async (): Promise<Metadata> => ({ title: (await getT())(key) });
}
