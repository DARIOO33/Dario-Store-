import type { Metadata } from "next";
import "@fontsource/anton";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { STORE_NAME } from "@/src/lib/store";
import { getLocale, getT } from "@/src/i18n/server";
import { I18nProvider } from "@/src/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    title: { default: `${STORE_NAME} — ${t("store.tagline")}`, template: `%s · ${STORE_NAME}` },
    description: t("store.description", { name: STORE_NAME }),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
