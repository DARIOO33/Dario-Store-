import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/email", () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }));
vi.mock("../prisma/users", () => ({ UserRepository: { findAdmins: vi.fn(), findStaff: vi.fn() } }));
vi.mock("../prisma/messages", () => ({ MessageRepository: { create: vi.fn() } }));
vi.mock("../prisma/orders", () => ({ OrderRepository: { setDeliveryEmailSent: vi.fn() } }));
vi.mock("./availability", () => ({ AvailabilityService: { current: vi.fn(async () => ({ responseMinutes: 15, awayUntilMs: null })) } }));

import { sendEmail } from "../lib/email";
import { UserRepository } from "../prisma/users";
import { OrderNotifications } from "./order-notifications";

const send = vi.mocked(sendEmail);
const users = vi.mocked(UserRepository);

const order = {
  id: "order-1",
  orderNumber: 42,
  userId: "user-1",
  guestToken: null,
  customerName: "Sami Ben Ali",
  customerEmail: "zz-sami@example.tn",
  customerPhone: null,
  locale: "en",
  paymentMethod: "D17",
  cryptoNetwork: null,
  totalMillimes: 20_000,
  subtotalMillimes: 20_000,
  shippingMillimes: 0,
  requiresShipping: false,
  items: [{ productName: "Netflix 1 month", variantName: null, quantity: 1, unitPriceMillimes: 20_000, productType: "VIRTUAL" }],
} as never;

// The email(s) sent to the team (not the customer's own confirmation).
const teamEmails = () => send.mock.calls.map(([email]) => email).filter((email) => email.to !== "zz-sami@example.tn");

beforeEach(() => {
  send.mockClear();
  users.findAdmins.mockResolvedValue([{ email: "owner@shop.tn" }] as never);
  users.findStaff.mockResolvedValue([{ email: "yasmine@shop.tn" }, { email: "Owner@Shop.tn" }] as never);
});
afterEach(() => vi.unstubAllEnvs());

describe("who gets the team emails", () => {
  it("admins and staff, each address once", async () => {
    await OrderNotifications.customerMessage(order, false);
    expect(teamEmails()).toEqual([expect.objectContaining({ to: "owner@shop.tn, yasmine@shop.tn" })]);
  });

  it("ADMIN_NOTIFY_EMAIL replaces the admin accounts, and staff still get it", async () => {
    vi.stubEnv("ADMIN_NOTIFY_EMAIL", "orders@shop.tn, boss@shop.tn");
    await OrderNotifications.paymentSent(order);

    expect(teamEmails()[0]!.to).toBe("orders@shop.tn, boss@shop.tn, yasmine@shop.tn, owner@shop.tn");
    expect(users.findAdmins).not.toHaveBeenCalled();
  });

  it("sends nothing when there is nobody to tell", async () => {
    users.findAdmins.mockResolvedValue([]);
    users.findStaff.mockResolvedValue([]);
    await OrderNotifications.customerMessage(order, false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("the team emails", () => {
  it("new order: the customer gets their confirmation and the team (with staff) gets the alert", async () => {
    OrderNotifications.placed(order);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "zz-sami@example.tn" }));
    expect(teamEmails()).toEqual([expect.objectContaining({ to: "owner@shop.tn, yasmine@shop.tn", subject: expect.stringContaining("New order #42") })]);
  });

  it("new customer message: links to the order, mentions a photo, never includes the message text", async () => {
    await OrderNotifications.customerMessage(order, true);
    const [email] = teamEmails();

    expect(email!.subject).toBe("Order #42: new message");
    expect(email!.text).toContain("Sami Ben Ali wrote in the order chat and sent a photo");
    expect(email!.text).toContain("/admin/orders/order-1");
  });

  it("payment sent and problem reported go to the same team list", async () => {
    await OrderNotifications.paymentSent(order);
    await OrderNotifications.problemReported(order, "It doesn't work");
    expect(teamEmails().map((email) => email.to)).toEqual(["owner@shop.tn, yasmine@shop.tn", "owner@shop.tn, yasmine@shop.tn"]);
  });
});
