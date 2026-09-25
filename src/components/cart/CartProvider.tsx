"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_QUANTITY_PER_LINE } from "@/src/lib/store";

// A line is one product, or one chosen variant of a product.
export type CartRef = { productId: string; variantId: string | null };
export type CartLine = CartRef & { quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (ref: CartRef, quantity?: number, max?: number | null) => void;
  setQuantity: (ref: CartRef, quantity: number) => void;
  remove: (ref: CartRef) => void;
  clear: () => void;
};

const same = (a: CartRef, b: CartRef) => a.productId === b.productId && a.variantId === b.variantId;

const STORAGE_KEY = "dario-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function read(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    // Carts saved before variants existed have no variantId.
    return parsed
      .filter((line) => typeof line?.productId === "string" && Number.isInteger(line?.quantity) && line.quantity > 0)
      .map((line) => ({
        productId: line.productId as string,
        variantId: typeof line.variantId === "string" ? line.variantId : null,
        quantity: line.quantity as number,
      }));
  } catch {
    return [];
  }
}

// The cart lives in the browser (localStorage), so guests and signed-in
// customers shop the same way. It only stores ids and quantities — prices are
// always fetched fresh, and the server re-checks everything at checkout.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // localStorage only exists in the browser, so it can't be read during the
    // first (server-matching) render.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLines(read());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Keep several open tabs in step.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((ref: CartRef, quantity = 1, max: number | null = null) => {
    setLines((current) => {
      const limit = Math.min(MAX_QUANTITY_PER_LINE, max ?? MAX_QUANTITY_PER_LINE);
      const existing = current.find((line) => same(line, ref));

      if (!existing) return [...current, { ...ref, quantity: Math.min(quantity, limit) }];

      return current.map((line) => (same(line, ref) ? { ...line, quantity: Math.min(line.quantity + quantity, limit) } : line));
    });
  }, []);

  const setQuantity = useCallback((ref: CartRef, quantity: number) => {
    setLines((current) =>
      current.map((line) => (same(line, ref) ? { ...line, quantity: Math.max(1, Math.min(quantity, MAX_QUANTITY_PER_LINE)) } : line)),
    );
  }, []);

  const remove = useCallback((ref: CartRef) => {
    setLines((current) => current.filter((line) => !same(line, ref)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) throw new Error("useCart must be used inside <CartProvider>");

  return context;
}
