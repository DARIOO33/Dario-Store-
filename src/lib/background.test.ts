import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const next = vi.hoisted(() => ({ inRequest: true, scheduled: [] as (() => Promise<unknown>)[] }));
vi.mock("next/server", () => ({
  after: (work: () => Promise<unknown>) => {
    if (!next.inRequest) throw new Error("`after` was called outside a request scope");
    next.scheduled.push(work);
  },
}));

import { runAfterResponse } from "./background";

beforeEach(() => {
  next.inRequest = true;
  next.scheduled.length = 0;
});

describe("runAfterResponse", () => {
  it("[fixed] hands the work to Next's after(), so Vercel keeps running until the email is sent", () => {
    const work = vi.fn(async () => {});
    runAfterResponse(work);

    expect(next.scheduled).toEqual([work]);
    expect(work).not.toHaveBeenCalled(); // Next runs it once the response is sent
  });

  it("just runs the work outside a request (scripts, tests)", () => {
    next.inRequest = false;
    const work = vi.fn(async () => {});
    runAfterResponse(work);

    expect(work).toHaveBeenCalledOnce();
  });
});

// Guard: an email started with a plain `void` is paused with the function on Vercel and arrives
// minutes late (that is what delayed the sign-up codes). Every background email goes through runAfterResponse.
describe("background emails", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [join(dir, entry.name)] : [],
    );

  it.each(files("src"))("%s starts no email with a plain `void`", (file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/void (sendEmail|OrderNotifications\.|notifyTeam|getLocale\(\)[\s\S]{0,80}sendEmail)/);
  });
});
