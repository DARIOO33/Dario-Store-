import { beforeEach, describe, expect, it, vi } from "vitest";

// The chat service is tested without a database: the repositories and photo storage are replaced by fakes.
vi.mock("../prisma/messages", () => ({
  MessageRepository: {
    listForOrder: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findImage: vi.fn(),
    wipe: vi.fn(),
    findSensitiveBefore: vi.fn(),
    countCustomerImages: vi.fn(),
    countSince: vi.fn(),
    markRead: vi.fn(),
    findUnread: vi.fn(),
  },
}));
vi.mock("../prisma/orders", () => ({
  OrderRepository: { findById: vi.fn(), listForUser: vi.fn() },
}));
vi.mock("./chat-images", () => ({
  ChatImages: { save: vi.fn(), load: vi.fn(), remove: vi.fn() },
}));

import { MessageRepository } from "../prisma/messages";
import { OrderRepository } from "../prisma/orders";
import { ChatImages } from "./chat-images";
import { MessageService } from "./messages";

const messages = vi.mocked(MessageRepository);
const orders = vi.mocked(OrderRepository);
const images = vi.mocked(ChatImages);

const customer = { id: "user-1", role: "CUSTOMER", name: "Sami" };
const stranger = { id: "user-2", role: "CUSTOMER", name: "Other" };
const admin = { id: "admin-1", role: "ADMIN", name: "Dario" };

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const at = Temporal.Instant.from("2026-09-20T10:00:00Z");

type FakeOrder = Awaited<ReturnType<typeof OrderRepository.findById>>;
function order(changes: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: customer.id,
    status: "PENDING",
    paymentMethod: "D17",
    paymentStatus: "UNPAID",
    paymentSentAt: null,
    updatedAt: at,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    ...changes,
  } as unknown as FakeOrder;
}

type FakeMessage = Awaited<ReturnType<typeof MessageRepository.create>>;
function message(changes: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    orderId: "order-1",
    fromAdmin: false,
    senderUserId: customer.id,
    body: "hello",
    hasImage: false,
    sensitive: false,
    wipedAt: null,
    readAt: null,
    createdAt: at,
    ...changes,
  } as unknown as FakeMessage;
}

beforeEach(() => {
  vi.resetAllMocks();
  orders.findById.mockResolvedValue(order());
  messages.listForOrder.mockResolvedValue([]);
  messages.findSensitiveBefore.mockResolvedValue([]);
  messages.countCustomerImages.mockResolvedValue(0);
  messages.countSince.mockResolvedValue(0);
  messages.create.mockImplementation(async (data) => message({ ...data }));
});

describe("who can use a chat", () => {
  it("lets the order's owner open it", async () => {
    await expect(MessageService.open("order-1", customer, false)).resolves.toBeDefined();
  });

  it("lets an admin open it as the store", async () => {
    await expect(MessageService.open("order-1", admin, true)).resolves.toBeDefined();
  });

  it("refuses guests, other customers and customers pretending to be the store", async () => {
    await expect(MessageService.open("order-1", null, false)).rejects.toMatchObject({ key: "errors.openDenied" });
    await expect(MessageService.open("order-1", stranger, false)).rejects.toMatchObject({ key: "errors.openDenied" });
    await expect(MessageService.open("order-1", customer, true)).rejects.toMatchObject({ key: "errors.openDenied" });
  });

  it("refuses an order that doesn't exist", async () => {
    orders.findById.mockResolvedValue(null);
    await expect(MessageService.send("nope", customer, false, "hi")).rejects.toMatchObject({ key: "errors.writeDenied" });
  });
});

describe("opening a chat", () => {
  it("marks the other side's messages as read", async () => {
    await MessageService.open("order-1", customer, false);
    expect(messages.markRead).toHaveBeenCalledWith("order-1", false, expect.any(Temporal.Instant));
  });

  it("shows the staff member's name to admins only", async () => {
    messages.listForOrder.mockResolvedValue([{ ...message({ fromAdmin: true }), sender: { name: "Dario" } }] as never);

    const forAdmin = await MessageService.open("order-1", admin, true);
    const forCustomer = await MessageService.open("order-1", customer, false);

    expect(forAdmin.messages[0].senderName).toBe("Dario");
    expect(forCustomer.messages[0].senderName).toBeNull();
  });

  it("lets the customer mark an online payment as sent while the order is pending", async () => {
    messages.countCustomerImages.mockResolvedValue(1);

    const { payment } = await MessageService.open("order-1", customer, false);

    expect(payment).toMatchObject({ online: true, canMarkSent: true, hasProof: true, sentAt: null, stage: null });
  });

  it("has no payment button for cash on delivery", async () => {
    orders.findById.mockResolvedValue(order({ paymentMethod: "CASH_ON_DELIVERY" }));

    const { payment } = await MessageService.open("order-1", customer, false);

    expect(payment.online).toBe(false);
    expect(payment.canMarkSent).toBe(false);
  });

  it("lets the admin ask for a new proof once the customer said they paid", async () => {
    const sentAt = Temporal.Instant.from("2026-09-21T08:00:00Z");
    orders.findById.mockResolvedValue(order({ paymentStatus: "SUBMITTED", paymentSentAt: sentAt }));

    const forAdmin = await MessageService.open("order-1", admin, true);
    const forCustomer = await MessageService.open("order-1", customer, false);

    expect(forAdmin.payment.canRequestNewProof).toBe(true);
    expect(forAdmin.payment.sentAt).toBe(sentAt.toString());
    expect(forCustomer.payment.canMarkSent).toBe(false);
    expect(forCustomer.payment.canRequestNewProof).toBe(false);
  });

  it("shows the stage once the order is paid", async () => {
    const paidAt = Temporal.Instant.from("2026-09-22T09:30:00Z");
    orders.findById.mockResolvedValue(order({ status: "PAID", paidAt }));

    const { payment } = await MessageService.open("order-1", customer, false);

    expect(payment.stage).toEqual({ status: "PAID", at: paidAt.toString() });
  });

  it("reports a cancelled order's chat as closed", async () => {
    orders.findById.mockResolvedValue(order({ status: "CANCELLED" }));
    const result = await MessageService.open("order-1", customer, false);
    expect(result.closed).toBe(true);
  });
});

describe("sending a message", () => {
  it("saves trimmed text with the sender", async () => {
    const { message: sent } = await MessageService.send("order-1", customer, false, "  hi there\r\n ");

    expect(messages.create).toHaveBeenCalledWith({ orderId: "order-1", fromAdmin: false, senderUserId: customer.id, body: "hi there", hasImage: false, sensitive: false });
    expect(sent.body).toBe("hi there");
  });

  it("refuses empty and too long messages", async () => {
    await expect(MessageService.send("order-1", customer, false, "   ")).rejects.toMatchObject({ key: "errors.emptyMessage" });
    await expect(MessageService.send("order-1", customer, false, "x".repeat(1001))).rejects.toMatchObject({ key: "errors.messageTooLong" });
    expect(messages.create).not.toHaveBeenCalled();
  });

  it("refuses messages on a cancelled order", async () => {
    orders.findById.mockResolvedValue(order({ status: "CANCELLED" }));
    await expect(MessageService.send("order-1", customer, false, "hi")).rejects.toMatchObject({ key: "errors.chatClosed" });
  });

  it("slows down someone sending too many messages", async () => {
    messages.countSince.mockResolvedValue(8);
    await expect(MessageService.send("order-1", customer, false, "hi")).rejects.toMatchObject({ key: "errors.tooFast" });
  });

  it("stores a photo with the type read from its bytes", async () => {
    await MessageService.send("order-1", customer, false, "", { bytes: PNG });

    expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({ hasImage: true }));
    expect(images.save).toHaveBeenCalledWith("msg-1", { bytes: PNG, mimeType: "image/png" });
  });

  it("refuses photos that are not JPG/PNG/WebP, empty or too large", async () => {
    const svg = new TextEncoder().encode("<svg></svg>");
    await expect(MessageService.send("order-1", customer, false, "", { bytes: svg })).rejects.toMatchObject({ key: "errors.photoFormat" });
    await expect(MessageService.send("order-1", customer, false, "", { bytes: new Uint8Array() })).rejects.toMatchObject({ key: "errors.emptyFile" });

    const huge = new Uint8Array(5 * 1024 * 1024 + 1);
    huge.set(PNG);
    await expect(MessageService.send("order-1", customer, false, "", { bytes: huge })).rejects.toMatchObject({ key: "errors.photoTooLarge" });
    expect(images.save).not.toHaveBeenCalled();
  });

  it("refuses photos on cash-on-delivery orders", async () => {
    orders.findById.mockResolvedValue(order({ paymentMethod: "CASH_ON_DELIVERY" }));
    await expect(MessageService.send("order-1", customer, false, "", { bytes: PNG })).rejects.toMatchObject({ key: "errors.photosOnlinePayment" });
  });
});

describe("wiping login details", () => {
  it("deletes the photo and blanks a sensitive message", async () => {
    const stored = { messageId: "msg-1", mimeType: "image/png", storageKey: "abc" };
    messages.findById.mockResolvedValue(message({ sensitive: true, hasImage: true }));
    messages.findImage.mockResolvedValue(stored as never);

    await MessageService.wipe("order-1", customer, false, "msg-1");

    expect(images.remove).toHaveBeenCalledWith(stored);
    expect(messages.wipe).toHaveBeenCalledWith("msg-1");
  });

  it("won't wipe ordinary messages or messages from another order", async () => {
    messages.findById.mockResolvedValue(message({ sensitive: false }));
    await expect(MessageService.wipe("order-1", customer, false, "msg-1")).rejects.toMatchObject({ key: "errors.orderNotFound" });

    messages.findById.mockResolvedValue(message({ sensitive: true, orderId: "order-2" }));
    await expect(MessageService.wipe("order-1", customer, false, "msg-1")).rejects.toMatchObject({ key: "errors.orderNotFound" });

    expect(messages.wipe).not.toHaveBeenCalled();
  });
});

describe("getting a chat photo", () => {
  beforeEach(() => {
    messages.findById.mockResolvedValue(message({ hasImage: true }));
    messages.findImage.mockResolvedValue({ messageId: "msg-1", mimeType: "image/png", dataBase64: "AAA" } as never);
    images.load.mockResolvedValue(Buffer.from(PNG));
  });

  it("gives the photo to the owner and to admins", async () => {
    await expect(MessageService.getImage("msg-1", customer)).resolves.toEqual({ mimeType: "image/png", bytes: Buffer.from(PNG) });
    await expect(MessageService.getImage("msg-1", admin)).resolves.not.toBeNull();
  });

  it("gives nothing to guests or other customers", async () => {
    await expect(MessageService.getImage("msg-1", null)).resolves.toBeNull();
    await expect(MessageService.getImage("msg-1", stranger)).resolves.toBeNull();
  });

  it("gives nothing when the photo can't be read", async () => {
    images.load.mockResolvedValue(null);
    await expect(MessageService.getImage("msg-1", customer)).resolves.toBeNull();
  });
});

describe("unread badges", () => {
  it("counts unread store messages per order for the customer", async () => {
    orders.listForUser.mockResolvedValue([{ id: "order-1" }, { id: "order-2" }] as never);
    messages.findUnread.mockResolvedValue([{ orderId: "order-1" }, { orderId: "order-1" }, { orderId: "order-2" }] as never);

    await expect(MessageService.unreadForCustomer(customer.id)).resolves.toEqual({ "order-1": 2, "order-2": 1 });
    expect(messages.findUnread).toHaveBeenCalledWith(true, ["order-1", "order-2"]);
  });
});
