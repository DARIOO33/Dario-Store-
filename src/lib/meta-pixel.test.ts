// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

type Fbq = { queue: unknown[][] };
const fbq = () => (window as unknown as { fbq: Fbq }).fbq;
const calls = () => fbq().queue.map((args) => Array.from(args));

// The helper keeps "loaded" in module state: every test starts from a fresh page.
async function freshPixel() {
  vi.resetModules();
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { _fbq?: unknown })._fbq;
  document.head.innerHTML = "";
  return await import("./meta-pixel");
}

describe("Meta Pixel helper", () => {
  let m: Awaited<ReturnType<typeof freshPixel>>;
  beforeEach(async () => {
    m = await freshPixel();
  });

  it("loads Meta's script once and starts with init", () => {
    m.loadMetaPixel("1231199037661013");
    m.loadMetaPixel("1231199037661013");

    expect(document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveLength(1);
    expect(calls()).toEqual([["init", "1231199037661013"]]);
  });

  it("keeps events sent before loading and sends them right after init (a product page renders first)", () => {
    m.pixel.viewContent({ id: "p-1", name: "KZ Castor", priceMillimes: 50_000 });
    m.loadMetaPixel("1231199037661013");
    m.pixel.pageView();

    expect(calls().map((args) => args[1])).toEqual(["1231199037661013", "ViewContent", "PageView"]);
  });

  it("sends amounts in dinars with the TND currency", () => {
    m.loadMetaPixel("id");
    m.pixel.addToCart({ productId: "p-1", name: "Netflix 1 month", priceMillimes: 12_500, quantity: 2 });

    expect(calls()[1]).toEqual(["track", "AddToCart", {
      content_ids: ["p-1"], content_name: "Netflix 1 month", content_type: "product",
      contents: [{ id: "p-1", quantity: 2, item_price: 12.5 }], value: 25, currency: "TND",
    }]);
  });

  it("reports a purchase with the order id as event id, so Meta counts it once", () => {
    m.loadMetaPixel("id");
    m.pixel.purchase("order-7", [{ productId: "p-1", quantity: 1, priceMillimes: 50_000 }, { productId: "p-2", quantity: 2, priceMillimes: 20_000 }], 97_000);

    expect(calls()[1]).toEqual(["track", "Purchase", {
      content_ids: ["p-1", "p-2"], content_type: "product",
      contents: [{ id: "p-1", quantity: 1, item_price: 50 }, { id: "p-2", quantity: 2, item_price: 20 }],
      num_items: 3, value: 97, currency: "TND",
    }, { eventID: "order-order-7" }]);
  });

  it("never sends personal data (no email, phone, name of a person or address fields)", () => {
    m.loadMetaPixel("id");
    m.pixel.initiateCheckout([{ productId: "p-1", quantity: 1, priceMillimes: 1_000 }], 8_000);
    m.pixel.completeRegistration();

    const sent = JSON.stringify(calls());
    for (const field of ["em", "ph", "fn", "ln", "email", "phone", "address", "ct", "zp", "external_id"]) expect(sent).not.toContain(`"${field}"`);
  });
});
