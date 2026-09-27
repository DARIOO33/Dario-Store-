import { millimesToDinars } from "./money";

// Meta (Facebook) Pixel events for ads. Only product ids, quantities and amounts are sent: never a
// name, email or phone. Events asked for before the pixel is loaded (a product page's first render
// runs before the layout loads it) wait in `pending` and go out right after "init".
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push?: unknown; loaded?: boolean; version?: string };
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

const CURRENCY = "TND";
const MAX_PENDING = 50;
let pending: unknown[][] = [];
let loaded = false;

// Meta's own loader, written out: a queue that fbevents.js empties once it has downloaded.
export function loadMetaPixel(pixelId: string) {
  const w = window as PixelWindow;
  if (loaded || !pixelId) return;
  loaded = true;

  if (!w.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;
    w._fbq ??= fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  w.fbq!("init", pixelId);
  for (const args of pending) w.fbq!(...args);
  pending = [];
}

function send(...args: unknown[]) {
  const fbq = (window as PixelWindow).fbq;
  if (loaded && fbq) fbq(...args);
  else if (pending.length < MAX_PENDING) pending.push(args);
}

type Line = { productId: string; quantity: number; priceMillimes?: number };

const contents = (lines: Line[]) =>
  lines.map((line) => ({ id: line.productId, quantity: line.quantity, ...(line.priceMillimes !== undefined && { item_price: millimesToDinars(line.priceMillimes) }) }));

export const pixel = {
  pageView: () => send("track", "PageView"),

  viewContent: (product: { id: string; name: string; priceMillimes: number }) =>
    send("track", "ViewContent", { content_ids: [product.id], content_name: product.name, content_type: "product", value: millimesToDinars(product.priceMillimes), currency: CURRENCY }),

  addToCart: (line: { productId: string; name: string; priceMillimes: number; quantity: number }) =>
    send("track", "AddToCart", {
      content_ids: [line.productId],
      content_name: line.name,
      content_type: "product",
      contents: contents([line]),
      value: millimesToDinars(line.priceMillimes * line.quantity),
      currency: CURRENCY,
    }),

  initiateCheckout: (lines: Line[], totalMillimes: number) =>
    send("track", "InitiateCheckout", {
      content_ids: lines.map((line) => line.productId),
      content_type: "product",
      contents: contents(lines),
      num_items: lines.reduce((sum, line) => sum + line.quantity, 0),
      value: millimesToDinars(totalMillimes),
      currency: CURRENCY,
    }),

  // The order id is the event id, so Meta counts one purchase even if the page is sent twice.
  purchase: (orderId: string, lines: Line[], totalMillimes: number) =>
    send(
      "track",
      "Purchase",
      { content_ids: lines.map((line) => line.productId), content_type: "product", contents: contents(lines), num_items: lines.reduce((sum, line) => sum + line.quantity, 0), value: millimesToDinars(totalMillimes), currency: CURRENCY },
      { eventID: `order-${orderId}` },
    ),

  completeRegistration: () => send("track", "CompleteRegistration"),
};
