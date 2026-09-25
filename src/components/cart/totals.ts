import { shippingFee } from "@/src/lib/store";
import type { CartRow } from "@/src/components/cart/useCartRows";

// Everything the summary and the checkout form need to know about the cart.
// These numbers are only for display — the server recomputes them at checkout.
export function summarize(rows: CartRow[]) {
  const usable = rows.filter((row): row is CartRow & { product: NonNullable<CartRow["product"]> } => row.available && !!row.product);
  const amount = (row: (typeof usable)[number]) => row.product.priceMillimes * row.line.quantity;

  const subtotal = usable.reduce((sum, row) => sum + amount(row), 0);
  const physicalSubtotal = usable.filter((row) => row.product.type === "PHYSICAL").reduce((sum, row) => sum + amount(row), 0);
  const requiresShipping = usable.some((row) => row.product.type === "PHYSICAL");
  const shipping = requiresShipping ? shippingFee(physicalSubtotal) : 0;

  return {
    usable,
    subtotal,
    physicalSubtotal,
    requiresShipping,
    shipping,
    total: subtotal + shipping,
    hasVirtual: usable.some((row) => row.product.type === "VIRTUAL"),
  };
}
