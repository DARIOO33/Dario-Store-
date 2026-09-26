import { describe, expect, it } from "vitest";
import { formatMillimes, millimesToInput, parseDinars } from "./money";

describe("money (integer millimes)", () => {
  it("parses dinars typed by the admin", () => {
    expect(parseDinars("12")).toBe(12_000);
    expect(parseDinars("12.5")).toBe(12_500);
    expect(parseDinars("12,500")).toBe(12_500);
    expect(parseDinars(" 0.005 ")).toBe(5);
  });

  it("refuses negative, over-precise, huge or non-numeric amounts", () => {
    for (const text of ["-1", "1.2345", "abc", "", "1e3", "12 500", "99999999", "Infinity"]) expect(parseDinars(text)).toBeNull();
  });

  it("formats millimes the same way in every language", () => {
    expect(formatMillimes(12_500).replace(/\s/g, " ")).toBe("12,500 DT");
    expect(millimesToInput(12_500)).toBe("12.500");
  });
});
