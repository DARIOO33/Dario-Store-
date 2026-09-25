import Link from "next/link";
import { formatMillimes } from "@/src/lib/money";
import { getT } from "@/src/i18n/server";

type Order = {
  items: {
    id: string;
    productId: string | null;
    productName: string;
    variantName: string | null;
    productType: string;
    quantity: number;
    unitPriceMillimes: number;
  }[];
  requiresShipping: boolean;
  subtotalMillimes: number;
  shippingMillimes: number;
  totalMillimes: number;
};

// What was ordered and what it cost, from the copy saved on the order (so it
// stays true even if the product is edited or deleted later). Customers get
// links back to the products; the admin view doesn't need them.
export default async function OrderItemsPanel({
  order,
  linkToProducts = false,
  reviewLinks = {},
}: {
  order: Order;
  linkToProducts?: boolean;
  // productId -> whether the customer can write a new review or edit theirs.
  reviewLinks?: Record<string, "new" | "edit">;
}) {
  const t = await getT();

  return (
    <section className="panel">
      <h2>{t("order.items")}</h2>
      <ul className="orderItems">
        {order.items.map((item) => {
          const name = (
            <>
              {item.productName}
              {item.variantName && <span className="cartVariant"> · {item.variantName}</span>}
            </>
          );

          return (
            <li key={item.id}>
              <div>
                {linkToProducts && item.productId ? (
                  <Link href={`/products/${item.productId}`} className="cartName">
                    {name}
                  </Link>
                ) : (
                  <span className="cartName">{name}</span>
                )}
                <div className="cartMeta">
                  <span className={`pill ${item.productType === "VIRTUAL" ? "pillCobalt" : "pillAmber"}`}>
                    {item.productType === "VIRTUAL" ? t("product.digital") : t("product.physical")}
                  </span>
                  <span className="muted">
                    {item.quantity} × {formatMillimes(item.unitPriceMillimes)}
                  </span>
                  {item.productId && reviewLinks[item.productId] && (
                    <Link href={`/products/${item.productId}#write-review`} className="reviewLink">
                      {reviewLinks[item.productId] === "edit" ? t("order.editReview") : t("order.rateItem")}
                    </Link>
                  )}
                </div>
              </div>
              <strong>{formatMillimes(item.unitPriceMillimes * item.quantity)}</strong>
            </li>
          );
        })}
      </ul>

      <dl className="totals">
        <div>
          <dt>{t("summary.subtotal")}</dt>
          <dd>{formatMillimes(order.subtotalMillimes)}</dd>
        </div>
        <div>
          <dt>{t("summary.shipping")}</dt>
          <dd>{order.requiresShipping ? (order.shippingMillimes === 0 ? t("summary.free") : formatMillimes(order.shippingMillimes)) : t("summary.notNeeded")}</dd>
        </div>
        <div className="grand">
          <dt>{t("summary.total")}</dt>
          <dd>{formatMillimes(order.totalMillimes)}</dd>
        </div>
      </dl>
    </section>
  );
}
