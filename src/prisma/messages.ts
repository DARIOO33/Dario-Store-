// Database access for order chat messages and their photos: queries only. The rules live in services/messages.ts.
// The one thing done here besides queries: message text and photos are encrypted on the way in and decrypted
// on the way out (lib/crypto.ts), so nothing above this file ever handles ciphertext and nothing forgets to.

import { db } from "./db";
import { now } from "../lib/time";
import { openBase64, openText, sealBase64, sealText } from "../lib/crypto";

type MessageRow = NonNullable<Awaited<ReturnType<typeof db.orm.public.OrderMessage.first>>>;
const decrypted = (message: MessageRow) => ({ ...message, body: openText(message.body) });

export const MessageRepository = {
  // With the sender's name, so the admin can see which staff member wrote what.
  listForOrder: async (orderId: string) => {
    const rows = await db.orm.public.OrderMessage.where({ orderId })
      .orderBy((m) => m.createdAt.asc())
      .include("sender")
      .all();
    return rows.map((row) => ({ ...row, body: openText(row.body) }));
  },

  findById: async (id: string) => {
    const row = await db.orm.public.OrderMessage.first({ id });
    return row ? decrypted(row) : null;
  },

  // `senderUserId` is empty for the messages the shop writes by itself.
  create: async (data: { orderId: string; fromAdmin: boolean; senderUserId?: string | null; body: string; hasImage: boolean; sensitive?: boolean }) => {
    const created = await db.orm.public.OrderMessage.create({ ...data, body: sealText(data.body) });
    return decrypted(created);
  },

  // A photo is either in Cloudinary (`storageKey`, see services/chat-images.ts) or in `dataBase64`.
  createImage: async (data: { messageId: string; mimeType: string; sizeBytes: number; storageKey?: string; dataBase64?: string }) => {
    return await db.orm.public.MessageImage.create({ ...data, dataBase64: data.dataBase64 ? sealBase64(data.dataBase64) : null });
  },

  findImage: async (messageId: string) => {
    const image = await db.orm.public.MessageImage.first({ messageId });
    if (!image) return null;
    // A database photo that can't be decrypted (key changed) reads as "no photo".
    const dataBase64 = image.dataBase64 ? openBase64(image.dataBase64) : null;
    return image.dataBase64 && !dataBase64 ? null : { ...image, dataBase64 };
  },

  findImagesStoredInDatabase: async () => {
    return await db.orm.public.MessageImage.where((i) => i.dataBase64.isNotNull()).all();
  },

  setImageStorage: async (messageId: string, storageKey: string) => {
    return await db.orm.public.MessageImage.where({ messageId }).update({ storageKey, dataBase64: null });
  },

  // Erases a "login details" message for good: its text and its photo row.
  wipe: async (id: string) => {
    await db.orm.public.MessageImage.where({ messageId: id }).delete();
    return await db.orm.public.OrderMessage.where({ id }).update({ body: "", hasImage: false, wipedAt: now() });
  },

  // Login-details messages older than `before` that are still readable.
  findSensitiveBefore: async (before: Temporal.Instant) => {
    return await db.orm.public.OrderMessage.where({ sensitive: true })
      .where((m) => m.wipedAt.isNull())
      .where((m) => m.createdAt.lt(before))
      .all();
  },

  // Has the customer uploaded at least one photo (their payment proof)?
  countCustomerImages: async (orderId: string) => {
    const { total } = await db.orm.public.OrderMessage.where({ orderId, fromAdmin: false, hasImage: true }).aggregate((a) => ({
      total: a.count(),
    }));
    return total;
  },

  countSince: async (orderId: string, fromAdmin: boolean, since: Temporal.Instant) => {
    const { total } = await db.orm.public.OrderMessage.where({ orderId, fromAdmin })
      .where((m) => m.createdAt.gte(since))
      .aggregate((a) => ({ total: a.count() }));
    return total;
  },

  // Messages the other side wrote that this side hasn't opened yet.
  markRead: async (orderId: string, readerIsAdmin: boolean, at: Temporal.Instant) => {
    return await db.orm.public.OrderMessage.where({ orderId, fromAdmin: !readerIsAdmin })
      .where((m) => m.readAt.isNull())
      .updateAndCount({ readAt: at });
  },

  findUnread: async (fromAdmin: boolean, orderIds?: string[]) => {
    if (orderIds && orderIds.length === 0) return [];

    const query = db.orm.public.OrderMessage.where({ fromAdmin }).where((m) => m.readAt.isNull());
    return await (orderIds ? query.where((m) => m.orderId.in(orderIds)) : query).all();
  },
};
