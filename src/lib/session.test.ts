import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: null as null | { user: Record<string, unknown>; session: { token: string } }, deleted: [] as string[] }));

vi.mock("./auth", () => ({
  auth: {
    api: { getSession: async () => state.session },
    $context: Promise.resolve({ internalAdapter: { deleteSession: async (token: string) => void state.deleted.push(token) } }),
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { getCurrentUser, requireRole, requireSession } from "./session";

const user = (changes: Record<string, unknown> = {}) => ({ id: "user-1", name: "Sami", email: "zz-sami@example.tn", role: "MEMBER", emailVerified: true, ...changes });

beforeEach(() => {
  state.session = null;
  state.deleted.length = 0;
});

describe("getCurrentUser", () => {
  it("returns the logged-in user when their email is verified", async () => {
    state.session = { user: user(), session: { token: "tok-1" } };
    await expect(getCurrentUser()).resolves.toMatchObject({ id: "user-1" });
    expect(state.deleted).toEqual([]);
  });

  it("returns null for a guest", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("[fixed] ends the session of a user whose email is no longer verified and treats them as a guest", async () => {
    state.session = { user: user({ emailVerified: false }), session: { token: "tok-2" } };

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(state.deleted).toEqual(["tok-2"]);
  });

  it("[fixed] an unverified account can't pass requireSession / requireRole, even an admin", async () => {
    state.session = { user: user({ emailVerified: false, role: "ADMIN" }), session: { token: "tok-3" } };

    await expect(requireSession()).rejects.toThrow("Unauthorized");
    await expect(requireRole("ADMIN")).rejects.toThrow("Unauthorized");
  });
});
