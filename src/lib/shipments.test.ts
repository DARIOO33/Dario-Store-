import { describe, expect, it } from "vitest";
import { normalizeTrackingCode } from "./shipments";

describe("normalizeTrackingCode", () => {
  it("accepts the code however it is typed", () => {
    for (const typed of ["DS-7K4Q9-X2M3F", "ds-7k4q9-x2m3f", " DS7K4Q9X2M3F ", "7k4q9x2m3f"]) expect(normalizeTrackingCode(typed)).toBe("DS-7K4Q9-X2M3F");
  });

  it("returns an empty code for anything else", () => {
    for (const typed of ["", "DS-123", "' OR 1=1 --", "DS-7K4Q9-X2M3F-EXTRA"]) expect(normalizeTrackingCode(typed)).toBe("");
  });
});
