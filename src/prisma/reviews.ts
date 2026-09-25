// Database access for product reviews: plain queries only. The rules live in services/reviews.ts.
import { db } from "./db";
import { now } from "../lib/time";

export type ReviewWriteInput = {
  rating: number;
  message: string;
  authorName: string;
  hideName: boolean;
};

export const ReviewRepository = {
  findById: async (id: string) => {
    return await db.orm.public.Review.first({ id });
  },

  findByUserAndProduct: async (userId: string, productId: string) => {
    return await db.orm.public.Review.first({ userId, productId });
  },

  create: async (data: ReviewWriteInput & { productId: string; userId: string; orderId: string | null; variantName: string | null }) => {
    return await db.orm.public.Review.create(data);
  },

  update: async (id: string, data: ReviewWriteInput) => {
    return await db.orm.public.Review.where({ id }).update({ ...data, updatedAt: now() });
  },

  delete: async (id: string) => {
    return await db.orm.public.Review.where({ id }).delete();
  },

  // Only reviews an admin hasn't hidden are shown in the shop.
  listVisibleForProduct: async (productId: string, limit: number, offset: number) => {
    return await db.orm.public.Review.where({ productId, hidden: false })
      .orderBy((r) => r.createdAt.desc())
      .limit(limit)
      .offset(offset)
      .all();
  },

  countVisible: async (productId: string) => {
    const { total } = await db.orm.public.Review.where({ productId, hidden: false }).aggregate((a) => ({ total: a.count() }));
    return total;
  },

  countVisibleWithRating: async (productId: string, rating: number) => {
    const { total } = await db.orm.public.Review.where({ productId, hidden: false, rating }).aggregate((a) => ({ total: a.count() }));
    return total;
  },

  totalsVisible: async (productId: string) => {
    const { count, sum } = await db.orm.public.Review.where({ productId, hidden: false }).aggregate((a) => ({
      count: a.count(),
      sum: a.sum("rating"),
    }));
    return { count, sum: sum ?? 0 };
  },

  listForAdmin: async (limit: number, offset: number) => {
    return await db.orm.public.Review.where((r) => r.rating.gte(1))
      .orderBy((r) => r.createdAt.desc())
      .include("product")
      .limit(limit)
      .offset(offset)
      .all();
  },

  countAll: async () => {
    const { total } = await db.orm.public.Review.aggregate((a) => ({ total: a.count() }));
    return total;
  },

  setHidden: async (id: string, hidden: boolean) => {
    return await db.orm.public.Review.where({ id }).update({ hidden, updatedAt: now() });
  },

  setReply: async (id: string, reply: string | null) => {
    return await db.orm.public.Review.where({ id }).update({ adminReply: reply, adminRepliedAt: reply ? now() : null });
  },
};
