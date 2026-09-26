"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { STORE_NAME } from "@/src/lib/store";
import type { UserRole } from "@/src/lib/roles";

// `staff`: also shown to STAFF accounts (see lib/roles.ts).
const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders", staff: true },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/shipments", label: "Shipments", staff: true },
];

export default function AdminNav({ name, role }: { name: string; role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="adminSide">
      <Link href={role === "ADMIN" ? "/admin" : "/admin/orders"} className="adminBrand">
        <span className="brandStar" aria-hidden="true">✱</span>
        <span>
          {STORE_NAME}
          <small>control room</small>
        </span>
      </Link>

      <nav className="adminNav" aria-label="Admin">
        {ITEMS.filter((item) => role === "ADMIN" || item.staff).map((item, index) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <span className="navNo">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="adminFoot">
        <Link href="/" className="adminLink">
          View store ↗
        </Link>
        <span className="adminUser">{name}</span>
        <button type="button" className="adminLink" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
