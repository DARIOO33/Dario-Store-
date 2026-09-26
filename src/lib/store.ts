// Everything a shop owner might want to tweak lives here.
export const STORE_NAME = "Dario Store";

// The site's public address, from BETTER_AUTH_URL (https://your-domain in production). Used for
// links in emails, the sitemap and share previews.
export function siteUrl() {
  return (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

// How customers reach the shop (footer, legal pages). Leave a value empty to hide it.
export const CONTACT = {
  instagram: "dario.store.tn",
  facebook: "",
  // International format without spaces or "+", e.g. 21651099580
  whatsapp: "",
  email: "",
};

// Shipping applies only to physical products: a flat fee, free once the
// physical part of the cart reaches the threshold. Amounts are in millimes.
export const SHIPPING_FLAT_MILLIMES = 7_000;
export const FREE_SHIPPING_FROM_MILLIMES = 150_000;

// The shop's clock. The live "available / away until …" status is set by the admin on the
// dashboard (services/availability.ts); SUPPORT_HOURS are the usual hours quoted in the legal pages.
export const SUPPORT_TIME_ZONE = "Africa/Tunis";
export const SUPPORT_HOURS = { from: 9, to: 23 };

// Chat messages marked "contains login details" are erased this many days after they were sent.
export const SENSITIVE_MESSAGE_DAYS = 7;

// After delivery, a customer can reopen a closed chat with "Report a problem" for this many days
// (at most once a day). After that the closed chat shows the CONTACT channels instead.
export const PROBLEM_REPORT_DAYS = 30;

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
