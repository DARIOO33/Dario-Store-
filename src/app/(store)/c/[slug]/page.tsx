import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";
import ProductCard from "@/src/components/catalog/ProductCard";
import Pagination from "@/src/components/ui/Pagination";
import EmptyState from "@/src/components/ui/EmptyState";
import { buildQuery } from "@/src/lib/query";
import { getLocale, getT } from "@/src/i18n/server";
import { STORE_NAME } from "@/src/lib/store";
import JsonLd from "@/src/components/seo/JsonLd";
import { breadcrumbJsonLd, metaDescription, SHARE_IMAGE } from "@/src/lib/seo";
import type { ProductSort } from "@/src/prisma/products";

export const dynamic = "force-dynamic";

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc", "name"];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const t = await getT();
  const category = await CategoryService.getBySlug(slug, await getLocale());
  if (!category) return { title: t("category.notFound"), robots: { index: false } };

  // Sorted copies of the list point search engines to the plain one; each page number is its own page.
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const path = `/c/${slug}${page > 1 ? `?page=${page}` : ""}`;
  const description = metaDescription(category.blurb || t("seo.category", { name: category.name, store: STORE_NAME }));

  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: STORE_NAME, url: path, images: SHARE_IMAGE, title: category.name, description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const t = await getT();
  const category = await CategoryService.getBySlug(slug, locale);

  if (!category) notFound();

  const sort = SORTS.find((s) => s === sp.sort) ?? "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const result = await CatalogService.list({ category: slug, sort, page, locale });
  const href = (patch: Record<string, string | number | undefined>) =>
    `/c/${slug}${buildQuery({ sort: sort === "newest" ? undefined : sort, ...patch })}`;

  return (
    <div className="wrap pageTop">
      <JsonLd data={breadcrumbJsonLd([{ name: t("product.shop"), path: "/products" }, { name: category.name, path: `/c/${slug}` }])} />
      <header className="pageHead">
        <span className="eyebrow">{t("category.eyebrow")}</span>
        <h1>{category.name}</h1>
        {category.blurb && <p className="pageBlurb">{category.blurb}</p>}
        <p className="muted">
          {t.plural("shop.count", result.total)}
        </p>
      </header>

      {result.total > 1 && (
        <div className="filters">
          <div className="chips" aria-label={t("shop.sortLabel")}>
            <span className="chipLabel">{t("shop.sortLabel")}</span>
            {SORTS.map((key) => (
              <Link key={key} href={href({ sort: key === "newest" ? undefined : key, page: undefined })} className={`chip${sort === key ? " active" : ""}`}>
                {t.messages.shop.sort[key]}
              </Link>
            ))}
          </div>
        </div>
      )}

      {result.items.length === 0 ? (
        <EmptyState
          title={t("category.comingSoon")}
          text={t("category.comingSoonText", { name: category.name })}
          seed={`empty-${slug}`}
          action={{ href: "/products", label: t("category.seeEverything") }}
        />
      ) : (
        <>
          <div className="productGrid">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} href={(p) => href({ page: p === 1 ? undefined : p })} />
        </>
      )}
    </div>
  );
}
