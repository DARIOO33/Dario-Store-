import Link from "next/link";
import { getCurrentUser } from "@/src/lib/session";
import { OrderService } from "@/src/services/orders";
import { MessageService } from "@/src/services/messages";
import StatusBadge from "@/src/components/orders/StatusBadge";
import EmptyState from "@/src/components/ui/EmptyState";
import { formatMillimes } from "@/src/lib/money";
import { formatDate } from "@/src/lib/time";
import { getT, pageTitle } from "@/src/i18n/server";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("orders.title");

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const t = await getT();

  if (!user) {
    return (
      <div className="wrap pageTop">
        <EmptyState
          title={t("orders.loginTitle")}
          text={t("orders.loginText")}
          seed="orders-login"
          action={{ href: "/login", label: t("orders.logIn") }}
        />
      </div>
    );
  }

  const [orders, unread] = await Promise.all([OrderService.listForUser(user.id), MessageService.unreadForCustomer(user.id)]);

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("orders.eyebrow")}</span>
        <h1>{t("orders.title")}</h1>
      </header>

      {orders.length === 0 ? (
        <EmptyState title={t("orders.emptyTitle")} text={t("orders.emptyText")} seed="orders-empty" action={{ href: "/products", label: t("orders.startShopping") }} />
      ) : (
        <ul className="orderList">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/order/${order.id}`} className="orderCard">
                <div>
                  <strong className="orderNo">
                    #{order.orderNumber}
                    {unread[order.id] > 0 && <span className="unread">{t.plural("orders.newMessages", unread[order.id]!)}</span>}
                  </strong>
                  <p className="muted">
                    {formatDate(order.createdAt, t.locale)} · {t("orders.itemCount", { count: order.items.reduce((n, item) => n + item.quantity, 0) })}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <strong>{formatMillimes(order.totalMillimes)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
