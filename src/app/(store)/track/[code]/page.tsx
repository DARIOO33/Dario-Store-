import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentService } from "@/src/services/shipments";
import { statusInfo } from "@/src/lib/shipments";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import BlurredText from "@/src/components/tracking/BlurredText";
import ShipmentStatusBadge from "@/src/components/tracking/ShipmentStatusBadge";
import TrackingAlerts from "@/src/components/tracking/TrackingAlerts";
import TrackingProgress from "@/src/components/tracking/TrackingProgress";
import TrackingTimeline from "@/src/components/tracking/TrackingTimeline";
import { getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";
// Tracking links are private: keep them out of search engines.
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("tracking.yourOrder"), robots: { index: false, follow: false } };
}

export default async function TrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getT();
  const shipment = await ShipmentService.getPublic(code, t.locale);

  if (!shipment) notFound();

  // The whole order is as far as its slowest item (see overallStatus in services/shipments.ts).
  const info = statusInfo(t, shipment.status);
  const { contact } = shipment;
  const several = shipment.items.length > 1;

  return (
    <div className="wrap pageTop trackPage">
      <header className="pageHead">
        <span className="eyebrow">
          {t("tracking.eyebrow", { reference: shipment.reference, code: shipment.trackingCode })}
        </span>
        <h1>{info.label}</h1>
        <p className="pageBlurb">{info.description}</p>
      </header>

      <TrackingProgress status={shipment.status} />

      <div className="trackLayout">
        <section className="panel">
          <h2>{several ? t("tracking.yourItems") : t("tracking.yourItem")}</h2>
          <ul className="trackItems">
            {shipment.items.map((item) => (
              <li key={item.id}>
                <div className="trackItem">
                  <div className="trackThumb">
                    <ProductMedia imageUrl={item.imageUrl} seed={item.id} label={item.name} alt="" />
                  </div>
                  <div className="trackItemText">
                    <strong className="trackItemName">{item.name}</strong>
                    <p className="muted">{t("tracking.quantity", { count: item.quantity })}</p>
                    {several && <ShipmentStatusBadge status={item.status} />}
                  </div>
                </div>
                {(item.trackingNumber || item.estimatedArrival) && (
                  <dl className="facts">
                    {item.estimatedArrival && (
                      <div>
                        <dt>{t("tracking.estimatedArrival")}</dt>
                        <dd>{item.estimatedArrival}</dd>
                      </div>
                    )}
                    {item.trackingNumber && (
                      <div>
                        <dt>{item.carrier ? t("tracking.carrierParcelNumber", { carrier: item.carrier }) : t("tracking.parcelNumber")}</dt>
                        <dd>
                          <code>{item.trackingNumber}</code>
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="trackSide">
          <section className="panel">
            <h2>{t("tracking.deliveryTo")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("tracking.name")}</dt>
                <dd>
                  <BlurredText value={contact.name} />
                </dd>
              </div>
              {contact.phone && (
                <div>
                  <dt>{t("tracking.phone")}</dt>
                  <dd>
                    <BlurredText value={contact.phone} />
                  </dd>
                </div>
              )}
              {(contact.address || contact.city) && (
                <div>
                  <dt>{t("tracking.address")}</dt>
                  <dd>
                    {contact.address && <BlurredText value={contact.address} />}
                    {contact.address && contact.city && ", "}
                    {contact.city}
                  </dd>
                </div>
              )}
              <div>
                <dt>{t("tracking.ordered")}</dt>
                <dd>{shipment.ordered}</dd>
              </div>
            </dl>
            <p className="hint">{t("tracking.privacy")}</p>
          </section>

          {shipment.status !== "CANCELLED" && shipment.status !== "DELIVERED" && <TrackingAlerts trackingCode={shipment.trackingCode} />}
        </div>
      </div>

      <section className="section">
        <div className="sectionHead">
          <h2>{t("tracking.history")}</h2>
        </div>
        <TrackingTimeline events={shipment.events} severalItems={several} />
      </section>

      <p className="muted trackHelp">
        {t("tracking.help")}{" "}
        <Link href="/track" className="linkBtn">
          {t("tracking.trackAnother")}
        </Link>
      </p>
    </div>
  );
}
