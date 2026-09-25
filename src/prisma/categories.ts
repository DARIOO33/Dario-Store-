// Database access for categories: plain queries only. The rules live in services/categories.ts.

import { db } from "./db";

export const CategoryRepository = {
  findAll: async () => {
    // Pinned menu order first, then alphabetical.
    return await db.orm.public.Category.orderBy((c) => c.position.asc()).orderBy((c) => c.name.asc()).all();
  },

  findInNav: async () => {
    return await db.orm.public.Category.where({ inNav: true })
      .orderBy((c) => c.position.asc())
      .orderBy((c) => c.name.asc())
      .all();
  },

  findById: async (id: string) => {
    return await db.orm.public.Category.first({ id });
  },

  findBySlug: async (slug: string) => {
    return await db.orm.public.Category.first({ slug });
  },

  create: async (data: { name: string; slug: string }) => {
    return await db.orm.public.Category.create(data);
  },

  update: async (id: string, data: { name: string; slug: string }) => {
    return await db.orm.public.Category.where({ id }).update(data);
  },

  updateSettings: async (id: string, data: { blurb: string; nameFr: string; blurbFr: string; inNav: boolean; position: number }) => {
    return await db.orm.public.Category.where({ id }).update(data);
  },

  delete: async (id: string) => {
    return await db.orm.public.Category.where({ id }).delete();
  },
};
