// Business rules for the order chat and payment proofs. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { MessageRepository } from "../prisma/messages";
import { OrderRepository } from "../prisma/orders";
import { UserError, userError } from "../lib/result";
import { now } from "../lib/time";
import { PROBLEM_REPORT_DAYS, SENSITIVE_MESSAGE_DAYS } from "../lib/store";
import { isProblemReason } from "../lib/problems";
import { OrderNotifications } from "./order-notifications";
import { sniffImageType } from "../lib/image-type";
import { ChatImages } from "./chat-images";
import { isTeam } from "../lib/roles";
import { ReviewService, type ChatReviewItem } from "./reviews";
import { createTranslator } from "../i18n/translate";
import { toLocale } from "../i18n/config";

const MAX_LENGTH = 1000;
const MAX_PER_MINUTE = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Viewer = { id: string; role: string; name?: string } | null;

// Why nobody can write any more: the order was cancelled, or the team closed the chat
// (the "Close chat" button). A delivered order's chat stays open until the team closes it.
export type ChatClosure = "cancelled" | "store" | null;

// Whether the customer can reopen a chat the team closed ("Report a problem"): for PROBLEM_REPORT_DAYS
// after delivery (no limit while the order is still on its way), at most once every 24 hours.
export type ProblemReportState =
  | { kind: "available"; until: string | null }
  | { kind: "expired"; days: number }
  | { kind: "wait"; after: string };

// Shown in a delivered order's chat so the customer can review what they bought.
export type ChatReview = { reviewerName: string; items: ChatReviewItem[] };

// What the browser gets: plain values only (no Temporal objects).
export type ChatMessage = {
  id: string;
  fromAdmin: boolean;
  // Shown to admins only: which staff member wrote a store message.
  senderName: string | null;
  body: string;
  hasImage: boolean;
  sensitive: boolean;
  wiped: boolean;
  createdAt: string;
};

export type ChatPayment = {
  // Photos are only for orders paid online.
  online: boolean;
  canMarkSent: boolean;
  hasProof: boolean;
  sentAt: string | null;
  canRequestNewProof: boolean;
  // Once the store has confirmed the payment, the banner shows where the order is instead.
  stage: { status: "PAID" | "SHIPPED" | "DELIVERED"; at: string } | null;
};

// The chat is private to the order: its owner (a signed-in customer) and
// the shop's team (admin and staff). The caller says which side they're speaking as, and we check they
// really are that side. Guests and everyone else get nothing.
async function accessFor(orderId: string, viewer: Viewer, asAdmin: boolean) {
  if (!viewer) return null;

  const order = await OrderRepository.findById(orderId);
  if (!order) return null;

  const allowed = asAdmin ? isTeam(viewer.role) : order.userId === viewer.id;

  return allowed ? { order, asAdmin } : null;
}

type MessageRowForChat = { id: string; fromAdmin: boolean; body: string; hasImage: boolean; sensitive: boolean; wipedAt: Temporal.Instant | null; createdAt: Temporal.Instant; sender?: { name: string } | null };

function toChat(message: MessageRowForChat, forAdmin: boolean): ChatMessage {
  return {
    id: message.id,
    fromAdmin: message.fromAdmin,
    senderName: forAdmin && message.fromAdmin ? (message.sender?.name ?? null) : null,
    body: message.body,
    hasImage: message.hasImage,
    sensitive: message.sensitive,
    wiped: !!message.wipedAt,
    createdAt: message.createdAt.toString(),
  };
}


// The stage the order is at and when it got there. Orders from before these dates were recorded
// fall back to their last update.
function currentStage(order: { status: string; updatedAt: Temporal.Instant; paidAt: Temporal.Instant | null; shippedAt: Temporal.Instant | null; deliveredAt: Temporal.Instant | null }): ChatPayment["stage"] {
  const at = { PAID: order.paidAt, SHIPPED: order.shippedAt, DELIVERED: order.deliveredAt }[order.status];
  if (at === undefined) return null;

  return { status: order.status as "PAID" | "SHIPPED" | "DELIVERED", at: (at ?? order.updatedAt).toString() };
}

// Login details don't stay around: old ones (in every chat) are erased when a chat is opened.
// Chats refresh every few seconds, so this runs at most once every 10 minutes per server.
let lastErase = 0;

function closureOf(order: { status: string; chatClosedAt: Temporal.Instant | null }): ChatClosure {
  if (order.status === "CANCELLED") return "cancelled";
  return order.chatClosedAt ? "store" : null;
}

const REPORT_EVERY_HOURS = 24;

function problemReportState(order: { deliveredAt: Temporal.Instant | null; problemReportedAt: Temporal.Instant | null }): ProblemReportState {
  const current = now();
  const until = order.deliveredAt?.add({ hours: PROBLEM_REPORT_DAYS * 24 }) ?? null;
  if (until && Temporal.Instant.compare(current, until) > 0) return { kind: "expired", days: PROBLEM_REPORT_DAYS };

  const after = order.problemReportedAt?.add({ hours: REPORT_EVERY_HOURS });
  if (after && Temporal.Instant.compare(current, after) < 0) return { kind: "wait", after: after.toString() };

  return { kind: "available", until: until?.toString() ?? null };
}

// Deletes the photo (wherever it's kept), then blanks the message.
async function wipeMessage(messageId: string) {
  const image = await MessageRepository.findImage(messageId);
  if (image) await ChatImages.remove(image);
  await MessageRepository.wipe(messageId);
}

async function eraseOldLoginDetails() {
  if (Date.now() - lastErase < 10 * 60 * 1000) return;
  lastErase = Date.now();
  for (const message of await MessageRepository.findSensitiveBefore(now().subtract({ hours: SENSITIVE_MESSAGE_DAYS * 24 }))) {
    await wipeMessage(message.id);
  }
}

export const MessageService = {
  // Opening the chat marks the other side's messages as read.
  open: async (orderId: string, viewer: Viewer, asAdmin: boolean) => {
    const access = await accessFor(orderId, viewer, asAdmin);
    if (!access) throw userError("errors.openDenied");

    const { order } = access;
    await eraseOldLoginDetails();
    await MessageRepository.markRead(orderId, access.asAdmin, now());
    const messages = await MessageRepository.listForOrder(orderId);

    const online = order.paymentMethod !== "CASH_ON_DELIVERY";
    const awaiting = order.status === "PENDING" && online;
    const submitted = order.paymentStatus === "SUBMITTED";
    const payment: ChatPayment = {
      online,
      canMarkSent: !access.asAdmin && awaiting && !submitted,
      hasProof: (await MessageRepository.countCustomerImages(orderId)) > 0,
      sentAt: submitted && order.paymentSentAt ? order.paymentSentAt.toString() : null,
      canRequestNewProof: access.asAdmin && awaiting && submitted,
      stage: currentStage(order),
    };

    const closure = closureOf(order);
    const review: ChatReview | null = access.asAdmin ? null : await ReviewService.forOrderChat({ id: viewer!.id, name: viewer!.name ?? "" }, order);

    const problemReport = !access.asAdmin && closure === "store" ? problemReportState(order) : null;

    return { messages: messages.map((message) => toChat(message, access.asAdmin)), closed: closure !== null, closure, payment, review, problemReport };
  },

  send: async (orderId: string, viewer: Viewer, asAdmin: boolean, text: string, image?: { bytes: Uint8Array }, sensitive = false) => {
    const access = await accessFor(orderId, viewer, asAdmin);
    if (!access) throw userError("errors.writeDenied");
    const closure = closureOf(access.order);
    if (closure === "cancelled") throw userError("errors.chatClosed");
    if (closure === "store") throw userError("errors.chatClosedByStore");

    const body = text.replace(/\r\n/g, "\n").trim();
    if (body.length === 0 && !image) throw userError("errors.emptyMessage");
    if (body.length > MAX_LENGTH) throw userError("errors.messageTooLong", { max: MAX_LENGTH });

    let mimeType: string | null = null;
    if (image) {
      if (access.order.paymentMethod === "CASH_ON_DELIVERY") throw userError("errors.photosOnlinePayment");
      if (image.bytes.length === 0) throw userError("errors.emptyFile");
      if (image.bytes.length > MAX_IMAGE_BYTES) throw userError("errors.photoTooLarge");

      mimeType = sniffImageType(image.bytes);
      if (!mimeType) throw userError("errors.photoFormat");
    }

    const recent = await MessageRepository.countSince(orderId, access.asAdmin, now().subtract({ seconds: 60 }));
    if (recent >= MAX_PER_MINUTE) throw userError("errors.tooFast");

    const message = await MessageRepository.create({ orderId, fromAdmin: access.asAdmin, senderUserId: viewer!.id, body, hasImage: !!image, sensitive });
    if (image && mimeType) await ChatImages.save(message.id, { bytes: image.bytes, mimeType });

    return { message: toChat({ ...message, sender: access.asAdmin ? { name: viewer!.name ?? "" } : null }, access.asAdmin) };
  },

  // The team's "Close chat" / "Reopen chat" button. The customer is told in the chat, in their language.
  setClosed: async (orderId: string, viewer: Viewer, closed: boolean) => {
    const access = await accessFor(orderId, viewer, true);
    if (!access) throw userError("errors.writeDenied");

    const { order } = access;
    if (order.status === "CANCELLED") throw new UserError("A cancelled order's chat stays closed.");
    if (!!order.chatClosedAt === closed) return;

    await OrderRepository.setChatClosed(orderId, closed ? now() : null);
    const t = createTranslator(toLocale(order.locale));
    await MessageRepository.create({ orderId, fromAdmin: true, body: t(closed ? "chatSystem.chatClosed" : "chatSystem.chatReopened"), hasImage: false });
  },

  // "Report a problem" on a chat the team closed: reopens it with the customer's message and alerts the admins.
  reportProblem: async (orderId: string, viewer: Viewer, reason: string, text: string) => {
    const access = await accessFor(orderId, viewer, false);
    if (!access) throw userError("errors.writeDenied");

    const { order } = access;
    const closure = closureOf(order);
    if (closure === "cancelled") throw userError("errors.chatClosed");
    if (closure !== "store") throw userError("errors.chatAlreadyOpen");
    if (!isProblemReason(reason)) throw userError("errors.problemReason");

    const body = text.replace(/\r\n/g, "\n").trim();
    if (body.length === 0) throw userError("errors.emptyMessage");
    if (body.length > MAX_LENGTH) throw userError("errors.messageTooLong", { max: MAX_LENGTH });

    const state = problemReportState(order);
    if (state.kind === "expired") throw userError("errors.problemExpired", { days: state.days });
    if (state.kind === "wait") throw userError("errors.problemWait");

    if (!(await OrderRepository.reopenForProblem(orderId, now()))) throw userError("errors.chatAlreadyOpen");

    const t = createTranslator(toLocale(order.locale));
    const label = t.messages.chat.problemReasons[reason];
    await MessageRepository.create({ orderId, fromAdmin: false, senderUserId: viewer!.id, body: `${t("chatSystem.problemReported", { reason: label })}\n${body}`, hasImage: false });
    void OrderNotifications.problemReported(order, createTranslator("en").messages.chat.problemReasons[reason]);
  },

  // Either side of the chat can erase a "login details" message right away (for example once the top-up is done).
  wipe: async (orderId: string, viewer: Viewer, asAdmin: boolean, messageId: string) => {
    const access = await accessFor(orderId, viewer, asAdmin);
    if (!access) throw userError("errors.writeDenied");

    const message = await MessageRepository.findById(messageId);
    if (!message || message.orderId !== orderId || !message.sensitive) throw userError("errors.orderNotFound");

    await wipeMessage(messageId);
  },

  // Only the order's owner or the team can see a photo.
  getImage: async (messageId: string, viewer: Viewer) => {
    if (!viewer) return null;

    const message = await MessageRepository.findById(messageId);
    if (!message?.hasImage) return null;

    const order = await OrderRepository.findById(message.orderId);
    if (!order || (!isTeam(viewer.role) && order.userId !== viewer.id)) return null;

    const image = await MessageRepository.findImage(messageId);
    const bytes = image ? await ChatImages.load(image) : null;
    return image && bytes ? { mimeType: image.mimeType, bytes } : null;
  },

  // For the little "new message" badges: order id -> number of unread messages.
  unreadForAdmin: async () => {
    const unread = await MessageRepository.findUnread(false);
    return countByOrder(unread);
  },

  unreadForCustomer: async (userId: string) => {
    const orders = await OrderRepository.listForUser(userId);
    const unread = await MessageRepository.findUnread(
      true,
      orders.map((order) => order.id),
    );
    return countByOrder(unread);
  },
};

function countByOrder(messages: { orderId: string }[]) {
  const counts: Record<string, number> = {};
  for (const message of messages) counts[message.orderId] = (counts[message.orderId] ?? 0) + 1;
  return counts;
}
