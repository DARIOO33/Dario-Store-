// Business rules for product reviews. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.
import { ReviewRepository } from "../prisma/reviews";
import { ProductRepository } from "../prisma/products";
import { OrderRepository, type OrderStatus } from "../prisma/orders";
import { UserError, userError } from "../lib/result";
import { formatDate } from "../lib/time";
import { maskName } from "../lib/mask";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

const MAX_MESSAGE = 1000;
const MAX_REPLY = 600;
const MAX_AUTHOR_NAME = 60;
export const REVIEWS_PER_PAGE = 8;

// A review needs a purchase that has actually been paid: not pending, not cancelled.
const REVIEWABLE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

type Viewer = { id: string; name: string; role: string } | null;

// Plain values only, so they can be passed to client components.
export type ReviewView = {
  id: string;
  authorName: string;
  rating: number;
  message: string;
  variantName: string | null;
  date: string;
  reply: { text: string; date: string } | null;
  mine: boolean;
};

export type ReviewSummary = {
  count: number;
  average: number | null;
  // From 5 stars down to 1.
  distribution: { stars: number; count: number }[];
};

// One product in the chat's review card (plain values, sent to the browser).
export type ChatReviewItem = {
  productId: string;
  name: string;
  existing: { rating: number; message: string; hideName: boolean } | null;
};

// What the current visitor may do on a product's review section.
export type ReviewAccess =
  | { kind: "guest" }
  | { kind: "not-buyer" }
  | { kind: "can-review"; fullName: string; existing: { id: string; rating: number; message: string; hideName: boolean } | null };

// Keeps the totals shown on product cards in step with the visible reviews.
async function refreshRating(productId: string) {
  const { count, sum } = await ReviewRepository.totalsVisible(productId);
  await ProductRepository.setRating(productId, count, sum);
}

// The customer's most recent paid order that contains this product, if any.
async function findPurchase(userId: string, productId: string) {
  const orders = await OrderRepository.listForUser(userId);

  for (const order of orders) {
    if (!REVIEWABLE_STATUSES.includes(order.status)) continue;

    const item = order.items.find((line) => line.productId === productId);
    if (item) return { orderId: order.id, variantName: item.variantName };
  }
  return null;
}

function toView(review: NonNullable<Awaited<ReturnType<typeof ReviewRepository.findById>>>, viewer: Viewer, locale: Locale): ReviewView {
  return {
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    message: review.message,
    variantName: review.variantName,
    date: formatDate(review.createdAt, locale),
    reply: review.adminReply && review.adminRepliedAt ? { text: review.adminReply, date: formatDate(review.adminRepliedAt, locale) } : null,
    mine: !!viewer && review.userId === viewer.id,
  };
}

export const ReviewService = {
  summary: async (productId: string): Promise<ReviewSummary> => {
    const [{ count, sum }, ...perRating] = await Promise.all([
      ReviewRepository.totalsVisible(productId),
      ...[5, 4, 3, 2, 1].map((stars) => ReviewRepository.countVisibleWithRating(productId, stars)),
    ]);

    return {
      count,
      average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
      distribution: [5, 4, 3, 2, 1].map((stars, i) => ({ stars, count: perRating[i]! })),
    };
  },

  listForProduct: async (productId: string, viewer: Viewer, page: number, locale: Locale) => {
    const [rows, total] = await Promise.all([
      ReviewRepository.listVisibleForProduct(productId, REVIEWS_PER_PAGE, (page - 1) * REVIEWS_PER_PAGE),
      ReviewRepository.countVisible(productId),
    ]);

    return { reviews: rows.map((row) => toView(row, viewer, locale)), total, pages: Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE)) };
  },

  accessFor: async (productId: string, viewer: Viewer): Promise<ReviewAccess> => {
    if (!viewer) return { kind: "guest" };

    const existing = await ReviewRepository.findByUserAndProduct(viewer.id, productId);
    const purchase = existing ? null : await findPurchase(viewer.id, productId);

    if (!existing && !purchase) return { kind: "not-buyer" };

    return {
      kind: "can-review",
      fullName: viewer.name,
      existing: existing ? { id: existing.id, rating: existing.rating, message: existing.message, hideName: existing.hideName } : null,
    };
  },

  // For the order page: which items can be reviewed, and which already were.
  // Only the order's owner sees these links, and only once it has been paid.
  reviewLinksForOrder: async (viewer: Viewer, order: { userId: string | null; status: OrderStatus; items: { productId: string | null }[] }) => {
    const links: Record<string, "new" | "edit"> = {};
    if (!viewer || order.userId !== viewer.id || !REVIEWABLE_STATUSES.includes(order.status)) return links;

    for (const item of order.items) {
      if (!item.productId || links[item.productId]) continue;
      links[item.productId] = (await ReviewRepository.findByUserAndProduct(viewer.id, item.productId)) ? "edit" : "new";
    }
    return links;
  },

  // The review card in the chat of a delivered order (customer side): one entry per product that is
  // still in the shop, with the customer's review when they already left one. Null for anyone else.
  forOrderChat: async (viewer: { id: string; name: string }, order: { userId: string | null; status: OrderStatus; items: { productId: string | null; productName: string }[] }) => {
    if (order.userId !== viewer.id || order.status !== "DELIVERED") return null;

    const items: ChatReviewItem[] = [];
    for (const item of order.items) {
      if (!item.productId || items.some((known) => known.productId === item.productId)) continue;

      const existing = await ReviewRepository.findByUserAndProduct(viewer.id, item.productId);
      items.push({
        productId: item.productId,
        name: item.productName,
        existing: existing ? { rating: existing.rating, message: existing.message, hideName: existing.hideName } : null,
      });
    }
    return items.length > 0 ? { reviewerName: viewer.name, items } : null;
  },

  // Creates the customer's review, or updates it if they already left one.
  submit: async (viewer: Viewer, productId: string, input: { rating: number; message: string; hideName: boolean }) => {
    if (!viewer) throw userError("reviews.errors.loginRequired");
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw userError("reviews.ratingRequired");

    const message = input.message.trim();
    if (message.length > MAX_MESSAGE) throw userError("reviews.errors.tooLong", { max: MAX_MESSAGE });

    if (!(await ProductRepository.findById(productId))) throw userError("reviews.errors.productGone");

    // The name is masked here, before saving, so a hidden name is never stored. Account names have
    // no length limit at sign-up, so it is cut to what a review card can show.
    const name = viewer.name.trim().slice(0, MAX_AUTHOR_NAME);
    const data = { rating: input.rating, message, hideName: input.hideName, authorName: input.hideName ? maskName(name) : name };

    const existing = await ReviewRepository.findByUserAndProduct(viewer.id, productId);
    if (existing) {
      await ReviewRepository.update(existing.id, data);
    } else {
      const purchase = await findPurchase(viewer.id, productId);
      if (!purchase) throw userError("reviews.errors.buyersOnly");

      await ReviewRepository.create({ ...data, productId, userId: viewer.id, orderId: purchase.orderId, variantName: purchase.variantName });
    }

    await refreshRating(productId);
  },

  // Owners can delete their own review; admins can delete any.
  remove: async (viewer: Viewer, reviewId: string) => {
    const review = await ReviewRepository.findById(reviewId);

    if (!viewer || !review || (review.userId !== viewer.id && viewer.role !== "ADMIN")) throw userError("reviews.errors.notFound");

    await ReviewRepository.delete(reviewId);
    await refreshRating(review.productId);
  },

  // --- admin moderation ---

  listForAdmin: async (page: number, pageSize: number) => {
    const [rows, total] = await Promise.all([ReviewRepository.listForAdmin(pageSize, (page - 1) * pageSize), ReviewRepository.countAll()]);

    return {
      rows: rows.map((row) => ({ ...toView(row, null, DEFAULT_LOCALE), productId: row.productId, productName: row.product?.name ?? "Deleted product", hidden: row.hidden })),
      total,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  setHidden: async (reviewId: string, hidden: boolean) => {
    const review = await ReviewRepository.setHidden(reviewId, hidden);
    if (!review) throw new UserError("Review not found.");
    await refreshRating(review.productId);
  },

  // An empty reply removes the store's answer.
  reply: async (reviewId: string, text: string) => {
    const reply = text.trim();
    if (reply.length > MAX_REPLY) throw new UserError(`Keep the reply under ${MAX_REPLY} characters.`);

    const review = await ReviewRepository.setReply(reviewId, reply || null);
    if (!review) throw new UserError("Review not found.");
  },
};
