import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/shipments", () => ({
  ShipmentRepository: { findByCode: vi.fn(), findById: vi.fn(), findEvent: vi.fn(), codeExists: vi.fn(), create: vi.fn(), update: vi.fn(), addEvent: vi.fn(), setStatus: vi.fn(), deleteEvent: vi.fn() },
}));

import { ShipmentRepository } from "../prisma/shipments";
import { ShipmentService, type ShipmentFormInput } from "./shipments";

const shipments = vi.mocked(ShipmentRepository);
const at = Temporal.Instant.from("2026-09-20T10:00:00Z");

const row = {
  id: "s-1",
  reference: 12,
  trackingCode: "DS-7K4Q9-X2M3F",
  customerName: "Mehdi Ben Omrane",
  customerPhone: "22 123 456",
  customerAddress: "12 Rue de la Kasbah",
  customerCity: "Tunis",
  contactChannel: "Instagram",
  itemName: "KZ Castor",
  itemUrl: "https://aliexpress.com/item/123",
  itemImageUrl: null,
  adminNotes: "paid 45 DT on AliExpress, profit 20 DT",
  quantity: 1,
  status: "SHIPPED",
  carrier: "Aramex",
  carrierTrackingNumber: "AB123456",
  estimatedArrival: null,
  createdAt: at,
  events: [{ id: "e-2", status: "SHIPPED", note: "", createdAt: at }, { id: "e-1", status: "RECEIVED", note: "We received your order.", createdAt: at }],
};

function form(changes: Partial<ShipmentFormInput> = {}): ShipmentFormInput {
  return {
    customerName: "Mehdi", customerPhone: "", customerCity: "", customerAddress: "", contactChannel: "", itemName: "KZ Castor",
    itemUrl: "", itemImageUrl: "", quantity: "1", carrier: "", carrierTrackingNumber: "", estimatedArrival: "", adminNotes: "",
    ...changes,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  shipments.findByCode.mockResolvedValue(row as never);
  shipments.findById.mockResolvedValue(row as never);
  shipments.codeExists.mockResolvedValue(false);
  shipments.create.mockImplementation(async (data) => ({ id: "s-new", ...data }) as never);
});

describe("public tracking page", () => {
  it("masks the customer's name, phone and address on the server", async () => {
    const view = await ShipmentService.getPublic("ds-7k4q9-x2m3f", "en");

    expect(view!.contact).toEqual({ name: "M***i B***n O***e", phone: "** *** 456", address: "*** R***e d* l* K***h", city: "Tunis" });
  });

  it("never includes internal notes, the AliExpress link or the contact channel", async () => {
    const text = JSON.stringify(await ShipmentService.getPublic("DS-7K4Q9-X2M3F", "en"));

    for (const secret of ["profit", "aliexpress.com", "Instagram", "Mehdi", "22 123 456", "Kasbah"]) expect(text).not.toContain(secret);
  });

  it("returns nothing for an unknown or malformed code", async () => {
    shipments.findByCode.mockResolvedValue(null);
    await expect(ShipmentService.getPublic("DS-AAAAA-BBBBB", "en")).resolves.toBeNull();
    expect(shipments.findByCode).toHaveBeenLastCalledWith("DS-AAAAA-BBBBB");

    await ShipmentService.getPublic("' OR 1=1 --", "en");
    expect(shipments.findByCode).toHaveBeenLastCalledWith("");
  });
});

describe("admin shipment form", () => {
  it("creates a shipment with an unguessable tracking code", async () => {
    const { trackingCode } = await ShipmentService.create(form());
    expect(trackingCode).toMatch(/^DS-[A-HJ-NP-TV-Z2-9]{5}-[A-HJ-NP-TV-Z2-9]{5}$/);
  });

  it("only accepts http(s) links, so no javascript: link can reach a page", async () => {
    await expect(ShipmentService.create(form({ itemUrl: "javascript:alert(1)" }))).rejects.toThrow(/https:\/\//);
    await expect(ShipmentService.create(form({ itemImageUrl: "data:image/svg+xml,<svg onload=alert(1)>" }))).rejects.toThrow(/https:\/\//);
  });

  it("validates names, quantity, phone, date and text lengths", async () => {
    await expect(ShipmentService.create(form({ customerName: "x" }))).rejects.toThrow(/customer's name/);
    await expect(ShipmentService.create(form({ quantity: "0" }))).rejects.toThrow(/Quantity/);
    await expect(ShipmentService.create(form({ quantity: "1e3" }))).rejects.toThrow(/Quantity/);
    await expect(ShipmentService.create(form({ customerPhone: "abc" }))).rejects.toThrow(/phone/);
    await expect(ShipmentService.create(form({ estimatedArrival: "not a date" }))).rejects.toThrow(/date/);
    await expect(ShipmentService.create(form({ adminNotes: "x".repeat(1001) }))).rejects.toThrow(/too long/);
  });

  it("rejects fields that are not text (a hand-made request)", async () => {
    await expect(ShipmentService.create(form({ customerName: { $ne: "" } as unknown as string }))).rejects.toThrow(/invalid/);
  });

  it("won't remove the first timeline entry, or an entry from another shipment", async () => {
    shipments.findEvent.mockResolvedValue({ id: "e-1", shipmentId: "s-1" } as never);
    await expect(ShipmentService.removeEvent("s-1", "e-1")).rejects.toThrow(/first entry/);

    shipments.findEvent.mockResolvedValue({ id: "e-9", shipmentId: "s-2" } as never);
    await expect(ShipmentService.removeEvent("s-1", "e-9")).rejects.toThrow(/no longer exists/);
    expect(shipments.deleteEvent).not.toHaveBeenCalled();
  });
});
