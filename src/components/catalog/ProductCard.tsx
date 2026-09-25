import Link from "next/link";
import type { ProductCardData } from "@/src/services/catalog";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import Price from "@/src/components/ui/Price";
import { QuickAdd } from "@/src/components/cart/AddToCart";
import Stars from "@/src/components/reviews/Stars";
import { getT } from "@/src/i18n/server";

export default async function ProductCard({ product }: { product: ProductCardData }) {
  const t = await getT();
  const href = `/products/${product.slug}`;

  return (
    <article className="pcard" data-tilt>
      <Link href={href} className="pcardMedia" aria-label={product.name} tabIndex={-1}>
        <div className="pcardArt">
          <ProductMedia imageUrl={product.imageUrl} seed={product.id} label={product.name} alt="" />
        </div>
        <div className="pcardBadges">
          {product.type === "VIRTUAL" && <span className="pill pillCobalt">{t("product.digital")}</span>}
          {!product.available && <span className="pill pillInk">{t("product.soldOut")}</span>}
          {product.available && product.lowStock && <span className="pill pillAmber">{t("product.lowStock")}</span>}
        </div>
      </Link>

      <div className="pcardBody">
        <p className="pcardCat">{product.categoryName ?? (product.type === "VIRTUAL" ? t("product.digital") : t("product.fallbackCategory"))}</p>
        <h3 className="pcardName">
          <Link href={href}>{product.name}</Link>
        </h3>
        {product.ratingAverage !== null && (
          <p className="pcardRating">
            <Stars value={product.ratingAverage} label={t("reviews.outOfFive", { value: product.ratingAverage })} />
            <span>{product.ratingAverage.toFixed(1)}</span>
            <span className="muted">({product.ratingCount})</span>
          </p>
        )}
        <div className="pcardFoot">
          <span className="priceFrom">
            {product.hasVariants && <small>{t("product.from")}</small>}
            <Price millimes={product.priceMillimes} />
          </span>
          {product.hasVariants && product.available ? (
            <Link href={href} className="quickAdd quickChoose" aria-label={t("product.chooseOptionFor", { name: product.name })}>
              →
            </Link>
          ) : (
            <QuickAdd productId={product.id} available={product.available} stock={null} />
          )}
        </div>
      </div>
    </article>
  );
}
