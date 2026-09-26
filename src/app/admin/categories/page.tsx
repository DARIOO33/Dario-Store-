import type { Metadata } from "next";
import { CategoryService } from "@/src/services/categories";
import CategoryManager from "@/src/components/admin/CategoryManager";
import { getLocale } from "@/src/i18n/server";
import { requirePageRole } from "@/src/lib/guards";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  // Checked here too, not only in the admin layout: a layout is skipped when the browser asks for just this page.
  await requirePageRole("ADMIN");
  const categories = await CategoryService.listWithCounts(await getLocale());

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Categories</h1>
        </div>
      </header>
      <CategoryManager categories={categories} />
    </>
  );
}
