"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { placeOrderAction } from "@/src/actions/orders";
import { cartKey } from "@/src/lib/cart-key";
import { rememberPlacedOrder } from "@/src/lib/placed-order";
import { AVAILABLE_ONLINE_METHODS } from "@/src/lib/payments";
import { useCart } from "@/src/components/cart/CartProvider";
import EmptyState from "@/src/components/ui/EmptyState";
import CartLineRow from "@/src/components/cart/CartLineRow";
import CheckoutFields, { type CheckoutForm } from "@/src/components/cart/CheckoutFields";
import OrderSummary from "@/src/components/cart/OrderSummary";
import { summarize } from "@/src/components/cart/totals";
import { useCartRows } from "@/src/components/cart/useCartRows";
import { useT } from "@/src/i18n/client";
import type { Availability } from "@/src/lib/availability";

// The whole cart page: the lines, the checkout form and the summary. Placing
// the order sends only ids and quantities — the server prices everything.
export default function CartView({ availability }: { availability: Availability }) {
  const t = useT();
  const router = useRouter();
  const { lines, setQuantity, remove } = useCart();
  const { rows, ready, loaded } = useCartRows();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [edits, setEdits] = useState<Partial<CheckoutForm>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Signed-in customers get name/email pre-filled; anything they type wins.
  const form: CheckoutForm = {
    name: session?.user.name ?? "",
    email: session?.user.email ?? "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
    // With a single way to pay, it is already chosen.
    paymentMethod: AVAILABLE_ONLINE_METHODS.length === 1 ? AVAILABLE_ONLINE_METHODS[0]! : "",
    cryptoNetwork: "",
    ...edits,
  };
  const onChange = (key: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEdits((current) => ({ ...current, [key]: e.target.value }));

  const totals = summarize(rows);
  const { usable, hasVirtual } = totals;
  const needsLogin = hasVirtual && !sessionPending && !session;
  const needsPayment = hasVirtual && !!session;
  const hasUnavailable = loaded && rows.some((row) => !row.available);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await placeOrderAction({
        items: usable.map((row) => ({ productId: row.line.productId, variantId: row.line.variantId, quantity: row.line.quantity })),
        ...form,
      });

      if (result.ok) {
        // Keep the cart and the spinner on screen until the order page takes over; that page empties the cart.
        rememberPlacedOrder(result.orderId);
        const query = result.guestToken ? `?t=${result.guestToken}&new=1` : "?new=1";
        router.push(`/order/${result.orderId}${query}`);
        return;
      }
      setError(result.error);
    } catch {
      setError(t("cart.placeFailed"));
    }
    setSubmitting(false);
  };

  if (!ready || (lines.length > 0 && !loaded)) {
    return <div className="cartSkeleton" aria-busy="true" />;
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title={t("cart.emptyTitle")}
        text={t("cart.emptyText")}
        seed="empty-cart"
        action={{ href: "/products", label: t("cart.startShopping") }}
      />
    );
  }

  return (
    <div className="cartLayout">
      {submitting && (
        <div className="placingOverlay" role="status" aria-live="polite">
          <div className="placingCard">
            <span className="spinner" aria-hidden="true" />
            <strong>{t("cart.placingTitle")}</strong>
            <span className="muted">{t("cart.placingText")}</span>
          </div>
        </div>
      )}
      <div className="cartMain">
        <ul className="cartLines">
          {rows.map((row) => (
            <CartLineRow key={cartKey(row.line.productId, row.line.variantId)} row={row} onQuantity={setQuantity} onRemove={remove} />
          ))}
        </ul>

        <CheckoutFields
          form={form}
          onChange={onChange}
          onSubmit={handleSubmit}
          error={error}
          signedIn={!!session}
          needsLogin={needsLogin}
          requiresShipping={totals.requiresShipping}
          hasVirtual={hasVirtual}
          availability={availability}
        />
      </div>

      <aside className="cartSide">
        <OrderSummary
          totals={totals}
          submitting={submitting}
          disabled={submitting || usable.length === 0 || hasUnavailable || needsLogin || sessionPending}
          needsLogin={needsLogin}
          needsPayment={needsPayment}
          hasUnavailable={hasUnavailable}
        />
      </aside>
    </div>
  );
}
