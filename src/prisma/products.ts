// Database access for products, their images and variants: plain queries only. The rules live in services/products.ts.

import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "./db";
import { now } from "../lib/time";

export type ProductType = "PHYSICAL" | "VIRTUAL";
export type ProductSort = "newest" | "price-asc" | "price-desc" | "name";

export type ProductFilter = {
  q?: string;
  categoryId?: string;
  type?: ProductType;
  featured?: boolean;
  includeInactive?: boolean;
};

export type ProductWriteInput = {
  name: string;
  description: string;
  // Optional French versions (empty = show the English ones).
  nameFr: string;
  descriptionFr: string;
  type: ProductType;
  priceMillimes: number;
  stock: number | null;
  featured: boolean;
  active: boolean;
  categoryId: string | null;
};

export type VariantWriteInput = {
  id?: string;
  name: string;
  priceMillimes: number;
  stock: number | null;
  imageUrl: string | null;
  active: boolean;
};

// LIKE treats % and _ as wildcards — escape them so a search for "50%" is literal.
function likePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

function filtered(filter: ProductFilter) {
  // priceMillimes >= 0 is always true (a CHECK constraint guarantees it); it
  // just gives the query a starting point when nothing else filters.
  let query = filter.includeInactive
    ? db.orm.public.Product.where((p) => p.priceMillimes.gte(0))
    : db.orm.public.Product.where({ active: true });

  if (filter.categoryId) query = query.where({ categoryId: filter.categoryId });
  if (filter.type) query = query.where({ type: filter.type });
  if (filter.featured !== undefined) query = query.where({ featured: filter.featured });

  if (filter.q?.trim()) {
    const pattern = likePattern(filter.q.trim());
    query = query.where((p) => or(p.name.ilike(pattern), p.description.ilike(pattern), p.nameFr.ilike(pattern), p.descriptionFr.ilike(pattern)));
  }

  return query;
}

export const ProductRepository = {
  // Cards only need the cover image, so only the first image is loaded.
  findMany: async (filter: ProductFilter, sort: ProductSort, limit: number, offset: number) => {
    const query = filtered(filter);
    const sorted =
      sort === "price-asc"
        ? query.orderBy((p) => p.priceMillimes.asc())
        : sort === "price-desc"
          ? query.orderBy((p) => p.priceMillimes.desc())
          : sort === "name"
            ? query.orderBy((p) => p.name.asc())
            : query.orderBy((p) => p.createdAt.desc());

    return await sorted
      .include("images", (images) => images.orderBy((i) => i.position.asc()).limit(1))
      .include("variants", (variants) => variants.orderBy((v) => v.position.asc()))
      .include("category")
      .limit(limit)
      .offset(offset)
      .all();
  },

  count: async (filter: ProductFilter) => {
    const { total } = await filtered(filter).aggregate((a) => ({ total: a.count() }));
    return total;
  },

  findById: async (id: string) => {
    return await db.orm.public.Product.where({ id })
      .include("images", (images) => images.orderBy((i) => i.position.asc()))
      .include("variants", (variants) => variants.orderBy((v) => v.position.asc()))
      .include("category")
      .first();
  },

  findByIds: async (ids: string[]) => {
    if (ids.length === 0) return [];

    return await db.orm.public.Product.where((p) => p.id.in(ids))
      .include("images", (images) => images.orderBy((i) => i.position.asc()).limit(1))
      .include("variants", (variants) => variants.orderBy((v) => v.position.asc()))
      .all();
  },

  findLowStock: async (threshold: number) => {
    return await db.orm.public.Product.where({ active: true, type: "PHYSICAL" })
      .where((p) => p.stock.lte(threshold))
      .orderBy((p) => p.stock.asc())
      .limit(6)
      .all();
  },

  countAll: async () => {
    const { total } = await db.orm.public.Product.aggregate((a) => ({ total: a.count() }));
    return total;
  },

  create: async (data: ProductWriteInput) => {
    return await db.orm.public.Product.create(data);
  },

  update: async (id: string, data: ProductWriteInput) => {
    return await db.orm.public.Product.where({ id }).update({ ...data, updatedAt: now() });
  },

  setFeatured: async (id: string, featured: boolean) => {
    return await db.orm.public.Product.where({ id }).update({ featured, updatedAt: now() });
  },

  setActive: async (id: string, active: boolean) => {
    return await db.orm.public.Product.where({ id }).update({ active, updatedAt: now() });
  },

  delete: async (id: string) => {
    return await db.orm.public.Product.where({ id }).delete();
  },

  // Saves the variant list from the admin form: rows with an id are updated,
  // rows without one are created, and rows no longer listed are removed
  // (past orders keep their own copy of the variant name and price).
  replaceVariants: async (productId: string, variants: VariantWriteInput[]) => {
    const existing = await db.orm.public.ProductVariant.where({ productId }).all();
    const keep = new Set(variants.flatMap((v) => (v.id ? [v.id] : [])));

    for (const old of existing) {
      if (!keep.has(old.id)) await db.orm.public.ProductVariant.where({ id: old.id }).delete();
    }

    for (const [position, variant] of variants.entries()) {
      const { id, ...data } = variant;
      const row = { ...data, position };

      if (id && existing.some((old) => old.id === id)) {
        await db.orm.public.ProductVariant.where({ id }).update(row);
      } else {
        await db.orm.public.ProductVariant.create({ productId, ...row });
      }
    }
  },

  // The review totals shown on cards; recalculated by services/reviews.ts.
  setRating: async (id: string, ratingCount: number, ratingSum: number) => {
    return await db.orm.public.Product.where({ id }).update({ ratingCount, ratingSum });
  },

  // Replaces the whole gallery: position 0 is the cover image.
  replaceImages: async (productId: string, urls: string[]) => {
    await db.orm.public.ProductImage.where({ productId }).delete();

    for (const [position, url] of urls.entries()) {
      await db.orm.public.ProductImage.create({ productId, url, position });
    }
  },
};
