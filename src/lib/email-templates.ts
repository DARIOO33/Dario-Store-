// The designed emails: cream paper, black outlines, orange and yellow blocks, like the shop.
// Email clients ignore most CSS, so everything is inline styles on plain tables.
// Each function returns the subject, an HTML version and a plain-text version.

import { STORE_NAME } from "./store";
import { formatMillimes } from "./money";
import { createTranslator, type Translator } from "../i18n/translate";
import type { Locale } from "../i18n/config";

const INK = "#17130f";
const PAPER = "#f3ede0";
const CARD = "#fffdf6";
const ORANGE = "#ff5a1f";
const YELLOW = "#ffd400";
const DISPLAY = "Impact, 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";
const BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export type Email = { subject: string; html: string; text: string };

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const withBreaks = (text: string) => escape(text).replace(/\r?\n/g, "<br>");


type Frame = {
  t: Translator;
  footer: string;
  kicker: string;
  title: string;
  // Sits in the yellow header, under the title.
  intro: string;
  // Extra blocks between the intro and the button (already HTML).
  body: string;
  button?: { label: string; url: string };
  // Small print under the button (e.g. the unsubscribe link), already HTML.
  after?: string;
};

function frame({ t, footer, kicker, title, intro, body, button, after = "" }: Frame) {
  const action = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr><td style="background:${INK};">
      <a href="${escape(button.url)}" style="display:inline-block;padding:14px 24px;font-family:${MONO};font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${PAPER};text-decoration:none;">${escape(button.label)} &rarr;</a>
    </td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="${t.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 0 14px 2px;font-family:${DISPLAY};font-size:26px;letter-spacing:1px;text-transform:uppercase;color:${INK};"><span style="color:${ORANGE};">&#10033;</span> ${escape(STORE_NAME)}</td></tr>
  <tr><td style="background:${YELLOW};border:2px solid ${INK};padding:26px 28px;">
    <span style="display:inline-block;background:${INK};color:${YELLOW};font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:6px 10px;">${escape(kicker)}</span>
    <div style="font-family:${DISPLAY};font-size:38px;line-height:1.05;text-transform:uppercase;color:${INK};margin:16px 0 10px;">${escape(title)}</div>
    <div style="font-family:${BODY};font-size:16px;line-height:1.5;color:${INK};">${escape(intro)}</div>
  </td></tr>
  <tr><td style="background:${CARD};border:2px solid ${INK};border-top:0;padding:26px 28px;font-family:${BODY};font-size:15px;line-height:1.55;color:${INK};">
    ${body}
    ${action}
    ${after}
  </td></tr>
  <tr><td style="padding:16px 4px 0;font-family:${BODY};font-size:12px;line-height:1.5;color:#847a68;">${escape(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

const orderFooter = (t: Translator, number: number) => t("email.footer", { number, store: STORE_NAME });
const viewOrder = (t: Translator, url: string) => ({ label: t("email.viewOrder"), url });
const paragraph = (text: string) => `<p style="margin:0 0 14px;">${escape(text)}</p>`;

export type OrderEmailData = {
  locale: Locale;
  name: string;
  orderNumber: number;
  // The page the button opens (guest orders include their private token).
  orderUrl: string;
};

/* ---------- 1. order received ---------- */

export type ReceivedData = OrderEmailData & {
  items: { name: string; quantity: number; unitPriceMillimes: number }[];
  subtotalMillimes: number;
  shippingMillimes: number;
  requiresShipping: boolean;
  totalMillimes: number;
  online: boolean;
};

export function orderReceivedEmail(data: ReceivedData): Email {
  const t = createTranslator(data.locale);
  const number = data.orderNumber;
  const rows = data.items
    .map(
      (item) => `<tr>
        <td style="padding:9px 0;border-bottom:1px dashed ${INK};">${escape(item.name)} <span style="color:#847a68;">&times; ${item.quantity}</span></td>
        <td align="right" style="padding:9px 0;border-bottom:1px dashed ${INK};font-family:${MONO};white-space:nowrap;">${formatMillimes(item.unitPriceMillimes * item.quantity)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:5px 0;${strong ? `font-family:${DISPLAY};font-size:22px;text-transform:uppercase;` : ""}">${escape(label)}</td><td align="right" style="padding:5px 0;font-family:${MONO};${strong ? "font-weight:bold;font-size:16px;" : ""}">${value}</td></tr>`;
  const shipping = data.requiresShipping ? (data.shippingMillimes === 0 ? t("summary.free") : formatMillimes(data.shippingMillimes)) : t("summary.notNeeded");

  const body = `${paragraph(t("email.hello", { name: data.name }))}
    <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:6px 0 2px;">${escape(t("email.itemsTitle"))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
      ${line(t("summary.subtotal"), formatMillimes(data.subtotalMillimes))}${line(t("summary.shipping"), escape(shipping))}${line(t("summary.total"), formatMillimes(data.totalMillimes), true)}
    </table>
    <p style="margin:16px 0 0;padding:12px 14px;background:${PAPER};border:2px solid ${INK};">${escape(data.online ? t("email.orderNextOnline") : t("email.orderNextCod"))}</p>`;

  const text = [
    t("email.hello", { name: data.name }),
    t("email.orderIntro", { number }),
    ...data.items.map((item) => `- ${item.name} x ${item.quantity}  ${formatMillimes(item.unitPriceMillimes * item.quantity)}`),
    `${t("summary.total")}: ${formatMillimes(data.totalMillimes)}`,
    data.online ? t("email.orderNextOnline") : t("email.orderNextCod"),
    `${t("email.viewOrder")}: ${data.orderUrl}`,
  ].join("\n");

  return {
    subject: t("email.orderSubject", { number }),
    html: frame({ t, footer: orderFooter(t, number), kicker: t("email.orderKicker"), title: t("email.orderTitle"), intro: t("email.orderIntro", { number }), body, button: viewOrder(t, data.orderUrl) }),
    text,
  };
}

/* ---------- 2. payment confirmed ---------- */

// `fulfilment` = when the order will be delivered (see fulfilmentText in services/order-notifications.ts).
export function paymentConfirmedEmail(data: OrderEmailData & { fulfilment: string }): Email {
  const t = createTranslator(data.locale);
  const number = data.orderNumber;
  const body = `${paragraph(t("email.hello", { name: data.name }))}
    <p style="margin:0;padding:14px 16px;background:${PAPER};border:2px solid ${INK};">${escape(data.fulfilment)}</p>`;

  return {
    subject: t("email.paidSubject", { number }),
    html: frame({ t, footer: orderFooter(t, number), kicker: t("email.paidKicker"), title: t("email.paidTitle"), intro: t("email.paidIntro", { number }), body, button: viewOrder(t, data.orderUrl) }),
    text: [t("email.hello", { name: data.name }), data.fulfilment, `${t("email.viewOrder")}: ${data.orderUrl}`].join("\n\n"),
  };
}

/* ---------- 3. delivery (sent by the admin) ---------- */

export function deliveryEmail(data: OrderEmailData & { message: string }): Email {
  const t = createTranslator(data.locale);
  const number = data.orderNumber;
  const body = `${paragraph(t("email.hello", { name: data.name }))}
    <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:6px 0 8px;">${escape(t("email.deliveryBox"))}</div>
    <div style="background:${INK};color:${PAPER};border:2px solid ${INK};padding:18px 20px;font-family:${MONO};font-size:15px;line-height:1.6;word-break:break-word;">${withBreaks(data.message)}</div>
    <p style="margin:16px 0 8px;padding:12px 14px;background:${YELLOW};border:2px solid ${INK};">${escape(t("email.deliverySecurity"))}</p>
    ${paragraph(t("email.deliveryHelp"))}`;

  return {
    subject: t("email.deliverySubject", { number }),
    html: frame({ t, footer: orderFooter(t, number), kicker: t("email.deliveryKicker"), title: t("email.deliveryTitle"), intro: t("email.deliveryIntro", { number }), body, button: viewOrder(t, data.orderUrl) }),
    text: [t("email.hello", { name: data.name }), t("email.deliveryIntro", { number }), "----", data.message, "----", t("email.deliverySecurity"), `${t("email.viewOrder")}: ${data.orderUrl}`].join("\n\n"),
  };
}

/* ---------- 4. sign-up / sign-in code ---------- */

export type CodeType = "email-verification" | "sign-in" | "forget-password" | "change-email";

export function verificationCodeEmail(data: { locale: Locale; code: string; type: CodeType }): Email {
  const t = createTranslator(data.locale);
  const subject = t.messages.email.otpSubject[data.type];
  const body = `<div style="text-align:center;margin:4px 0 18px;"><span style="display:inline-block;background:${INK};color:${YELLOW};font-family:${MONO};font-size:36px;font-weight:bold;letter-spacing:10px;padding:16px 24px 16px 34px;">${escape(data.code)}</span></div>
    ${paragraph(t("email.otpIgnore"))}`;

  return {
    subject,
    html: frame({ t, footer: t("email.otpFooter", { store: STORE_NAME }), kicker: t("email.otpKicker"), title: subject, intro: t("email.otpIntro"), body }),
    text: [subject, data.code, t("email.otpIntro"), t("email.otpIgnore")].join("\n\n"),
  };
}

/* ---------- 5. new order, for the shop owner ---------- */

export function adminNewOrderEmail(data: {
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: { name: string; quantity: number }[];
  totalMillimes: number;
  paymentLabel: string;
  adminUrl: string;
}): Email {
  const t = createTranslator("en");
  const title = `New order #${data.orderNumber}`;
  const rows = data.items.map((item) => `<li style="margin:0 0 4px;">${escape(item.name)} &times; ${item.quantity}</li>`).join("");
  const facts = [
    ["Customer", `${data.customerName} · ${data.customerEmail}${data.customerPhone ? ` · ${data.customerPhone}` : ""}`],
    ["Payment", data.paymentLabel],
    ["Total", formatMillimes(data.totalMillimes)],
  ];
  const body = `<ul style="margin:0 0 14px;padding-left:18px;">${rows}</ul>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${facts
      .map(([k, v]) => `<tr><td style="padding:4px 0;font-family:${MONO};font-size:12px;letter-spacing:1px;text-transform:uppercase;width:110px;">${k}</td><td style="padding:4px 0;">${escape(v!)}</td></tr>`)
      .join("")}</table>`;

  return {
    subject: `${title} — ${formatMillimes(data.totalMillimes)}`,
    html: frame({ t, footer: `Sent by ${STORE_NAME} because a new order was placed.`, kicker: "New order", title, intro: `${data.customerName} just ordered ${data.items.length} item(s).`, body, button: { label: "Open in admin", url: data.adminUrl } }),
    text: [title, ...data.items.map((i) => `- ${i.name} x ${i.quantity}`), ...facts.map(([k, v]) => `${k}: ${v}`), `Open in admin: ${data.adminUrl}`].join("\n"),
  };
}

/* ---------- 6. short alert for the shop owner ---------- */

export function adminAlertEmail(data: { kicker: string; title: string; intro: string; adminUrl: string }): Email {
  const t = createTranslator("en");
  return {
    subject: data.title,
    html: frame({ t, footer: `Sent by ${STORE_NAME}.`, kicker: data.kicker, title: data.title, intro: data.intro, body: "", button: { label: "Open in admin", url: data.adminUrl } }),
    text: [data.title, data.intro, `Open in admin: ${data.adminUrl}`].join("\n\n"),
  };
}

/* ---------- 7. AliExpress tracking updates (for whoever turned them on) ---------- */

export function trackingCodeEmail(data: { locale: Locale; code: string; reference: number }): Email {
  const t = createTranslator(data.locale);
  const subject = t("email.trackingCodeSubject", { reference: data.reference });
  const intro = t("email.trackingCodeIntro", { reference: data.reference });
  const body = `<div style="text-align:center;margin:4px 0 18px;"><span style="display:inline-block;background:${INK};color:${YELLOW};font-family:${MONO};font-size:36px;font-weight:bold;letter-spacing:10px;padding:16px 24px 16px 34px;">${escape(data.code)}</span></div>
    ${paragraph(t("email.trackingCodeIgnore"))}`;

  return {
    subject,
    html: frame({ t, footer: t("email.otpFooter", { store: STORE_NAME }), kicker: t("email.trackingKicker"), title: subject, intro, body }),
    text: [subject, data.code, intro, t("email.trackingCodeIgnore")].join("\n\n"),
  };
}

// `itemNames`: the items this update is about; [null] means every item of the order.
export function trackingUpdateEmail(data: {
  locale: Locale;
  reference: number;
  statusLabel: string;
  itemNames: (string | null)[];
  note: string;
  trackingUrl: string;
  unsubscribeUrl: string;
}): Email {
  const t = createTranslator(data.locale);
  const subject = t("email.trackingUpdateSubject", { reference: data.reference, status: data.statusLabel });
  const intro = t("email.trackingUpdateIntro", { reference: data.reference });
  const names = data.itemNames.map((name) => name ?? t("email.trackingAllItems"));
  const rows = names
    .map((name) => `<tr><td style="padding:8px 0;border-bottom:1px dashed ${INK};">${escape(name)}</td><td align="right" style="padding:8px 0;border-bottom:1px dashed ${INK};font-family:${MONO};font-weight:bold;">${escape(data.statusLabel)}</td></tr>`)
    .join("");
  const note = data.note ? `<p style="margin:16px 0 0;padding:12px 14px;background:${PAPER};border:2px solid ${INK};"><strong>${escape(t("email.trackingNote"))}</strong> ${escape(data.note)}</p>` : "";
  const stop = `<p style="margin:22px 0 0;font-size:12px;color:#847a68;">${escape(t("email.trackingWhy", { reference: data.reference }))} <a href="${escape(data.unsubscribeUrl)}" style="color:#847a68;">${escape(t("email.trackingStop"))}</a></p>`;
  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${note}`;

  return {
    subject,
    html: frame({ t, footer: t("email.trackingFooter", { store: STORE_NAME }), kicker: t("email.trackingKicker"), title: data.statusLabel, intro, body, button: { label: t("email.trackingFollow"), url: data.trackingUrl }, after: stop }),
    text: [subject, intro, ...names.map((name) => `- ${name}: ${data.statusLabel}`), data.note ? `${t("email.trackingNote")} ${data.note}` : "", `${t("email.trackingFollow")}: ${data.trackingUrl}`, `${t("email.trackingStop")}: ${data.unsubscribeUrl}`].filter(Boolean).join("\n\n"),
  };
}

// Sent once the code is confirmed: proof that the updates will reach this inbox.
export function trackingSubscribedEmail(data: { locale: Locale; reference: number; statusLabel: string; trackingUrl: string; unsubscribeUrl: string }): Email {
  const t = createTranslator(data.locale);
  const subject = t("email.trackingOnSubject", { reference: data.reference });
  const intro = t("email.trackingOnIntro", { reference: data.reference });
  const body = `${paragraph(t("email.trackingOnText"))}
    <p style="margin:0;padding:12px 14px;background:${PAPER};border:2px solid ${INK};"><strong>${escape(t("email.trackingOnNow"))}</strong> ${escape(data.statusLabel)}</p>`;
  const stop = `<p style="margin:22px 0 0;font-size:12px;color:#847a68;">${escape(t("email.trackingWhy", { reference: data.reference }))} <a href="${escape(data.unsubscribeUrl)}" style="color:#847a68;">${escape(t("email.trackingStop"))}</a></p>`;

  return {
    subject,
    html: frame({ t, footer: t("email.trackingFooter", { store: STORE_NAME }), kicker: t("email.trackingKicker"), title: t("email.trackingOnTitle"), intro, body, button: { label: t("email.trackingFollow"), url: data.trackingUrl }, after: stop }),
    text: [subject, intro, t("email.trackingOnText"), `${t("email.trackingOnNow")} ${data.statusLabel}`, `${t("email.trackingFollow")}: ${data.trackingUrl}`, `${t("email.trackingStop")}: ${data.unsubscribeUrl}`].join("\n\n"),
  };
}
