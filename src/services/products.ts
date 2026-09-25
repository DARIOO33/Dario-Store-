// Business rules for products (the admin's create/edit/delete). Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { ProductRepository, type ProductType, type ProductWriteInput, type VariantWriteInput } from "../prisma/products";
import { CategoryRepository } from "../prisma/categories";
import { UserError } from "../lib/result";
import { parseDinars } from "../lib/money";

// What the admin form submits — everything as text, exactly as typed.
export type ProductFormInput = {
  name: string;
  description: string;
  nameFr: string;
  descriptionFr: string;
  type: string;
  price: string;
  stock: string;
  categoryId: string;
  imageUrls: string;
  featured: boolean;
  active: boolean;
  variants: VariantFormInput[];
};

export type VariantFormInput = {
  id?: string;
  name: string;
  price: string;
  stock: string;
  imageUrl: string;
  active: boolean;
};

const MAX_IMAGES = 8;
const MAX_VARIANTS = 20;

function parseImageUrl(url: string) {
  if (url.length > 500 || !/^(https?:\/\/|\/)\S+$/.test(url)) {
    throw new UserError(`"${url.slice(0, 40)}" isn't a valid image address (use a full https:// link).`);
  }
  return url;
}

function parseStock(text: string, what: string) {
  if (text.trim() === "") return null;
  if (!/^\d{1,6}$/.test(text.trim())) throw new UserError(`${what} must be a whole number, or empty for unlimited.`);
  return Number(text.trim());
}

function parseVariants(list: VariantFormInput[]): VariantWriteInput[] {
  if (list.length > MAX_VARIANTS) throw new UserError(`At most ${MAX_VARIANTS} variants per product.`);

  const seen = new Set<string>();
  const variants = list.map((variant, i) => {
    const name = variant.name.trim();
    if (name.length < 1 || name.length > 60) throw new UserError(`Variant ${i + 1}: give it a name (60 characters max).`);
    if (seen.has(name.toLowerCase())) throw new UserError(`Two variants are called "${name}" — names must differ.`);
    seen.add(name.toLowerCase());

    const priceMillimes = parseDinars(variant.price);
    if (priceMillimes === null) throw new UserError(`Variant "${name}": enter the price in dinars, e.g. 12.500.`);

    const imageUrl = variant.imageUrl.trim();
    return {
      id: variant.id,
      name,
      priceMillimes,
      stock: parseStock(variant.stock, `Variant "${name}" stock`),
      imageUrl: imageUrl ? parseImageUrl(imageUrl) : null,
      active: variant.active,
    };
  });

  if (variants.length > 0 && !variants.some((v) => v.active)) throw new UserError("At least one variant must be active.");
  return variants;
}

async function parseForm(input: ProductFormInput) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) {
    throw new UserError("Name must be between 2 and 120 characters.");
  }

  const description = input.description.trim();
  if (description.length > 4000) {
    throw new UserError("Description is too long (4000 characters max).");
  }

  const nameFr = (input.nameFr ?? "").trim();
  if (nameFr.length > 120) throw new UserError("The French name is too long (120 characters max).");

  const descriptionFr = (input.descriptionFr ?? "").trim();
  if (descriptionFr.length > 4000) throw new UserError("The French description is too long (4000 characters max).");

  if (input.type !== "PHYSICAL" && input.type !== "VIRTUAL") {
    throw new UserError("Choose whether the product is physical or virtual.");
  }
  const type: ProductType = input.type;

  const variants = parseVariants(Array.isArray(input.variants) ? input.variants : []);

  // With variants, the product's own price is the lowest active variant price
  // (shown as "from …") and stock is tracked per variant.
  let priceMillimes = parseDinars(input.price);
  if (variants.length > 0) {
    priceMillimes = Math.min(...variants.filter((v) => v.active).map((v) => v.priceMillimes));
  } else if (priceMillimes === null) {
    throw new UserError("Enter the price in dinars, e.g. 12.500 (max 3 decimals).");
  }

  const stock = variants.length > 0 ? null : parseStock(input.stock, "Stock");

  let categoryId: string | null = null;
  if (input.categoryId) {
    if (!(await CategoryRepository.findById(input.categoryId))) {
      throw new UserError("That category no longer exists.");
    }
    categoryId = input.categoryId;
  }

  const images = input.imageUrls
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (images.length > MAX_IMAGES) {
    throw new UserError(`At most ${MAX_IMAGES} images per product.`);
  }
  images.forEach(parseImageUrl);

  const data: ProductWriteInput = {
    name,
    description,
    nameFr,
    descriptionFr,
    type,
    priceMillimes,
    stock,
    featured: input.featured,
    active: input.active,
    categoryId,
  };

  return { data, images, variants };
}

export const ProductService = {
  listForAdmin: async (q: string | undefined, page: number, pageSize: number) => {
    const filter = { q, includeInactive: true };
    const [rows, total] = await Promise.all([
      ProductRepository.findMany(filter, "newest", pageSize, (page - 1) * pageSize),
      ProductRepository.count(filter),
    ]);

    return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  getForAdmin: async (id: string) => {
    return await ProductRepository.findById(id);
  },

  create: async (input: ProductFormInput) => {
    const { data, images, variants } = await parseForm(input);
    const product = await ProductRepository.create(data);
    await ProductRepository.replaceImages(product.id, images);
    await ProductRepository.replaceVariants(product.id, variants);

    return { id: product.id };
  },

  update: async (id: string, input: ProductFormInput) => {
    const { data, images, variants } = await parseForm(input);
    const product = await ProductRepository.update(id, data);

    if (!product) throw new UserError("That product no longer exists.");
    await ProductRepository.replaceImages(id, images);
    await ProductRepository.replaceVariants(id, variants);
  },

  setFeatured: async (id: string, featured: boolean) => {
    const product = await ProductRepository.setFeatured(id, featured);
    if (!product) throw new UserError("That product no longer exists.");
  },

  setActive: async (id: string, active: boolean) => {
    const product = await ProductRepository.setActive(id, active);
    if (!product) throw new UserError("That product no longer exists.");
  },

  // Past orders keep their own copy of the name and price, so deleting is safe.
  remove: async (id: string) => {
    await ProductRepository.delete(id);
  },
};
