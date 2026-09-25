// Business rules for browsing the shop (cards, product pages, cart lines). Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { ProductRepository, type ProductSort, type ProductType } from "../prisma/products";
import { CategoryRepository } from "../prisma/categories";
import { LOW_STOCK_THRESHOLD, PAGE_SIZE } from "../lib/store";
import { localized } from "../i18n/content";
import type { Locale } from "../i18n/config";

type ProductRow = Awaited<ReturnType<typeof ProductRepository.findMany>>[number];

// The plain shape a product card needs. No Temporal values in here, so it can
// be handed to client components as-is.
export type VariantData = {
  id: string;
  name: string;
  priceMillimes: number;
  stock: number | null;
  imageUrl: string | null;
  available: boolean;
};

export type ProductCardData = {
  id: string;
  name: string;
  priceMillimes: number;
  type: ProductType;
  imageUrl: string | null;
  categoryName: string | null;
  featured: boolean;
  available: boolean;
  lowStock: boolean;
  ratingCount: number;
  // The average of the visible reviews, or null when there are none.
  ratingAverage: number | null;
  // With variants the price above is the lowest one ("from …") and the card
  // sends people to the product page to choose.
  hasVariants: boolean;
};

export type ProductDetailData = ProductCardData & {
  description: string;
  stock: number | null;
  variants: VariantData[];
  images: { url: string; alt: string }[];
  categoryId: string | null;
  categorySlug: string | null;
};

// One line of the cart with fresh data. The cart itself only remembers which
// product (and variant) and how many.
export type CartLineData = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  priceMillimes: number;
  type: ProductType;
  imageUrl: string | null;
  stock: number | null;
  available: boolean;
};


type VariantRow = ProductRow["variants"][number];

function toVariant(variant: VariantRow): VariantData {
  return {
    id: variant.id,
    name: variant.name,
    priceMillimes: variant.priceMillimes,
    stock: variant.stock,
    imageUrl: variant.imageUrl,
    available: variant.active && (variant.stock === null || variant.stock > 0),
  };
}

// `locale` picks the French name/description when there is one.
function toCard(product: ProductRow, locale: Locale): ProductCardData {
  const activeVariants = product.variants.filter((variant) => variant.active);
  const hasVariants = activeVariants.length > 0;
  const inStock = hasVariants
    ? activeVariants.some((variant) => variant.stock === null || variant.stock > 0)
    : product.stock === null || product.stock > 0;

  return {
    id: product.id,
    name: localized(locale, product.name, product.nameFr),
    priceMillimes: product.priceMillimes,
    type: product.type,
    imageUrl: product.images[0]?.url ?? null,
    categoryName: product.category ? localized(locale, product.category.name, product.category.nameFr) : null,
    featured: product.featured,
    available: product.active && inStock,
    lowStock: !hasVariants && product.stock !== null && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
    hasVariants,
    ratingCount: product.ratingCount,
    ratingAverage: product.ratingCount > 0 ? Math.round((product.ratingSum / product.ratingCount) * 10) / 10 : null,
  };
}

export type CatalogQuery = {
  q?: string;
  category?: string; // slug
  type?: ProductType;
  sort?: ProductSort;
  page?: number;
  locale: Locale;
};

export const CatalogService = {
  featured: async (limit: number, locale: Locale) => {
    const rows = await ProductRepository.findMany({ featured: true }, "newest", limit, 0);
    return rows.map((row) => toCard(row, locale));
  },

  latest: async (limit: number, locale: Locale) => {
    const rows = await ProductRepository.findMany({}, "newest", limit, 0);
    return rows.map((row) => toCard(row, locale));
  },

  // A few products from one category, for the home page shelves.
  byCategory: async (categoryId: string, limit: number, locale: Locale) => {
    const rows = await ProductRepository.findMany({ categoryId }, "newest", limit, 0);
    return rows.map((row) => toCard(row, locale));
  },

  list: async (query: CatalogQuery) => {
    const page = Math.max(1, query.page ?? 1);
    let categoryId: string | undefined;

    if (query.category) {
      const category = await CategoryRepository.findBySlug(query.category);
      // An unknown category shows an empty list rather than everything.
      if (!category) return { items: [], total: 0, page: 1, pages: 1 };
      categoryId = category.id;
    }

    const filter = { q: query.q, categoryId, type: query.type };
    const [rows, total] = await Promise.all([
      ProductRepository.findMany(filter, query.sort ?? "newest", PAGE_SIZE, (page - 1) * PAGE_SIZE),
      ProductRepository.count(filter),
    ]);

    return { items: rows.map((row) => toCard(row, query.locale)), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  },

  getDetail: async (id: string, locale: Locale): Promise<ProductDetailData | null> => {
    const product = await ProductRepository.findById(id);

    if (!product || !product.active) return null;

    return {
      ...toCard(product, locale),
      description: localized(locale, product.description, product.descriptionFr),
      stock: product.stock,
      variants: product.variants.filter((variant) => variant.active).map(toVariant),
      images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
      categoryId: product.categoryId,
      categorySlug: product.category?.slug ?? null,
    };
  },

  related: async (productId: string, categoryId: string | null, limit: number, locale: Locale) => {
    const rows = await ProductRepository.findMany(categoryId ? { categoryId } : {}, "newest", limit + 1, 0);
    return rows.filter((row) => row.id !== productId).slice(0, limit).map((row) => toCard(row, locale));
  },

  // Fresh prices and stock for whatever is in a visitor's cart.
  getCartLines: async (wanted: { productId: string; variantId: string | null }[], locale: Locale): Promise<CartLineData[]> => {
    const rows = await ProductRepository.findByIds([...new Set(wanted.slice(0, 50).map((line) => line.productId))]);
    const lines: CartLineData[] = [];

    for (const { productId, variantId } of wanted.slice(0, 50)) {
      const product = rows.find((row) => row.id === productId);
      if (!product) continue;

      const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
      const hasVariants = product.variants.some((v) => v.active);

      // A product with variants can only be bought as one of its variants,
      // and a removed variant leaves the line unavailable.
      const valid = hasVariants ? !!variant && variant.active : !variantId;
      const stock = variant ? variant.stock : product.stock;

      lines.push({
        productId,
        variantId: variant?.id ?? null,
        name: localized(locale, product.name, product.nameFr),
        variantName: variant?.name ?? null,
        priceMillimes: variant ? variant.priceMillimes : product.priceMillimes,
        type: product.type,
        imageUrl: variant?.imageUrl ?? product.images[0]?.url ?? null,
        stock,
        available: product.active && valid && (stock === null || stock > 0),
      });
    }

    return lines;
  },
};
