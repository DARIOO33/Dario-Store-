// What the customer is told about their order, in the chat and by email. Emails are
// designed in lib/email-templates.ts and only leave the server once SMTP is set up
// (lib/email.ts). Everything is written in the language the customer ordered in.

import { MessageRepository } from "../prisma/messages";
import { OrderRepository } from "../prisma/orders";
import { sendEmail } from "../lib/email";
import { adminAlertEmail, adminNewOrderEmail, deliveryEmail, orderReceivedEmail, paymentConfirmedEmail } from "../lib/email-templates";
import { paymentLabel } from "../lib/payments";
import { formatMillimes } from "../lib/money";
import { UserRepository } from "../prisma/users";
import { maskEmail } from "../lib/mask";
import { siteUrl } from "../lib/store";
import { formatBackAt, formatResponseTime } from "../lib/availability";
import { AvailabilityService } from "./availability";
import { createTranslator } from "../i18n/translate";
import { toLocale } from "../i18n/config";

type OrderRow = NonNullable<Awaited<ReturnType<typeof OrderRepository.findById>>>;

// Guests need their private token in the link; account customers log in.
function orderUrl(order: { id: string; guestToken: string | null }) {
  return `${siteUrl()}/order/${order.id}${order.guestToken ? `?t=${order.guestToken}` : ""}`;
}

// The sentence promising delivery: the usual response time while the team is available, and an
// honest "we're back on …" while the admin has set themselves away (see services/availability.ts).
async function fulfilmentText(order: OrderRow) {
  const t = createTranslator(toLocale(order.locale));
  const { responseMinutes, awayUntilMs } = await AvailabilityService.current();
  return awayUntilMs
    ? t("chatSystem.paidAway", { date: formatBackAt(awayUntilMs, t.locale) })
    : t("chatSystem.paidOnline", { time: formatResponseTime(responseMinutes) });
}

const hasDigitalItems = (order: OrderRow) => order.items.some((item) => item.productType === "VIRTUAL");

// Who hears about new orders: ADMIN_NOTIFY_EMAIL (comma-separated) if set, otherwise every admin account.
async function adminAddresses() {
  const configured = (process.env.ADMIN_NOTIFY_EMAIL ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  if (configured.length > 0) return configured;

  const admins = await UserRepository.findAdmins();
  return admins.map((admin) => admin.email);
}

async function notifyAdmins(order: OrderRow) {
  const to = await adminAddresses();
  if (to.length === 0) return;

  const email = adminNewOrderEmail({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    items: order.items.map((item) => ({ name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName, quantity: item.quantity })),
    totalMillimes: order.totalMillimes,
    paymentLabel: paymentLabel(createTranslator("en"), order.paymentMethod, order.cryptoNetwork),
    adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
  });
  await sendEmail({ to: to.join(", "), ...email });
}

export const OrderNotifications = {
  // Right after checkout: a confirmation email with the summary.
  placed: (order: OrderRow) => {
    void notifyAdmins(order);
    const email = orderReceivedEmail({
      locale: toLocale(order.locale),
      name: order.customerName,
      orderNumber: order.orderNumber,
      orderUrl: orderUrl(order),
      items: order.items.map((item) => ({
        name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
        quantity: item.quantity,
        unitPriceMillimes: item.unitPriceMillimes,
      })),
      subtotalMillimes: order.subtotalMillimes,
      shippingMillimes: order.shippingMillimes,
      requiresShipping: order.requiresShipping,
      totalMillimes: order.totalMillimes,
      online: order.paymentMethod !== "CASH_ON_DELIVERY",
    });
    void sendEmail({ to: order.customerEmail, ...email });
  },

  // The customer says they've paid: tell the admin to check the proof.
  paymentSent: async (order: OrderRow) => {
    const to = await adminAddresses();
    if (to.length === 0) return;

    const email = adminAlertEmail({
      kicker: "Payment to check",
      title: `Order #${order.orderNumber}: payment sent`,
      intro: `${order.customerName} says they paid ${formatMillimes(order.totalMillimes)} (${paymentLabel(createTranslator("en"), order.paymentMethod, order.cryptoNetwork)}). Check the proof in the chat, then mark the order Paid.`,
      adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
    });
    await sendEmail({ to: to.join(", "), ...email });
  },

  // The customer reopened a closed chat with "Report a problem". The message itself stays in the
  // (encrypted) chat; the email only says that there is one.
  problemReported: async (order: OrderRow, reasonLabel: string) => {
    const to = await adminAddresses();
    if (to.length === 0) return;

    const email = adminAlertEmail({
      kicker: "Problem reported",
      title: `Order #${order.orderNumber}: problem reported`,
      intro: `${order.customerName} reopened the chat: "${reasonLabel}". Answer them in the order chat.`,
      adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
    });
    await sendEmail({ to: to.join(", "), ...email });
  },

  // The payment was just confirmed: say what to expect, in the chat (account orders) and by email.
  paid: async (order: OrderRow) => {
    if (!hasDigitalItems(order)) return;

    const fulfilment = await fulfilmentText(order);
    if (order.userId) await MessageRepository.create({ orderId: order.id, fromAdmin: true, body: fulfilment, hasImage: false });

    const email = paymentConfirmedEmail({ locale: toLocale(order.locale), name: order.customerName, orderNumber: order.orderNumber, orderUrl: orderUrl(order), fulfilment });
    void sendEmail({ to: order.customerEmail, ...email });
  },

  // The admin's delivery email. Returns the send result so the admin sees if it failed.
  buildDelivery: (order: OrderRow, message: string) =>
    deliveryEmail({ locale: toLocale(order.locale), name: order.customerName, orderNumber: order.orderNumber, orderUrl: orderUrl(order), message }),

  deliverByEmail: async (order: OrderRow, message: string) => {
    const result = await sendEmail({ to: order.customerEmail, ...OrderNotifications.buildDelivery(order, message) });
    if (!result.sent) return result;

    await OrderRepository.setDeliveryEmailSent(order.id);
    // Tells them to look in their inbox, without repeating the private details in the chat.
    if (order.userId) {
      const t = createTranslator(toLocale(order.locale));
      await MessageRepository.create({ orderId: order.id, fromAdmin: true, body: t("chatSystem.deliveredEmail", { email: maskEmail(order.customerEmail) }), hasImage: false });
    }
    return result;
  },
};
