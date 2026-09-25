import { CategoryService } from "@/src/services/categories";
import EmptyState from "@/src/components/ui/EmptyState";
import CategoryTile from "@/src/components/catalog/CategoryTile";
import type { Metadata } from "next";
import { getLocale, getT } from "@/src/i18n/server";
import { STORE_NAME } from "@/src/lib/store";
import { SHARE_IMAGE } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const description = t("seo.categories", { store: STORE_NAME });
  return { title: t("categories.title"), description, alternates: { canonical: "/categories" }, openGraph: { type: "website", siteName: STORE_NAME, url: "/categories", images: SHARE_IMAGE, description } };
}

export default async function CategoriesPage() {
  const t = await getT();
  const categories = await CategoryService.listWithCounts(await getLocale());

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("categories.eyebrow")}</span>
        <h1>{t("categories.title")}</h1>
        <p className="muted">{t("categories.text")}</p>
      </header>

      {categories.length === 0 ? (
        <EmptyState title={t("categories.emptyTitle")} text={t("categories.emptyText")} seed="no-categories" action={{ href: "/products", label: t("categories.seeAllProducts") }} />
      ) : (
        <div className="tiles tilesBig">
          {categories.map((category, i) => (
            <CategoryTile
              key={category.id}
              href={`/c/${category.slug}`}
              name={category.name}
              count={String(category.productCount).padStart(2, "0")}
              meta={category.blurb || t.plural("categories.productCount", category.productCount)}
              index={i}
            />
          ))}
          <CategoryTile href="/products" name={t("categories.everything")} count="∞" meta={t("categories.wholeShop")} index={0} color="tilePaper" />
        </div>
      )}
    </div>
  );
}
