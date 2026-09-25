import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

// Image hosting. Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env;
// until all three are set, callers fall back to what they did before (see cloudinaryConfigured()).
export function cloudinaryConfigured() {
  return !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
}

function client() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

function upload(bytes: Buffer, options: Record<string, unknown>) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client().uploader.upload_stream(options, (error, result) => (error || !result ? reject(error ?? new Error("Empty Cloudinary response")) : resolve(result)));
    stream.end(bytes);
  });
}

// Shop photos (products, variants): public, and Cloudinary serves them resized and compressed.
export async function uploadPublicImage(bytes: Buffer, folder: string) {
  const result = await upload(bytes, { resource_type: "image", folder, unique_filename: true, overwrite: false });
  // f_auto,q_auto: each browser gets its best format (WebP/AVIF) at a sensible quality.
  return result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}

// Private files (chat photos): "authenticated" files have no public address; the server
// downloads them with a short-lived signed link. Returns the Cloudinary public_id.
export async function uploadPrivateFile(bytes: Buffer, folder: string) {
  const result = await upload(bytes, { resource_type: "raw", type: "authenticated", folder, unique_filename: true, overwrite: false });
  return result.public_id;
}

export async function downloadPrivateFile(publicId: string) {
  const url = client().utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cloudinary download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export async function deletePrivateFile(publicId: string) {
  await client().uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
}
