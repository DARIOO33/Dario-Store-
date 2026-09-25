import { statusInfo, type ShipmentStatus } from "@/src/lib/shipments";
import { getT } from "@/src/i18n/server";

const STYLES: Record<ShipmentStatus, string> = {
  RECEIVED: "",
  PAID: "pillCobalt",
  ORDERED: "pillCobalt",
  SHIPPED: "pillAmber",
  IN_TRANSIT: "pillAmber",
  IN_TUNISIA: "pillAmber",
  OUT_FOR_DELIVERY: "pillAmber",
  DELIVERED: "pillGreen",
  CANCELLED: "pillRed",
};

export default async function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const t = await getT();

  return <span className={`pill ${STYLES[status]}`.trim()}>{statusInfo(t, status).label}</span>;
}
