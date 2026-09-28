// Photos the team uploads from the admin (products, shipment items). Public on Cloudinary.
import { UserError } from "../lib/result";
import { sniffImageType } from "../lib/image-type";
import { cloudinaryConfigured, uploadPublicImage } from "../lib/cloudinary";

const MAX_BYTES = 6 * 1024 * 1024;

export async function uploadShopPhoto(bytes: Uint8Array, folder: string) {
  if (!cloudinaryConfigured()) throw new UserError("Photo upload needs Cloudinary: add the CLOUDINARY_* settings to .env and restart.");
  if (bytes.length === 0) throw new UserError("That file is empty.");
  if (bytes.length > MAX_BYTES) throw new UserError("That photo is too large (6 MB maximum).");
  if (!sniffImageType(bytes)) throw new UserError("Upload a JPG, PNG or WebP photo.");

  try {
    return { url: await uploadPublicImage(Buffer.from(bytes), folder) };
  } catch (error) {
    console.error("[uploads] Cloudinary upload failed:", error);
    throw new UserError("The upload failed. Check the Cloudinary settings and try again.");
  }
}
