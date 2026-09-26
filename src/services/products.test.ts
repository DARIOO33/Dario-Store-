import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/products", () => ({
  ProductRepository: { create: vi.fn(), update: vi.fn(), slugTaken: vi.fn(), replaceImages: vi.fn(), replaceVariants: vi.fn() },
}));
vi.mock("../prisma/categories", () => ({ CategoryRepository: { findById: vi.fn() } }));
vi.mock("../lib/cloudinary", () => ({ cloudinaryConfigured: vi.fn(() => true), uploadPublicImage: vi.fn(async () => "https://res.cloudinary.com/x.png") }));

import { ProductRepository } from "../prisma/products";
import { ProductService, type ProductFormInput } from "./products";

const products = vi.mocked(ProductRepository);

function form(changes: Partial<ProductFormInput> = {}): ProductFormInput {
  return { name: "KZ Castor", description: "", nameFr: "", descriptionFr: "", type: "PHYSICAL", price: "50", stock: "10", categoryId: "", imageUrls: "", featured: false, active: true, variants: [], ...changes };
}

beforeEach(() => {
  vi.resetAllMocks();
  products.slugTaken.mockResolvedValue(false);
  products.create.mockImplementation(async (data) => ({ id: "p-1", ...data }) as never);
  products.update.mockResolvedValue({ id: "p-1" } as never);
});

describe("admin product form", () => {
  it("stores the price in millimes and makes a slug from the name", async () => {
    await ProductService.create(form({ name: "KZ Castor (Bass)", price: "12,5" }));
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ priceMillimes: 12_500, stock: 10, slug: "kz-castor-bass" }));
  });

  it("adds -2 when the slug is taken, and never changes a slug on rename", async () => {
    products.slugTaken.mockImplementation(async (slug) => slug === "kz-castor");
    await ProductService.create(form());
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "kz-castor-2" }));

    await ProductService.update("p-1", form({ name: "New name" }));
    expect(products.update.mock.calls[0]![1]).not.toHaveProperty("slug");
  });

  it("refuses negative, too precise or non-numeric prices and stock", async () => {
    for (const price of ["-5", "1.2345", "abc", "", "1e5"]) await expect(ProductService.create(form({ price }))).rejects.toThrow(/price/);
    for (const stock of ["-1", "2.5", "lots"]) await expect(ProductService.create(form({ stock }))).rejects.toThrow(/whole number/);
  });

  it("only accepts https (or site) image addresses, at most 8", async () => {
    await expect(ProductService.create(form({ imageUrls: "javascript:alert(1)" }))).rejects.toThrow(/valid image/);
    await expect(ProductService.create(form({ imageUrls: Array(9).fill("https://x.tn/a.png").join("\n") }))).rejects.toThrow(/At most 8/);
  });

  it("takes the lowest active variant price as the product price", async () => {
    await ProductService.create(form({ variants: [
      { name: "Bass", price: "60", stock: "", imageUrl: "", active: true },
      { name: "Clear", price: "40", stock: "", imageUrl: "", active: false },
      { name: "Pro", price: "55", stock: "", imageUrl: "", active: true },
    ] }));
    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ priceMillimes: 55_000, stock: null }));
  });

  it("refuses duplicate variant names and all-inactive variants", async () => {
    const v = { price: "10", stock: "", imageUrl: "", active: true };
    await expect(ProductService.create(form({ variants: [{ ...v, name: "Bass" }, { ...v, name: "bass" }] }))).rejects.toThrow(/must differ/);
    await expect(ProductService.create(form({ variants: [{ ...v, name: "Bass", active: false }] }))).rejects.toThrow(/At least one/);
  });

  it("refuses an upload that is not really a photo", async () => {
    await expect(ProductService.uploadImage(new TextEncoder().encode("<svg onload=alert(1)>"))).rejects.toThrow(/JPG, PNG or WebP/);
  });
});
