// Database access for user accounts (the better-auth table): read-only queries the shop needs.

import { db } from "./db";

export const UserRepository = {
  findAdmins: async () => {
    return await db.orm.public.User.where({ role: "ADMIN" }).all();
  },
};
