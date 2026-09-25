import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ProductCard from "@/src/components/catalog/ProductCard";
import ProductDetail from "@/src/components/catalog/ProductDetail";
import ReviewsSection from "@/src/components/reviews/ReviewsSection";
import { getCurrentUser } from "@/src/lib/session";
import JsonLd from "@/src/components/seo/JsonLd";
import { CatalogService, type ProductDetailData } from "@/src/services/catalog";
import { breadcrumbJsonLd, metaDescription, productJsonLd, SHARE_IMAGE } from "@/src/lib/seo";
import { formatMillimes } from "@/src/lib/money";
import { STORE_NAME } from "@/src/lib/store";
import type { Translator } from "@/src/i18n/translate";
import { getLocale, getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ rpage?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const product = await CatalogService.getDetail(slug, await getLocale());
  if (!product) return { title: t("product.notFound"), robots: { index: false } };

  const description = productDescription(t, product);
  const path = `/products/${product.slug}`;
  const images = product.images.map((image) => ({ url: image.url, alt: image.alt || product.name }));

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: STORE_NAME, url: path, title: product.name, description, images: images.length > 0 ? images : SHARE_IMAGE },
    twitter: { card: images.length > 0 ? "summary_large_image" : "summary", title: product.name, description },
  };
}

// The product's own text, or "Buy X in Tunisia for 12,500 DT…" when it has none.
function productDescription(t: Translator, product: ProductDetailData) {
  const fallback = t("seo.product", { name: product.name, price: formatMillimes(product.priceMillimes), store: STORE_NAME });
  return metaDescription(product.description.trim() || fallback);
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const t = await getT();
  const [product, viewer] = await Promise.all([CatalogService.getDetail(slug, locale), getCurrentUser()]);

  if (!product) notFound();
  // Old links used the id: send them (and search engines) to the slug address.
  if (slug !== product.slug) permanentRedirect(`/products/${product.slug}${sp.rpage ? `?rpage=${sp.rpage}` : ""}`);

  const related = await CatalogService.related(product.id, product.categoryId, 4, locale);
  const crumbs = [
    { name: t("product.shop"), path: "/products" },
    ...(product.categoryName && product.categorySlug ? [{ name: product.categoryName, path: `/c/${product.categorySlug}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];

  return (
    <div className="wrap pageTop">
      <JsonLd data={[productJsonLd(product, productDescription(t, product)), breadcrumbJsonLd(crumbs)]} />
      <nav className="crumbs" aria-label={t("product.breadcrumb")}>
        <Link href="/products">{t("product.shop")}</Link>
        {product.categoryName && product.categorySlug && (
          <>
            <span>/</span>
            <Link href={`/c/${product.categorySlug}`}>{product.categoryName}</Link>
          </>
        )}
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      <ReviewsSection productId={product.id} productSlug={product.slug} viewer={viewer} page={Math.max(1, parseInt(sp.rpage ?? "1", 10) || 1)} />

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="sectionHead">
            <h2>{t("product.related")}</h2>
          </div>
          <div className="productGrid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
