import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/shipments", () => ({
  ShipmentRepository: {
    findByCode: vi.fn(), findById: vi.fn(), findSubscriber: vi.fn(), findSubscriberByToken: vi.fn(), listSubscribers: vi.fn(),
    createSubscriber: vi.fn(), updateSubscriber: vi.fn(), deleteSubscriber: vi.fn(), countCodesSentSince: vi.fn(),
  },
}));
vi.mock("../lib/email", () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }));

import { ShipmentRepository } from "../prisma/shipments";
import { sendEmail } from "../lib/email";
import { ShipmentNotifications } from "./shipment-notifications";
import { en } from "../i18n/messages/en";
import { fr } from "../i18n/messages/fr";

const repo = vi.mocked(ShipmentRepository);
const send = vi.mocked(sendEmail);
const minutesAgo = (n: number) => Temporal.Now.instant().subtract({ minutes: n });

const shipment = { id: "s-1", reference: 12, trackingCode: "DS-7K4Q9-X2M3F", items: [], events: [] } as never;
const subscriber = (changes: Record<string, unknown> = {}) =>
  ({ id: "sub-1", shipmentId: "s-1", email: "zz-sami@example.tn", locale: "en", verifiedAt: null, codeHash: null, codeExpiresAt: null, codeAttempts: 0, lastCodeSentAt: null, unsubscribeToken: "a".repeat(48), ...changes }) as never;
const hashOf = (code: string) => createHash("sha256").update(`sub-1:${code}`).digest("hex");

beforeEach(() => {
  vi.resetAllMocks();
  send.mockResolvedValue({ sent: true });
  repo.findByCode.mockResolvedValue(shipment);
  repo.findSubscriber.mockResolvedValue(null);
  repo.listSubscribers.mockResolvedValue([]);
  repo.countCodesSentSince.mockResolvedValue(0);
  repo.createSubscriber.mockImplementation(async (data) => subscriber(data));
});

describe("turning on email updates: the code", () => {
  it("emails a 6-digit code and stores only its hash", async () => {
    await expect(ShipmentNotifications.requestCode("ds-7k4q9-x2m3f", "  ZZ-Sami@Example.tn ", "fr")).resolves.toEqual({ alreadyEnabled: false });

    expect(repo.createSubscriber).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: "s-1", email: "zz-sami@example.tn", locale: "fr", unsubscribeToken: expect.stringMatching(/^[a-f0-9]{48}$/) }));
    const email = send.mock.calls[0]![0];
    const code = email.text.match(/\b\d{6}\b/)![0];
    expect(email).toMatchObject({ to: "zz-sami@example.tn", subject: "Votre code pour suivre la commande Nº 12" });

    const saved = repo.updateSubscriber.mock.calls[0]![1];
    expect(saved.codeHash).toBe(hashOf(code));
    expect(JSON.stringify(saved)).not.toContain(`"${code}"`);
  });

  it("sends nothing to an address that is already confirmed", async () => {
    repo.findSubscriber.mockResolvedValue(subscriber({ verifiedAt: minutesAgo(60) }));
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "en")).resolves.toEqual({ alreadyEnabled: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("[abuse] waits a minute between two codes to the same address", async () => {
    repo.findSubscriber.mockResolvedValue(subscriber({ lastCodeSentAt: Temporal.Now.instant().subtract({ seconds: 20 }) }));
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "en")).rejects.toMatchObject({ key: "errors.trackingCodeWait" });
    expect(send).not.toHaveBeenCalled();
  });

  it("[abuse] a tracking link can't be used to email many strangers (5 addresses an hour)", async () => {
    repo.countCodesSentSince.mockResolvedValue(5);
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "victim@example.tn", "en")).rejects.toMatchObject({ key: "errors.trackingTooManyCodes" });
    expect(send).not.toHaveBeenCalled();
  });

  it("[abuse] at most 5 addresses can follow one order", async () => {
    repo.listSubscribers.mockResolvedValue(Array.from({ length: 5 }, () => subscriber({ verifiedAt: minutesAgo(5) })));
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "sixth@example.tn", "en")).rejects.toMatchObject({ key: "errors.trackingTooManySubscribers" });
  });

  it("refuses an invalid email or an unknown tracking code", async () => {
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "not an email", "en")).rejects.toMatchObject({ key: "errors.email" });
    await expect(ShipmentNotifications.requestCode("DS-7K4Q9-X2M3F", "a@b.tn\r\nBcc: x@y.tn", "en")).rejects.toMatchObject({ key: "errors.email" });
    repo.findByCode.mockResolvedValue(null);
    await expect(ShipmentNotifications.requestCode("DS-AAAAA-BBBBB", "zz-sami@example.tn", "en")).rejects.toMatchObject({ key: "errors.trackingNotFound" });
  });
});

describe("turning on email updates: checking the code", () => {
  const waiting = (changes: Record<string, unknown> = {}) => subscriber({ codeHash: hashOf("123456"), codeExpiresAt: Temporal.Now.instant().add({ minutes: 5 }), ...changes });

  it("confirms the address with the right code", async () => {
    repo.findSubscriber.mockResolvedValue(waiting());
    await ShipmentNotifications.verifyCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", " 123456 ");
    expect(repo.updateSubscriber).toHaveBeenCalledWith("sub-1", expect.objectContaining({ verifiedAt: expect.any(Temporal.Instant), codeHash: null }));
  });

  it("counts a wrong code and refuses it", async () => {
    repo.findSubscriber.mockResolvedValue(waiting());
    await expect(ShipmentNotifications.verifyCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "654321")).rejects.toMatchObject({ key: "errors.trackingCodeInvalid" });
    expect(repo.updateSubscriber).toHaveBeenCalledWith("sub-1", { codeAttempts: 1 });
  });

  it("[abuse] stops after 5 wrong codes, even if the 6th is right", async () => {
    repo.findSubscriber.mockResolvedValue(waiting({ codeAttempts: 5 }));
    await expect(ShipmentNotifications.verifyCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "123456")).rejects.toMatchObject({ key: "errors.trackingTooManyAttempts" });
  });

  it("refuses an expired code, or a code nobody asked for", async () => {
    repo.findSubscriber.mockResolvedValue(waiting({ codeExpiresAt: minutesAgo(1) }));
    await expect(ShipmentNotifications.verifyCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "123456")).rejects.toMatchObject({ key: "errors.trackingCodeExpired" });

    repo.findSubscriber.mockResolvedValue(null);
    await expect(ShipmentNotifications.verifyCode("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "123456")).rejects.toMatchObject({ key: "errors.trackingCodeInvalid" });
  });
});

describe("update emails", () => {
  it("emails each confirmed address separately, in its language, with its own stop link", async () => {
    repo.listSubscribers.mockResolvedValue([
      subscriber({ email: "sami@example.tn", locale: "fr", verifiedAt: minutesAgo(9), unsubscribeToken: "b".repeat(48) }),
      subscriber({ email: "unconfirmed@example.tn", verifiedAt: null }),
      subscriber({ email: "lina@example.tn", locale: "en", verifiedAt: minutesAgo(9), unsubscribeToken: "c".repeat(48) }),
    ]);

    await ShipmentNotifications.sendUpdate(shipment, { itemNames: ["Earbuds"], status: "IN_TUNISIA", note: "At customs" });

    expect(send.mock.calls.map(([email]) => email.to)).toEqual(["sami@example.tn", "lina@example.tn"]);
    expect(send.mock.calls[0]![0].subject).toBe(`Commande Nº 12 : ${fr.shipmentStatus.IN_TUNISIA.label}`);
    expect(send.mock.calls[1]![0].subject).toBe(`Order Nº 12: ${en.shipmentStatus.IN_TUNISIA.label}`);
    expect(send.mock.calls[0]![0].text).toContain(`/track/unsubscribe?token=${"b".repeat(48)}`);
    expect(send.mock.calls[1]![0].text).toContain(`/track/unsubscribe?token=${"c".repeat(48)}`);
    expect(send.mock.calls[1]![0].text).toContain("/track/DS-7K4Q9-X2M3F");
  });
});

describe("stopping the emails", () => {
  it("deletes the address with a valid link, and refuses anything else", async () => {
    repo.findSubscriberByToken.mockResolvedValue(subscriber());
    await ShipmentNotifications.unsubscribe("a".repeat(48));
    expect(repo.deleteSubscriber).toHaveBeenCalledWith("sub-1");

    await expect(ShipmentNotifications.unsubscribe("' OR 1=1 --")).rejects.toMatchObject({ key: "errors.trackingUnsubscribeInvalid" });
    repo.findSubscriberByToken.mockResolvedValue(null);
    await expect(ShipmentNotifications.unsubscribe("d".repeat(48))).rejects.toMatchObject({ key: "errors.trackingUnsubscribeInvalid" });
  });
});
