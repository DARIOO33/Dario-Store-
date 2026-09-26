import { describe, expect, it } from "vitest";
import { maskAddress, maskEmail, maskName, maskPhone } from "./mask";

describe("masking personal details", () => {
  it("keeps only the first and last letter of each name", () => {
    expect(maskName("anouar dario")).toBe("a***r d***o");
    expect(maskName("Li")).toBe("L*");
    expect(maskName("   ")).toBe("Anonymous");
  });

  it("hides all but the last 3 digits of a phone", () => {
    expect(maskPhone("22 123 456")).toBe("** *** 456");
    expect(maskPhone("+216 22 123 456")).toBe("+*** ** *** 456");
  });

  it("hides house numbers completely", () => {
    expect(maskAddress("12 Rue de la Kasbah")).toBe("*** R***e d* l* K***h");
  });

  it("masks an email for the chat", () => {
    expect(maskEmail("dario@gmail.com")).toBe("d***@gmail.com");
  });
});
