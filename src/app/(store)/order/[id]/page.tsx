import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/src/lib/session";
import { OrderService, allowedStatuses } from "@/src/services/orders";
import type { OrderStatus } from "@/src/prisma/orders";
import StatusBadge, { statusLabel } from "@/src/components/orders/StatusBadge";
import CancelOrderButton from "@/src/components/orders/CancelOrderButton";
import PaymentPanel from "@/src/components/orders/PaymentPanel";
import OrderItemsPanel from "@/src/components/orders/OrderItemsPanel";
import OrderChat from "@/src/components/chat/OrderChat";
import ClearCartAfterOrder from "@/src/components/cart/ClearCartAfterOrder";
import { ReviewService } from "@/src/services/reviews";
import { AvailabilityService } from "@/src/services/availability";
import { availabilityText } from "@/src/lib/availability";
import { formatDateTime } from "@/src/lib/time";
import { getT, pageTitle } from "@/src/i18n/server";
import { isTeam } from "@/src/lib/roles";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("order.title");

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; new?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await getCurrentUser();
  const t = await getT();
  const order = await OrderService.getForViewer(id, viewer, sp.t ?? null);

  if (!order) notFound();

  const isGuestView = !viewer || (viewer.id !== order.userId && !isTeam(viewer.role));
  const steps: OrderStatus[] = allowedStatuses(order.requiresShipping).filter((status) => status !== "CANCELLED");
  const currentStep = steps.indexOf(order.status);
  const cancelled = order.status === "CANCELLED";
  const isOwner = !!viewer && viewer.id === order.userId;
  const isAdmin = isTeam(viewer?.role);
  const canChat = isOwner || (isAdmin && !!order.userId);
  const [reviewLinks, availability] = await Promise.all([ReviewService.reviewLinksForOrder(viewer, order), AvailabilityService.current()]);
  // Only while the order still waits for the shop (payment to check, or delivery to make).
  const waitingForShop = order.paymentMethod !== "CASH_ON_DELIVERY" && (order.status === "PENDING" || order.status === "PAID");

  return (
    <div className="wrap pageTop">
      {sp.new && <ClearCartAfterOrder orderId={order.id} />}
      {sp.new && !cancelled && (
        <div className="thanks">
          <span className="thanksMark" aria-hidden="true">✓</span>
          <div>
            <h2>{t("order.thanks", { name: order.customerName.split(" ")[0]! })}</h2>
            <p>{t("order.thanksText", { email: order.customerEmail })}</p>
          </div>
        </div>
      )}

      <header className="pageHead orderHead">
        <div>
          <span className="eyebrow">{t("order.eyebrow")}</span>
          <h1>#{order.orderNumber}</h1>
          <p className="muted">{t("order.placed", { date: formatDateTime(order.createdAt, t.locale) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {cancelled ? (
        <p className="error" style={{ marginBottom: "1.5rem" }}>{t("order.cancelledNote")}</p>
      ) : (
        <ol className="timeline" aria-label={t("order.progress")}>
          {steps.map((status, i) => (
            <li key={status} className={i < currentStep ? "done" : i === currentStep ? "current" : ""}>
              <span className="timelineDot">{i < currentStep ? "✓" : i + 1}</span>
              <span className="timelineLabel">{statusLabel(t, status)}</span>
            </li>
          ))}
        </ol>
      )}

      {isGuestView && !viewer && (
        <p className="notice" style={{ marginBottom: "1.5rem" }}>
          {t("order.keepLink")}
        </p>
      )}

      <div className="orderLayout orderWithChat">
        <OrderItemsPanel order={order} linkToProducts reviewLinks={reviewLinks} />

        <div className="orderSide">
          <PaymentPanel
            method={order.paymentMethod}
            cryptoNetwork={order.cryptoNetwork}
            status={order.status}
            paymentStatus={order.paymentStatus}
            totalMillimes={order.totalMillimes}
            showInstructions
          />

          {waitingForShop && <p className="deliveryNote">{availabilityText(t, availability)}</p>}

          <section className="panel">
            <h2>{t("order.contact")}</h2>
            <p>{order.customerName}</p>
            <p className="muted">{order.customerEmail}</p>
            {order.customerPhone && <p className="muted">{order.customerPhone}</p>}
          </section>

          <section className="panel">
            <h2>{t("order.delivery")}</h2>
            {order.requiresShipping ? (
              <>
                <p>{order.shippingAddress}</p>
                <p className="muted">
                  {[order.shippingPostalCode, order.shippingCity, order.shippingCountry].filter(Boolean).join(" · ")}
                </p>
              </>
            ) : (
              <p className="muted">{t("order.digitalNothing")}</p>
            )}
            {order.notes && <p style={{ marginTop: "0.8rem" }}><strong>{t("order.note")}</strong> {order.notes}</p>}
          </section>

          {order.status === "PENDING" && <CancelOrderButton orderId={order.id} token={sp.t ?? null} />}
          {isAdmin && (
            <Link href={`/admin/orders/${order.id}`} className="btn btnAccent">
              {t("order.manage")}
            </Link>
          )}
        </div>

        <div className="orderChat">
          {canChat ? (
            <div className="chatWrap">
              <OrderChat orderId={order.id} asAdmin={!isOwner} />
            </div>
          ) : (
            <p className="notice chatWrap">
              {t("order.questions")}{" "}
              <Link href="/login" className="linkBtn">
                {t("order.logIn")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
