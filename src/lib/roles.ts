// Mirrors the ROLE enum in contract.prisma. STAFF exists in the schema but no screen uses it yet.
export type UserRole = "MEMBER" | "STAFF" | "ADMIN";
