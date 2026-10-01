// Database access for AliExpress shipments, their items, history and email subscribers: plain queries only.
// The rules live in services/shipments.ts and services/shipment-notifications.ts.
import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "./db";
import { now } from "../lib/time";
import type { ShipmentStatus } from "../lib/shipments";

export type ShipmentWriteInput = {
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  contactChannel: string | null;
  adminNotes: string;
};

export type ShipmentItemWriteInput = {
  // Set for an item that already exists (edit form); absent for a new one.
  id?: string;
  name: string;
  quantity: number;
  url: string | null;
  imageUrl: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedArrival: Temporal.Instant | null;
};

export type ShipmentFilter = { q?: string; status?: ShipmentStatus };

async function filtered(filter: ShipmentFilter) {
  // reference >= 1 is always true (it counts from 1): a starting point for the filters.
  let query = db.orm.public.Shipment.where((s) => s.reference.gte(1));

  if (filter.status) query = query.where({ status: filter.status });

  if (filter.q?.trim()) {
    // LIKE treats % and _ as wildcards — escape them so the search is literal.
    const pattern = `%${filter.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    // An item name or parcel number finds its shipment too.
    const items = await db.orm.public.ShipmentItem.where((i) => or(i.name.ilike(pattern), i.trackingNumber.ilike(pattern))).all();
    const ids = [...new Set(items.map((item) => item.shipmentId))];
    query = query.where((s) =>
      ids.length > 0 ? or(s.customerName.ilike(pattern), s.trackingCode.ilike(pattern), s.id.in(ids)) : or(s.customerName.ilike(pattern), s.trackingCode.ilike(pattern)),
    );
  }

  return query;
}

export const ShipmentRepository = {
  findMany: async (filter: ShipmentFilter, limit: number, offset: number) => {
    return await (await filtered(filter))
      .orderBy((s) => s.createdAt.desc())
      .include("items", (items) => items.orderBy((i) => i.position.asc()))
      .limit(limit)
      .offset(offset)
      .all();
  },

  count: async (filter: ShipmentFilter) => {
    const { total } = await (await filtered(filter)).aggregate((a) => ({ total: a.count() }));
    return total;
  },

  findById: async (id: string) => {
    return await db.orm.public.Shipment.where({ id })
      .include("items", (items) => items.orderBy((i) => i.position.asc()))
      .include("events", (events) => events.orderBy((e) => e.createdAt.desc()))
      .first();
  },

  findByCode: async (trackingCode: string) => {
    return await db.orm.public.Shipment.where({ trackingCode })
      .include("items", (items) => items.orderBy((i) => i.position.asc()))
      .include("events", (events) => events.orderBy((e) => e.createdAt.desc()))
      .first();
  },

  codeExists: async (trackingCode: string) => {
    return !!(await db.orm.public.Shipment.first({ trackingCode }));
  },

  create: async (data: ShipmentWriteInput & { trackingCode: string; orderId?: string | null }) => {
    return await db.orm.public.Shipment.create(data);
  },

  findByOrderId: async (orderId: string) => {
    return await db.orm.public.Shipment.first({ orderId });
  },

  update: async (id: string, data: ShipmentWriteInput) => {
    return await db.orm.public.Shipment.where({ id }).update({ ...data, updatedAt: now() });
  },

  // The whole order's stage, worked out from its items by the service.
  setStatus: async (id: string, status: ShipmentStatus) => {
    return await db.orm.public.Shipment.where({ id }).update({ status, updatedAt: now() });
  },

  delete: async (id: string) => {
    return await db.orm.public.Shipment.where({ id }).delete();
  },

  // Saves the item list from the admin form: rows with an id are updated, rows without one are
  // created, and rows no longer listed are removed (with their history lines).
  replaceItems: async (shipmentId: string, items: ShipmentItemWriteInput[]) => {
    const existing = await db.orm.public.ShipmentItem.where({ shipmentId }).all();
    const keep = new Set(items.flatMap((item) => (item.id ? [item.id] : [])));

    for (const old of existing) {
      if (!keep.has(old.id)) await db.orm.public.ShipmentItem.where({ id: old.id }).delete();
    }

    for (const [position, item] of items.entries()) {
      const { id, ...data } = item;
      const row = { ...data, position, updatedAt: now() };

      if (id && existing.some((old) => old.id === id)) {
        await db.orm.public.ShipmentItem.where({ id }).update(row);
      } else {
        await db.orm.public.ShipmentItem.create({ shipmentId, ...row });
      }
    }
  },

  setItemStatus: async (itemId: string, status: ShipmentStatus) => {
    return await db.orm.public.ShipmentItem.where({ id: itemId }).update({ status, updatedAt: now() });
  },

  addEvent: async (shipmentId: string, itemId: string | null, status: ShipmentStatus, note: string) => {
    return await db.orm.public.ShipmentEvent.create({ shipmentId, itemId, status, note });
  },

  findEvent: async (id: string) => {
    return await db.orm.public.ShipmentEvent.first({ id });
  },

  deleteEvent: async (id: string) => {
    return await db.orm.public.ShipmentEvent.where({ id }).delete();
  },

  // --- email subscribers ---

  findSubscriber: async (shipmentId: string, email: string) => {
    return await db.orm.public.ShipmentSubscriber.first({ shipmentId, email });
  },

  findSubscriberByToken: async (unsubscribeToken: string) => {
    return await db.orm.public.ShipmentSubscriber.first({ unsubscribeToken });
  },

  listSubscribers: async (shipmentId: string) => {
    return await db.orm.public.ShipmentSubscriber.where({ shipmentId })
      .orderBy((s) => s.createdAt.asc())
      .all();
  },

  createSubscriber: async (data: { shipmentId: string; email: string; locale: string; unsubscribeToken: string }) => {
    return await db.orm.public.ShipmentSubscriber.create(data);
  },

  updateSubscriber: async (
    id: string,
    data: Partial<{ locale: string; verifiedAt: Temporal.Instant | null; codeHash: string | null; codeExpiresAt: Temporal.Instant | null; codeAttempts: number; lastCodeSentAt: Temporal.Instant }>,
  ) => {
    return await db.orm.public.ShipmentSubscriber.where({ id }).update(data);
  },

  deleteSubscriber: async (id: string) => {
    return await db.orm.public.ShipmentSubscriber.where({ id }).delete();
  },

  // How many codes were emailed for this shipment since `since`, to stop anyone using the page to spam addresses.
  countCodesSentSince: async (shipmentId: string, since: Temporal.Instant) => {
    const { total } = await db.orm.public.ShipmentSubscriber.where({ shipmentId })
      .where((s) => s.lastCodeSentAt.gte(since))
      .aggregate((a) => ({ total: a.count() }));
    return total;
  },
};
