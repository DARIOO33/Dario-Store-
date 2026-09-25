import "dotenv/config";
import { connectDatabase } from "./db";
import { MessageRepository } from "./messages";
import { ChatImages } from "../services/chat-images";
import { cloudinaryConfigured } from "../lib/cloudinary";

// Moves chat photos that are still stored in the database to Cloudinary (private and encrypted),
// then empties them from the database. Safe to run again: moved photos are skipped.
async function main() {
  if (!cloudinaryConfigured()) throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env first.");

  await connectDatabase();
  let moved = 0;
  for (const row of await MessageRepository.findImagesStoredInDatabase()) {
    const image = await MessageRepository.findImage(row.messageId);
    if (image && (await ChatImages.moveToCloud(image))) moved++;
  }
  console.log(`Moved ${moved} photo(s) to Cloudinary.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
