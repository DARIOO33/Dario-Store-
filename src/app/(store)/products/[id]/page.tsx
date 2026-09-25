import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogService } from "@/src/services/catalog";
import ProductCard from "@/src/components/catalog/ProductCard";
import ProductDetail from "@/src/components/catalog/ProductDetail";
import ReviewsSection from "@/src/components/reviews/ReviewsSection";
import { getCurrentUser } from "@/src/lib/session";
import { getLocale, getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ rpage?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = await CatalogService.getDetail(id, await getLocale());

  return product ? { title: product.name, description: product.description.slice(0, 160) } : { title: (await getT())("product.notFound") };
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const t = await getT();
  const [product, viewer] = await Promise.all([CatalogService.getDetail(id, locale), getCurrentUser()]);

  if (!product) notFound();

  const related = await CatalogService.related(product.id, product.categoryId, 4, locale);

  return (
    <div className="wrap pageTop">
      <nav className="crumbs" aria-label={t("product.breadcrumb")}>
        <Link href="/products">{t("product.shop")}</Link>
        {product.categoryName && product.categorySlug && (
          <>
            <span>/</span>
            <Link href={`/products?category=${product.categorySlug}`}>{product.categoryName}</Link>
          </>
        )}
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      <ReviewsSection productId={product.id} viewer={viewer} page={Math.max(1, parseInt(sp.rpage ?? "1", 10) || 1)} />

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
