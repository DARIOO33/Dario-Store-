import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import type { UserRole } from "./roles";

// The logged-in user (with their role), or null for a guest. For server
// actions, route handlers and server components.
// Remembered for the rest of the request, so the page and its components share one session lookup.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  return session ? (session.user as typeof session.user & { role: UserRole }) : null;
});

// Server actions: throw when nobody is logged in.
export async function requireSession() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

// Server actions: throw unless the user has one of the given roles.
export async function requireRole(...roles: UserRole[]) {
  const user = await requireSession();

  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}
