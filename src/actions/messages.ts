"use server";

// Server actions for the order chat: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireRole } from "../lib/session";
import { TEAM } from "../lib/roles";
import { safely, userError } from "../lib/result";
import { getLocale } from "../i18n/server";
import { MessageService } from "../services/messages";
import { OrderService } from "../services/orders";

export async function openChatAction(orderId: string, asAdmin: boolean) {
  const user = await getCurrentUser();
  return await safely(() => MessageService.open(String(orderId), user, asAdmin === true));
}

// The form carries `text` and, optionally, a photo in `image`.
export async function sendChatMessageAction(orderId: string, asAdmin: boolean, form: FormData) {
  const user = await getCurrentUser();
  const text = form.get("text");
  const file = form.get("image");

  return await safely(async () => {
    let image: { bytes: Uint8Array } | undefined;

    if (file instanceof File && file.size > 0) {
      image = { bytes: new Uint8Array(await file.arrayBuffer()) };
    } else if (file !== null && !(file instanceof File)) {
      throw userError("errors.notAFile");
    }

    const sensitive = form.get("sensitive") === "true";
    const result = await MessageService.send(String(orderId), user, asAdmin === true, typeof text === "string" ? text : "", image, sensitive);
    revalidatePath("/admin", "layout");
    return result;
  });
}

export async function wipeChatMessageAction(orderId: string, asAdmin: boolean, messageId: string) {
  const user = await getCurrentUser();

  return await safely(async () => {
    await MessageService.wipe(String(orderId), user, asAdmin === true, String(messageId));
  });
}

// The team's "Close chat" / "Reopen chat" button.
export async function setChatClosedAction(orderId: string, closed: boolean) {
  const user = await requireRole(...TEAM);

  return await safely(async () => {
    await MessageService.setClosed(String(orderId), user, closed === true);
    revalidatePath("/admin", "layout");
    revalidatePath(`/order/${orderId}`);
  });
}

export async function markPaymentSentAction(orderId: string) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  return await safely(async () => {
    await OrderService.markPaymentSent(String(orderId), user, locale);
    revalidatePath("/admin", "layout");
    revalidatePath(`/order/${orderId}`);
  });
}

export async function requestNewProofAction(orderId: string) {
  await requireRole(...TEAM);

  return await safely(async () => {
    await OrderService.requestNewProof(String(orderId));
    revalidatePath("/admin", "layout");
  });
}
