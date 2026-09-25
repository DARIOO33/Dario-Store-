import type { Metadata } from "next";
import { CategoryService } from "@/src/services/categories";
import CategoryManager from "@/src/components/admin/CategoryManager";
import { getLocale } from "@/src/i18n/server";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
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
