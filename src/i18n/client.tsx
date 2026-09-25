"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

const I18nContext = createContext<Translator | null>(null);

// Wrapped around the whole app by the root layout, so client components can call useT().
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const translator = useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useT() {
  const translator = useContext(I18nContext);
  if (!translator) throw new Error("useT must be used inside <I18nProvider>");
  return translator;
}
