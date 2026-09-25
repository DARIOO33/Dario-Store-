import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { UserRole } from "./roles";

// For pages and layouts: send visitors somewhere sensible instead of failing.
// (Server actions use `requireRole` from ./session, which throws instead.)
export async function requirePageRole(...roles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
