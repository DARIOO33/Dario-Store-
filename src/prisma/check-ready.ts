import "dotenv/config";
import { printReadiness } from "../lib/readiness";

// npm run check:ready — the launch checklist, without starting the server.
printReadiness();
