import { describe, expect, it } from "vitest";
import { adminNewOrderEmail, deliveryEmail, orderReceivedEmail, trackingCodeEmail, trackingUpdateEmail } from "./email-templates";

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

describe("tracking emails", () => {
  it("the code email shows the code and says what to do if you didn't ask for it", () => {
    const email = trackingCodeEmail({ locale: "en", code: "048213", reference: 12 });
    expect(email.subject).toBe("Your code for updates on order Nº 12");
    expect(email.html).toContain("048213");
    expect(email.text).toContain("Didn't ask for this?");
  });

  it("the update email escapes the team's note and carries the stop link", () => {
    const email = trackingUpdateEmail({
      locale: "fr", reference: 12, statusLabel: "Expédiée", itemNames: [null, evil], note: evil,
      trackingUrl: "https://shop.tn/track/DS-7K4Q9-X2M3F", unsubscribeUrl: "https://shop.tn/track/unsubscribe?token=abc",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("Tous vos articles");
    expect(email.html).toContain('href="https://shop.tn/track/unsubscribe?token=abc"');
    expect(email.text).toContain("Ne plus recevoir ces e-mails: https://shop.tn/track/unsubscribe?token=abc");
  });
});
