import { SHIPMENT_STEPS, statusInfo, type ShipmentStatus } from "@/src/lib/shipments";
import { getT } from "@/src/i18n/server";

// The eight stages in a row, with everything up to the current one filled in.
export default async function TrackingProgress({ status }: { status: ShipmentStatus }) {
  const t = await getT();

  if (status === "CANCELLED") {
    return <p className="error trackCancelled">{t("tracking.cancelled")}</p>;
  }

  const current = SHIPMENT_STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="trackSteps" aria-label={t("tracking.progress")}>
      {SHIPMENT_STEPS.map((step, i) => (
        <li key={step.status} className={i < current ? "done" : i === current ? "current" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="trackStepNo">{String(i + 1).padStart(2, "0")}</span>
          {statusInfo(t, step.status).label}
        </li>
      ))}
    </ol>
  );
}
