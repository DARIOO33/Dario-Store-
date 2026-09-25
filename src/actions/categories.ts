"use server";

// Server actions for categories: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { requireRole } from "../lib/session";
import { safely } from "../lib/result";
import { CategoryService } from "../services/categories";

function refreshStore() {
  revalidatePath("/", "layout");
}

export async function createCategoryAction(name: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    const created = await CategoryService.create(name);
    refreshStore();
    return created;
  });
}

export async function renameCategoryAction(id: string, name: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await CategoryService.rename(id, name);
    refreshStore();
  });
}

export async function deleteCategoryAction(id: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await CategoryService.remove(id);
    refreshStore();
  });
}

export async function updateCategorySettingsAction(id: string, input: { blurb: string; nameFr: string; blurbFr: string; inNav: boolean; position: number }) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await CategoryService.updateSettings(String(id), {
      blurb: String(input?.blurb ?? ""),
      nameFr: String(input?.nameFr ?? ""),
      blurbFr: String(input?.blurbFr ?? ""),
      inNav: input?.inNav === true,
      position: Number(input?.position),
    });
    refreshStore();
  });
}
