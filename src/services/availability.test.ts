import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma/support-status", () => ({ SupportStatusRepository: { find: vi.fn(), save: vi.fn() } }));

import { SupportStatusRepository } from "../prisma/support-status";
import { AvailabilityService } from "./availability";

const repo = vi.mocked(SupportStatusRepository);
const inTunis = (hours: number) => Temporal.Now.zonedDateTimeISO("Africa/Tunis").add({ hours }).toPlainDateTime().toString({ smallestUnit: "minute" });

beforeEach(() => {
  vi.resetAllMocks();
  repo.find.mockResolvedValue(null);
});

describe("AvailabilityService", () => {
  it("uses 15 minutes when nothing was set, and ignores an 'away' that has passed", async () => {
    await expect(AvailabilityService.current()).resolves.toEqual({ responseMinutes: 15, awayUntilMs: null });

    repo.find.mockResolvedValue({ responseMinutes: 30, awayUntil: Temporal.Now.instant().subtract({ hours: 1 }) } as never);
    await expect(AvailabilityService.current()).resolves.toEqual({ responseMinutes: 30, awayUntilMs: null });
  });

  it("accepts a response time between 1 minute and 24 hours", async () => {
    await AvailabilityService.setAvailable(20);
    expect(repo.save).toHaveBeenCalledWith({ responseMinutes: 20, awayUntil: null });

    for (const minutes of [0, -1, 1.5, 24 * 60 + 1, Number.NaN]) {
      await expect(AvailabilityService.setAvailable(minutes)).rejects.toThrow(/between 1 minute and 24 hours/);
    }
  });

  it("accepts an 'away until' in the next 60 days only", async () => {
    await AvailabilityService.setAway(inTunis(10));
    expect(repo.save).toHaveBeenCalledOnce();

    await expect(AvailabilityService.setAway(inTunis(-1))).rejects.toThrow(/future/);
    await expect(AvailabilityService.setAway(inTunis(61 * 24))).rejects.toThrow(/60 days/);
    await expect(AvailabilityService.setAway("tomorrow")).rejects.toThrow(/Pick the date/);
  });
});
