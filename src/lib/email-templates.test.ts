import { describe, expect, it } from "vitest";
import { adminNewOrderEmail, deliveryEmail, orderReceivedEmail } from "./email-templates";

// A customer controls their name, the order notes and (for the admin) item names in emails:
// nothing they type may turn into HTML or a working link in a mail client.
const evil = `<a href="https://evil.tn">Click to confirm</a><img src=x onerror=alert(1)>`;

describe("email templates escape customer text", () => {
  it("in the order confirmation", () => {
    const email = orderReceivedEmail({
      locale: "en", name: evil, orderNumber: 7, orderUrl: "https://shop.tn/order/1",
      items: [{ name: evil, quantity: 1, unitPriceMillimes: 1000 }], subtotalMillimes: 1000, shippingMillimes: 0, requiresShipping: false, totalMillimes: 1000, online: true,
    });
    expect(email.html).not.toContain("<a href=\"https://evil.tn\"");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;a href=&quot;https://evil.tn&quot;&gt;");
  });

  it("in the admin's new-order alert", () => {
    const email = adminNewOrderEmail({ orderNumber: 7, customerName: evil, customerEmail: "a@b.tn", customerPhone: null, items: [{ name: evil, quantity: 1 }], totalMillimes: 1000, paymentLabel: "D17", adminUrl: "https://shop.tn/admin/orders/1" });
    expect(email.html).not.toContain("<img src=x");
    expect(email.subject).not.toContain("\n");
  });

  it("in the delivery email (the admin's text is shown as text, line breaks kept)", () => {
    const email = deliveryEmail({ locale: "fr", name: "Sami", orderNumber: 7, orderUrl: "https://shop.tn/order/1", message: `login: a\npass: <b>x</b>` });
    expect(email.html).toContain("login: a<br>pass: &lt;b&gt;x&lt;/b&gt;");
  });
});
