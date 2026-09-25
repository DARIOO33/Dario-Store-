import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentService } from "@/src/services/shipments";
import { statusInfo } from "@/src/lib/shipments";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import BlurredText from "@/src/components/tracking/BlurredText";
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

  const info = statusInfo(t, shipment.status);
  const { contact } = shipment;

  return (
    <div className="wrap pageTop">
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
          <h2>{t("tracking.yourItem")}</h2>
          <div className="trackItem">
            <div className="trackThumb">
              <ProductMedia imageUrl={shipment.itemImageUrl} seed={shipment.trackingCode} label={shipment.itemName} alt="" />
            </div>
            <div>
              <strong className="trackItemName">{shipment.itemName}</strong>
              <p className="muted">{t("tracking.quantity", { count: shipment.quantity })}</p>
            </div>
          </div>

          <dl className="facts">
            <div>
              <dt>{t("tracking.ordered")}</dt>
              <dd>{shipment.ordered}</dd>
            </div>
            {shipment.estimatedArrival && (
              <div>
                <dt>{t("tracking.estimatedArrival")}</dt>
                <dd>{shipment.estimatedArrival}</dd>
              </div>
            )}
            {shipment.carrierTrackingNumber && (
              <div>
                <dt>{shipment.carrier ? t("tracking.carrierParcelNumber", { carrier: shipment.carrier }) : t("tracking.parcelNumber")}</dt>
                <dd>
                  <code>{shipment.carrierTrackingNumber}</code>
                </dd>
              </div>
            )}
          </dl>
        </section>

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
          </dl>
          <p className="hint">{t("tracking.privacy")}</p>
        </section>
      </div>

      <section className="section">
        <div className="sectionHead">
          <h2>{t("tracking.history")}</h2>
        </div>
        <TrackingTimeline events={shipment.events} />
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
