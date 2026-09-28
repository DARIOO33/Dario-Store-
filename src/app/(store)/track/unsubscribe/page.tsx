import type { Metadata } from "next";
import Link from "next/link";
import { ShipmentNotifications } from "@/src/services/shipment-notifications";
import StopTrackingAlerts from "@/src/components/tracking/StopTrackingAlerts";
import { getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("tracking.unsubscribeTitle"), robots: { index: false, follow: false } };
}

// The link at the bottom of every tracking update email. Opening it changes nothing (some email apps
// open links by themselves): the visitor confirms with the button.
export default async function StopTrackingAlertsPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const t = await getT();
  const subscription = await ShipmentNotifications.findByToken(token);

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("tracking.pageEyebrow")}</span>
        <h1>{t("tracking.unsubscribeTitle")}</h1>
      </header>

      <section className="panel trackAlerts">
        {subscription ? (
          <>
            <p>{t("tracking.unsubscribeText", { reference: subscription.reference })}</p>
            <StopTrackingAlerts token={token} />
            <p>
              <Link href={`/track/${subscription.trackingCode}`} className="linkBtn">
                {t("tracking.unsubscribeBack")}
              </Link>
            </p>
          </>
        ) : (
          <p className="muted">{t("tracking.unsubscribeInvalid")}</p>
        )}
      </section>
    </div>
  );
}
