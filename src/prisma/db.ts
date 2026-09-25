import postgres from "@prisma/orm-postgres/runtime";

import "temporal-polyfill/global";

import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

// The one database client for the whole app. When deployed with Prisma
// Composer the service binding provides it; locally it connects with the
// DATABASE_URL from .env. The Next app connects on its first query; standalone
// scripts (like the seed) call connectDatabase() themselves.
function loadComposerDatabase() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

function createDatabase() {
  return (
    loadComposerDatabase() ??
    (process.env.DATABASE_URL
      ? postgres<Contract>({ contractJson, url: process.env.DATABASE_URL, poolOptions: { idleTimeoutMillis: 10_000 } })
      : postgres<Contract>({ contractJson }))
  );
}

// Next bundles this file more than once (pages, server actions, /api routes). Keeping the client on
// globalThis gives one connection pool per server process instead of one per copy, which is what
// exhausted the database's connections ("EMAXCONN max client connections reached") in production.
const shared = globalThis as typeof globalThis & { database?: ReturnType<typeof createDatabase> };
export const db = (shared.database ??= createDatabase());

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  connection ??= db.connect().then(() => undefined).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
