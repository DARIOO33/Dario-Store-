import type { Metadata } from "next";
import Link from "next/link";
import { ProductService } from "@/src/services/products";
import { ActiveToggle, FeaturedToggle, RowActions } from "@/src/components/admin/ProductRowActions";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import Pagination from "@/src/components/ui/Pagination";
import Price from "@/src/components/ui/Price";
import { buildQuery } from "@/src/lib/query";
import { requirePageRole } from "@/src/lib/guards";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 15;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  // Checked here too, not only in the admin layout: a layout is skipped when the browser asks for just this page.
  await requirePageRole("ADMIN");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await ProductService.listForAdmin(q, page, PAGE_SIZE);

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn btnAccent">
          + New product
        </Link>
      </header>

      <form className="adminSearch" action="/admin/products" role="search">
        <input className="input" name="q" type="search" defaultValue={q} placeholder="Search products by name…" aria-label="Search products" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      <p className="muted">{total} product{total === 1 ? "" : "s"}{q ? ` matching “${q}”` : ""}</p>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="muted">Nothing here yet.</p>
        </div>
      ) : (
        <ul className="adminTable" aria-label="Products">
          <li className="adminTableHead" aria-hidden="true">
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Featured</span>
            <span>Visible</span>
            <span />
          </li>
          {rows.map((product) => (
            <li key={product.id} className={product.active ? "" : "isHidden"}>
              <div className="cellProduct">
                <div className="thumb">
                  <ProductMedia imageUrl={product.images[0]?.url ?? null} seed={product.id} alt="" />
                </div>
                <div>
                  <Link href={`/admin/products/${product.id}`} className="cartName">
                    {product.name}
                  </Link>
                  <div className="cartMeta">
                    <span className={`pill ${product.type === "VIRTUAL" ? "pillCobalt" : "pillAmber"}`}>
                      {product.type === "VIRTUAL" ? "Digital" : "Physical"}
                    </span>
                    {product.category && <span className="muted">{product.category.name}</span>}
                  </div>
                </div>
              </div>
              <div data-label="Price">
                <Price millimes={product.priceMillimes} />
              </div>
              <div data-label="Stock">
                {product.stock === null ? <span className="muted">∞</span> : product.stock === 0 ? <span className="pill pillRed">Sold out</span> : product.stock}
              </div>
              <div data-label="Featured">
                <FeaturedToggle id={product.id} name={product.name} featured={product.featured} />
              </div>
              <div data-label="Visible">
                <ActiveToggle id={product.id} name={product.name} active={product.active} />
              </div>
              <RowActions id={product.id} name={product.name} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={pages} href={(p) => `/admin/products${buildQuery({ q, page: p > 1 ? p : undefined })}`} />
    </>
  );
}
