import type { Metadata } from "next";
import Link from "next/link";
import { CategoryService } from "@/src/services/categories";
import ProductForm from "@/src/components/admin/ProductForm";
import { cloudinaryConfigured } from "@/src/lib/cloudinary";
import { requirePageRole } from "@/src/lib/guards";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  // Checked here too, not only in the admin layout: a layout is skipped when the browser asks for just this page.
  await requirePageRole("ADMIN");
  const categories = await CategoryService.list();

  return (
    <>
      <header className="adminHead">
        <div>
          <Link href="/admin/products" className="linkBtn">
            ← Products
          </Link>
          <h1>New product</h1>
        </div>
      </header>
      <div className="panel formPanel">
        <ProductForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          canUpload={cloudinaryConfigured()}
          initial={{ name: "", description: "", nameFr: "", descriptionFr: "", type: "PHYSICAL", price: "", stock: "", categoryId: "", imageUrls: "", featured: false, active: true, variants: [] }}
        />
      </div>
    </>
  );
}
