import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { LOCKED_TEXT, isSealed, openBase64, openText, sealBase64, sealText } from "./crypto";

const newKey = () => randomBytes(32).toString("base64");

afterEach(() => vi.unstubAllEnvs());

describe("chat text encryption", () => {
  it("encrypts and decrypts a message with the key", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());

    const stored = sealText("my login: player@mail.tn / hunter2");

    expect(isSealed(stored)).toBe(true);
    expect(stored).not.toContain("hunter2");
    expect(openText(stored)).toBe("my login: player@mail.tn / hunter2");
  });

  it("gives a different ciphertext each time for the same text", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    expect(sealText("same")).not.toBe(sealText("same"));
  });

  it("stores plain text when no key is set", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", "");
    expect(sealText("hello")).toBe("hello");
  });

  it("passes old plaintext messages through unchanged", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    expect(openText("an old message")).toBe("an old message");
  });

  it("shows the locked text when the key is wrong or missing", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    const stored = sealText("secret");

    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    expect(openText(stored)).toBe(LOCKED_TEXT);

    vi.stubEnv("CHAT_ENCRYPTION_KEY", "");
    expect(openText(stored)).toBe(LOCKED_TEXT);
  });

  it("refuses a key that is not 32 bytes", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", Buffer.from("too short").toString("base64"));
    expect(() => sealText("x")).toThrow(/32 bytes/);
  });
});

describe("chat photo encryption", () => {
  it("round-trips a photo's base64", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    const photo = randomBytes(200).toString("base64");

    const stored = sealBase64(photo);

    expect(isSealed(stored)).toBe(true);
    expect(openBase64(stored)).toBe(photo);
  });

  it("returns null for a photo it cannot decrypt", () => {
    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    const stored = sealBase64(randomBytes(20).toString("base64"));

    vi.stubEnv("CHAT_ENCRYPTION_KEY", newKey());
    expect(openBase64(stored)).toBeNull();
  });
});
