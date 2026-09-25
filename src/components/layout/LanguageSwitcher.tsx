"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/src/actions/locale";
import { LOCALES, type Locale } from "@/src/i18n/config";
import { useT } from "@/src/i18n/client";

// EN | FR — saves the choice in a cookie, then re-renders the page in that language.
export default function LanguageSwitcher() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (locale === t.locale) return;

    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  };

  return (
    <div className="langSwitch" role="group" aria-label={t("nav.language")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          className={locale === t.locale ? "active" : ""}
          aria-pressed={locale === t.locale}
          disabled={pending}
          onClick={() => choose(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
