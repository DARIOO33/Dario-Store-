"use server";

// Server actions for cart lines: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { CatalogService } from "../services/catalog";
import { getLocale } from "../i18n/server";

// Public: the cart page asks for fresh prices and stock for its lines.
export async function getCartLinesAction(lines: { productId: string; variantId: string | null }[]) {
  if (
    !Array.isArray(lines) ||
    !lines.every((line) => typeof line?.productId === "string" && (line.variantId === null || typeof line.variantId === "string"))
  ) {
    return [];
  }

  return await CatalogService.getCartLines(lines, await getLocale());
}
