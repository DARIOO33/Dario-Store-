"use server";

// The public tracking page's email updates. No login: anyone with the tracking link can ask, and the
// service makes sure only the owner of an address can turn them on (6-digit code) and limits how often.

import { safely } from "../lib/result";
import { getLocale } from "../i18n/server";
import { ShipmentNotifications } from "../services/shipment-notifications";

export async function requestTrackingAlertsCodeAction(trackingCode: string, email: string) {
  const locale = await getLocale();
  return await safely(async () => await ShipmentNotifications.requestCode(String(trackingCode), String(email ?? ""), locale));
}

export async function verifyTrackingAlertsAction(trackingCode: string, email: string, code: string) {
  return await safely(async () => {
    await ShipmentNotifications.verifyCode(String(trackingCode), String(email ?? ""), String(code ?? ""));
  });
}

export async function stopTrackingAlertsAction(token: string) {
  return await safely(async () => {
    await ShipmentNotifications.unsubscribe(String(token ?? ""));
  });
}
