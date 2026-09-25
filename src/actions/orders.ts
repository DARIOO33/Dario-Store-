"use server";

// Server actions for orders: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireRole } from "../lib/session";
import { safely, UserError, userError } from "../lib/result";
import { getLocale } from "../i18n/server";
import { OrderService } from "../services/orders";
import type { OrderStatus } from "../prisma/orders";
import { ORDER_STATUSES } from "../prisma/orders";

export type PlaceOrderInput = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  paymentMethod: string;
  cryptoNetwork: string;
};

// Physical-only orders can be placed as a guest (they get a secret order
// link); anything digital needs a signed-in account, checked in the service.
export async function placeOrderAction(input: PlaceOrderInput) {
  const items = Array.isArray(input?.items) ? input.items : [];
  const user = await getCurrentUser();
  const locale = await getLocale();

  return await safely(async () => {
    if (
      !items.every(
        (item) =>
          typeof item?.productId === "string" &&
          typeof item?.quantity === "number" &&
          (item.variantId === undefined || item.variantId === null || typeof item.variantId === "string"),
      )
    ) {
      throw userError("errors.cartInvalid");
    }

    const result = await OrderService.place({
      items,
      name: String(input.name ?? ""),
      email: String(input.email ?? ""),
      phone: String(input.phone ?? ""),
      address: String(input.address ?? ""),
      city: String(input.city ?? ""),
      postalCode: String(input.postalCode ?? ""),
      notes: String(input.notes ?? ""),
      paymentMethod: String(input.paymentMethod ?? ""),
      cryptoNetwork: String(input.cryptoNetwork ?? ""),
      userId: user?.id ?? null,
      locale,
    });

    revalidatePath("/admin", "layout");
    return result;
  });
}

export async function cancelMyOrderAction(orderId: string, token: string | null) {
  const user = await getCurrentUser();

  return await safely(async () => {
    await OrderService.cancelIfPending(orderId, user, token);
    revalidatePath("/admin", "layout");
  });
}

// The admin's "send delivery email" panel.
export async function sendDeliveryEmailAction(orderId: string, message: string, markDelivered: boolean) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await OrderService.deliverByEmail(String(orderId), { message: String(message ?? ""), markDelivered: markDelivered === true });
    revalidatePath("/admin", "layout");
    revalidatePath(`/order/${orderId}`);
  });
}

export async function previewDeliveryEmailAction(orderId: string, message: string) {
  await requireRole("ADMIN");

  return await safely(async () => ({ html: await OrderService.previewDeliveryEmail(String(orderId), String(message ?? "")) }));
}

export async function setOrderStatusAction(orderId: string, status: OrderStatus) {
  await requireRole("ADMIN");

  return await safely(async () => {
    if (!ORDER_STATUSES.includes(status)) throw new UserError("Unknown status.");

    await OrderService.setStatus(orderId, status);
    revalidatePath("/admin", "layout");
  });
}
