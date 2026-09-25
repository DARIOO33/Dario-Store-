// Database access for order chat messages and their photos: queries only. The rules live in services/messages.ts.
// The one thing done here besides queries: message text and photos are encrypted on the way in and decrypted
// on the way out (lib/crypto.ts), so nothing above this file ever handles ciphertext and nothing forgets to.

import { db } from "./db";
import { now } from "../lib/time";
import { openBase64, openText, sealBase64, sealText } from "../lib/crypto";

type MessageRow = NonNullable<Awaited<ReturnType<typeof db.orm.public.OrderMessage.first>>>;
const decrypted = (message: MessageRow) => ({ ...message, body: openText(message.body) });

export const MessageRepository = {
  listForOrder: async (orderId: string) => {
    const rows = await db.orm.public.OrderMessage.where({ orderId })
      .orderBy((m) => m.createdAt.asc())
      .all();
    return rows.map(decrypted);
  },

  findById: async (id: string) => {
    const row = await db.orm.public.OrderMessage.first({ id });
    return row ? decrypted(row) : null;
  },

  create: async (data: { orderId: string; fromAdmin: boolean; body: string; hasImage: boolean; sensitive?: boolean }) => {
    const created = await db.orm.public.OrderMessage.create({ ...data, body: sealText(data.body) });
    return decrypted(created);
  },

  createImage: async (data: { messageId: string; mimeType: string; sizeBytes: number; dataBase64: string }) => {
    return await db.orm.public.MessageImage.create({ ...data, dataBase64: sealBase64(data.dataBase64) });
  },

  findImage: async (messageId: string) => {
    const image = await db.orm.public.MessageImage.first({ messageId });
    const dataBase64 = image ? openBase64(image.dataBase64) : null;
    return image && dataBase64 ? { ...image, dataBase64 } : null;
  },

  // Erases a "login details" message for good: its text and its photo.
  wipe: async (id: string) => {
    await db.orm.public.MessageImage.where({ messageId: id }).delete();
    return await db.orm.public.OrderMessage.where({ id }).update({ body: "", hasImage: false, wipedAt: now() });
  },

  // Login-details messages older than `before` that are still readable.
  wipeSensitiveBefore: async (before: Temporal.Instant) => {
    const old = await db.orm.public.OrderMessage.where({ sensitive: true })
      .where((m) => m.wipedAt.isNull())
      .where((m) => m.createdAt.lt(before))
      .all();

    for (const message of old) await MessageRepository.wipe(message.id);
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
