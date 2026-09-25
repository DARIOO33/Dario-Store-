// Database access for AliExpress shipments and their history: plain queries only.
// The rules live in services/shipments.ts.
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
  itemName: string;
  itemUrl: string | null;
  itemImageUrl: string | null;
  quantity: number;
  carrier: string | null;
  carrierTrackingNumber: string | null;
  estimatedArrival: Temporal.Instant | null;
  adminNotes: string;
};

export type ShipmentFilter = { q?: string; status?: ShipmentStatus };

function filtered(filter: ShipmentFilter) {
  // quantity >= 1 is always true (a CHECK guarantees it): a starting point for the filters.
  let query = db.orm.public.Shipment.where((s) => s.quantity.gte(1));

  if (filter.status) query = query.where({ status: filter.status });

  if (filter.q?.trim()) {
    // LIKE treats % and _ as wildcards — escape them so the search is literal.
    const pattern = `%${filter.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    query = query.where((s) =>
      or(s.customerName.ilike(pattern), s.itemName.ilike(pattern), s.trackingCode.ilike(pattern), s.carrierTrackingNumber.ilike(pattern)),
    );
  }

  return query;
}

export const ShipmentRepository = {
  findMany: async (filter: ShipmentFilter, limit: number, offset: number) => {
    return await filtered(filter)
      .orderBy((s) => s.createdAt.desc())
      .limit(limit)
      .offset(offset)
      .all();
  },

  count: async (filter: ShipmentFilter) => {
    const { total } = await filtered(filter).aggregate((a) => ({ total: a.count() }));
    return total;
  },

  findById: async (id: string) => {
    return await db.orm.public.Shipment.where({ id })
      .include("events", (events) => events.orderBy((e) => e.createdAt.desc()))
      .first();
  },

  findByCode: async (trackingCode: string) => {
    return await db.orm.public.Shipment.where({ trackingCode })
      .include("events", (events) => events.orderBy((e) => e.createdAt.desc()))
      .first();
  },

  codeExists: async (trackingCode: string) => {
    return !!(await db.orm.public.Shipment.first({ trackingCode }));
  },

  create: async (data: ShipmentWriteInput & { trackingCode: string }) => {
    return await db.orm.public.Shipment.create(data);
  },

  update: async (id: string, data: ShipmentWriteInput) => {
    return await db.orm.public.Shipment.where({ id }).update({ ...data, updatedAt: now() });
  },

  setStatus: async (id: string, status: ShipmentStatus) => {
    return await db.orm.public.Shipment.where({ id }).update({ status, updatedAt: now() });
  },

  delete: async (id: string) => {
    return await db.orm.public.Shipment.where({ id }).delete();
  },

  addEvent: async (shipmentId: string, status: ShipmentStatus, note: string) => {
    return await db.orm.public.ShipmentEvent.create({ shipmentId, status, note });
  },

  findEvent: async (id: string) => {
    return await db.orm.public.ShipmentEvent.first({ id });
  },

  deleteEvent: async (id: string) => {
    return await db.orm.public.ShipmentEvent.where({ id }).delete();
  },
};
