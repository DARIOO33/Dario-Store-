import { afterEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => [] as { auth?: { user: string; pass: string } }[]);
vi.mock("nodemailer", () => ({
  default: { createTransport: (options: { auth?: { user: string; pass: string } }) => ({ sendMail: async () => void sent.push(options) }) },
}));

import { sendEmail } from "./email";

const email = { to: "zz-sami@example.tn", subject: "Verify your email", text: "123456" };

afterEach(() => {
  vi.unstubAllEnvs();
  sent.length = 0;
});

describe("sendEmail", () => {
  it("[fixed] uses the SMTP password in .env now, not the one it saw first", async () => {
    vi.stubEnv("SMTP_HOST", "mail.example.tn");
    vi.stubEnv("MAIL_FROM", "Shop <contact@example.tn>");
    vi.stubEnv("SMTP_USER", "contact@example.tn");

    vi.stubEnv("SMTP_PASS", "old-wrong-password");
    await sendEmail(email);
    vi.stubEnv("SMTP_PASS", "new-right-password");
    await sendEmail(email);

    expect(sent.map((options) => options.auth?.pass)).toEqual(["old-wrong-password", "new-right-password"]);
  });

  it("sends nothing without SMTP settings", async () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("MAIL_FROM", "");
    await expect(sendEmail(email)).resolves.toEqual({ sent: false, reason: "not-configured" });
    expect(sent).toEqual([]);
  });
});
