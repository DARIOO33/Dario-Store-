"use client";

import { useEffect } from "react";
import { useCart } from "@/src/components/cart/CartProvider";
import { consumePlacedOrder } from "@/src/lib/placed-order";
import { pixel } from "@/src/lib/meta-pixel";

type Props = {
  orderId: string;
  // For the Meta Pixel "AddPaymentInfo" event (the purchase is reported later, see ReportPurchase).
  totalMillimes: number;
  lines: { productId: string; quantity: number; priceMillimes: number }[];
};

// Rendered on the "thank you" order page: empties the cart that produced this order and tells Meta
// an order was placed. Both happen once, only for the order this browser just placed (an old "thank you"
// link opened later does neither).
export default function ClearCartAfterOrder({ orderId, totalMillimes, lines }: Props) {
  const { clear, ready } = useCart();

  useEffect(() => {
    if (!ready || !consumePlacedOrder(orderId)) return;
    clear();
    pixel.addPaymentInfo(lines, totalMillimes);
  }, [ready, orderId, clear, lines, totalMillimes]);

  return null;
}
