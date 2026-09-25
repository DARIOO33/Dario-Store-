import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryService } from "@/src/services/categories";
import { ProductService } from "@/src/services/products";
import ProductForm from "@/src/components/admin/ProductForm";
import { cloudinaryConfigured } from "@/src/lib/cloudinary";
import { millimesToInput } from "@/src/lib/money";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([ProductService.getForAdmin(id), CategoryService.list()]);

  if (!product) notFound();

  return (
    <>
      <header className="adminHead">
        <div>
          <Link href="/admin/products" className="linkBtn">
            ← Products
          </Link>
          <h1>{product.name}</h1>
        </div>
        <Link href={`/products/${product.slug}`} className="btn btnGhost">
          View in store ↗
        </Link>
      </header>
      <div className="panel formPanel">
        <ProductForm
          productId={product.id}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          canUpload={cloudinaryConfigured()}
          initial={{
            name: product.name,
            description: product.description,
            nameFr: product.nameFr,
            descriptionFr: product.descriptionFr,
            type: product.type,
            price: millimesToInput(product.priceMillimes),
            stock: product.stock === null ? "" : String(product.stock),
            categoryId: product.categoryId ?? "",
            imageUrls: product.images.map((image) => image.url).join("\n"),
            featured: product.featured,
            active: product.active,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              price: millimesToInput(variant.priceMillimes),
              stock: variant.stock === null ? "" : String(variant.stock),
              imageUrl: variant.imageUrl ?? "",
              active: variant.active,
            })),
          }}
        />
      </div>
    </>
  );
}
