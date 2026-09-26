import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guard rails that fail as soon as a new page or action forgets its access check.
const files = (dir: string, name: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name), name) : name.test(entry.name) ? [join(dir, entry.name)] : [],
  );

describe("admin pages", () => {
  const pages = files("src/app/admin", /^page\.tsx$/);

  it("finds the admin pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(11);
  });

  // [fixed] The admin layout alone is not enough: Next.js skips the layout when the browser says it
  // already has it (client-side navigation), so a hand-made request could render just the page.
  it.each(pages)("%s checks the role itself", (page) => {
    expect(readFileSync(page, "utf8")).toMatch(/await requirePageRole\(("ADMIN"|\.\.\.TEAM)\)/);
  });

  // Staff may only open these; everything else (products, categories, reviews, dashboard figures)
  // stays ADMIN only. A page added to this list must be a deliberate choice.
  it("lets staff into the order and shipment pages only", () => {
    const forStaff = pages.filter((page) => readFileSync(page, "utf8").includes("requirePageRole(...TEAM)")).sort();
    expect(forStaff).toEqual([
      "src/app/admin/orders/[id]/page.tsx",
      "src/app/admin/orders/page.tsx",
      "src/app/admin/page.tsx", // redirects staff to the orders list before loading anything
      "src/app/admin/shipments/[id]/page.tsx",
      "src/app/admin/shipments/new/page.tsx",
      "src/app/admin/shipments/page.tsx",
    ]);
    expect(readFileSync("src/app/admin/page.tsx", "utf8")).toMatch(/if \(viewer\.role !== "ADMIN"\) redirect\("\/admin\/orders"\);/);
  });
});

describe("server actions", () => {
  const actionFiles = files("src/actions", /^(?!.*\.test\.).*\.ts$/);

  it.each(actionFiles)("%s: every exported action checks the caller or is deliberately public", (file) => {
    const source = readFileSync(file, "utf8");
    const actions = source.split(/^export async function /m).slice(1);
    const PUBLIC = ["getCartLinesAction", "setLocaleAction", "placeOrderAction"];

    for (const action of actions) {
      const name = action.slice(0, action.indexOf("("));
      if (PUBLIC.includes(name)) continue;
      expect(action, `${name} in ${file}`).toMatch(/await (requireRole|getCurrentUser)\(/);
    }
  });
});
