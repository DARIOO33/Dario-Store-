// Where chat photos are kept. With Cloudinary set up, each photo is encrypted (lib/crypto.ts)
// and uploaded as a private file, and only its Cloudinary id is stored in the database. Without
// Cloudinary, the photo is kept in the database as before (also encrypted, see prisma/messages.ts).

import { MessageRepository } from "../prisma/messages";
import { cloudinaryConfigured, deletePrivateFile, downloadPrivateFile, uploadPrivateFile } from "../lib/cloudinary";
import { openBase64, sealBase64 } from "../lib/crypto";

const FOLDER = "dario-store/chat";

type StoredImage = NonNullable<Awaited<ReturnType<typeof MessageRepository.findImage>>>;

export const ChatImages = {
  save: async (messageId: string, image: { bytes: Uint8Array; mimeType: string }) => {
    const base64 = Buffer.from(image.bytes).toString("base64");
    const meta = { messageId, mimeType: image.mimeType, sizeBytes: image.bytes.length };

    if (cloudinaryConfigured()) {
      try {
        const storageKey = await uploadPrivateFile(Buffer.from(sealBase64(base64), "utf8"), FOLDER);
        await MessageRepository.createImage({ ...meta, storageKey });
        return;
      } catch (error) {
        // A customer must never lose their payment proof because Cloudinary is down or misconfigured:
        // keep it in the database; `npm run chat:move-images` moves it later.
        console.error("[chat] Cloudinary upload failed, photo kept in the database:", error);
      }
    }
    await MessageRepository.createImage({ ...meta, dataBase64: base64 });
  },

  // The photo's bytes, or null if it can't be read (missing, or the key changed).
  load: async (image: StoredImage) => {
    if (image.dataBase64) return Buffer.from(image.dataBase64, "base64");
    if (!image.storageKey || !cloudinaryConfigured()) return null;

    try {
      const base64 = openBase64((await downloadPrivateFile(image.storageKey)).toString("utf8"));
      return base64 ? Buffer.from(base64, "base64") : null;
    } catch (error) {
      console.error("[chat] could not load a photo from Cloudinary:", error);
      return null;
    }
  },

  remove: async (image: StoredImage) => {
    if (image.storageKey && cloudinaryConfigured()) await deletePrivateFile(image.storageKey).catch((error) => console.error("[chat] could not delete a photo from Cloudinary:", error));
  },

  // Moves a photo saved in the database to Cloudinary (npm run chat:move-images).
  moveToCloud: async (image: StoredImage) => {
    if (!image.dataBase64 || image.storageKey) return false;

    const storageKey = await uploadPrivateFile(Buffer.from(sealBase64(image.dataBase64), "utf8"), FOLDER);
    await MessageRepository.setImageStorage(image.messageId, storageKey);
    return true;
  },
};
