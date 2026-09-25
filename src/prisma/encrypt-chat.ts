import "dotenv/config";
import { db, connectDatabase } from "./db";
import { chatEncryptionEnabled, isSealed, sealBase64, sealText } from "../lib/crypto";

// Encrypts the chat messages and photos saved before encryption was switched on.
// Safe to run again: whatever is already encrypted is skipped. Needs CHAT_ENCRYPTION_KEY in .env.
async function main() {
  if (!chatEncryptionEnabled()) throw new Error("Set CHAT_ENCRYPTION_KEY in .env first (make one with: openssl rand -base64 32)");

  await connectDatabase();
  let messages = 0;
  let photos = 0;

  for (const message of await db.orm.public.OrderMessage.all()) {
    if (!message.body || isSealed(message.body)) continue;
    await db.orm.public.OrderMessage.where({ id: message.id }).update({ body: sealText(message.body) });
    messages++;
  }

  for (const image of await db.orm.public.MessageImage.all()) {
    if (!image.dataBase64 || isSealed(image.dataBase64)) continue;
    await db.orm.public.MessageImage.where({ id: image.id }).update({ dataBase64: sealBase64(image.dataBase64) });
    photos++;
  }

  console.log(`Encrypted ${messages} message(s) and ${photos} photo(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
