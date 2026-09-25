// Database access for orders: plain queries only. The rules live in services/orders.ts.

import { db } from "./db";
import { now } from "../lib/time";

export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];

// Statuses that count as real sales (money received or on its way).
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export const OrderRepository = {
  findById: async (id: string) => {
    return await db.orm.public.Order.where({ id }).include("items").first();
  },

  listForUser: async (userId: string) => {
    return await db.orm.public.Order.where({ userId })
      .orderBy((o) => o.createdAt.desc())
      .include("items")
      .all();
  },

  findMany: async (status: OrderStatus | undefined, limit: number, offset: number) => {
    const query = status ? db.orm.public.Order.where({ status }) : db.orm.public.Order.where((o) => o.totalMillimes.gte(0));

    return await query
      .orderBy((o) => o.createdAt.desc())
      .include("items")
      .limit(limit)
      .offset(offset)
      .all();
  },

  count: async (status?: OrderStatus) => {
    const query = status ? db.orm.public.Order.where({ status }) : db.orm.public.Order.where((o) => o.totalMillimes.gte(0));
    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    return total;
  },

  findSince: async (since: Temporal.Instant) => {
    return await db.orm.public.Order.where((o) => o.createdAt.gte(since)).all();
  },

  sumRevenue: async () => {
    const { total } = await db.orm.public.Order.where((o) => o.status.in(REVENUE_STATUSES)).aggregate((a) => ({
      total: a.sum("totalMillimes"),
    }));
    return total ?? 0;
  },

  setPaymentSent: async (id: string, at: Temporal.Instant | null) => {
    return await db.orm.public.Order.where({ id }).update({ paymentSentAt: at, updatedAt: now() });
  },

  // Orders whose customer says they've paid and are waiting for the store to check.
  findAwaitingVerification: async () => {
    return await db.orm.public.Order.where({ status: "PENDING" })
      .where((o) => o.paymentSentAt.isNotNull())
      .orderBy((o) => o.paymentSentAt.asc())
      .all();
  },

  setDeliveryEmailSent: async (id: string) => {
    return await db.orm.public.Order.where({ id }).update({ deliveryEmailSentAt: now(), updatedAt: now() });
  },

  setStatus: async (id: string, status: OrderStatus) => {
    return await db.orm.public.Order.where({ id }).update({ status, updatedAt: now() });
  },
};
