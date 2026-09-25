// Search-engine helpers: page descriptions and schema.org data (JSON-LD) that lets Google show
// prices, stock and star ratings under our links. Plain functions, no database.
import type { ProductDetailData } from "../services/catalog";
import { millimesToInput } from "./money";
import { CONTACT, siteUrl, STORE_NAME } from "./store";

// Google shows about 155 characters: one line, cut on a word.
export function metaDescription(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

// The shop's share picture (src/app/opengraph-image.png), for pages that set their own openGraph
// (which replaces the default one, picture included).
export const SHARE_IMAGE = "/opengraph-image.png";

export function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl()}/`).toString();
}

function sameAs() {
  return [CONTACT.instagram && `https://www.instagram.com/${CONTACT.instagram}`, CONTACT.facebook && `https://www.facebook.com/${CONTACT.facebook}`].filter(Boolean);
}

// The shop itself, plus the search box Google can show under the home page result.
export function storeJsonLd(description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: STORE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.png"),
      image: absoluteUrl(SHARE_IMAGE),
      description,
      areaServed: { "@type": "Country", name: "Tunisia" },
      currenciesAccepted: "TND",
      sameAs: sameAs(),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: STORE_NAME,
      url: absoluteUrl("/"),
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

// "Home > Category > Product" as Google shows it above the link.
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1, name: crumb.name, item: absoluteUrl(crumb.path) })),
  };
}

export function productJsonLd(product: ProductDetailData, description: string) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const offer = (name: string | null, priceMillimes: number, available: boolean) => ({
    "@type": "Offer",
    ...(name ? { name } : {}),
    url,
    price: millimesToInput(priceMillimes),
    priceCurrency: "TND",
    availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: STORE_NAME },
  });

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    url,
    sku: product.id,
    image: product.images.map((image) => absoluteUrl(image.url)),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers:
      product.variants.length > 0
        ? product.variants.map((variant) => offer(`${product.name} — ${variant.name}`, variant.priceMillimes, product.available && variant.available))
        : offer(null, product.priceMillimes, product.available),
    ...(product.ratingAverage !== null
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAverage, reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}
