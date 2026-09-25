// Business rules for placing and managing orders. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "../prisma/db";
import { ProductRepository } from "../prisma/products";
import { OrderRepository, ORDER_STATUSES, type OrderStatus, type PaymentStatus } from "../prisma/orders";
import { MessageRepository } from "../prisma/messages";
import { OrderNotifications } from "./order-notifications";
import { emailConfigured } from "../lib/email";
import { UserError, userError } from "../lib/result";
import { now } from "../lib/time";
import { cartKey } from "../lib/cart-key";
import { MAX_QUANTITY_PER_LINE, shippingFee } from "../lib/store";
import { AVAILABLE_CRYPTO_NETWORKS, AVAILABLE_ONLINE_METHODS, type PaymentMethod } from "../lib/payments";
import { localized } from "../i18n/content";
import { createTranslator } from "../i18n/translate";
import { toLocale, type Locale } from "../i18n/config";

// Everything the checkout form sends. Prices are deliberately absent: the
// server looks them up.
export type CheckoutInput = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  paymentMethod: string;
  cryptoNetwork: string;
  userId: string | null;
  // The language the customer is browsing in: names in errors, and the emails we send.
  locale: Locale;
};

type Viewer = { id: string; role: string } | null;
type ProductRow = Awaited<ReturnType<typeof ProductRepository.findByIds>>[number];
type VariantRow = ProductRow["variants"][number];

// One thing being bought: a product, or one variant of a product.
type OrderLine = {
  product: ProductRow;
  variant: VariantRow | null;
  quantity: number;
  label: string;
  unitPrice: number;
};

const MAX_ORDERS_PER_HOUR = 5;

// Virtual-only orders are never "shipped".
export function allowedStatuses(requiresShipping: boolean): OrderStatus[] {
  return requiresShipping
    ? ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]
    : ["PENDING", "PAID", "DELIVERED", "CANCELLED"];
}

function sameToken(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Stock lives on the variant when there is one, otherwise on the product.
// `null` means unlimited.
function stockOf(line: Pick<OrderLine, "product" | "variant">) {
  return line.variant ? line.variant.stock : line.product.stock;
}

function validateContact(input: CheckoutInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (name.length < 2) throw userError("errors.name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw userError("errors.email");
  if (phone && !/^\+?[0-9 ]{8,15}$/.test(phone)) throw userError("errors.phone");

  return { name, email, phone };
}

// Merges duplicate lines and sanity-checks the quantities.
function mergeItems(items: CheckoutInput["items"]) {
  const wanted = new Map<string, { productId: string; variantId: string | null; quantity: number }>();

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY_PER_LINE) {
      throw userError("errors.quantity", { max: MAX_QUANTITY_PER_LINE });
    }

    const variantId = item.variantId ?? null;
    const key = cartKey(item.productId, variantId);
    const line = wanted.get(key) ?? { productId: item.productId, variantId, quantity: 0 };
    line.quantity += item.quantity;
    wanted.set(key, line);
  }

  if (wanted.size === 0) throw userError("errors.cartEmpty");
  return [...wanted.values()];
}

// Looks every requested line up in the database and checks it can be bought.
async function resolveLines(wanted: ReturnType<typeof mergeItems>, locale: Locale) {
  const products = await ProductRepository.findByIds([...new Set(wanted.map((line) => line.productId))]);
  const lines: OrderLine[] = [];

  for (const { productId, variantId, quantity } of wanted) {
    const product = products.find((p) => p.id === productId);

    if (!product || !product.active) {
      throw userError("errors.itemUnavailable");
    }

    // A product with variants is bought as one of its variants — which then
    // carries the price and the stock.
    let variant: VariantRow | null = null;
    if (product.variants.some((v) => v.active)) {
      variant = product.variants.find((v) => v.id === variantId && v.active) ?? null;
      if (!variant) throw userError("errors.optionChanged", { name: localized(locale, product.name, product.nameFr) });
    } else if (variantId) {
      throw userError("errors.itemUnavailable");
    }

    const name = localized(locale, product.name, product.nameFr);
    const label = variant ? `${name} (${variant.name})` : name;
    const stock = stockOf({ product, variant });
    if (stock !== null && stock < quantity) {
      throw stock === 0 ? userError("errors.soldOut", { name: label }) : userError("errors.onlyLeft", { count: stock, name: label });
    }

    lines.push({ product, variant, quantity, label, unitPrice: variant ? variant.priceMillimes : product.priceMillimes });
  }

  return lines;
}

// Digital orders are paid online and discussed with the store in a private
// chat, so they need an account. Physical-only orders can stay guest and are
// paid in cash on delivery.
function resolvePayment(hasVirtual: boolean, input: CheckoutInput) {
  let paymentMethod: PaymentMethod = "CASH_ON_DELIVERY";
  let cryptoNetwork: string | null = null;

  if (hasVirtual) {
    if (!input.userId) throw userError("errors.loginForDigital");

    const chosen = AVAILABLE_ONLINE_METHODS.find((method) => method === input.paymentMethod);
    if (!chosen) throw userError("errors.choosePayment");
    paymentMethod = chosen;

    if (chosen === "CRYPTO") {
      const network = AVAILABLE_CRYPTO_NETWORKS.find((n) => n.id === input.cryptoNetwork);
      if (!network) throw userError("errors.chooseNetwork");
      cryptoNetwork = network.id;
    }
  }

  return { paymentMethod, cryptoNetwork };
}

// Remembers when the order first reached each stage (the customer sees these dates in the chat).
// Skipping a stage (Pending -> Delivered) stamps the earlier ones too.
function stageDates(order: { paidAt: Temporal.Instant | null; shippedAt: Temporal.Instant | null; deliveredAt: Temporal.Instant | null }, status: OrderStatus) {
  const at = now();
  const reached = { PAID: 1, SHIPPED: 2, DELIVERED: 3 }[status as string] ?? 0;
  return {
    ...(reached >= 1 && !order.paidAt && { paidAt: at }),
    ...(status === "SHIPPED" && !order.shippedAt && { shippedAt: at }),
    ...(reached >= 3 && !order.deliveredAt && { deliveredAt: at }),
  };
}

// Moving an order to Paid / Shipped / Delivered means the store has its money: the payment is VERIFIED.
// (Cash on delivery too, once delivered.) Cancelling doesn't touch it: a refund is its own step.
function paymentFor(order: { paymentStatus: PaymentStatus }, status: OrderStatus) {
  const settled = status === "PAID" || status === "SHIPPED" || status === "DELIVERED";
  return settled && order.paymentStatus !== "VERIFIED" ? { paymentStatus: "VERIFIED" as const } : {};
}

const sum = (lines: OrderLine[]) => lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Takes stock with a compare-and-swap: the update only matches if the stock
// is still what we just read, so two shoppers can't both buy the last item.
async function takeStock(tx: Tx, lines: OrderLine[]) {
  for (const line of lines) {
    const { product, variant, quantity, label } = line;
    const stock = stockOf(line);
    if (stock === null) continue;

    const taken = variant
      ? await tx.orm.public.ProductVariant.where({ id: variant.id, stock }).update({ stock: stock - quantity })
      : await tx.orm.public.Product.where({ id: product.id, stock }).update({ stock: stock - quantity, updatedAt: now() });
    if (!taken) throw userError("errors.justSoldOut", { name: label });
  }
}

// The reverse of takeStock, used when an order is cancelled. Products or
// variants that were deleted since, and unlimited stock, are skipped.
async function restock(tx: Tx, items: NonNullable<Awaited<ReturnType<typeof OrderRepository.findById>>>["items"]) {
  for (const item of items) {
    if (item.variantId) {
      const variant = await tx.orm.public.ProductVariant.first({ id: item.variantId });
      if (!variant || variant.stock === null) continue;

      const restocked = await tx.orm.public.ProductVariant.where({ id: variant.id, stock: variant.stock }).update({
        stock: variant.stock + item.quantity,
      });
      if (!restocked) throw userError("errors.stockChanged");
      continue;
    }

    if (!item.productId) continue;

    const product = await tx.orm.public.Product.first({ id: item.productId });
    if (!product || product.stock === null) continue;

    const restocked = await tx.orm.public.Product.where({ id: product.id, stock: product.stock }).update({
      stock: product.stock + item.quantity,
      updatedAt: now(),
    });
    if (!restocked) throw userError("errors.stockChanged");
  }
}

export const OrderService = {
  // Prices, stock and the shipping rule are all decided here from the
  // database — the browser only says which products and how many.
  place: async (input: CheckoutInput) => {
    const { name, email, phone } = validateContact(input);
    // Stops a script (or an impatient double-click spree) from filling the shop with orders that hold stock.
    if ((await OrderRepository.countByEmailSince(email, now().subtract({ hours: 1 }))) >= MAX_ORDERS_PER_HOUR) {
      throw userError("errors.tooManyOrders");
    }
    const lines = await resolveLines(mergeItems(input.items), input.locale);
    const hasVirtual = lines.some((line) => line.product.type === "VIRTUAL");
    const requiresShipping = lines.some((line) => line.product.type === "PHYSICAL");
    const { paymentMethod, cryptoNetwork } = resolvePayment(hasVirtual, input);

    const address = input.address.trim();
    const city = input.city.trim();

    if (requiresShipping) {
      if (!address || !city) throw userError("errors.addressRequired");
      if (!phone) throw userError("errors.phoneRequired");
    }

    const subtotalMillimes = sum(lines);
    const shippingMillimes = requiresShipping ? shippingFee(sum(lines.filter((line) => line.product.type === "PHYSICAL"))) : 0;
    const guestToken = input.userId ? null : randomBytes(16).toString("hex");

    const order = await db.transaction(async (tx) => {
      await takeStock(tx, lines);

      const created = await tx.orm.public.Order.create({
        userId: input.userId,
        guestToken,
        requiresShipping,
        paymentMethod,
        cryptoNetwork,
        subtotalMillimes,
        shippingMillimes,
        totalMillimes: subtotalMillimes + shippingMillimes,
        customerName: name,
        customerEmail: email,
        customerPhone: phone || null,
        shippingAddress: requiresShipping ? address : null,
        shippingCity: requiresShipping ? city : null,
        shippingPostalCode: requiresShipping ? input.postalCode.trim() || null : null,
        notes: input.notes.trim() || null,
        locale: input.locale,
      });

      // Each item keeps its own copy of the name and price, so later edits
      // to the product never rewrite history.
      for (const { product, variant, quantity, unitPrice } of lines) {
        await tx.orm.public.OrderItem.create({
          orderId: created.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          variantName: variant?.name ?? null,
          productType: product.type,
          unitPriceMillimes: unitPrice,
          quantity,
        });
      }

      return created;
    });

    const saved = await OrderRepository.findById(order.id);
    if (saved) OrderNotifications.placed(saved);

    return { orderId: order.id, guestToken };
  },

  // Owners see their own orders, admins see everything, and a guest needs the
  // secret token from the link they were given at checkout.
  getForViewer: async (id: string, viewer: Viewer, token: string | null) => {
    const order = await OrderRepository.findById(id);
    if (!order) return null;

    const isAdmin = viewer?.role === "ADMIN";
    const isOwner = !!viewer && order.userId === viewer.id;
    const hasToken = !!order.guestToken && !!token && sameToken(order.guestToken, token);

    return isAdmin || isOwner || hasToken ? order : null;
  },

  listForUser: async (userId: string) => {
    return await OrderRepository.listForUser(userId);
  },

  countByStatus: async () => {
    const counts = await Promise.all(ORDER_STATUSES.map((status) => OrderRepository.count(status)));
    return Object.fromEntries(ORDER_STATUSES.map((status, i) => [status, counts[i]!])) as Record<OrderStatus, number>;
  },

  listForAdmin: async (status: OrderStatus | undefined, page: number, pageSize: number) => {
    const [rows, total] = await Promise.all([
      OrderRepository.findMany(status, pageSize, (page - 1) * pageSize),
      OrderRepository.count(status),
    ]);

    return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  // Cancelled is final, and cancelling puts the stock back.
  setStatus: async (id: string, status: OrderStatus) => {
    const order = await OrderRepository.findById(id);

    if (!order) throw new UserError("That order no longer exists.");
    if (order.status === status) return;
    if (order.status === "CANCELLED") throw new UserError("A cancelled order can't be changed.");
    if (!allowedStatuses(order.requiresShipping).includes(status)) {
      throw new UserError("That status doesn't apply to an order with nothing to ship.");
    }

    await db.transaction(async (tx) => {
      if (status === "CANCELLED") await restock(tx, order.items);

      await tx.orm.public.Order.where({ id }).update({ status, updatedAt: now(), ...stageDates(order, status), ...paymentFor(order, status) });
    });

    // Only the first time the payment is confirmed.
    if (status === "PAID" && order.status === "PENDING") await OrderNotifications.paid(order);
  },

  // Admin: email the customer what they bought (an account, a key, ...). Safer than
  // pasting it in the chat. Optionally marks the order Delivered afterwards.
  deliverByEmail: async (id: string, input: { message: string; markDelivered: boolean }) => {
    const order = await OrderRepository.findById(id);
    const message = input.message.trim();

    if (!order) throw new UserError("That order no longer exists.");
    if (order.status === "PENDING" || order.status === "CANCELLED") throw new UserError("Mark the order as paid before sending the delivery email.");
    if (!message) throw new UserError("Write what the customer should receive (account, key, instructions…).");
    if (message.length > 4000) throw new UserError("The message is too long (4000 characters max).");
    if (!emailConfigured()) throw new UserError("Email isn't set up yet: add the SMTP settings and MAIL_FROM to the .env file, then restart the server.");

    const result = await OrderNotifications.deliverByEmail(order, message);
    if (!result.sent) throw new UserError("The email could not be sent. Check the SMTP settings and the server log, then try again.");

    if (input.markDelivered && order.status !== "DELIVERED") await OrderService.setStatus(id, "DELIVERED");
  },

  // Admin: how the delivery email will look (works before SMTP is set up).
  previewDeliveryEmail: async (id: string, message: string) => {
    const order = await OrderRepository.findById(id);
    if (!order) throw new UserError("That order no longer exists.");

    return OrderNotifications.buildDelivery(order, message.trim() || "…").html;
  },

  // The customer says "I've paid". They must have uploaded a proof photo first,
  // and the store gets a chat message it will see as unread.
  markPaymentSent: async (id: string, viewer: Viewer, locale: Locale) => {
    const order = await OrderRepository.findById(id);

    if (!viewer || !order || order.userId !== viewer.id) throw userError("errors.orderNotFound");
    if (order.paymentMethod === "CASH_ON_DELIVERY") throw userError("errors.paidOnDelivery");
    if (order.status !== "PENDING") throw userError("errors.notWaitingPayment");
    if (order.paymentStatus === "SUBMITTED") throw userError("errors.alreadyPaid");
    if (order.paymentStatus !== "PENDING" && order.paymentStatus !== "FAILED") throw userError("errors.notWaitingPayment");

    if ((await MessageRepository.countCustomerImages(id)) === 0) {
      throw userError("errors.proofFirst");
    }

    await OrderRepository.setPaymentStatus(id, "SUBMITTED", now());
    await MessageRepository.create({ orderId: id, fromAdmin: false, senderUserId: viewer.id, body: createTranslator(locale)("chatSystem.paymentSent"), hasImage: false });
    void OrderNotifications.paymentSent(order);
  },

  // The proof wasn't good enough: the payment is marked FAILED and the customer can send a new one.
  requestNewProof: async (id: string) => {
    const order = await OrderRepository.findById(id);

    if (!order) throw new UserError("That order no longer exists.");
    if (order.status !== "PENDING" || order.paymentStatus !== "SUBMITTED") throw new UserError("There's no payment waiting to be checked.");

    await OrderRepository.setPaymentStatus(id, "FAILED");
    await MessageRepository.create({
      orderId: id,
      fromAdmin: true,
      // Written in the language the customer ordered in, since they are the one reading it.
      body: createTranslator(toLocale(order.locale))("chatSystem.newProofRequested"),
      hasImage: false,
    });
  },

  // Admin: a cancelled order whose money was received and sent back.
  markRefunded: async (id: string) => {
    const order = await OrderRepository.findById(id);

    if (!order) throw new UserError("That order no longer exists.");
    if (order.status !== "CANCELLED") throw new UserError("Cancel the order before marking it refunded.");
    if (order.paymentStatus !== "VERIFIED") throw new UserError("Only a payment that was received can be refunded.");

    await OrderRepository.setPaymentStatus(id, "REFUNDED");
  },

  awaitingVerification: async () => {
    return await OrderRepository.findAwaitingVerification();
  },

  // Customers may only cancel while nothing has happened to the order yet.
  cancelIfPending: async (id: string, viewer: Viewer, token: string | null) => {
    const order = await OrderService.getForViewer(id, viewer, token);

    if (!order) throw userError("errors.orderNotFound");
    if (order.status !== "PENDING") throw userError("errors.cannotCancel");

    await OrderService.setStatus(id, "CANCELLED");
  },
};
