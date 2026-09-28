import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/shipments", () => ({
  ShipmentRepository: {
    findByCode: vi.fn(), findById: vi.fn(), findEvent: vi.fn(), codeExists: vi.fn(), create: vi.fn(), update: vi.fn(), replaceItems: vi.fn(),
    setItemStatus: vi.fn(), setStatus: vi.fn(), addEvent: vi.fn(), deleteEvent: vi.fn(), listSubscribers: vi.fn(),
  },
}));
vi.mock("./shipment-notifications", () => ({ ShipmentNotifications: { sendUpdate: vi.fn() } }));
vi.mock("./uploads", () => ({ uploadShopPhoto: vi.fn() }));

import { ShipmentRepository } from "../prisma/shipments";
import { ShipmentNotifications } from "./shipment-notifications";
import { ShipmentService, overallStatus, type ShipmentFormInput, type ShipmentItemFormInput } from "./shipments";

const repo = vi.mocked(ShipmentRepository);
const notifications = vi.mocked(ShipmentNotifications);
const at = Temporal.Instant.from("2026-09-20T10:00:00Z");

const item = (id: string, changes: Record<string, unknown> = {}) => ({
  id, shipmentId: "s-1", position: 0, name: `Item ${id}`, quantity: 1, url: "https://aliexpress.com/item/secret-" + id, imageUrl: null,
  carrier: "Cainiao", trackingNumber: `LP${id}0001`, estimatedArrival: null, status: "SHIPPED", createdAt: at, updatedAt: at, ...changes,
});

function shipment(changes: Record<string, unknown> = {}) {
  return {
    id: "s-1", reference: 12, trackingCode: "DS-7K4Q9-X2M3F", customerName: "Mehdi Ben Omrane", customerPhone: "22 123 456",
    customerAddress: "12 Rue de la Kasbah", customerCity: "Tunis", contactChannel: "Instagram", adminNotes: "profit 20 DT", status: "SHIPPED", createdAt: at,
    items: [item("a"), item("b", { status: "IN_TUNISIA" }), item("c")],
    events: [
      { id: "e-3", shipmentId: "s-1", itemId: "b", status: "IN_TUNISIA", note: "", createdAt: at },
      { id: "e-2", shipmentId: "s-1", itemId: null, status: "SHIPPED", note: "", createdAt: at },
      { id: "e-1", shipmentId: "s-1", itemId: null, status: "RECEIVED", note: "We received your order.", createdAt: at },
    ],
    ...changes,
  } as never;
}

const formItem = (changes: Partial<ShipmentItemFormInput> = {}): ShipmentItemFormInput => ({ name: "Earbuds", quantity: "1", url: "", imageUrl: "", carrier: "", trackingNumber: "", estimatedArrival: "", ...changes });
function form(changes: Partial<ShipmentFormInput> = {}): ShipmentFormInput {
  return { customerName: "Mehdi", customerPhone: "", customerCity: "", customerAddress: "", contactChannel: "", adminNotes: "", items: [formItem()], ...changes };
}

beforeEach(() => {
  vi.resetAllMocks();
  repo.findByCode.mockResolvedValue(shipment());
  repo.findById.mockResolvedValue(shipment());
  repo.codeExists.mockResolvedValue(false);
  repo.create.mockImplementation(async (data) => ({ id: "s-new", ...data }) as never);
  repo.listSubscribers.mockResolvedValue([]);
});

describe("overall status (the slowest item)", () => {
  it("follows the item that is furthest behind, and is Delivered only when every item is", () => {
    expect(overallStatus([{ status: "DELIVERED" }, { status: "SHIPPED" }, { status: "IN_TUNISIA" }])).toBe("SHIPPED");
    expect(overallStatus([{ status: "DELIVERED" }, { status: "DELIVERED" }])).toBe("DELIVERED");
  });

  it("ignores cancelled items, unless every item is cancelled", () => {
    expect(overallStatus([{ status: "CANCELLED" }, { status: "DELIVERED" }])).toBe("DELIVERED");
    expect(overallStatus([{ status: "CANCELLED" }, { status: "CANCELLED" }])).toBe("CANCELLED");
  });
});

describe("creating and editing a shipment with several items", () => {
  it("creates one shipment with all its items and an unguessable tracking code", async () => {
    const items = Array.from({ length: 10 }, (_, i) => formItem({ name: `Item ${i + 1}`, trackingNumber: `LP00${i}1234` }));
    const { trackingCode } = await ShipmentService.create(form({ items }));

    expect(trackingCode).toMatch(/^DS-[A-HJ-NP-TV-Z2-9]{5}-[A-HJ-NP-TV-Z2-9]{5}$/);
    expect(repo.replaceItems).toHaveBeenCalledWith("s-new", expect.arrayContaining([expect.objectContaining({ name: "Item 10", trackingNumber: "LP0091234" })]));
    expect(repo.replaceItems.mock.calls[0]![1]).toHaveLength(10);
    expect(repo.addEvent).toHaveBeenCalledWith("s-new", null, "RECEIVED", "We received your order.");
  });

  it("gives each item its own carrier, parcel number and arrival date", async () => {
    await ShipmentService.create(form({ items: [formItem({ carrier: "Yanwen", trackingNumber: "YT123456", estimatedArrival: "2026-10-15", imageUrl: "https://res.cloudinary.com/x.jpg" })] }));
    expect(repo.replaceItems.mock.calls[0]![1][0]).toMatchObject({ carrier: "Yanwen", trackingNumber: "YT123456", imageUrl: "https://res.cloudinary.com/x.jpg", estimatedArrival: Temporal.Instant.from("2026-10-15T00:00:00Z") });
  });

  it("needs at least one item and at most 30, and says which item is wrong", async () => {
    await expect(ShipmentService.create(form({ items: [] }))).rejects.toThrow(/at least one item/);
    await expect(ShipmentService.create(form({ items: Array.from({ length: 31 }, () => formItem()) }))).rejects.toThrow(/At most 30/);
    await expect(ShipmentService.create(form({ items: [formItem(), formItem({ quantity: "0" })] }))).rejects.toThrow(/^Item 2: quantity/);
    await expect(ShipmentService.create(form({ items: [formItem({ name: "x" })] }))).rejects.toThrow(/^Item 1: enter what was ordered/);
  });

  it("only accepts http(s) links, so no javascript: link can reach a page", async () => {
    await expect(ShipmentService.create(form({ items: [formItem({ url: "javascript:alert(1)" })] }))).rejects.toThrow(/https:\/\//);
    await expect(ShipmentService.create(form({ items: [formItem({ imageUrl: "data:image/svg+xml,<svg onload=alert(1)>" })] }))).rejects.toThrow(/https:\/\//);
  });

  it("validates the customer and rejects fields that are not text (a hand-made request)", async () => {
    await expect(ShipmentService.create(form({ customerName: "x" }))).rejects.toThrow(/customer's name/);
    await expect(ShipmentService.create(form({ customerPhone: "abc" }))).rejects.toThrow(/phone/);
    await expect(ShipmentService.create(form({ items: [formItem({ estimatedArrival: "soon" })] }))).rejects.toThrow(/date/);
    await expect(ShipmentService.create(form({ customerName: { $ne: "" } as unknown as string }))).rejects.toThrow(/invalid/);
  });

  it("won't let an edit touch an item from another shipment", async () => {
    await expect(ShipmentService.update("s-1", form({ items: [formItem({ id: "item-of-someone-else" })] }))).rejects.toThrow(/changed elsewhere/);
    expect(repo.replaceItems).not.toHaveBeenCalled();
  });
});

describe("updating items", () => {
  it("updates only the chosen items, one history line each, then recomputes the order and emails the followers", async () => {
    await ShipmentService.addUpdate("s-1", ["a", "c"], "DELIVERED", "Left with the neighbour");

    expect(repo.setItemStatus.mock.calls).toEqual([["a", "DELIVERED"], ["c", "DELIVERED"]]);
    expect(repo.addEvent.mock.calls).toEqual([["s-1", "a", "DELIVERED", "Left with the neighbour"], ["s-1", "c", "DELIVERED", "Left with the neighbour"]]);
    expect(repo.setStatus).toHaveBeenCalledWith("s-1", "SHIPPED"); // the fake still has a SHIPPED item: the order follows it
    expect(notifications.sendUpdate).toHaveBeenCalledWith(expect.anything(), { itemNames: ["Item a", "Item c"], status: "DELIVERED", note: "Left with the neighbour" });
  });

  it("choosing every item writes one line for the whole order", async () => {
    await ShipmentService.addUpdate("s-1", ["a", "b", "c"], "IN_TUNISIA", "");

    expect(repo.addEvent.mock.calls).toEqual([["s-1", null, "IN_TUNISIA", ""]]);
    expect(notifications.sendUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ itemNames: [null] }));
  });

  it("refuses no items, unknown items, a bad status and a long note", async () => {
    await expect(ShipmentService.addUpdate("s-1", [], "SHIPPED", "")).rejects.toThrow(/at least one item/);
    await expect(ShipmentService.addUpdate("s-1", ["zzz"], "SHIPPED", "")).rejects.toThrow(/no longer exists/);
    await expect(ShipmentService.addUpdate("s-1", ["a"], "TELEPORTED", "")).rejects.toThrow(/valid status/);
    await expect(ShipmentService.addUpdate("s-1", ["a"], "SHIPPED", "x".repeat(241))).rejects.toThrow(/240/);
    expect(repo.setItemStatus).not.toHaveBeenCalled();
    expect(notifications.sendUpdate).not.toHaveBeenCalled();
  });

  it("undoing an item's update puts that item back to its previous stage", async () => {
    repo.findEvent.mockResolvedValue({ id: "e-3", shipmentId: "s-1", itemId: "b" } as never);
    await ShipmentService.removeEvent("s-1", "e-3");

    expect(repo.deleteEvent).toHaveBeenCalledWith("e-3");
    expect(repo.setItemStatus.mock.calls).toEqual([["b", "SHIPPED"]]);
  });

  it("won't remove the first entry, or an entry from another shipment", async () => {
    repo.findEvent.mockResolvedValue({ id: "e-1", shipmentId: "s-1", itemId: null } as never);
    await expect(ShipmentService.removeEvent("s-1", "e-1")).rejects.toThrow(/first entry/);

    repo.findEvent.mockResolvedValue({ id: "e-9", shipmentId: "s-2", itemId: null } as never);
    await expect(ShipmentService.removeEvent("s-1", "e-9")).rejects.toThrow(/no longer exists/);
    expect(repo.deleteEvent).not.toHaveBeenCalled();
  });
});

describe("public tracking page", () => {
  it("shows every item with its own stage, parcel number and photo", async () => {
    const view = await ShipmentService.getPublic("ds-7k4q9-x2m3f", "en");

    expect(view!.items.map((i) => [i.name, i.status, i.trackingNumber])).toEqual([["Item a", "SHIPPED", "LPa0001"], ["Item b", "IN_TUNISIA", "LPb0001"], ["Item c", "SHIPPED", "LPc0001"]]);
    expect(view!.events.map((e) => e.itemName)).toEqual(["Item b", null, null]);
  });

  it("masks the customer's name, phone and address on the server", async () => {
    const view = await ShipmentService.getPublic("DS-7K4Q9-X2M3F", "en");
    expect(view!.contact).toEqual({ name: "M***i B***n O***e", phone: "** *** 456", address: "*** R***e d* l* K***h", city: "Tunis" });
  });

  it("never includes internal notes, the AliExpress links or the contact channel", async () => {
    const text = JSON.stringify(await ShipmentService.getPublic("DS-7K4Q9-X2M3F", "en"));
    for (const secret of ["profit", "aliexpress.com", "secret-", "Instagram", "Mehdi", "22 123 456", "Kasbah"]) expect(text).not.toContain(secret);
  });

  it("returns nothing for an unknown or malformed code", async () => {
    repo.findByCode.mockResolvedValue(null);
    await expect(ShipmentService.getPublic("DS-AAAAA-BBBBB", "en")).resolves.toBeNull();
    await ShipmentService.getPublic("' OR 1=1 --", "en");
    expect(repo.findByCode).toHaveBeenLastCalledWith("");
  });
});

describe("the admin's view", () => {
  it("shows who gets email updates, masked, and only confirmed addresses", async () => {
    repo.listSubscribers.mockResolvedValue([
      { email: "mehdi@gmail.com", verifiedAt: at },
      { email: "not-confirmed@gmail.com", verifiedAt: null },
    ] as never);
    await expect(ShipmentService.getForAdmin("s-1")).resolves.toMatchObject({ subscribers: ["m***@gmail.com"] });
  });
});
