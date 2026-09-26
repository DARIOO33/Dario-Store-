"use server";

// Server actions for AliExpress shipments (the team: admin and staff): check who is calling,
// hand the input to the service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { requireRole } from "../lib/session";
import { TEAM } from "../lib/roles";
import { safely } from "../lib/result";
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

export async function addShipmentUpdateAction(id: string, status: string, note: string) {
  await requireRole(...TEAM);

  return await safely(async () => {
    await ShipmentService.addUpdate(String(id), String(status), String(note ?? ""));
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
