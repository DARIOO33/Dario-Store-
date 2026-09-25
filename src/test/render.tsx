import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { I18nProvider } from "@/src/i18n/client";
import type { Locale } from "@/src/i18n/config";

// Renders a client component the way the app does: inside the language provider.
export function renderWithLocale(ui: ReactElement, locale: Locale = "en") {
  return render(<I18nProvider locale={locale}>{ui}</I18nProvider>);
}
