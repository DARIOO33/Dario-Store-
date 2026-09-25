// After `next build`: the standalone server (.next/standalone) needs the public files and the built
// static assets next to it. Runs automatically after `npm run build`.
import { cpSync, existsSync } from "node:fs";

if (existsSync(".next/standalone")) {
  cpSync("public", ".next/standalone/public", { recursive: true });
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  console.log("standalone server ready: npm run start:prod");
}
