import Link from "next/link";
import { formatMillimes } from "@/src/lib/money";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import type { CartLine } from "@/src/components/cart/CartProvider";
import type { CartRow } from "@/src/components/cart/useCartRows";
import { useT } from "@/src/i18n/client";

type Props = {
  row: CartRow;
  onQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
};

export default function CartLineRow({ row: { line, product, available, cap }, onQuantity, onRemove }: Props) {
  const t = useT();

  return (
    <li className={`cartLine${available ? "" : " unavailable"}`}>
      <div className="cartThumb">
        {product ? <ProductMedia imageUrl={product.imageUrl} seed={product.productId} label={product.name} alt="" /> : <div className="cartThumbGone" />}
      </div>

      <div className="cartInfo">
        {product ? (
          <Link href={`/products/${product.productId}`} className="cartName">
            {product.name}
            {product.variantName && <span className="cartVariant"> · {product.variantName}</span>}
          </Link>
        ) : (
          <span className="cartName">{t("cart.removedProduct")}</span>
        )}
        <div className="cartMeta">
          {product && <span className={`pill ${product.type === "VIRTUAL" ? "pillCobalt" : "pillAmber"}`}>{product.type === "VIRTUAL" ? t("product.digital") : t("product.physical")}</span>}
          {product && <span className="muted">{t("cart.priceEach", { price: formatMillimes(product.priceMillimes) })}</span>}
        </div>
        {!available && <p className="cartWarn">{product ? t("cart.noLongerAvailable") : t("cart.productRemoved")}</p>}
        {available && product && product.stock !== null && product.stock <= 5 && <p className="cartWarn">{t("product.onlyLeft", { count: product.stock })}</p>}
      </div>

      <div className="cartQty">
        {available && (
          <div className="stepper">
            <button type="button" onClick={() => onQuantity(line, line.quantity - 1)} disabled={line.quantity <= 1} aria-label={t("cart.decrease")}>
              −
            </button>
            <output>{line.quantity}</output>
            <button type="button" onClick={() => onQuantity(line, line.quantity + 1)} disabled={line.quantity >= cap} aria-label={t("cart.increase")}>
              +
            </button>
          </div>
        )}
        <button type="button" className="linkBtn" onClick={() => onRemove(line)}>
          {t("cart.remove")}
        </button>
      </div>

      <div className="cartTotal">{available && product ? formatMillimes(product.priceMillimes * line.quantity) : "—"}</div>
    </li>
  );
}
