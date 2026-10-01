import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/products", () => ({ ProductRepository: { findByIds: vi.fn(), findMany: vi.fn() } }));
vi.mock("../prisma/categories", () => ({ CategoryRepository: {} }));

import { ProductRepository } from "../prisma/products";
import { CatalogService } from "./catalog";

const products = vi.mocked(ProductRepository);

function product(changes: Record<string, unknown> = {}) {
  return { id: "iem", slug: "kz-castor", name: "KZ Castor", nameFr: null, type: "PHYSICAL", active: true, priceMillimes: 50_000, stock: 3, images: [], variants: [], aliexpressPick: false, offerEndsAt: null, ...changes };
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

describe("AliExpress picks in the catalogue", () => {
  it("a pick whose offer has ended can't go in the cart", async () => {
    products.findByIds.mockResolvedValue([product({ id: "pick", aliexpressPick: true, offerEndsAt: Temporal.Now.instant().subtract({ hours: 1 }) })] as never);
    const [line] = await CatalogService.getCartLines([{ productId: "pick", variantId: null }], "en");
    expect(line).toMatchObject({ aliexpressPick: true, available: false });
  });

  it("an open pick can, and says it is a pick", async () => {
    products.findByIds.mockResolvedValue([product({ id: "pick", aliexpressPick: true, offerEndsAt: Temporal.Now.instant().add({ hours: 5 }) })] as never);
    const [line] = await CatalogService.getCartLines([{ productId: "pick", variantId: null }], "en");
    expect(line).toMatchObject({ aliexpressPick: true, available: true });
  });
});

describe("shop lists", () => {
  it("ask the database to leave out picks whose offer has ended", async () => {
    products.findMany.mockResolvedValue([]);
    await CatalogService.featured(4, "en");
    await CatalogService.byCategory("c-1", 4, "en");
    for (const [filter] of products.findMany.mock.calls) expect(filter).toMatchObject({ offersOpenAt: expect.any(Temporal.Instant) });
  });
});
