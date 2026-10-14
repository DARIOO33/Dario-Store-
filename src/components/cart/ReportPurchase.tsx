"use client";

import { useEffect } from "react";
import { firstPurchaseReport } from "@/src/lib/placed-order";
import { pixel } from "@/src/lib/meta-pixel";

type Props = {
  orderId: string;
  totalMillimes: number;
  lines: { productId: string; quantity: number; priceMillimes: number }[];
};

// Rendered on the customer's order page once the store has confirmed the payment: reports the
// purchase to Meta, once per browser. An order that is never paid is never a sale.
export default function ReportPurchase({ orderId, totalMillimes, lines }: Props) {
  useEffect(() => {
    if (firstPurchaseReport(orderId)) pixel.purchase(orderId, lines, totalMillimes);
  }, [orderId, lines, totalMillimes]);

  return null;
}
