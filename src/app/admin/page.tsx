import Link from "next/link";
import { StatsService } from "@/src/services/stats";
import { MessageService } from "@/src/services/messages";
import { OrderService } from "@/src/services/orders";
import StatusBadge from "@/src/components/orders/StatusBadge";
import { ORDER_STATUSES } from "@/src/prisma/orders";
import { formatMillimes } from "@/src/lib/money";
import { formatDateTime } from "@/src/lib/time";
import { paymentLabel } from "@/src/lib/payments";
import { getT } from "@/src/i18n/server";

export default async function AdminDashboard() {
  const t = await getT();
  const [stats, unread, toVerify] = await Promise.all([
    StatsService.overview(),
    MessageService.unreadForAdmin(),
    OrderService.awaitingVerification(),
  ]);
  const unreadOrders = Object.keys(unread);
  const unreadTotal = Object.values(unread).reduce((sum, n) => sum + n, 0);
  const maxBar = Math.max(1, ...stats.chart.map((day) => day.millimes));

  const kpis = [
    { label: "Revenue", value: formatMillimes(stats.revenueMillimes), note: "paid, shipped & delivered", tone: "orange" },
    { label: "Orders", value: String(stats.orderCount), note: `${stats.byStatus.PENDING} waiting for you`, tone: "yellow" },
    { label: "Products", value: String(stats.productCount), note: "in the catalogue", tone: "mint" },
    { label: "Low stock", value: String(stats.lowStock.length), note: "need restocking", tone: "pink" },
  ];

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Dashboard</h1>
        </div>
        <Link href="/admin/products/new" className="btn btnAccent">
          + New product
        </Link>
      </header>

      {toVerify.length > 0 && (
        <section className="panel verifyPanel" aria-label="Payments to verify">
          <h2>
            {toVerify.length} payment{toVerify.length === 1 ? "" : "s"} to verify
          </h2>
          <ul className="miniList">
            {toVerify.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`}>
                  <strong>#{order.orderNumber}</strong>
                  <span className="muted">
                    {order.customerName} · {paymentLabel(t, order.paymentMethod)}
                  </span>
                  <strong>{formatMillimes(order.totalMillimes)}</strong>
                  <span className="pill pillAmber">Check proof →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unreadTotal > 0 && (
        <Link href={`/admin/orders/${unreadOrders[0]}`} className="attention">
          <strong>{unreadTotal} unread message{unreadTotal === 1 ? "" : "s"}</strong>
          <span>
            from {unreadOrders.length} customer{unreadOrders.length === 1 ? "" : "s"} — open the conversation →
          </span>
        </Link>
      )}

      <section className="kpis" aria-label="Key numbers">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`kpi kpi-${kpi.tone}`}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.note}</small>
          </div>
        ))}
      </section>

      <div className="adminCols">
        <section className="panel">
          <h2>Last 7 days</h2>
          <div className="bars" role="img" aria-label="Revenue per day for the last 7 days">
            {stats.chart.map((day) => (
              <div key={day.key} className="barCol">
                <span className="barValue">{day.millimes > 0 ? Math.round(day.millimes / 1000) : ""}</span>
                <div className="bar" style={{ height: `${Math.max(4, (day.millimes / maxBar) * 100)}%` }} title={`${day.orders} order(s) · ${formatMillimes(day.millimes)}`} />
                <span className="barLabel">{day.label}</span>
              </div>
            ))}
          </div>
          <p className="hint">Revenue in dinars (paid, shipped and delivered orders).</p>
        </section>

        <section className="panel">
          <h2>Orders by status</h2>
          <ul className="statusList">
            {ORDER_STATUSES.map((status) => (
              <li key={status}>
                <Link href={`/admin/orders?status=${status}`}>
                  <StatusBadge status={status} />
                  <strong>{stats.byStatus[status]}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="adminCols">
        <section className="panel">
          <div className="panelHead">
            <h2>Recent orders</h2>
            <Link href="/admin/orders" className="linkBtn">
              All orders
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <ul className="miniList">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`}>
                    <strong>#{order.orderNumber}</strong>
                    <span className="muted">
                      {order.customerName} · {formatDateTime(order.createdAt)}
                    </span>
                    <StatusBadge status={order.status} />
                    <strong>{formatMillimes(order.totalMillimes)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Running low</h2>
          {stats.lowStock.length === 0 ? (
            <p className="muted">Every product is well stocked.</p>
          ) : (
            <ul className="miniList">
              {stats.lowStock.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${product.id}`}>
                    <strong>{product.name}</strong>
                    <span className={`pill ${product.stock === 0 ? "pillRed" : "pillAmber"}`}>
                      {product.stock === 0 ? "Sold out" : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
