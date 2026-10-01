"use client";

import { useEffect, useState } from "react";
import Img from "@/src/components/ui/Img";
import Price from "@/src/components/ui/Price";
import Stars from "@/src/components/reviews/Stars";
import ProductGallery from "@/src/components/catalog/ProductGallery";
import { AddToCartPanel } from "@/src/components/cart/AddToCart";
import { formatMillimes } from "@/src/lib/money";
import { FREE_SHIPPING_FROM_MILLIMES, SHIPPING_FLAT_MILLIMES } from "@/src/lib/store";
import type { ProductDetailData } from "@/src/services/catalog";
import { useT } from "@/src/i18n/client";
import { pixel } from "@/src/lib/meta-pixel";
import { offerLastDay } from "@/src/lib/offers";

// The interactive top half of a product page. It owns the chosen variant so
// the photo, price, stock and add-to-cart button all follow it.
export default function ProductDetail({ product }: { product: ProductDetailData }) {
  const t = useT();
  const { variants } = product;
  const [variantId, setVariantId] = useState<string | null>(() => (variants.find((v) => v.available) ?? variants[0])?.id ?? null);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const physical = product.type === "PHYSICAL";
  const price = variant ? variant.priceMillimes : product.priceMillimes;
  const stock = variant ? variant.stock : product.stock;
  // A pick whose offer has ended can't be bought, whichever option is chosen.
  const available = !product.offerEnded && (variant ? variant.available : product.available);
  const lowStock = stock !== null && stock > 0 && stock <= 5;

  // One Meta Pixel "ViewContent" per product page (not per option picked).
  useEffect(() => {
    pixel.viewContent({ id: product.id, name: product.name, priceMillimes: product.priceMillimes });
  }, [product.id, product.name, product.priceMillimes]);

  // Choosing a variant shows its photo; a thumbnail click overrides that until
  // the next variant is chosen.
  const activeUrl = pickedUrl ?? variant?.imageUrl ?? null;

  return (
    <div className="pdp">
      <ProductGallery seed={variant?.id ?? product.id} name={variant ? `${product.name} ${variant.name}` : product.name} images={product.images} activeUrl={activeUrl} onSelect={setPickedUrl} />

      <div className="pdpInfo">
        <div className="pdpTags">
          <span className={`pill ${physical ? "pillAmber" : "pillCobalt"}`}>{physical ? t("product.physical") : t("product.digital")}</span>
          {product.aliexpressPick && <span className="pill pillRed">{t("product.pickBadge")}</span>}
          {product.featured && !product.aliexpressPick && <span className="pill pillRed">{t("product.featured")}</span>}
          {!available && <span className="pill pillInk">{product.offerEnded ? t("product.offerEnded") : t("product.soldOut")}</span>}
          {product.aliexpressPick && product.offerEndsAt && !product.offerEnded && <span className="pill pillAmber">{t("product.offerEnds", { date: offerLastDay(product.offerEndsAt, t.locale) })}</span>}
          {available && lowStock && <span className="pill pillAmber">{t("product.onlyLeft", { count: stock })}</span>}
        </div>

        <h1>{product.name}</h1>
        {product.ratingAverage !== null && (
          <a href="#reviews" className="ratingLine">
            <Stars value={product.ratingAverage} label={t("reviews.outOfFive", { value: product.ratingAverage })} />
            <span>
              {product.ratingAverage.toFixed(1)} · {t.plural("product.reviews", product.ratingCount)}
            </span>
          </a>
        )}
        <Price millimes={price} className="priceXL" />

        {variants.length > 0 && (
          <div className="variantPicker">
            <p className="variantLabel">
              {t("product.chooseOption")}{variant && <>: <strong>{variant.name}</strong></>}
            </p>
            <div className="variants" role="radiogroup" aria-label={t("product.options")}>
              {variants.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={option.id === variantId}
                  disabled={!option.available}
                  className={`variant${option.id === variantId ? " active" : ""}`}
                  onClick={() => {
                    setVariantId(option.id);
                    setPickedUrl(null);
                  }}
                >
                  {option.imageUrl && (
                    <span className="variantThumb">
                      <Img src={option.imageUrl} alt="" className="media" />
                    </span>
                  )}
                  <span className="variantText">
                    <span className="variantName">{option.name}</span>
                    <span className="variantPrice">{option.available ? formatMillimes(option.priceMillimes) : t("product.soldOut")}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="deliveryNote">
          {product.aliexpressPick ? (
            <>
              <strong>{t("product.pickNoticeTitle")}</strong>
              <ul className="pickNotice">
                <li>{t("product.pickNoticeDelivery")}</li>
                <li>{t("product.pickNoticeCustoms")}</li>
                <li>{t("product.pickNoticePrepaid")}</li>
              </ul>
            </>
          ) : physical ? (
            <>
              <strong>{t("product.deliveredTitle")}</strong>{" "}
              {t("product.deliveredText", {
                fee: formatMillimes(SHIPPING_FLAT_MILLIMES),
                threshold: formatMillimes(FREE_SHIPPING_FROM_MILLIMES).replace(",000", ""),
              })}
            </>
          ) : (
            <>
              <strong>{t("product.digitalTitle")}</strong> {t("product.digitalText")}
            </>
          )}
        </div>

        <div className="pdpBuy">
          {product.offerEnded ? (
            <button type="button" className="btn btnLg btnBlock" disabled>
              {t("product.offerEnded")}
            </button>
          ) : (
          <AddToCartPanel key={variantId ?? "base"} productId={product.id} name={variant ? `${product.name} (${variant.name})` : product.name} priceMillimes={price} variantId={variantId} available={available} stock={stock} />
          )}
        </div>

        {product.description && (
          <div className="pdpDescription">
            <h2>{t("product.about")}</h2>
            <p>{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
