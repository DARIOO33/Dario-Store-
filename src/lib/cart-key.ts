// A cart line is one product, or one chosen variant of it.
export function cartKey(productId: string, variantId: string | null | undefined) {
  return `${productId}:${variantId ?? ""}`;
}
