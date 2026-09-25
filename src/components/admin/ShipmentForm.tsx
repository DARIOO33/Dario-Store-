"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShipmentAction, deleteShipmentAction, updateShipmentAction } from "@/src/actions/shipments";
import { CONTACT_CHANNELS } from "@/src/lib/shipments";
import type { ShipmentFormInput } from "@/src/services/shipments";

type Props = {
  shipmentId?: string;
  initial: ShipmentFormInput;
};

// Create a shipment, or edit its details. Only the item, the parcel number,
// the arrival date and a masked version of the contact details are ever
// shown to the customer; the rest stays here.
export default function ShipmentForm({ shipmentId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof ShipmentFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);

    const result = shipmentId ? await updateShipmentAction(shipmentId, form) : await createShipmentAction(form);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if ("id" in result) {
      router.push(`/admin/shipments/${result.id}`);
    } else {
      setSaved(true);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!shipmentId || !confirm("Delete this shipment and its history? The tracking link will stop working.")) return;

    setBusy(true);
    const result = await deleteShipmentAction(shipmentId);
    setBusy(false);

    if (!result.ok) setError(result.error);
    else router.push("/admin/shipments");
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h3 className="formSection">Customer (kept private — the tracking page only shows a masked version)</h3>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-name">Full name</label>
          <input id="s-name" className="input" value={form.customerName} onChange={set("customerName")} required />
        </div>
        <div className="field">
          <label htmlFor="s-phone">Phone</label>
          <input id="s-phone" className="input" type="tel" placeholder="+216 22 123 456" value={form.customerPhone} onChange={set("customerPhone")} />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-city">City</label>
          <input id="s-city" className="input" value={form.customerCity} onChange={set("customerCity")} />
        </div>
        <div className="field">
          <label htmlFor="s-channel">Contacted you on</label>
          <select id="s-channel" className="input" value={form.contactChannel} onChange={set("contactChannel")}>
            <option value="">—</option>
            {CONTACT_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-address">Street address</label>
        <input id="s-address" className="input" value={form.customerAddress} onChange={set("customerAddress")} />
      </div>

      <h3 className="formSection">The item</h3>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-item">What was ordered</label>
          <input id="s-item" className="input" placeholder="Wireless earbuds, black" value={form.itemName} onChange={set("itemName")} required />
        </div>
        <div className="field">
          <label htmlFor="s-qty">Quantity</label>
          <input id="s-qty" className="input" inputMode="numeric" value={form.quantity} onChange={set("quantity")} required />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-url">AliExpress link (private)</label>
          <input id="s-url" className="input" placeholder="https://aliexpress.com/item/…" value={form.itemUrl} onChange={set("itemUrl")} />
        </div>
        <div className="field">
          <label htmlFor="s-image">Photo link (shown to the customer)</label>
          <input id="s-image" className="input" placeholder="https://…/photo.jpg" value={form.itemImageUrl} onChange={set("itemImageUrl")} />
        </div>
      </div>

      <h3 className="formSection">Shipping</h3>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-carrier">Carrier</label>
          <input id="s-carrier" className="input" placeholder="Cainiao, Yanwen…" value={form.carrier} onChange={set("carrier")} />
        </div>
        <div className="field">
          <label htmlFor="s-parcel">Parcel tracking number</label>
          <input id="s-parcel" className="input" value={form.carrierTrackingNumber} onChange={set("carrierTrackingNumber")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-eta">Estimated arrival</label>
        <input id="s-eta" className="input" type="date" value={form.estimatedArrival} onChange={set("estimatedArrival")} />
      </div>

      <div className="field">
        <label htmlFor="s-notes">Internal notes (private)</label>
        <textarea id="s-notes" className="input" value={form.adminNotes} onChange={set("adminNotes")} />
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="okNote">Saved.</p>}

      <div className="formActions">
        <button type="submit" className="btn btnAccent btnLg" disabled={busy}>
          {busy ? "Saving…" : shipmentId ? "Save details" : "Create shipment"}
        </button>
        {shipmentId && (
          <button type="button" className="btn btnGhost btnLg" onClick={handleDelete} disabled={busy}>
            Delete shipment
          </button>
        )}
      </div>
    </form>
  );
}
