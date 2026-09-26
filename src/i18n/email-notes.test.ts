import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { fr } from "./messages/fr";

// Every screen that tells the customer "we sent you an email" also says it may be in the spam folder.
describe("'check your spam' notes", () => {
  const sentToCustomer = (m: typeof en) => [m.order.thanksText, m.auth.sentCode, m.auth.notVerified, m.auth.sentNewCode, m.chatSystem.deliveredEmail];

  it("are in every English text", () => {
    for (const text of sentToCustomer(en)) expect(text).toMatch(/spam/i);
  });

  it("are in every French text", () => {
    for (const text of sentToCustomer(fr)) expect(text).toMatch(/spam|indésirables/i);
  });
});
