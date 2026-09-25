// Never trust the browser's file type: look at the first bytes to see what the file really is,
// and only accept ordinary photo formats (no SVG, which can carry scripts).
export function sniffImageType(bytes: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);

  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}
