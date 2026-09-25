// Business rules for AliExpress shipments. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.
import { randomBytes } from "node:crypto";
import { ShipmentRepository, type ShipmentWriteInput } from "../prisma/shipments";
import { UserError } from "../lib/result";
import { formatDate, formatDateTime } from "../lib/time";
import type { Locale } from "../i18n/config";
import { maskAddress, maskName, maskPhone } from "../lib/mask";
import { CONTACT_CHANNELS, SHIPMENT_STATUSES, normalizeTrackingCode, type ShipmentStatus } from "../lib/shipments";

// What the admin form sends: everything as text, exactly as typed.
export type ShipmentFormInput = {
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  contactChannel: string;
  itemName: string;
  itemUrl: string;
  itemImageUrl: string;
  quantity: string;
  carrier: string;
  carrierTrackingNumber: string;
  // "YYYY-MM-DD" or empty.
  estimatedArrival: string;
  adminNotes: string;
};

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

function optionalText(value: string, label: string, max: number) {
  const text = value.trim();
  if (text.length > max) throw new UserError(`${label} is too long (${max} characters at most).`);
  return text || null;
}

function optionalUrl(value: string, label: string, allowPath = false) {
  const text = value.trim();
  if (!text) return null;

  const valid = allowPath ? /^(https?:\/\/|\/)\S+$/.test(text) : /^https?:\/\/\S+$/.test(text);
  if (!valid || text.length > 500) throw new UserError(`${label} must be a full https:// link.`);
  return text;
}

function parseForm(input: ShipmentFormInput): ShipmentWriteInput {
  // Server actions receive whatever the browser sends, so read every field as text.
  const text = (field: keyof ShipmentFormInput) => {
    const value = (input as Partial<Record<keyof ShipmentFormInput, unknown>>)?.[field];
    if (value !== undefined && value !== null && typeof value !== "string") throw new UserError("Some of the form data is invalid — reload the page and try again.");
    return value ?? "";
  };

  const customerName = text("customerName").trim();
  if (customerName.length < 2 || customerName.length > 80) throw new UserError("Enter the customer's name (2 to 80 characters).");

  const itemName = text("itemName").trim();
  if (itemName.length < 2 || itemName.length > 140) throw new UserError("Enter what was ordered (2 to 140 characters).");

  const phone = text("customerPhone").trim();
  if (phone && !/^\+?[0-9 ]{8,15}$/.test(phone)) throw new UserError("Enter a valid phone number (digits and spaces only).");

  const quantity = Number(text("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new UserError("Quantity must be between 1 and 99.");

  const channel = text("contactChannel").trim();
  if (channel && !CONTACT_CHANNELS.includes(channel)) throw new UserError("Choose where the customer contacted you.");

  const trackingNumber = text("carrierTrackingNumber").trim();
  if (trackingNumber && !/^[\w .-]{4,60}$/.test(trackingNumber)) throw new UserError("The parcel tracking number looks wrong (4 to 60 letters and digits).");

  let estimatedArrival: Temporal.Instant | null = null;
  if (text("estimatedArrival").trim()) {
    try {
      estimatedArrival = Temporal.PlainDate.from(text("estimatedArrival").trim()).toZonedDateTime("UTC").toInstant();
    } catch {
      throw new UserError("The estimated arrival date isn't valid.");
    }
  }

  const adminNotes = text("adminNotes").trim();
  if (adminNotes.length > 1000) throw new UserError("Internal notes are too long (1000 characters at most).");

  return {
    customerName,
    customerPhone: phone || null,
    customerAddress: optionalText(text("customerAddress"), "The address", 160),
    customerCity: optionalText(text("customerCity"), "The city", 60),
    contactChannel: channel || null,
    itemName,
    itemUrl: optionalUrl(text("itemUrl"), "The item link"),
    itemImageUrl: optionalUrl(text("itemImageUrl"), "The image link", true),
    quantity,
    carrier: optionalText(text("carrier"), "The carrier name", 40),
    carrierTrackingNumber: trackingNumber || null,
    estimatedArrival,
    adminNotes,
  };
}

function cleanNote(note: string) {
  const text = note.trim();
  if (text.length > 240) throw new UserError("Keep the note under 240 characters.");
  return text;
}

export const ShipmentService = {
  create: async (input: ShipmentFormInput) => {
    const data = parseForm(input);
    const shipment = await ShipmentRepository.create({ ...data, trackingCode: await newTrackingCode() });
    await ShipmentRepository.addEvent(shipment.id, "RECEIVED", "We received your order.");

    return { id: shipment.id, trackingCode: shipment.trackingCode };
  },

  update: async (id: string, input: ShipmentFormInput) => {
    const updated = await ShipmentRepository.update(id, parseForm(input));
    if (!updated) throw new UserError("That shipment no longer exists.");
  },

  // Moves the shipment to a new stage (or, with the same stage, just adds a
  // note such as "held at customs") and records it on the timeline.
  addUpdate: async (id: string, status: string, note: string) => {
    if (!SHIPMENT_STATUSES.includes(status as ShipmentStatus)) throw new UserError("Choose a valid status.");
    if (!(await ShipmentRepository.findById(id))) throw new UserError("That shipment no longer exists.");

    await ShipmentRepository.addEvent(id, status as ShipmentStatus, cleanNote(note));
    await ShipmentRepository.setStatus(id, status as ShipmentStatus);
  },

  // Undo a mistaken update. The very first entry can't be removed; the shipment
  // goes back to the stage of the latest entry that is left.
  removeEvent: async (shipmentId: string, eventId: string) => {
    const shipment = await ShipmentRepository.findById(shipmentId);
    const event = await ShipmentRepository.findEvent(eventId);

    if (!shipment || !event || event.shipmentId !== shipmentId) throw new UserError("That update no longer exists.");
    if (event.id === shipment.events[shipment.events.length - 1]!.id) throw new UserError("The first entry can't be removed.");

    await ShipmentRepository.deleteEvent(eventId);
    const latest = shipment.events.find((e) => e.id !== eventId)!;
    await ShipmentRepository.setStatus(shipmentId, latest.status);
  },

  remove: async (id: string) => {
    await ShipmentRepository.delete(id);
  },

  listForAdmin: async (filter: { q?: string; status?: ShipmentStatus }, page: number, pageSize: number) => {
    const [rows, total] = await Promise.all([ShipmentRepository.findMany(filter, pageSize, (page - 1) * pageSize), ShipmentRepository.count(filter)]);
    return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  getForAdmin: async (id: string) => {
    return await ShipmentRepository.findById(id);
  },

  // What the public tracking page may show. Built here, on the server, with
  // the contact details already masked: the real name, phone and address never
  // reach a visitor's browser. Internal notes, the AliExpress link and the
  // contact channel are not included either.
  getPublic: async (code: string, locale: Locale) => {
    const shipment = await ShipmentRepository.findByCode(normalizeTrackingCode(code));
    if (!shipment) return null;

    return {
      reference: shipment.reference,
      trackingCode: shipment.trackingCode,
      itemName: shipment.itemName,
      itemImageUrl: shipment.itemImageUrl,
      quantity: shipment.quantity,
      status: shipment.status,
      carrier: shipment.carrier,
      carrierTrackingNumber: shipment.carrierTrackingNumber,
      estimatedArrival: shipment.estimatedArrival ? formatDate(shipment.estimatedArrival, locale) : null,
      ordered: formatDate(shipment.createdAt, locale),
      contact: {
        name: maskName(shipment.customerName),
        phone: shipment.customerPhone ? maskPhone(shipment.customerPhone) : null,
        address: shipment.customerAddress ? maskAddress(shipment.customerAddress) : null,
        city: shipment.customerCity,
      },
      events: shipment.events.map((event) => ({ id: event.id, status: event.status, note: event.note, date: formatDateTime(event.createdAt, locale) })),
    };
  },
};
