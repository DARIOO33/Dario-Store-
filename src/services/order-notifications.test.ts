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

const text = (body: string) => ({ body, hasImage: false, sensitive: false });

beforeEach(() => {
  send.mockClear();
  vi.stubEnv("BETTER_AUTH_URL", "https://shop.example/");
  users.findAdmins.mockResolvedValue([{ email: "owner@shop.tn" }] as never);
  users.findStaff.mockResolvedValue([{ email: "yasmine@shop.tn" }, { email: "Owner@Shop.tn" }] as never);
});
afterEach(() => vi.unstubAllEnvs());

describe("who gets the team emails", () => {
  it("admins and staff, each address once", async () => {
    await OrderNotifications.customerMessages(order, [text("Hello?")]);
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
    await OrderNotifications.customerMessages(order, [text("Hello?")]);
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

  it("unread customer messages: shows what the customer wrote and links to the order", async () => {
    await OrderNotifications.customerMessages(order, [text("Is my key ready?\nI paid an hour ago"), { body: "", hasImage: true, sensitive: false }]);
    const [email] = teamEmails();

    expect(email!.subject).toBe("Order #42: 2 unread messages");
    expect(email!.text).toContain("> Is my key ready?\n> I paid an hour ago");
    expect(email!.html).toContain("Is my key ready?<br>I paid an hour ago");
    expect(email!.text).toContain("[Photo: open the chat to see it]");
    expect(email!.text).toContain("https://shop.example/admin/orders/order-1");
  });

  it("[fixed] login details are never emailed, to the team or to the customer", async () => {
    const secret = { body: "login: sami / pass: hunter2", hasImage: false, sensitive: true };
    await OrderNotifications.customerMessages(order, [secret]);
    await OrderNotifications.storeMessage(order, secret);

    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(send.mock.calls)).not.toContain("hunter2");
    expect(send.mock.calls[1]![0].text).toContain("not shown in this email");
  });

  it("[fixed] a message can't inject HTML into the email", async () => {
    await OrderNotifications.storeMessage(order, text('<img src=x onerror="alert(1)">'));
    expect(send.mock.calls[0]![0].html).not.toContain("<img");
  });

  it("store message: the customer gets the text and a link to their order, in their language", async () => {
    await OrderNotifications.storeMessage({ ...(order as object), locale: "fr" } as never, text("Votre clé est prête."));

    expect(send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: "zz-sami@example.tn", subject: "Nouveau message concernant votre commande n°42" }));
    expect(send.mock.calls[0]![0].text).toContain("Votre clé est prête.");
    expect(send.mock.calls[0]![0].text).toContain("https://shop.example/order/order-1");
  });

  it("payment sent and problem reported go to the same team list", async () => {
    await OrderNotifications.paymentSent(order);
    await OrderNotifications.problemReported(order, "It doesn't work");
    expect(teamEmails().map((email) => email.to)).toEqual(["owner@shop.tn, yasmine@shop.tn", "owner@shop.tn, yasmine@shop.tn"]);
  });
});
