import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";
import ProductCard from "@/src/components/catalog/ProductCard";
import Pagination from "@/src/components/ui/Pagination";
import EmptyState from "@/src/components/ui/EmptyState";
import { buildQuery } from "@/src/lib/query";
import type { Metadata } from "next";
import { getLocale, getT } from "@/src/i18n/server";
import { STORE_NAME } from "@/src/lib/store";
import { SHARE_IMAGE } from "@/src/lib/seo";
import type { ProductSort, ProductType } from "@/src/prisma/products";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ category?: string; type?: string; sort?: string; page?: string }>;

// Filtered and sorted copies of the list point search engines to the plain one.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const t = await getT();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const path = `/products${page > 1 && !sp.type ? `?page=${page}` : ""}`;
  const description = t("seo.shop", { store: STORE_NAME });

  return { title: t("shop.title"), description, alternates: { canonical: path }, openGraph: { type: "website", siteName: STORE_NAME, url: path, images: SHARE_IMAGE, description } };
}

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc", "name"];

const TYPES: { key: ProductType | undefined; label: "all" | "physical" | "digital" }[] = [
  { key: undefined, label: "all" },
  { key: "PHYSICAL", label: "physical" },
  { key: "VIRTUAL", label: "digital" },
];

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();

  // A category has its own page; old links with ?category= land there.
  if (sp.category && (await CategoryService.getBySlug(sp.category, locale))) {
    permanentRedirect(`/c/${sp.category}${buildQuery({ sort: sp.sort, page: sp.page })}`);
  }
  const type: ProductType | undefined = sp.type === "PHYSICAL" || sp.type === "VIRTUAL" ? sp.type : undefined;
  const sort = SORTS.find((s) => s === sp.sort) ?? "newest";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [result, categories] = await Promise.all([
    CatalogService.list({ category: sp.category, type, sort, page, locale }),
    CategoryService.forShop(locale),
  ]);

  const activeCategory = categories.find((c) => c.slug === sp.category);
  const href = (patch: Record<string, string | number | undefined>) =>
    `/products${buildQuery({ category: sp.category, type, sort: sort === "newest" ? undefined : sort, ...patch })}`;

  const title = activeCategory?.name ?? (type === "VIRTUAL" ? t("shop.titleDigital") : type === "PHYSICAL" ? t("shop.type.physical") : t("shop.titleAll"));

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("shop.title")}</span>
        <h1>{title}</h1>
        <p className="muted">
          {t.plural("shop.count", result.total)}
        </p>
      </header>

      <div className="filters">
        <div className="chips" aria-label={t("shop.typeLabel")}>
          {TYPES.map((option) => (
            <Link key={option.label} href={href({ type: option.key, page: undefined })} className={`chip${type === option.key ? " active" : ""}`}>
              {t.messages.shop.type[option.label]}
            </Link>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="chips" aria-label={t("shop.categoryLabel")}>
            <Link href={href({ category: undefined, page: undefined })} className={`chip${!sp.category ? " active" : ""}`}>
              {t("shop.allCategories")}
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}${buildQuery({ sort: sort === "newest" ? undefined : sort })}`} className={`chip${sp.category === c.slug ? " active" : ""}`}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="chips" aria-label={t("shop.sortLabel")}>
          <span className="chipLabel">{t("shop.sortLabel")}</span>
          {SORTS.map((key) => (
            <Link key={key} href={href({ sort: key === "newest" ? undefined : key, page: undefined })} className={`chip${sort === key ? " active" : ""}`}>
              {t.messages.shop.sort[key]}
            </Link>
          ))}
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title={t("shop.emptyTitle")}
          text={t("shop.emptyText")}
          seed="no-results"
          action={{ href: "/products", label: t("shop.clearFilters") }}
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
