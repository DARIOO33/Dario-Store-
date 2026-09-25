import type { Metadata } from "next";
import Link from "next/link";
import { OrderService } from "@/src/services/orders";
import { MessageService } from "@/src/services/messages";
import { paymentLabel } from "@/src/lib/payments";
import { ORDER_STATUSES, type OrderStatus } from "@/src/prisma/orders";
import StatusBadge, { statusLabel } from "@/src/components/orders/StatusBadge";
import Pagination from "@/src/components/ui/Pagination";
import { buildQuery } from "@/src/lib/query";
import { formatMillimes } from "@/src/lib/money";
import { formatDateTime } from "@/src/lib/time";
import { getT } from "@/src/i18n/server";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 15;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const status = ORDER_STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, pages }, counts, unread] = await Promise.all([
    OrderService.listForAdmin(status, page, PAGE_SIZE),
    OrderService.countByStatus(),
    MessageService.unreadForAdmin(),
  ]);

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">Sales</span>
          <h1>Orders</h1>
        </div>
      </header>

      <nav className="chips" aria-label="Filter by status">
        <Link href="/admin/orders" className={`chip${!status ? " active" : ""}`}>
          All
        </Link>
        {ORDER_STATUSES.map((s: OrderStatus) => (
          <Link key={s} href={`/admin/orders${buildQuery({ status: s })}`} className={`chip${status === s ? " active" : ""}`}>
            {statusLabel(t, s)} <span>{counts[s]}</span>
          </Link>
        ))}
      </nav>

      <p className="muted">{total} order{total === 1 ? "" : "s"}</p>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="muted">No orders here.</p>
        </div>
      ) : (
        <ul className="orderList">
          {rows.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/orders/${order.id}`} className="orderCard">
                <div>
                  <strong className="orderNo">
                    #{order.orderNumber}
                    {order.status === "PENDING" && order.paymentStatus === "SUBMITTED" && <span className="unread unreadPay">Payment sent</span>}
                    {unread[order.id] > 0 && <span className="unread">{unread[order.id]} new</span>}
                  </strong>
                  <p className="muted">
                    {order.customerName} · {formatDateTime(order.createdAt)} · {paymentLabel(t, order.paymentMethod)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <strong>{formatMillimes(order.totalMillimes)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={pages} href={(p) => `/admin/orders${buildQuery({ status, page: p > 1 ? p : undefined })}`} />
    </>
  );
}
