import type { Metadata } from "next";
import "@fontsource/anton";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { siteUrl, STORE_NAME } from "@/src/lib/store";
import { getLocale, getT } from "@/src/i18n/server";
import { I18nProvider } from "@/src/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = `${STORE_NAME} — ${t("store.tagline")}`;
  const description = t("store.description", { name: STORE_NAME });

  return {
    // Makes share images and links absolute (Facebook/WhatsApp previews need full addresses).
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${STORE_NAME}` },
    description,
    applicationName: STORE_NAME,
    // Pages that set their own openGraph replace this one, so they repeat siteName.
    openGraph: { type: "website", siteName: STORE_NAME, title, description, locale: t.locale === "fr" ? "fr_FR" : "en_GB" },
    twitter: { card: "summary_large_image", title, description },
    formatDetection: { telephone: false },
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
