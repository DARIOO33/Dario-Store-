"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MAX_QUANTITY_PER_LINE } from "@/src/lib/store";
import { useCart } from "@/src/components/cart/CartProvider";
import { useT } from "@/src/i18n/client";

type Props = {
  productId: string;
  variantId?: string | null;
  available: boolean;
  stock: number | null;
};

// Small "+" on product cards.
export function QuickAdd({ productId, variantId = null, available, stock }: Props) {
  const t = useT();
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(timer);
  }, [added]);

  if (!available) return <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 700 }}>{t("cart.soldOut")}</span>;

  return (
    <button
      type="button"
      className={`quickAdd${added ? " done" : ""}`}
      aria-label={t("cart.addToCartLabel")}
      onClick={() => {
        add({ productId, variantId }, 1, stock);
        setAdded(true);
      }}
    >
      {added ? "✓" : "+"}
    </button>
  );
}

// Quantity stepper + add button on the product page.
export function AddToCartPanel({ productId, variantId = null, available, stock }: Props) {
  const t = useT();
  const { add } = useCart();
  const max = Math.min(MAX_QUANTITY_PER_LINE, stock ?? MAX_QUANTITY_PER_LINE);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!available) {
    return (
      <button type="button" className="btn btnLg btnBlock" disabled>
        {t("cart.soldOut")}
      </button>
    );
  }

  return (
    <div className="buyBox">
      <div className="stepper" aria-label={t("cart.quantity")}>
        <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label={t("cart.decrease")}>
          −
        </button>
        <output aria-live="polite">{quantity}</output>
        <button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={quantity >= max} aria-label={t("cart.increase")}>
          +
        </button>
      </div>

      <button
        type="button"
        className="btn btnAccent btnLg"
        style={{ flex: 1 }}
        onClick={() => {
          add({ productId, variantId }, quantity, stock);
          setAdded(true);
        }}
      >
        {added ? t("cart.addedMore") : t("cart.addToCart")}
      </button>

      {added && (
        <Link href="/cart" className="btn btnPrimary btnLg" style={{ flexBasis: "100%" }}>
          {t("cart.goToCart")}
        </Link>
      )}
    </div>
  );
}
