"use client";

import { useEffect } from "react";
import { useCart } from "@/src/components/cart/CartProvider";
import { consumePlacedOrder } from "@/src/lib/placed-order";

// Rendered on the "thank you" order page: empties the cart that produced this order.
export default function ClearCartAfterOrder({ orderId }: { orderId: string }) {
  const { clear, ready } = useCart();

  useEffect(() => {
    if (ready && consumePlacedOrder(orderId)) clear();
  }, [ready, orderId, clear]);

  return null;
}
