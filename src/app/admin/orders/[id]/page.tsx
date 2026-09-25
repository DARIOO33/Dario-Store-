import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allowedStatuses } from "@/src/services/orders";
import { OrderRepository } from "@/src/prisma/orders";
import OrderStatusForm from "@/src/components/admin/OrderStatusForm";
import PaymentPanel from "@/src/components/orders/PaymentPanel";
import OrderItemsPanel from "@/src/components/orders/OrderItemsPanel";
import OrderChat from "@/src/components/chat/OrderChat";
import DeliverByEmail from "@/src/components/admin/DeliverByEmail";
import { emailConfigured } from "@/src/lib/email";
import StatusBadge, { statusLabel } from "@/src/components/orders/StatusBadge";
import { formatDateTime } from "@/src/lib/time";
import { getT } from "@/src/i18n/server";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const order = await OrderRepository.findById(id);

  if (!order) notFound();

  const options = allowedStatuses(order.requiresShipping).map((value) => ({ value, label: statusLabel(t, value) }));

  return (
    <>
      <header className="adminHead">
        <div>
          <Link href="/admin/orders" className="linkBtn">
            ← Orders
          </Link>
          <h1>
            Order #{order.orderNumber} <StatusBadge status={order.status} />
          </h1>
          <p className="muted">
            Placed {formatDateTime(order.createdAt)} · {order.userId ? "account customer" : "guest checkout"}
          </p>
        </div>
      </header>

      <div className="orderLayout orderWithChat">
        <OrderItemsPanel order={order} />

        <div className="orderSide">
          <section className="panel">
            <h2>Status</h2>
            <OrderStatusForm orderId={order.id} current={order.status} options={options} />
          </section>

          <PaymentPanel
            method={order.paymentMethod}
            cryptoNetwork={order.cryptoNetwork}
            status={order.status}
            paymentSentAt={order.paymentSentAt}
            totalMillimes={order.totalMillimes}
            showInstructions={false}
          />

          {order.status === "PENDING" || order.status === "CANCELLED" ? (
            <section className="panel">
              <h2>Deliver by email</h2>
              <p className="muted">Available once the order is marked as paid.</p>
            </section>
          ) : (
            <DeliverByEmail
              orderId={order.id}
              customerEmail={order.customerEmail}
              emailReady={emailConfigured()}
              sentAt={order.deliveryEmailSentAt ? formatDateTime(order.deliveryEmailSentAt) : null}
              alreadyDelivered={order.status === "DELIVERED"}
            />
          )}

          <section className="panel">
            <h2>Customer</h2>
            <p>{order.customerName}</p>
            <p className="muted">
              <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
            </p>
            {order.customerPhone && (
              <p className="muted">
                <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Delivery</h2>
            {order.requiresShipping ? (
              <>
                <p>{order.shippingAddress}</p>
                <p className="muted">{[order.shippingPostalCode, order.shippingCity, order.shippingCountry].filter(Boolean).join(" · ")}</p>
              </>
            ) : (
              <p className="muted">Digital order — nothing to ship.</p>
            )}
            {order.notes && (
              <p style={{ marginTop: "0.8rem" }}>
                <strong>Note:</strong> {order.notes}
              </p>
            )}
          </section>
        </div>

        <div className="orderChat">
          <div className="chatWrap">
            {order.userId ? (
              <OrderChat orderId={order.id} asAdmin />
            ) : (
              <p className="notice">This is a guest order (physical items, cash on delivery), so there is no chat. Contact the customer by phone or email.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
