import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/products", () => ({ ProductRepository: { findByIds: vi.fn() } }));
vi.mock("../prisma/categories", () => ({ CategoryRepository: {} }));

import { ProductRepository } from "../prisma/products";
import { CatalogService } from "./catalog";

const products = vi.mocked(ProductRepository);

function product(changes: Record<string, unknown> = {}) {
  return { id: "iem", slug: "kz-castor", name: "KZ Castor", nameFr: null, type: "PHYSICAL", active: true, priceMillimes: 50_000, stock: 3, images: [], variants: [], ...changes };
}

beforeEach(() => {
  vi.resetAllMocks();
  products.findByIds.mockResolvedValue([product(), product({ id: "secret", slug: "unreleased", name: "Unreleased bundle", active: false, priceMillimes: 1_000 })] as never);
});

describe("cart lines", () => {
  it("gives fresh name, price and stock for products on sale", async () => {
    const [line] = await CatalogService.getCartLines([{ productId: "iem", variantId: null }], "en");
    expect(line).toMatchObject({ name: "KZ Castor", priceMillimes: 50_000, stock: 3, available: true });
  });

  it("[fixed] says nothing about a product the admin switched off, even with its id", async () => {
    const lines = await CatalogService.getCartLines([{ productId: "secret", variantId: null }], "en");
    expect(lines).toEqual([]);
    expect(JSON.stringify(lines)).not.toContain("Unreleased");
  });

  it("reads at most 50 lines", async () => {
    const many = Array.from({ length: 500 }, () => ({ productId: "iem", variantId: null }));
    await CatalogService.getCartLines(many, "en");
    expect(products.findByIds).toHaveBeenCalledWith(["iem"]);
    expect((await CatalogService.getCartLines(many, "en")).length).toBe(50);
  });

  it("marks a line unavailable when its option was removed", async () => {
    products.findByIds.mockResolvedValue([product({ variants: [{ id: "v-1", name: "Bass", active: true, priceMillimes: 60_000, stock: 2, imageUrl: null }] })] as never);
    const [line] = await CatalogService.getCartLines([{ productId: "iem", variantId: "v-gone" }], "en");
    expect(line!.available).toBe(false);
  });
});
