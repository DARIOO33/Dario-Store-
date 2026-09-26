import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/reviews", () => ({
  ReviewRepository: { findById: vi.fn(), findByUserAndProduct: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), totalsVisible: vi.fn(), setHidden: vi.fn(), setReply: vi.fn() },
}));
vi.mock("../prisma/products", () => ({ ProductRepository: { findById: vi.fn(), setRating: vi.fn() } }));
vi.mock("../prisma/orders", () => ({ OrderRepository: { listForUser: vi.fn() } }));

import { ReviewRepository } from "../prisma/reviews";
import { ProductRepository } from "../prisma/products";
import { OrderRepository } from "../prisma/orders";
import { ReviewService } from "./reviews";

const reviews = vi.mocked(ReviewRepository);
const products = vi.mocked(ProductRepository);
const orders = vi.mocked(OrderRepository);

const buyer = { id: "user-1", name: "Sami Ben Ali", role: "MEMBER" };
const other = { id: "user-2", name: "Other", role: "MEMBER" };
const admin = { id: "admin-1", name: "Dario", role: "ADMIN" };
const input = { rating: 5, message: "Great sound", hideName: false };

function paidOrder(status = "PAID") {
  return { id: "order-1", status, items: [{ productId: "iem", variantName: "Bass" }] } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  products.findById.mockResolvedValue({ id: "iem" } as never);
  reviews.findByUserAndProduct.mockResolvedValue(null);
  reviews.totalsVisible.mockResolvedValue({ count: 1, sum: 5 });
  orders.listForUser.mockResolvedValue([paidOrder()]);
});

describe("writing a review", () => {
  it("lets a customer who paid for the product review it, and updates the product's rating", async () => {
    await ReviewService.submit(buyer, "iem", input);

    expect(reviews.create).toHaveBeenCalledWith(expect.objectContaining({ productId: "iem", userId: "user-1", orderId: "order-1", variantName: "Bass", authorName: "Sami Ben Ali", rating: 5 }));
    expect(products.setRating).toHaveBeenCalledWith("iem", 1, 5);
  });

  it("refuses guests and people who didn't buy (or only have a pending / cancelled order)", async () => {
    await expect(ReviewService.submit(null, "iem", input)).rejects.toMatchObject({ key: "reviews.errors.loginRequired" });

    orders.listForUser.mockResolvedValue([]);
    await expect(ReviewService.submit(other, "iem", input)).rejects.toMatchObject({ key: "reviews.errors.buyersOnly" });

    orders.listForUser.mockResolvedValue([paidOrder("PENDING"), paidOrder("CANCELLED")]);
    await expect(ReviewService.submit(buyer, "iem", input)).rejects.toMatchObject({ key: "reviews.errors.buyersOnly" });
    expect(reviews.create).not.toHaveBeenCalled();
  });

  it("refuses ratings outside 1 to 5 and messages over 1000 characters", async () => {
    for (const rating of [0, 6, 4.5, Number.NaN]) {
      await expect(ReviewService.submit(buyer, "iem", { ...input, rating })).rejects.toMatchObject({ key: "reviews.ratingRequired" });
    }
    await expect(ReviewService.submit(buyer, "iem", { ...input, message: "x".repeat(1001) })).rejects.toMatchObject({ key: "reviews.errors.tooLong" });
  });

  it("masks the name before saving when the customer hides it", async () => {
    await ReviewService.submit(buyer, "iem", { ...input, hideName: true });
    expect(reviews.create).toHaveBeenCalledWith(expect.objectContaining({ authorName: "S***i B***n A***i" }));
  });

  it("[fixed] cuts a very long account name before showing it publicly", async () => {
    await ReviewService.submit({ ...buyer, name: "Spam ".repeat(500) }, "iem", input);
    const saved = reviews.create.mock.calls[0]![0];
    expect(saved.authorName.length).toBeLessThanOrEqual(60);
  });

  it("edits the existing review instead of adding a second one", async () => {
    reviews.findByUserAndProduct.mockResolvedValue({ id: "rev-1" } as never);
    await ReviewService.submit(buyer, "iem", { ...input, rating: 3 });

    expect(reviews.update).toHaveBeenCalledWith("rev-1", expect.objectContaining({ rating: 3 }));
    expect(reviews.create).not.toHaveBeenCalled();
  });
});

describe("deleting a review", () => {
  beforeEach(() => reviews.findById.mockResolvedValue({ id: "rev-1", userId: "user-1", productId: "iem" } as never));

  it("lets the author and admins delete it, and refreshes the rating", async () => {
    await ReviewService.remove(buyer, "rev-1");
    await ReviewService.remove(admin, "rev-1");
    expect(reviews.delete).toHaveBeenCalledTimes(2);
    expect(products.setRating).toHaveBeenCalledTimes(2);
  });

  it("refuses anyone else", async () => {
    await expect(ReviewService.remove(other, "rev-1")).rejects.toMatchObject({ key: "reviews.errors.notFound" });
    await expect(ReviewService.remove(null, "rev-1")).rejects.toMatchObject({ key: "reviews.errors.notFound" });
    expect(reviews.delete).not.toHaveBeenCalled();
  });
});

describe("admin moderation", () => {
  it("hiding a review updates the product's rating", async () => {
    reviews.setHidden.mockResolvedValue({ productId: "iem" } as never);
    await ReviewService.setHidden("rev-1", true);
    expect(products.setRating).toHaveBeenCalledWith("iem", 1, 5);
  });

  it("keeps replies under 600 characters", async () => {
    await expect(ReviewService.reply("rev-1", "x".repeat(601))).rejects.toThrow(/600/);
  });
});

describe("review links on an order", () => {
  it("are only for the owner of a paid order", async () => {
    const order = { userId: "user-1", status: "PAID" as const, items: [{ productId: "iem" }] };
    await expect(ReviewService.reviewLinksForOrder(buyer, order)).resolves.toEqual({ iem: "new" });
    await expect(ReviewService.reviewLinksForOrder(other, order)).resolves.toEqual({});
    await expect(ReviewService.reviewLinksForOrder(buyer, { ...order, status: "PENDING" })).resolves.toEqual({});
  });
});
