"use client";

import { useEffect, useMemo, useState } from "react";
import { getCartLinesAction } from "@/src/actions/catalog";
import { cartKey } from "@/src/lib/cart-key";
import { MAX_QUANTITY_PER_LINE } from "@/src/lib/store";
import type { CartLineData } from "@/src/services/catalog";
import { useCart, type CartLine } from "@/src/components/cart/CartProvider";
import { useT } from "@/src/i18n/client";

// One line of the cart joined with its fresh server data.
export type CartRow = {
  line: CartLine;
  // Undefined while loading, or when the product no longer exists.
  product: CartLineData | undefined;
  available: boolean;
  // The most the customer can add: the stock left, capped at the per-line limit.
  cap: number;
};

// The cart itself only remembers ids and quantities. This asks the server for
// the current name, price and stock of every line, and keeps quantities within
// what's in stock.
export function useCartRows() {
  const { lines, ready, setQuantity } = useCart();
  const { locale } = useT();
  const [fresh, setFresh] = useState<Record<string, CartLineData>>({});
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);

  // Fetch again whenever the *set* of lines changes (not on every quantity tweak),
  // or the language does (product names come back translated).
  const setKey = lines.map((line) => cartKey(line.productId, line.variantId)).sort().join(",");
  const linesKey = setKey && `${locale}:${setKey}`;
  useEffect(() => {
    if (!ready || !linesKey) return;

    let cancelled = false;
    getCartLinesAction(lines.map(({ productId, variantId }) => ({ productId, variantId }))).then((found) => {
      if (cancelled) return;
      setFresh(Object.fromEntries(found.map((line) => [cartKey(line.productId, line.variantId), line])));
      setFetchedKey(linesKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lines` changes on every quantity tweak; `linesKey` only changes with the set of lines
  }, [ready, linesKey]);

  const loaded = ready && (linesKey === "" || fetchedKey === linesKey);

  const rows: (CartRow & { tooMany: boolean })[] = useMemo(
    () =>
      lines.map((line) => {
        const product = fresh[cartKey(line.productId, line.variantId)];
        const available = !!product && product.available;
        const cap = product?.stock === null || !product ? MAX_QUANTITY_PER_LINE : Math.min(product.stock, MAX_QUANTITY_PER_LINE);
        return { line, product, available, cap, tooMany: available && line.quantity > cap };
      }),
    [lines, fresh],
  );

  // If stock dropped below what's in the cart, bring the quantity down to match.
  useEffect(() => {
    for (const row of rows) {
      if (row.tooMany) setQuantity(row.line, row.cap);
    }
  }, [rows, setQuantity]);

  return { rows: rows as CartRow[], ready, loaded };
}
