import type { Metadata } from "next";
import { requirePageRole } from "@/src/lib/guards";
import AdminNav from "@/src/components/admin/AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("ADMIN");

  return (
    <div className="adminShell">
      <AdminNav name={user.name} />
      <main className="adminMain">{children}</main>
    </div>
  );
}
