import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  skills: {
    agents: [],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: "postgresql://postgres:postgres123@localhost:5432/membership",
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
