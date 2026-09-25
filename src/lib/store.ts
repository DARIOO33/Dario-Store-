// Everything a shop owner might want to tweak lives here.
export const STORE_NAME = "Dario Store";

// Shipping applies only to physical products: a flat fee, free once the
// physical part of the cart reaches the threshold. Amounts are in millimes.
export const SHIPPING_FLAT_MILLIMES = 7_000;
export const FREE_SHIPPING_FROM_MILLIMES = 150_000;

// When the team is usually online, in Tunisian time. Outside these hours a customer whose
// payment was just confirmed is told that delivery may take longer than the usual hour.
export const SUPPORT_TIME_ZONE = "Africa/Tunis";
export const SUPPORT_HOURS = { from: 9, to: 23 };

export function isSupportOnline(at = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: SUPPORT_TIME_ZONE }).format(at));
  return hour >= SUPPORT_HOURS.from && hour < SUPPORT_HOURS.to;
}

// Chat messages marked "contains login details" are erased this many days after they were sent.
export const SENSITIVE_MESSAGE_DAYS = 7;

export const MAX_QUANTITY_PER_LINE = 20;
export const LOW_STOCK_THRESHOLD = 5;
export const PAGE_SIZE = 12;

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Kef", "Mahdia", "Manouba", "Médenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;

// The shipping fee is charged on physical goods only; virtual items never
// count towards it, and a physical subtotal over the threshold ships free.
// One rule, shared by the cart page (to show it) and checkout (to charge it).
export function shippingFee(physicalSubtotalMillimes: number) {
  if (physicalSubtotalMillimes === 0) return 0;
  return physicalSubtotalMillimes >= FREE_SHIPPING_FROM_MILLIMES ? 0 : SHIPPING_FLAT_MILLIMES;
}
