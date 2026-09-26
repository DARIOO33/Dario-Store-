// Database access for orders: plain queries only. The rules live in services/orders.ts.

import { db } from "./db";
import { now } from "../lib/time";

export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];

// Statuses that count as real sales (money received or on its way).
export type PaymentStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "FAILED" | "REFUNDED";

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

  countByEmailSince: async (email: string, since: Temporal.Instant) => {
    const { total } = await db.orm.public.Order.where({ customerEmail: email })
      .where((o) => o.createdAt.gte(since))
      .aggregate((a) => ({ total: a.count() }));
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

  setPaymentStatus: async (id: string, paymentStatus: PaymentStatus, paymentSentAt?: Temporal.Instant | null) => {
    return await db.orm.public.Order.where({ id }).update({ paymentStatus, ...(paymentSentAt !== undefined && { paymentSentAt }), updatedAt: now() });
  },

  // Compare-and-swap for the payment buttons: only changes a PENDING order whose payment is still one
  // of `from`, so a double click can't do it twice. Returns null when nothing matched.
  changePaymentStatus: async (id: string, from: PaymentStatus[], to: PaymentStatus, paymentSentAt?: Temporal.Instant) => {
    return await db.orm.public.Order.where({ id, status: "PENDING" })
      .where((o) => o.paymentStatus.in(from))
      .update({ paymentStatus: to, ...(paymentSentAt && { paymentSentAt }), updatedAt: now() });
  },

  // Orders whose customer says they've paid and are waiting for the store to check.
  findAwaitingVerification: async () => {
    return await db.orm.public.Order.where({ status: "PENDING", paymentStatus: "SUBMITTED" })
      .orderBy((o) => o.paymentSentAt.asc())
      .all();
  },

  // "Report a problem": reopens a chat the team closed. Compare-and-swap on the chat still being closed,
  // so a double click reopens (and reports) only once. Returns null when nothing matched.
  reopenForProblem: async (id: string, at: Temporal.Instant) => {
    return await db.orm.public.Order.where({ id })
      .where((o) => o.chatClosedAt.isNotNull())
      .update({ chatClosedAt: null, problemReportedAt: at, updatedAt: at });
  },

  // `null` reopens the chat.
  setChatClosed: async (id: string, closedAt: Temporal.Instant | null) => {
    return await db.orm.public.Order.where({ id }).update({ chatClosedAt: closedAt, updatedAt: now() });
  },

  setDeliveryEmailSent: async (id: string) => {
    return await db.orm.public.Order.where({ id }).update({ deliveryEmailSentAt: now(), updatedAt: now() });
  },

  setStatus: async (id: string, status: OrderStatus) => {
    return await db.orm.public.Order.where({ id }).update({ status, updatedAt: now() });
  },
};
