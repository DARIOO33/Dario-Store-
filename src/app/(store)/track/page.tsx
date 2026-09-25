import type { Metadata } from "next";
import TrackLookupForm from "@/src/components/tracking/TrackLookupForm";
import { getT } from "@/src/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("tracking.title"), robots: { index: false } };
}

export default async function TrackPage() {
  const t = await getT();

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("tracking.pageEyebrow")}</span>
        <h1>{t("tracking.pageTitle")}</h1>
        <p className="pageBlurb">{t("tracking.pageText")}</p>
      </header>

      <div className="panel formPanel">
        <TrackLookupForm />
      </div>
    </div>
  );
}
