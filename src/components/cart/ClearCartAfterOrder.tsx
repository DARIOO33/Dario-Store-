"use client";

import { useEffect } from "react";
import { useCart } from "@/src/components/cart/CartProvider";
import { consumePlacedOrder } from "@/src/lib/placed-order";
import { pixel } from "@/src/lib/meta-pixel";

type Props = {
  orderId: string;
  // For the Meta Pixel "Purchase" event.
  totalMillimes: number;
  lines: { productId: string; quantity: number; priceMillimes: number }[];
};

// Rendered on the "thank you" order page: empties the cart that produced this order and reports the
// purchase to Meta. Both happen once, only for the order this browser just placed (an old "thank you"
// link opened later does neither).
export default function ClearCartAfterOrder({ orderId, totalMillimes, lines }: Props) {
  const { clear, ready } = useCart();

  useEffect(() => {
    if (!ready || !consumePlacedOrder(orderId)) return;
    clear();
    pixel.purchase(orderId, lines, totalMillimes);
  }, [ready, orderId, clear, lines, totalMillimes]);

  return null;
}
