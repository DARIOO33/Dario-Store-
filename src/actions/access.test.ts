import { beforeEach, describe, expect, it, vi } from "vitest";

// Calls the real server actions with the real requireRole/getCurrentUser (src/lib/session.ts).
// Only the session lookup, Next's request helpers and the services are replaced.
const session = vi.hoisted(() => ({ user: null as null | { id: string; name: string; role: string } }));

vi.mock("../lib/auth", () => ({ auth: { api: { getSession: async () => (session.user ? { user: session.user } : null) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Every service method is a spy that succeeds.
const spies = vi.hoisted(() => ({ calls: [] as string[] }));
const fakeService = vi.hoisted(() => (name: string) =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, method) => target[method] ?? (async () => { spies.calls.push(`${name}.${String(method)}`); return {}; }),
  }));
vi.mock("../services/availability", () => ({ AvailabilityService: fakeService("AvailabilityService") }));
vi.mock("../services/categories", () => ({ CategoryService: fakeService("CategoryService") }));
vi.mock("../services/products", () => ({ ProductService: fakeService("ProductService") }));
vi.mock("../services/reviews", () => ({ ReviewService: fakeService("ReviewService") }));
vi.mock("../services/shipments", () => ({ ShipmentService: fakeService("ShipmentService") }));
vi.mock("../services/orders", () => ({ OrderService: fakeService("OrderService") }));
vi.mock("../services/messages", () => ({ MessageService: fakeService("MessageService") }));
vi.mock("../services/catalog", () => ({ CatalogService: fakeService("CatalogService") }));

import * as availability from "./availability";
import * as categories from "./categories";
import * as products from "./products";
import * as reviews from "./reviews";
import * as shipments from "./shipments";
import * as orders from "./orders";
import * as messages from "./messages";

const guest = null;
const member = { id: "user-1", name: "Sami", role: "MEMBER" };
const staff = { id: "user-3", name: "Staff", role: "STAFF" };
const admin = { id: "admin-1", name: "Dario", role: "ADMIN" };

const form = () => {
  const data = new FormData();
  data.set("image", new File([new Uint8Array([1])], "a.png"));
  return data;
};

// Actions only the admin may use (products, categories, reviews, refunds, availability).
const ADMIN_ACTIONS: [string, () => Promise<unknown>][] = [
  ["setAvailableAction", () => availability.setAvailableAction(15)],
  ["setAwayAction", () => availability.setAwayAction("2030-01-01T07:00")],
  ["createCategoryAction", () => categories.createCategoryAction("Games")],
  ["renameCategoryAction", () => categories.renameCategoryAction("c-1", "Games")],
  ["deleteCategoryAction", () => categories.deleteCategoryAction("c-1")],
  ["updateCategorySettingsAction", () => categories.updateCategorySettingsAction("c-1", { blurb: "", nameFr: "", blurbFr: "", inNav: true, position: 1 })],
  ["uploadProductImageAction", () => products.uploadProductImageAction(form())],
  ["createProductAction", () => products.createProductAction({} as never)],
  ["updateProductAction", () => products.updateProductAction("p-1", {} as never)],
  ["setProductFeaturedAction", () => products.setProductFeaturedAction("p-1", true)],
  ["setProductActiveAction", () => products.setProductActiveAction("p-1", false)],
  ["deleteProductAction", () => products.deleteProductAction("p-1")],
  ["setReviewHiddenAction", () => reviews.setReviewHiddenAction("r-1", true)],
  ["replyToReviewAction", () => reviews.replyToReviewAction("r-1", "Thanks")],
  ["markRefundedAction", () => orders.markRefundedAction("o-1")],
];

// Actions for the whole team, admin and staff (orders, payment checks, delivery, shipments).
const TEAM_ACTIONS: [string, () => Promise<unknown>][] = [
  ["createShipmentAction", () => shipments.createShipmentAction({} as never)],
  ["updateShipmentAction", () => shipments.updateShipmentAction("s-1", {} as never)],
  ["addShipmentUpdateAction", () => shipments.addShipmentUpdateAction("s-1", "SHIPPED", "")],
  ["removeShipmentEventAction", () => shipments.removeShipmentEventAction("s-1", "e-1")],
  ["deleteShipmentAction", () => shipments.deleteShipmentAction("s-1")],
  ["sendDeliveryEmailAction", () => orders.sendDeliveryEmailAction("o-1", "key: 123", true)],
  ["previewDeliveryEmailAction", () => orders.previewDeliveryEmailAction("o-1", "key")],
  ["setOrderStatusAction", () => orders.setOrderStatusAction("o-1", "PAID")],
  ["requestNewProofAction", () => messages.requestNewProofAction("o-1")],
  ["setChatClosedAction", () => messages.setChatClosedAction("o-1", true)],
];

beforeEach(() => {
  spies.calls.length = 0;
  session.user = null;
});

describe("admin-only server actions", () => {
  it("covers every team action exported from src/actions", () => {
    expect(ADMIN_ACTIONS.length + TEAM_ACTIONS.length).toBe(25);
  });

  it.each(ADMIN_ACTIONS)("%s refuses guests, customers and staff without touching any service", async (_name, call) => {
    for (const user of [guest, member, staff]) {
      session.user = user;
      await expect(call()).rejects.toThrow(user ? "Forbidden" : "Unauthorized");
    }
    expect(spies.calls).toEqual([]);
  });

  it.each(ADMIN_ACTIONS)("%s works for an admin", async (_name, call) => {
    session.user = admin;
    await expect(call()).resolves.toMatchObject({ ok: true });
    expect(spies.calls).toHaveLength(1);
  });
});

describe("team server actions (admin and staff)", () => {
  it.each(TEAM_ACTIONS)("%s refuses guests and customers without touching any service", async (_name, call) => {
    for (const user of [guest, member]) {
      session.user = user;
      await expect(call()).rejects.toThrow(user ? "Forbidden" : "Unauthorized");
    }
    expect(spies.calls).toEqual([]);
  });

  it.each(TEAM_ACTIONS)("%s works for staff and for an admin", async (_name, call) => {
    for (const user of [staff, admin]) {
      session.user = user;
      await expect(call()).resolves.toMatchObject({ ok: true });
    }
    expect(spies.calls).toHaveLength(2);
  });

  it("refuses an order status that doesn't exist, even for the admin", async () => {
    session.user = admin;
    await expect(orders.setOrderStatusAction("o-1", "REFUNDED" as never)).resolves.toEqual({ ok: false, error: "Unknown status." });
    expect(spies.calls).toEqual([]);
  });
});

describe("customer actions pass who is calling to the service (which checks it)", () => {
  it("never lets the browser choose the user id of an order", async () => {
    session.user = member;
    const input = { items: [{ productId: "p-1", quantity: 1 }], userId: "admin-1" } as never;
    const spy = vi.fn();
    const { OrderService } = await import("../services/orders");
    (OrderService as unknown as { place: unknown }).place = spy;

    await orders.placeOrderAction(input);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
  });

  it("rejects a cart whose lines are not the expected shape", async () => {
    const bad = { items: [{ productId: { $gt: "" }, quantity: 1 }] } as never;
    await expect(orders.placeOrderAction(bad)).resolves.toMatchObject({ ok: false });
    await expect(orders.placeOrderAction({ items: [{ productId: "p-1", quantity: "5" }] } as never)).resolves.toMatchObject({ ok: false });
  });

  it("reports a problem as the signed-in customer (the service then checks it is their order)", async () => {
    session.user = member;
    const spy = vi.fn();
    const { MessageService } = await import("../services/messages");
    (MessageService as unknown as { reportProblem: unknown }).reportProblem = spy;

    await messages.reportProblemAction("o-1", "NOT_WORKING", "Account locked");
    expect(spy).toHaveBeenCalledWith("o-1", member, "NOT_WORKING", "Account locked");
  });

  it("rejects a chat attachment that is not a file", async () => {
    session.user = member;
    const data = new FormData();
    data.set("image", "not a file");
    await expect(messages.sendChatMessageAction("o-1", false, data)).resolves.toMatchObject({ ok: false });
    expect(spies.calls).toEqual([]);
  });
});
