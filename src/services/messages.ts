// Business rules for the order chat and payment proofs. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { MessageRepository } from "../prisma/messages";
import { OrderRepository } from "../prisma/orders";
import { userError } from "../lib/result";
import { now } from "../lib/time";
import { SENSITIVE_MESSAGE_DAYS } from "../lib/store";
import { sniffImageType } from "../lib/image-type";
import { ChatImages } from "./chat-images";

const MAX_LENGTH = 1000;
const MAX_PER_MINUTE = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Viewer = { id: string; role: string; name?: string } | null;

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
// admins. The caller says which side they're speaking as, and we check they
// really are that side. Guests and everyone else get nothing.
async function accessFor(orderId: string, viewer: Viewer, asAdmin: boolean) {
  if (!viewer) return null;

  const order = await OrderRepository.findById(orderId);
  if (!order) return null;

  const allowed = asAdmin ? viewer.role === "ADMIN" : order.userId === viewer.id;

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

    return { messages: messages.map((message) => toChat(message, access.asAdmin)), closed: order.status === "CANCELLED", payment };
  },

  send: async (orderId: string, viewer: Viewer, asAdmin: boolean, text: string, image?: { bytes: Uint8Array }, sensitive = false) => {
    const access = await accessFor(orderId, viewer, asAdmin);
    if (!access) throw userError("errors.writeDenied");
    if (access.order.status === "CANCELLED") throw userError("errors.chatClosed");

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

  // Either side of the chat can erase a "login details" message right away (for example once the top-up is done).
  wipe: async (orderId: string, viewer: Viewer, asAdmin: boolean, messageId: string) => {
    const access = await accessFor(orderId, viewer, asAdmin);
    if (!access) throw userError("errors.writeDenied");

    const message = await MessageRepository.findById(messageId);
    if (!message || message.orderId !== orderId || !message.sensitive) throw userError("errors.orderNotFound");

    await wipeMessage(messageId);
  },

  // Only the order's owner or an admin can see a photo.
  getImage: async (messageId: string, viewer: Viewer) => {
    if (!viewer) return null;

    const message = await MessageRepository.findById(messageId);
    if (!message?.hasImage) return null;

    const order = await OrderRepository.findById(message.orderId);
    if (!order || (viewer.role !== "ADMIN" && order.userId !== viewer.id)) return null;

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
