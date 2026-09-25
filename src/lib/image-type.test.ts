import { describe, expect, it } from "vitest";
import { sniffImageType } from "./image-type";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("sniffImageType", () => {
  it("recognises JPEG, PNG and WebP from their first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });

  it("rejects SVG, other RIFF files and random bytes", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull();
    expect(sniffImageType(bytes(1, 2, 3))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });
});
