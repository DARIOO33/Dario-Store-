// Business rules for categories. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { CategoryRepository } from "../prisma/categories";
import { ProductRepository } from "../prisma/products";
import { UserError } from "../lib/result";
import { slugify } from "../lib/slug";
import { localized } from "../i18n/content";
import type { Locale } from "../i18n/config";

function cleanName(input: string) {
  const name = input.trim();

  if (name.length < 2 || name.length > 60) {
    throw new UserError("Category name must be between 2 and 60 characters.");
  }

  return name;
}

// Two categories can't share a slug, so "Food" and "food!" become food / food-2.
async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "category";
  let slug = base;

  for (let n = 2; ; n++) {
    const existing = await CategoryRepository.findBySlug(slug);
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${n}`;
  }
}

// Pinned categories first (in menu order), then the rest alphabetically.
function inShopOrder<T extends { inNav: boolean; position: number; name: string }>(categories: T[]) {
  return [...categories].sort(
    (a, b) => Number(b.inNav) - Number(a.inNav) || (a.inNav ? a.position - b.position : 0) || a.name.localeCompare(b.name),
  );
}

export const CategoryService = {
  list: async () => {
    return inShopOrder(await CategoryRepository.findAll());
  },

  // Plain names for filter chips, in the visitor's language.
  forShop: async (locale: Locale) => {
    const categories = inShopOrder(await CategoryRepository.findAll());
    return categories.map((category) => ({ id: category.id, slug: category.slug, name: localized(locale, category.name, category.nameFr) }));
  },

  // How many visible products each category has — for the storefront tiles.
  listWithCounts: async (locale: Locale) => {
    const categories = inShopOrder(await CategoryRepository.findAll());

    return await Promise.all(
      categories.map(async (category) => ({
        id: category.id,
        name: localized(locale, category.name, category.nameFr),
        slug: category.slug,
        blurb: localized(locale, category.blurb, category.blurbFr),
        // The admin edits the French texts themselves, not the fallback-resolved ones.
        nameFr: category.nameFr,
        blurbFr: category.blurbFr,
        inNav: category.inNav,
        position: category.position,
        productCount: await ProductRepository.count({ categoryId: category.id }),
      })),
    );
  },

  // The categories pinned to the header menu.
  navigation: async (locale: Locale) => {
    const categories = await CategoryRepository.findInNav();
    return categories.map((category) => ({
      id: category.id,
      name: localized(locale, category.name, category.nameFr),
      slug: category.slug,
      blurb: localized(locale, category.blurb, category.blurbFr),
    }));
  },

  updateSettings: async (id: string, input: { blurb: string; nameFr: string; blurbFr: string; inNav: boolean; position: number }) => {
    const blurb = input.blurb.trim();
    const nameFr = input.nameFr.trim();
    const blurbFr = input.blurbFr.trim();
    if (nameFr.length > 60) throw new UserError("Keep the French name under 60 characters.");
    if (blurbFr.length > 160) throw new UserError("Keep the French description under 160 characters.");
    if (blurb.length > 160) throw new UserError("Keep the description under 160 characters.");
    if (!Number.isInteger(input.position) || input.position < 0 || input.position > 999) {
      throw new UserError("Order must be a whole number between 0 and 999.");
    }

    const updated = await CategoryRepository.updateSettings(id, { blurb, nameFr, blurbFr, inNav: input.inNav, position: input.position });
    if (!updated) throw new UserError("That category no longer exists.");
  },

  getBySlug: async (slug: string, locale: Locale) => {
    const category = await CategoryRepository.findBySlug(slug);
    if (!category) return null;

    return { ...category, name: localized(locale, category.name, category.nameFr), blurb: localized(locale, category.blurb, category.blurbFr) };
  },

  create: async (input: string) => {
    const name = cleanName(input);
    const category = await CategoryRepository.create({ name, slug: await uniqueSlug(name) });

    return { id: category.id };
  },

  rename: async (id: string, input: string) => {
    const name = cleanName(input);
    const updated = await CategoryRepository.update(id, { name, slug: await uniqueSlug(name, id) });

    if (!updated) throw new UserError("That category no longer exists.");
  },

  // Products in a deleted category simply become uncategorised.
  remove: async (id: string) => {
    await CategoryRepository.delete(id);
  },
};
