// Business rules for AliExpress shipments. A shipment is one customer's order; it has one or more items,
// each with its own parcel number, arrival date and stage. Called from server actions and server
// components; the database is only reached through the repositories in src/prisma.
import { randomBytes } from "node:crypto";
import { ShipmentRepository, type ShipmentItemWriteInput, type ShipmentWriteInput } from "../prisma/shipments";
import { UserError } from "../lib/result";
import { formatDate, formatDateTime } from "../lib/time";
import type { Locale } from "../i18n/config";
import { maskAddress, maskEmail, maskName, maskPhone } from "../lib/mask";
import { CONTACT_CHANNELS, SHIPMENT_STATUSES, SHIPMENT_STEPS, normalizeTrackingCode, type ShipmentStatus } from "../lib/shipments";
import { runAfterResponse } from "../lib/background";
import { uploadShopPhoto } from "./uploads";
import { ShipmentNotifications } from "./shipment-notifications";
import { OrderService } from "./orders";
import { OrderRepository } from "../prisma/orders";
import { ProductRepository } from "../prisma/products";
import { MessageRepository } from "../prisma/messages";
import { siteUrl } from "../lib/store";
import { createTranslator } from "../i18n/translate";
import { toLocale } from "../i18n/config";

// What the admin form sends: everything as text, exactly as typed.
export type ShipmentItemFormInput = {
  id?: string;
  name: string;
  quantity: string;
  url: string;
  imageUrl: string;
  carrier: string;
  trackingNumber: string;
  // "YYYY-MM-DD" or empty.
  estimatedArrival: string;
};

export type ShipmentFormInput = {
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  contactChannel: string;
  adminNotes: string;
  items: ShipmentItemFormInput[];
};

const MAX_ITEMS = 30;

// No 0/O/1/I/L/U, so a code read out over the phone isn't misheard.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

// DS-7K4Q9-X2M3F: 10 random characters (about 49 bits), so links can't be guessed.
async function newTrackingCode() {
  for (;;) {
    const bytes = randomBytes(10);
    const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
    const code = `DS-${chars.slice(0, 5)}-${chars.slice(5)}`;
    if (!(await ShipmentRepository.codeExists(code))) return code;
  }
}

// Server actions receive whatever the browser sends, so every field is checked to be text.
function textOf(source: unknown, field: string) {
  const value = (source as Record<string, unknown> | null | undefined)?.[field];
  if (value !== undefined && value !== null && typeof value !== "string") throw new UserError("Some of the form data is invalid — reload the page and try again.");
  return (value ?? "").trim();
}

function optionalText(value: string, label: string, max: number) {
  if (value.length > max) throw new UserError(`${label} is too long (${max} characters at most).`);
  return value || null;
}

function optionalUrl(value: string, label: string, allowPath = false) {
  if (!value) return null;

  const valid = allowPath ? /^(https?:\/\/|\/)\S+$/.test(value) : /^https?:\/\/\S+$/.test(value);
  if (!valid || value.length > 500) throw new UserError(`${label} must be a full https:// link.`);
  return value;
}

function optionalDate(value: string, label: string) {
  if (!value) return null;
  try {
    return Temporal.PlainDate.from(value).toZonedDateTime("UTC").toInstant();
  } catch {
    throw new UserError(`${label}: the estimated arrival date isn't valid.`);
  }
}

function parseCustomer(input: ShipmentFormInput): ShipmentWriteInput {
  const customerName = textOf(input, "customerName");
  if (customerName.length < 2 || customerName.length > 80) throw new UserError("Enter the customer's name (2 to 80 characters).");

  const phone = textOf(input, "customerPhone");
  if (phone && !/^\+?[0-9 ]{8,15}$/.test(phone)) throw new UserError("Enter a valid phone number (digits and spaces only).");

  const channel = textOf(input, "contactChannel");
  if (channel && !CONTACT_CHANNELS.includes(channel)) throw new UserError("Choose where the customer contacted you.");

  const adminNotes = textOf(input, "adminNotes");
  if (adminNotes.length > 1000) throw new UserError("Internal notes are too long (1000 characters at most).");

  return {
    customerName,
    customerPhone: phone || null,
    customerAddress: optionalText(textOf(input, "customerAddress"), "The address", 160),
    customerCity: optionalText(textOf(input, "customerCity"), "The city", 60),
    contactChannel: channel || null,
    adminNotes,
  };
}

function parseItem(raw: unknown, index: number): ShipmentItemWriteInput {
  const label = `Item ${index + 1}`;
  const name = textOf(raw, "name");
  if (name.length < 2 || name.length > 140) throw new UserError(`${label}: enter what was ordered (2 to 140 characters).`);

  const quantity = Number(textOf(raw, "quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new UserError(`${label}: quantity must be between 1 and 99.`);

  const trackingNumber = textOf(raw, "trackingNumber");
  if (trackingNumber && !/^[\w .-]{4,60}$/.test(trackingNumber)) throw new UserError(`${label}: the parcel tracking number looks wrong (4 to 60 letters and digits).`);

  const id = textOf(raw, "id");
  return {
    ...(id && { id }),
    name,
    quantity,
    url: optionalUrl(textOf(raw, "url"), `${label}: the AliExpress link`),
    imageUrl: optionalUrl(textOf(raw, "imageUrl"), `${label}: the photo`, true),
    carrier: optionalText(textOf(raw, "carrier"), `${label}: the carrier name`, 40),
    trackingNumber: trackingNumber || null,
    estimatedArrival: optionalDate(textOf(raw, "estimatedArrival"), label),
  };
}

function parseItems(input: ShipmentFormInput) {
  const list = Array.isArray(input?.items) ? input.items : [];
  if (list.length === 0) throw new UserError("Add at least one item.");
  if (list.length > MAX_ITEMS) throw new UserError(`At most ${MAX_ITEMS} items per shipment.`);
  return list.map(parseItem);
}

function cleanNote(note: string) {
  const text = note.trim();
  if (text.length > 240) throw new UserError("Keep the note under 240 characters.");
  return text;
}

// The whole order is as far as its slowest item: "Delivered" only once every item is delivered.
// Cancelled items don't hold the others back; if every item is cancelled, so is the order.
export function overallStatus(items: { status: ShipmentStatus }[]): ShipmentStatus {
  const active = items.filter((item) => item.status !== "CANCELLED");
  if (active.length === 0) return items.length > 0 ? "CANCELLED" : "RECEIVED";

  const stage = (status: ShipmentStatus) => SHIPMENT_STEPS.findIndex((step) => step.status === status);
  return active.reduce((slowest, item) => (stage(item.status) < stage(slowest.status) ? item : slowest)).status;
}

type ShipmentRow = NonNullable<Awaited<ReturnType<typeof ShipmentRepository.findById>>>;

// A shipment made from an AliExpress pick order moves that order along: Shipped once its items are on
// the way, Delivered once every item is. (Moves only forward; pending or cancelled orders are left alone.)
const ON_THE_WAY: ShipmentStatus[] = ["SHIPPED", "IN_TRANSIT", "IN_TUNISIA", "OUT_FOR_DELIVERY"];

async function syncOrder(orderId: string | null, overall: ShipmentStatus) {
  if (!orderId) return;
  const target = overall === "DELIVERED" ? "DELIVERED" : ON_THE_WAY.includes(overall) ? "SHIPPED" : null;
  const order = target ? await OrderRepository.findById(orderId) : null;
  if (!order || !target || order.status === target || order.status === "PENDING" || order.status === "CANCELLED") return;
  if (target === "SHIPPED" && order.status === "DELIVERED") return;
  await OrderService.setStatus(order.id, target);
}

async function refreshOverall(shipment: ShipmentRow) {
  const fresh = await ShipmentRepository.findById(shipment.id);
  if (!fresh) return null;
  const overall = overallStatus(fresh.items);
  await ShipmentRepository.setStatus(fresh.id, overall);
  await syncOrder(fresh.orderId, overall);
  return fresh;
}

// Every history line, with the item it is about (null = the whole order).
function itemNameOf(shipment: ShipmentRow, itemId: string | null) {
  return itemId ? (shipment.items.find((item) => item.id === itemId)?.name ?? null) : null;
}

export const ShipmentService = {
  create: async (input: ShipmentFormInput) => {
    const customer = parseCustomer(input);
    const items = parseItems(input);

    const shipment = await ShipmentRepository.create({ ...customer, trackingCode: await newTrackingCode() });
    await ShipmentRepository.replaceItems(shipment.id, items);
    await ShipmentRepository.addEvent(shipment.id, null, "RECEIVED", "We received your order.");

    return { id: shipment.id, trackingCode: shipment.trackingCode };
  },

  update: async (id: string, input: ShipmentFormInput) => {
    const customer = parseCustomer(input);
    const items = parseItems(input);

    const shipment = await ShipmentRepository.findById(id);
    if (!shipment) throw new UserError("That shipment no longer exists.");
    if (items.some((item) => item.id && !shipment.items.some((known) => known.id === item.id))) {
      throw new UserError("An item was changed elsewhere — reload the page and try again.");
    }

    await ShipmentRepository.update(id, customer);
    await ShipmentRepository.replaceItems(id, items);
    await refreshOverall(shipment);
  },

  // Moves the chosen items to a stage (or, with the same stage, just adds a note such as "held at
  // customs"). Choosing every item writes one history line for the whole order; otherwise one per item.
  // People who turned on email updates are told.
  addUpdate: async (id: string, itemIds: string[], status: string, note: string) => {
    if (!SHIPMENT_STATUSES.includes(status as ShipmentStatus)) throw new UserError("Choose a valid status.");
    const text = cleanNote(note);

    const shipment = await ShipmentRepository.findById(id);
    if (!shipment) throw new UserError("That shipment no longer exists.");

    const chosen = [...new Set(Array.isArray(itemIds) ? itemIds : [])];
    if (chosen.length === 0) throw new UserError("Choose at least one item.");
    if (chosen.some((itemId) => !shipment.items.some((item) => item.id === itemId))) throw new UserError("An item no longer exists — reload the page.");

    const next = status as ShipmentStatus;
    const wholeOrder = chosen.length === shipment.items.length;
    for (const itemId of chosen) await ShipmentRepository.setItemStatus(itemId, next);

    if (wholeOrder) await ShipmentRepository.addEvent(id, null, next, text);
    else for (const itemId of chosen) await ShipmentRepository.addEvent(id, itemId, next, text);

    const fresh = await refreshOverall(shipment);
    if (fresh) {
      const changed = wholeOrder ? [null] : chosen.map((itemId) => itemNameOf(fresh, itemId));
      runAfterResponse(() => ShipmentNotifications.sendUpdate(fresh, { itemNames: changed, status: next, note: text }));
    }
  },

  // Undo a mistaken update. The very first entry can't be removed. Each item goes back to the stage
  // of its latest remaining entry (its own, or one for the whole order).
  removeEvent: async (shipmentId: string, eventId: string) => {
    const shipment = await ShipmentRepository.findById(shipmentId);
    const event = await ShipmentRepository.findEvent(eventId);

    if (!shipment || !event || event.shipmentId !== shipmentId) throw new UserError("That update no longer exists.");
    if (event.id === shipment.events[shipment.events.length - 1]!.id) throw new UserError("The first entry can't be removed.");

    await ShipmentRepository.deleteEvent(eventId);
    const remaining = shipment.events.filter((e) => e.id !== eventId);
    for (const item of shipment.items) {
      if (event.itemId && event.itemId !== item.id) continue;
      const latest = remaining.find((e) => e.itemId === null || e.itemId === item.id);
      await ShipmentRepository.setItemStatus(item.id, latest?.status ?? "RECEIVED");
    }
    await refreshOverall(shipment);
  },

  remove: async (id: string) => {
    await ShipmentRepository.delete(id);
  },

  // AliExpress picks: once paid, the team turns the order into a shipment in one click (customer and items
  // copied from the order, product photos included) and the customer gets the tracking link in the order chat.
  createFromOrder: async (orderId: string) => {
    const order = await OrderRepository.findById(orderId);
    if (!order) throw new UserError("That order no longer exists.");
    if (!order.aliexpressPick) throw new UserError("Only AliExpress pick orders get a tracking page from here.");
    if (order.status === "PENDING" || order.status === "CANCELLED") throw new UserError("Mark the order as paid before creating its tracking.");

    const existing = await ShipmentRepository.findByOrderId(orderId);
    if (existing) return { id: existing.id, trackingCode: existing.trackingCode };

    const products = await ProductRepository.findByIds(order.items.flatMap((item) => (item.productId ? [item.productId] : [])));
    const photo = (productId: string | null) => products.find((p) => p.id === productId)?.images[0]?.url ?? null;

    const shipment = await ShipmentRepository.create({
      trackingCode: await newTrackingCode(),
      orderId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.shippingAddress,
      customerCity: order.shippingCity,
      contactChannel: null,
      adminNotes: `AliExpress pick — order #${order.orderNumber}`,
    });
    await ShipmentRepository.replaceItems(
      shipment.id,
      order.items.map((item) => ({
        name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
        quantity: item.quantity,
        url: null,
        imageUrl: photo(item.productId),
        carrier: null,
        trackingNumber: null,
        estimatedArrival: null,
      })),
    );
    await ShipmentRepository.addEvent(shipment.id, null, "RECEIVED", "We received your order.");

    if (order.userId) {
      const t = createTranslator(toLocale(order.locale));
      await MessageRepository.create({ orderId, fromAdmin: true, body: t("chatSystem.trackingReady", { url: `${siteUrl()}/track/${shipment.trackingCode}` }), hasImage: false });
    }
    return { id: shipment.id, trackingCode: shipment.trackingCode };
  },

  // For the order pages: the tracking made from this order, if any.
  forOrder: async (orderId: string) => {
    const shipment = await ShipmentRepository.findByOrderId(orderId);
    return shipment ? { id: shipment.id, trackingCode: shipment.trackingCode } : null;
  },

  uploadImage: async (bytes: Uint8Array) => await uploadShopPhoto(bytes, "dario-store/shipments"),

  listForAdmin: async (filter: { q?: string; status?: ShipmentStatus }, page: number, pageSize: number) => {
    const [rows, total] = await Promise.all([ShipmentRepository.findMany(filter, pageSize, (page - 1) * pageSize), ShipmentRepository.count(filter)]);
    return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  getForAdmin: async (id: string) => {
    const shipment = await ShipmentRepository.findById(id);
    if (!shipment) return null;

    // The team sees who gets email updates, but only masked: the address itself isn't needed here.
    const subscribers = (await ShipmentRepository.listSubscribers(id)).filter((s) => s.verifiedAt).map((s) => maskEmail(s.email));
    return { ...shipment, subscribers };
  },

  // What the public tracking page may show. Built here, on the server, with the contact details
  // already masked: the real name, phone and address never reach a visitor's browser. Internal notes,
  // the AliExpress links and the contact channel are not included either.
  getPublic: async (code: string, locale: Locale) => {
    const shipment = await ShipmentRepository.findByCode(normalizeTrackingCode(code));
    if (!shipment) return null;

    return {
      reference: shipment.reference,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      ordered: formatDate(shipment.createdAt, locale),
      items: shipment.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        status: item.status,
        carrier: item.carrier,
        trackingNumber: item.trackingNumber,
        estimatedArrival: item.estimatedArrival ? formatDate(item.estimatedArrival, locale) : null,
      })),
      contact: {
        name: maskName(shipment.customerName),
        phone: shipment.customerPhone ? maskPhone(shipment.customerPhone) : null,
        address: shipment.customerAddress ? maskAddress(shipment.customerAddress) : null,
        city: shipment.customerCity,
      },
      events: shipment.events.map((event) => ({
        id: event.id,
        status: event.status,
        note: event.note,
        itemName: shipment.items.length > 1 ? itemNameOf(shipment, event.itemId) : null,
        date: formatDateTime(event.createdAt, locale),
      })),
    };
  },
};
