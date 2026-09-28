// Email updates on AliExpress tracking pages: turning them on (6-digit code emailed to the address, so
// only its owner can), the update emails the team's changes trigger, and unsubscribing.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { ShipmentRepository } from "../prisma/shipments";
import { userError } from "../lib/result";
import { now } from "../lib/time";
import { sendEmail } from "../lib/email";
import { runAfterResponse } from "../lib/background";
import { siteUrl } from "../lib/store";
import { normalizeTrackingCode, type ShipmentStatus } from "../lib/shipments";
import { trackingCodeEmail, trackingUpdateEmail } from "../lib/email-templates";
import { createTranslator } from "../i18n/translate";
import { toLocale, type Locale } from "../i18n/config";

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
// Per shipment: how many different addresses may be sent a code in an hour, and how many may follow it.
// Stops anyone with a tracking link from using it to email strangers.
const MAX_CODE_ADDRESSES_PER_HOUR = 5;
const MAX_SUBSCRIBERS = 5;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hashed with the subscriber's id, so the same code for two addresses never gives the same hash.
const hashCode = (subscriberId: string, code: string) => createHash("sha256").update(`${subscriberId}:${code}`).digest("hex");

function sameHash(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function shipmentFor(trackingCode: string) {
  const shipment = await ShipmentRepository.findByCode(normalizeTrackingCode(String(trackingCode)));
  if (!shipment) throw userError("errors.trackingNotFound");
  return shipment;
}

function cleanEmail(input: string) {
  const email = String(input).trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw userError("errors.email");
  return email;
}

type ShipmentRow = NonNullable<Awaited<ReturnType<typeof ShipmentRepository.findById>>>;
type Update = { itemNames: (string | null)[]; status: ShipmentStatus; note: string };

export const ShipmentNotifications = {
  // Step 1: email a 6-digit code to the address. An address that is already confirmed gets nothing.
  requestCode: async (trackingCode: string, emailInput: string, locale: Locale) => {
    const shipment = await shipmentFor(trackingCode);
    const email = cleanEmail(emailInput);
    const current = now();

    let subscriber = await ShipmentRepository.findSubscriber(shipment.id, email);
    if (subscriber?.verifiedAt) return { alreadyEnabled: true };

    if (subscriber?.lastCodeSentAt && Temporal.Instant.compare(subscriber.lastCodeSentAt.add({ seconds: RESEND_SECONDS }), current) > 0) {
      throw userError("errors.trackingCodeWait");
    }
    if ((await ShipmentRepository.countCodesSentSince(shipment.id, current.subtract({ hours: 1 }))) >= MAX_CODE_ADDRESSES_PER_HOUR && !subscriber?.lastCodeSentAt) {
      throw userError("errors.trackingTooManyCodes");
    }

    if (!subscriber) {
      const confirmed = (await ShipmentRepository.listSubscribers(shipment.id)).filter((s) => s.verifiedAt).length;
      if (confirmed >= MAX_SUBSCRIBERS) throw userError("errors.trackingTooManySubscribers");
      subscriber = await ShipmentRepository.createSubscriber({ shipmentId: shipment.id, email, locale, unsubscribeToken: randomBytes(24).toString("hex") });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await ShipmentRepository.updateSubscriber(subscriber.id, {
      locale,
      codeHash: hashCode(subscriber.id, code),
      codeExpiresAt: current.add({ minutes: CODE_MINUTES }),
      codeAttempts: 0,
      lastCodeSentAt: current,
    });
    runAfterResponse(() => sendEmail({ to: email, ...trackingCodeEmail({ locale, code, reference: shipment.reference }) }));
    return { alreadyEnabled: false };
  },

  // Step 2: the code proves the address is theirs; from now on they get the update emails.
  verifyCode: async (trackingCode: string, emailInput: string, codeInput: string) => {
    const shipment = await shipmentFor(trackingCode);
    const email = cleanEmail(emailInput);
    const code = String(codeInput).trim();

    const subscriber = await ShipmentRepository.findSubscriber(shipment.id, email);
    if (subscriber?.verifiedAt) return;
    if (!subscriber?.codeHash || !subscriber.codeExpiresAt) throw userError("errors.trackingCodeInvalid");
    if (subscriber.codeAttempts >= MAX_ATTEMPTS) throw userError("errors.trackingTooManyAttempts");
    if (Temporal.Instant.compare(subscriber.codeExpiresAt, now()) < 0) throw userError("errors.trackingCodeExpired");

    if (!/^\d{6}$/.test(code) || !sameHash(hashCode(subscriber.id, code), subscriber.codeHash)) {
      await ShipmentRepository.updateSubscriber(subscriber.id, { codeAttempts: subscriber.codeAttempts + 1 });
      throw userError("errors.trackingCodeInvalid");
    }

    await ShipmentRepository.updateSubscriber(subscriber.id, { verifiedAt: now(), codeHash: null, codeExpiresAt: null, codeAttempts: 0 });
  },

  // The unsubscribe page: which order a link is for (shown before the "Stop" button), then stopping.
  findByToken: async (token: string) => {
    if (!/^[a-f0-9]{48}$/.test(String(token))) return null;
    const subscriber = await ShipmentRepository.findSubscriberByToken(token);
    if (!subscriber) return null;
    const shipment = await ShipmentRepository.findById(subscriber.shipmentId);
    return shipment ? { reference: shipment.reference, trackingCode: shipment.trackingCode } : null;
  },

  unsubscribe: async (token: string) => {
    if (!/^[a-f0-9]{48}$/.test(String(token))) throw userError("errors.trackingUnsubscribeInvalid");
    const subscriber = await ShipmentRepository.findSubscriberByToken(token);
    if (!subscriber) throw userError("errors.trackingUnsubscribeInvalid");
    await ShipmentRepository.deleteSubscriber(subscriber.id);
  },

  // After the team moves items to a stage or adds a note: one email per confirmed address (never a
  // shared "to" list), in the language they signed up in, with their own unsubscribe link.
  sendUpdate: async (shipment: ShipmentRow, update: Update) => {
    const subscribers = (await ShipmentRepository.listSubscribers(shipment.id)).filter((s) => s.verifiedAt);

    for (const subscriber of subscribers) {
      const locale = toLocale(subscriber.locale);
      const t = createTranslator(locale);
      await sendEmail({
        to: subscriber.email,
        ...trackingUpdateEmail({
          locale,
          reference: shipment.reference,
          statusLabel: t.messages.shipmentStatus[update.status].label,
          itemNames: update.itemNames,
          note: update.note,
          trackingUrl: `${siteUrl()}/track/${shipment.trackingCode}`,
          unsubscribeUrl: `${siteUrl()}/track/unsubscribe?token=${subscriber.unsubscribeToken}`,
        }),
      });
    }
  },
};
