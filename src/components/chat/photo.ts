// Matches the server's limit in services/messages.ts.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;

// Phone photos are big. Shrink them in the browser (max 1600px, JPEG) so the
// upload is quick; if the browser can't decode the file, send it as it is and
// let the server decide.
export async function shrinkImage(file: File, maxSide = MAX_SIDE): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));

    if (!blob || (blob.size >= file.size && scale === 1)) return file;
    return new File([blob], "proof.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
