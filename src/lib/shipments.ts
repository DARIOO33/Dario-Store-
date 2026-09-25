import type { Translator } from "../i18n/translate";

// The stages of an AliExpress shipment.
// The order here is the order of the progress bar on the public tracking page.
export type ShipmentStatus =
  | "RECEIVED"
  | "PAID"
  | "ORDERED"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "IN_TUNISIA"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const SHIPMENT_STEPS: { status: Exclude<ShipmentStatus, "CANCELLED"> }[] = [
  { status: "RECEIVED" },
  { status: "PAID" },
  { status: "ORDERED" },
  { status: "SHIPPED" },
  { status: "IN_TRANSIT" },
  { status: "IN_TUNISIA" },
  { status: "OUT_FOR_DELIVERY" },
  { status: "DELIVERED" },
];

export const SHIPMENT_STATUSES: ShipmentStatus[] = [...SHIPMENT_STEPS.map((step) => step.status), "CANCELLED"];

// The wording lives in the dictionaries (`shipmentStatus`), one label and description per stage.
export function statusInfo(t: Translator, status: ShipmentStatus) {
  return t.messages.shipmentStatus[status];
}

// Where the customer first contacted us (admin-only information).
export const CONTACT_CHANNELS = ["Instagram", "Facebook", "WhatsApp", "Other"];

// Accepts "ds-7k4q9-x2m3f", " DS7K4Q9X2M3F " and so on.
export function normalizeTrackingCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("DS") ? raw.slice(2) : raw;
  return body.length === 10 ? `DS-${body.slice(0, 5)}-${body.slice(5)}` : "";
}
