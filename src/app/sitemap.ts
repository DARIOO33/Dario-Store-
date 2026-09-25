import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/store";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";

export const dynamic = "force-dynamic";

// Every public page, for search engines: the shop pages, each category and each product.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories] = await Promise.all([CatalogService.allForSitemap(), CategoryService.forShop("en")]);

  return [
    ...["", "/products", "/categories", "/track", "/terms", "/privacy"].map((path) => ({ url: `${base}${path}` })),
    ...categories.map((category) => ({ url: `${base}/c/${category.slug}` })),
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: new Date(product.updatedAt.epochMilliseconds) })),
  ];
}
