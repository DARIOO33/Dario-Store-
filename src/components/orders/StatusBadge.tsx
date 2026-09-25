import type { OrderStatus } from "@/src/prisma/orders";
import { getT } from "@/src/i18n/server";
import type { Translator } from "@/src/i18n/translate";

const CLASS_NAMES: Record<OrderStatus, string> = {
  PENDING: "pillAmber",
  PAID: "pillCobalt",
  SHIPPED: "pillInk",
  DELIVERED: "pillGreen",
  CANCELLED: "pillRed",
};

export function statusLabel(t: Translator, status: OrderStatus) {
  return t.messages.orderStatus[status];
}

export default async function StatusBadge({ status }: { status: OrderStatus }) {
  const t = await getT();

  return <span className={`pill ${CLASS_NAMES[status]}`}>{statusLabel(t, status)}</span>;
}
