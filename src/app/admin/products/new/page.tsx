import type { Metadata } from "next";
import Link from "next/link";
import { CategoryService } from "@/src/services/categories";
import ProductForm from "@/src/components/admin/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
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
          initial={{ name: "", description: "", nameFr: "", descriptionFr: "", type: "PHYSICAL", price: "", stock: "", categoryId: "", imageUrls: "", featured: false, active: true, variants: [] }}
        />
      </div>
    </>
  );
}
