import { after } from "next/server";

// Work that must finish after the response has been sent, like an email. On Vercel a function is
// paused as soon as it answers, so a plain `void promise` only runs when that instance wakes up again
// (minutes later, or never). `after()` makes the platform wait until the work is done.
// Outside a request (scripts, tests) `after()` throws, and the work simply runs.
export function runAfterResponse(work: () => Promise<unknown>) {
  try {
    after(work);
  } catch {
    void work();
  }
}
