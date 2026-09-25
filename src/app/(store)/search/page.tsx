import Link from "next/link";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";
import ProductCard from "@/src/components/catalog/ProductCard";
import Pagination from "@/src/components/ui/Pagination";
import EmptyState from "@/src/components/ui/EmptyState";
import { buildQuery } from "@/src/lib/query";
import type { Metadata } from "next";
import { getLocale, getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";
// Result pages are thin copies of the shop: keep them out of Google, but follow their links.
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("search.title"), robots: { index: false, follow: true } };
}

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const result = q ? await CatalogService.list({ q, page, locale }) : null;
  const categories = result && result.items.length === 0 ? await CategoryService.forShop(locale) : [];

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("search.title")}</span>
        <h1>{q ? t("search.resultsFor", { q }) : t("search.heading")}</h1>
        {result && (
          <p className="muted">
            {t.plural("search.found", result.total)}
          </p>
        )}
      </header>

      <form action="/search" className="bigSearch" role="search">
        <label htmlFor="search-q" className="visuallyHidden">
          {t("search.label")}
        </label>
        <input id="search-q" name="q" type="search" defaultValue={q} placeholder={t("search.placeholder")} className="input" autoFocus={!q} />
        <button type="submit" className="btn btnPrimary">
          {t("search.button")}
        </button>
      </form>

      {result && result.items.length > 0 && (
        <>
          <div className="productGrid">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} href={(p) => `/search${buildQuery({ q, page: p === 1 ? undefined : p })}`} />
        </>
      )}

      {result && result.items.length === 0 && (
        <>
          <EmptyState title={t("search.emptyTitle", { q })} text={t("search.emptyText")} seed={q} />
          {categories.length > 0 && (
            <div className="chips" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
              {categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="chip">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
