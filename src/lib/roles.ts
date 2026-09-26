// Mirrors the ROLE enum in contract.prisma.
export type UserRole = "MEMBER" | "STAFF" | "ADMIN";

// The shop's team. ADMIN runs everything; STAFF handles the day-to-day orders: order pages, the
// chat, payment checks, delivery emails and shipments. Products, categories, reviews, refunds,
// availability and the sales dashboard stay ADMIN only.
export const TEAM: UserRole[] = ["ADMIN", "STAFF"];

export function isTeam(role: string | null | undefined) {
  return role === "ADMIN" || role === "STAFF";
}
