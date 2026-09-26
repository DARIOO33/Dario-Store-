import { beforeEach, describe, expect, it, vi } from "vitest";

// OrderService is tested against an in-memory stand-in for the database. The fake transaction
// behaves like the real compare-and-swap updates: `where({ id, stock })` / `where({ id, status })`
// only change a row whose current value still matches.
const state = vi.hoisted(() => ({
  productStock: new Map<string, number | null>(),
  variantStock: new Map<string, number | null>(),
  orderStatus: new Map<string, string>(),
  paymentStatus: new Map<string, string>(),
  createdOrders: [] as Record<string, unknown>[],
  createdItems: [] as Record<string, unknown>[],
}));

vi.mock("../prisma/db", () => {
  const casTable = (stock: Map<string, number | null>) => ({
    first: async ({ id }: { id: string }) => (stock.has(id) ? { id, stock: stock.get(id) } : null),
    where: (cond: { id: string; stock: number }) => ({
      update: async (data: { stock: number }) => {
        if (stock.get(cond.id) !== cond.stock) return null;
        stock.set(cond.id, data.stock);
        return { id: cond.id, ...data };
      },
    }),
  });
  const tx = {
    orm: {
      public: {
        Product: casTable(state.productStock),
        ProductVariant: casTable(state.variantStock),
        Order: {
          create: async (data: Record<string, unknown>) => {
            state.createdOrders.push(data);
            return { id: "order-new", ...data };
          },
          where: (cond: { id: string; status: string }) => ({
            update: async (data: { status: string }) => {
              if (state.orderStatus.get(cond.id) !== cond.status) return null;
              state.orderStatus.set(cond.id, data.status);
              return { id: cond.id, ...data };
            },
          }),
        },
        OrderItem: {
          create: async (data: Record<string, unknown>) => {
            state.createdItems.push(data);
            return data;
          },
        },
      },
    },
  };
  return { db: { transaction: async (work: (t: typeof tx) => unknown) => await work(tx) } };
});
vi.mock("../prisma/products", () => ({ ProductRepository: { findByIds: vi.fn() } }));
vi.mock("../prisma/orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../prisma/orders")>()),
  OrderRepository: { findById: vi.fn(), countByEmailSince: vi.fn(), setPaymentStatus: vi.fn(), changePaymentStatus: vi.fn(), listForUser: vi.fn() },
}));
vi.mock("../prisma/messages", () => ({ MessageRepository: { countCustomerImages: vi.fn(), create: vi.fn() } }));
vi.mock("./order-notifications", () => ({
  OrderNotifications: { placed: vi.fn(), paid: vi.fn(), paymentSent: vi.fn(), deliverByEmail: vi.fn(), buildDelivery: vi.fn() },
}));
vi.mock("../lib/email", () => ({ emailConfigured: vi.fn(() => true) }));
// The real payment details are the owner's; the tests use their own list of methods.
vi.mock("../lib/payments", () => ({
  AVAILABLE_ONLINE_METHODS: ["D17", "CRYPTO"],
  AVAILABLE_CRYPTO_NETWORKS: [{ id: "TRC20" }],
}));

import { ProductRepository } from "../prisma/products";
import { OrderRepository } from "../prisma/orders";
import { MessageRepository } from "../prisma/messages";
import { OrderNotifications } from "./order-notifications";
import { OrderService, type CheckoutInput } from "./orders";

const products = vi.mocked(ProductRepository);
const orders = vi.mocked(OrderRepository);
const messages = vi.mocked(MessageRepository);
const notifications = vi.mocked(OrderNotifications);

const customer = { id: "user-1", role: "MEMBER" };
const stranger = { id: "user-2", role: "MEMBER" };
const admin = { id: "admin-1", role: "ADMIN" };
const staff = { id: "staff-1", role: "STAFF" };

type ProductRow = Awaited<ReturnType<typeof ProductRepository.findByIds>>[number];
function product(changes: Record<string, unknown> = {}) {
  return { id: "iem", name: "KZ Castor", nameFr: null, type: "PHYSICAL", active: true, priceMillimes: 50_000, stock: 10, variants: [], ...changes } as unknown as ProductRow;
}
const netflix = product({ id: "netflix", name: "Netflix 1 month", type: "VIRTUAL", priceMillimes: 20_000, stock: null });

function checkout(changes: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    items: [{ productId: "iem", quantity: 1 }],
    name: "Sami Ben Ali",
    email: "zz-sami@example.tn",
    phone: "22 123 456",
    address: "12 Rue de Marseille",
    city: "Tunis",
    postalCode: "1000",
    notes: "",
    paymentMethod: "",
    cryptoNetwork: "",
    userId: null,
    locale: "en",
    ...changes,
  };
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof OrderRepository.findById>>>;
function order(changes: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: customer.id,
    guestToken: null,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "D17",
    requiresShipping: true,
    locale: "en",
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    items: [{ productId: "iem", variantId: null, quantity: 2 }],
    ...changes,
  } as unknown as OrderRow;
}

beforeEach(() => {
  vi.resetAllMocks();
  state.productStock.clear();
  state.variantStock.clear();
  state.orderStatus.clear();
  state.paymentStatus.clear();
  state.createdOrders.length = 0;
  state.createdItems.length = 0;

  state.productStock.set("iem", 10);
  products.findByIds.mockResolvedValue([product(), netflix]);
  orders.countByEmailSince.mockResolvedValue(0);
  orders.findById.mockResolvedValue(null);
  // The payment compare-and-swap, like the database: only matches while the payment is still `from`.
  orders.changePaymentStatus.mockImplementation(async (id, from, to) => {
    if (!from.includes(state.paymentStatus.get(id) as never)) return null as never;
    state.paymentStatus.set(id, to);
    return { id } as never;
  });
});

describe("placing an order: prices and stock come from the database", () => {
  it("prices the order from the database and takes the stock", async () => {
    const result = await OrderService.place(checkout({ items: [{ productId: "iem", quantity: 2 }] }));

    expect(result.guestToken).toMatch(/^[0-9a-f]{32}$/);
    expect(state.createdOrders[0]).toMatchObject({ subtotalMillimes: 100_000, shippingMillimes: 7_000, totalMillimes: 107_000, paymentMethod: "CASH_ON_DELIVERY" });
    expect(state.productStock.get("iem")).toBe(8);
  });

  it("ignores any price the browser sends", async () => {
    const tampered = { productId: "iem", quantity: 1, priceMillimes: 1, unitPriceMillimes: 1 } as CheckoutInput["items"][number];
    await OrderService.place(checkout({ items: [tampered] }));

    expect(state.createdItems[0]).toMatchObject({ unitPriceMillimes: 50_000 });
  });

  it("gives free shipping from 150 DT of physical items", async () => {
    await OrderService.place(checkout({ items: [{ productId: "iem", quantity: 3 }] }));
    expect(state.createdOrders[0]).toMatchObject({ shippingMillimes: 0, totalMillimes: 150_000 });
  });

  it("refuses more than the stock, hidden products and unknown products", async () => {
    await expect(OrderService.place(checkout({ items: [{ productId: "iem", quantity: 11 }] }))).rejects.toMatchObject({ key: "errors.onlyLeft" });

    products.findByIds.mockResolvedValue([product({ active: false })]);
    await expect(OrderService.place(checkout())).rejects.toMatchObject({ key: "errors.itemUnavailable" });

    products.findByIds.mockResolvedValue([]);
    await expect(OrderService.place(checkout({ items: [{ productId: "nope", quantity: 1 }] }))).rejects.toMatchObject({ key: "errors.itemUnavailable" });
  });

  it("refuses a product with options unless an active option is chosen", async () => {
    const withVariants = product({ variants: [{ id: "v-bass", name: "Bass", active: true, priceMillimes: 60_000, stock: 5 }] });
    products.findByIds.mockResolvedValue([withVariants]);

    await expect(OrderService.place(checkout())).rejects.toMatchObject({ key: "errors.optionChanged" });
    await expect(OrderService.place(checkout({ items: [{ productId: "iem", variantId: "v-other", quantity: 1 }] }))).rejects.toMatchObject({ key: "errors.optionChanged" });
  });

  it("fails cleanly when someone else bought the last item meanwhile", async () => {
    state.productStock.set("iem", 0); // the database changed after the product was read
    await expect(OrderService.place(checkout())).rejects.toMatchObject({ key: "errors.justSoldOut" });
    expect(state.createdOrders).toHaveLength(0);
  });
});

describe("placing an order: abuse checks", () => {
  it("[fixed] does not let the same product be split into many lines to pass the per-line limit", async () => {
    state.productStock.set("iem", null);
    products.findByIds.mockResolvedValue([product({ stock: null })]);
    const tenLinesOf20 = Array.from({ length: 10 }, () => ({ productId: "iem", quantity: 20 }));

    await expect(OrderService.place(checkout({ items: tenLinesOf20 }))).rejects.toMatchObject({ key: "errors.quantity" });
    expect(state.createdOrders).toHaveLength(0);
  });

  it("still merges duplicate lines that stay under the limit", async () => {
    await OrderService.place(checkout({ items: [{ productId: "iem", quantity: 2 }, { productId: "iem", quantity: 3 }] }));
    expect(state.createdItems).toEqual([expect.objectContaining({ quantity: 5 })]);
  });

  it("[fixed] refuses a cart with an absurd number of lines", async () => {
    const lines = Array.from({ length: 51 }, (_, i) => ({ productId: `p-${i}`, quantity: 1 }));
    await expect(OrderService.place(checkout({ items: lines }))).rejects.toMatchObject({ key: "errors.cartInvalid" });
    expect(products.findByIds).not.toHaveBeenCalled();
  });

  it("refuses zero, negative and fractional quantities", async () => {
    for (const quantity of [0, -5, 1.5, Number.NaN]) {
      await expect(OrderService.place(checkout({ items: [{ productId: "iem", quantity }] }))).rejects.toMatchObject({ key: "errors.quantity" });
    }
  });

  it("[fixed] refuses pages of text in the checkout fields (they go into admin and customer emails)", async () => {
    const cases: Partial<CheckoutInput>[] = [
      { name: "x".repeat(81) },
      { address: "x".repeat(161) },
      { city: "x".repeat(61) },
      { postalCode: "x".repeat(13) },
      { notes: "x".repeat(501) },
      { email: `${"x".repeat(250)}@example.tn` },
    ];
    for (const changes of cases) {
      await expect(OrderService.place(checkout(changes))).rejects.toMatchObject({ key: "errors.detailTooLong" });
    }
    expect(state.createdOrders).toHaveLength(0);
  });

  it("names the too-long field in the customer's language", async () => {
    await expect(OrderService.place(checkout({ name: "x".repeat(81), locale: "fr" }))).rejects.toMatchObject({ params: { field: "Nom complet", max: 80 } });
  });

  it("limits one email to 5 orders an hour", async () => {
    orders.countByEmailSince.mockResolvedValue(5);
    await expect(OrderService.place(checkout())).rejects.toMatchObject({ key: "errors.tooManyOrders" });
  });

  it("checks the contact details", async () => {
    await expect(OrderService.place(checkout({ name: " a " }))).rejects.toMatchObject({ key: "errors.name" });
    await expect(OrderService.place(checkout({ email: "not-an-email" }))).rejects.toMatchObject({ key: "errors.email" });
    await expect(OrderService.place(checkout({ email: "a@b.tn\r\nBcc: x@y.tn" }))).rejects.toMatchObject({ key: "errors.email" });
    await expect(OrderService.place(checkout({ phone: "call me" }))).rejects.toMatchObject({ key: "errors.phone" });
    await expect(OrderService.place(checkout({ address: " " }))).rejects.toMatchObject({ key: "errors.addressRequired" });
  });
});

describe("placing an order: digital products and payment", () => {
  const digital = { items: [{ productId: "netflix", quantity: 1 }] };

  it("needs an account for digital products", async () => {
    await expect(OrderService.place(checkout({ ...digital, paymentMethod: "D17" }))).rejects.toMatchObject({ key: "errors.loginForDigital" });
  });

  it("only accepts the payment methods the shop offers (never cash on delivery for digital)", async () => {
    for (const paymentMethod of ["CASH_ON_DELIVERY", "BANK_TRANSFER", "FREE", ""]) {
      await expect(OrderService.place(checkout({ ...digital, userId: customer.id, paymentMethod }))).rejects.toMatchObject({ key: "errors.choosePayment" });
    }
    await expect(OrderService.place(checkout({ ...digital, userId: customer.id, paymentMethod: "CRYPTO", cryptoNetwork: "FAKE" }))).rejects.toMatchObject({ key: "errors.chooseNetwork" });
  });

  it("places a digital order for a signed-in customer, with no shipping and no guest link", async () => {
    const result = await OrderService.place(checkout({ ...digital, userId: customer.id, paymentMethod: "D17" }));

    expect(result.guestToken).toBeNull();
    expect(state.createdOrders[0]).toMatchObject({ requiresShipping: false, shippingMillimes: 0, paymentMethod: "D17", shippingAddress: null });
  });
});

describe("who can see an order", () => {
  beforeEach(() => orders.findById.mockResolvedValue(order({ userId: null, guestToken: "a".repeat(32) })));

  it("shows a guest order only with its secret link", async () => {
    await expect(OrderService.getForViewer("order-1", null, "a".repeat(32))).resolves.not.toBeNull();
    await expect(OrderService.getForViewer("order-1", null, "b".repeat(32))).resolves.toBeNull();
    await expect(OrderService.getForViewer("order-1", null, "a")).resolves.toBeNull();
    await expect(OrderService.getForViewer("order-1", null, null)).resolves.toBeNull();
    await expect(OrderService.getForViewer("order-1", stranger, null)).resolves.toBeNull();
  });

  it("shows an account order to its owner and the team (admin, staff) only", async () => {
    orders.findById.mockResolvedValue(order());
    await expect(OrderService.getForViewer("order-1", customer, null)).resolves.not.toBeNull();
    await expect(OrderService.getForViewer("order-1", admin, null)).resolves.not.toBeNull();
    await expect(OrderService.getForViewer("order-1", staff, null)).resolves.not.toBeNull();
    await expect(OrderService.getForViewer("order-1", stranger, null)).resolves.toBeNull();
    await expect(OrderService.getForViewer("order-1", null, null)).resolves.toBeNull();
  });
});

describe("changing an order's status", () => {
  beforeEach(() => {
    orders.findById.mockResolvedValue(order());
    state.orderStatus.set("order-1", "PENDING");
  });

  it("puts the stock back when an order is cancelled", async () => {
    await OrderService.setStatus("order-1", "CANCELLED");

    expect(state.orderStatus.get("order-1")).toBe("CANCELLED");
    expect(state.productStock.get("iem")).toBe(12);
  });

  it("a double-clicked cancel puts the stock back only once (the stock compare-and-swap already ensured this)", async () => {
    const results = await Promise.allSettled([OrderService.cancelIfPending("order-1", customer, null), OrderService.cancelIfPending("order-1", customer, null)]);

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(state.productStock.get("iem")).toBe(12);
  });

  it("[fixed] a customer's cancel can't undo a payment the admin just confirmed", async () => {
    state.orderStatus.set("order-1", "PAID"); // the admin confirmed it after the page was loaded

    await expect(OrderService.cancelIfPending("order-1", customer, null)).rejects.toMatchObject({ key: "errors.orderChanged" });
    expect(state.orderStatus.get("order-1")).toBe("PAID");
    expect(state.productStock.get("iem")).toBe(10);
  });

  it("keeps a cancelled order cancelled", async () => {
    orders.findById.mockResolvedValue(order({ status: "CANCELLED" }));
    await expect(OrderService.setStatus("order-1", "PAID")).rejects.toThrow(/cancelled order/);
  });

  it("never marks an order with nothing to ship as Shipped", async () => {
    orders.findById.mockResolvedValue(order({ requiresShipping: false }));
    await expect(OrderService.setStatus("order-1", "SHIPPED")).rejects.toThrow(/nothing to ship/);
  });

  it("sends the 'payment confirmed' message only the first time", async () => {
    await OrderService.setStatus("order-1", "PAID");
    expect(notifications.paid).toHaveBeenCalledOnce();

    orders.findById.mockResolvedValue(order({ status: "PAID" }));
    await OrderService.setStatus("order-1", "PAID");
    await OrderService.setStatus("order-1", "DELIVERED");
    expect(notifications.paid).toHaveBeenCalledOnce();
  });
});

describe("customer cancelling", () => {
  it("only lets the owner (or the guest link) cancel, and only while pending", async () => {
    orders.findById.mockResolvedValue(order());
    await expect(OrderService.cancelIfPending("order-1", stranger, null)).rejects.toMatchObject({ key: "errors.orderNotFound" });
    await expect(OrderService.cancelIfPending("order-1", null, null)).rejects.toMatchObject({ key: "errors.orderNotFound" });

    orders.findById.mockResolvedValue(order({ status: "PAID" }));
    await expect(OrderService.cancelIfPending("order-1", customer, null)).rejects.toMatchObject({ key: "errors.cannotCancel" });
  });
});

describe("the customer's 'Payment sent'", () => {
  beforeEach(() => {
    orders.findById.mockResolvedValue(order());
    messages.countCustomerImages.mockResolvedValue(1);
    state.paymentStatus.set("order-1", "PENDING");
  });

  it("marks the payment submitted and tells the store", async () => {
    await OrderService.markPaymentSent("order-1", customer, "en");

    expect(state.paymentStatus.get("order-1")).toBe("SUBMITTED");
    expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({ orderId: "order-1", fromAdmin: false }));
    expect(notifications.paymentSent).toHaveBeenCalled();
  });

  it("is refused for other people, without a proof, on cash orders and twice", async () => {
    await expect(OrderService.markPaymentSent("order-1", stranger, "en")).rejects.toMatchObject({ key: "errors.orderNotFound" });
    await expect(OrderService.markPaymentSent("order-1", admin, "en")).rejects.toMatchObject({ key: "errors.orderNotFound" });

    messages.countCustomerImages.mockResolvedValue(0);
    await expect(OrderService.markPaymentSent("order-1", customer, "en")).rejects.toMatchObject({ key: "errors.proofFirst" });

    orders.findById.mockResolvedValue(order({ paymentMethod: "CASH_ON_DELIVERY" }));
    await expect(OrderService.markPaymentSent("order-1", customer, "en")).rejects.toMatchObject({ key: "errors.paidOnDelivery" });

    orders.findById.mockResolvedValue(order({ paymentStatus: "SUBMITTED" }));
    await expect(OrderService.markPaymentSent("order-1", customer, "en")).rejects.toMatchObject({ key: "errors.alreadyPaid" });

    orders.findById.mockResolvedValue(order({ status: "PAID", paymentStatus: "VERIFIED" }));
    await expect(OrderService.markPaymentSent("order-1", customer, "en")).rejects.toMatchObject({ key: "errors.notWaitingPayment" });
    expect(state.paymentStatus.get("order-1")).toBe("PENDING");
  });

  it("[fixed] two 'Payment sent' clicks at the same moment tell the store only once", async () => {
    const results = await Promise.allSettled([OrderService.markPaymentSent("order-1", customer, "en"), OrderService.markPaymentSent("order-1", customer, "en")]);

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(messages.create).toHaveBeenCalledOnce();
    expect(notifications.paymentSent).toHaveBeenCalledOnce();
  });
});

describe("admin payment tools", () => {
  it("asks for a new proof only when one is waiting, and only once", async () => {
    orders.findById.mockResolvedValue(order({ paymentStatus: "SUBMITTED" }));
    state.paymentStatus.set("order-1", "SUBMITTED");
    await Promise.allSettled([OrderService.requestNewProof("order-1"), OrderService.requestNewProof("order-1")]);
    expect(state.paymentStatus.get("order-1")).toBe("FAILED");
    expect(messages.create).toHaveBeenCalledOnce();

    orders.findById.mockResolvedValue(order({ paymentStatus: "PENDING" }));
    await expect(OrderService.requestNewProof("order-1")).rejects.toThrow(/no payment waiting/);
  });

  it("marks refunded only a cancelled order whose money was received", async () => {
    orders.findById.mockResolvedValue(order({ status: "PAID", paymentStatus: "VERIFIED" }));
    await expect(OrderService.markRefunded("order-1")).rejects.toThrow(/Cancel the order/);

    orders.findById.mockResolvedValue(order({ status: "CANCELLED", paymentStatus: "PENDING" }));
    await expect(OrderService.markRefunded("order-1")).rejects.toThrow(/was received/);

    orders.findById.mockResolvedValue(order({ status: "CANCELLED", paymentStatus: "VERIFIED" }));
    await OrderService.markRefunded("order-1");
    expect(orders.setPaymentStatus).toHaveBeenCalledWith("order-1", "REFUNDED");
  });

  it("never sends the delivery email for an unpaid order", async () => {
    orders.findById.mockResolvedValue(order());
    await expect(OrderService.deliverByEmail("order-1", { message: "login: x", markDelivered: false })).rejects.toThrow(/Mark the order as paid/);
    expect(notifications.deliverByEmail).not.toHaveBeenCalled();
  });
});
