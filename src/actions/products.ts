"use server";

// Server actions for products: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { requireRole } from "../lib/session";
import { safely, UserError } from "../lib/result";
import { ProductService, type ProductFormInput } from "../services/products";

// The storefront reads products on every request; this refreshes anything
// the browser has cached from a previous visit.
function refreshStore() {
  revalidatePath("/", "layout");
}

// The form carries one photo in `image`.
export async function uploadProductImageAction(form: FormData) {
  await requireRole("ADMIN");

  return await safely(async () => {
    const file = form.get("image");
    if (!(file instanceof File)) throw new UserError("Choose a photo to upload.");
    return await ProductService.uploadImage(new Uint8Array(await file.arrayBuffer()));
  });
}

export async function createProductAction(input: ProductFormInput) {
  await requireRole("ADMIN");

  return await safely(async () => {
    const created = await ProductService.create(input);
    refreshStore();
    return created;
  });
}

export async function updateProductAction(id: string, input: ProductFormInput) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ProductService.update(id, input);
    refreshStore();
  });
}

export async function setProductFeaturedAction(id: string, featured: boolean) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ProductService.setFeatured(id, featured);
    refreshStore();
  });
}

export async function setProductActiveAction(id: string, active: boolean) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ProductService.setActive(id, active);
    refreshStore();
  });
}

export async function deleteProductAction(id: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ProductService.remove(id);
    refreshStore();
  });
}
