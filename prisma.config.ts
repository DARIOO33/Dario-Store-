// Load .env like the app does (src/lib/auth.ts), so `npm run db:update` changes the database the app
// really uses. Without it the fallback below (a local Postgres) was used silently. A DATABASE_URL
// already set in the shell still wins: dotenv never overrides it.
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  skills: {
    agents: [],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: process.env.DATABASE_URL ?? "postgresql://postgres:postgres123@localhost:5432/membership",
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
