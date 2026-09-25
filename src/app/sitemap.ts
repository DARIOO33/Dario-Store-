import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/store";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";

export const dynamic = "force-dynamic";

// Every public page that search engines may list: the shop pages, each category and each product
// (with its photos, for Google Images). Pages marked noindex (track, search, log in) stay out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories] = await Promise.all([CatalogService.allForSitemap(), CategoryService.forShop("en")]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...["/products", "/categories"].map((path) => ({ url: `${base}${path}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories.map((category) => ({ url: `${base}/c/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt.epochMilliseconds),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: product.images.map((url) => new URL(url, `${base}/`).toString()),
    })),
    ...["/terms", "/privacy"].map((path) => ({ url: `${base}${path}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
