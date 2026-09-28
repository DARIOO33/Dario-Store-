"use server";

// Server actions for AliExpress shipments (the team: admin and staff): check who is calling,
// hand the input to the service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { requireRole } from "../lib/session";
import { TEAM } from "../lib/roles";
import { safely, UserError } from "../lib/result";
import { ShipmentService, type ShipmentFormInput } from "../services/shipments";

function refresh(id?: string) {
  revalidatePath("/admin/shipments");
  if (id) revalidatePath(`/admin/shipments/${id}`);
}

export async function createShipmentAction(input: ShipmentFormInput) {
  await requireRole(...TEAM);

  return await safely(async () => {
    const created = await ShipmentService.create(input);
    refresh();
    return created;
  });
}

export async function updateShipmentAction(id: string, input: ShipmentFormInput) {
  await requireRole(...TEAM);

  return await safely(async () => {
    await ShipmentService.update(String(id), input);
    refresh(String(id));
    revalidatePath("/track", "layout");
  });
}

// Moves the chosen items to a stage (or adds a note); choosing every item updates the whole order.
export async function addShipmentUpdateAction(id: string, itemIds: string[], status: string, note: string) {
  await requireRole(...TEAM);

  return await safely(async () => {
    const ids = Array.isArray(itemIds) ? itemIds.map(String) : [];
    await ShipmentService.addUpdate(String(id), ids, String(status), String(note ?? ""));
    refresh(String(id));
    revalidatePath("/track", "layout");
  });
}

export async function removeShipmentEventAction(shipmentId: string, eventId: string) {
  await requireRole(...TEAM);

  return await safely(async () => {
    await ShipmentService.removeEvent(String(shipmentId), String(eventId));
    refresh(String(shipmentId));
    revalidatePath("/track", "layout");
  });
}

export async function deleteShipmentAction(id: string) {
  await requireRole(...TEAM);

  return await safely(async () => {
    await ShipmentService.remove(String(id));
    refresh();
  });
}

// A photo for a shipment item, uploaded instead of pasting a link. The form carries it in `image`.
export async function uploadShipmentImageAction(form: FormData) {
  await requireRole(...TEAM);

  return await safely(async () => {
    const file = form.get("image");
    if (!(file instanceof File)) throw new UserError("Choose a photo to upload.");
    return await ShipmentService.uploadImage(new Uint8Array(await file.arrayBuffer()));
  });
}
