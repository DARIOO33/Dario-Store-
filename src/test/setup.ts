// The app loads the Temporal polyfill in prisma/db.ts; tests mock the database, so load it here.
import "temporal-polyfill/global";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
