"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShipmentAction, deleteShipmentAction, updateShipmentAction, uploadShipmentImageAction } from "@/src/actions/shipments";
import ImageUploadButton from "@/src/components/admin/ImageUploadButton";
import { CONTACT_CHANNELS } from "@/src/lib/shipments";
import type { ShipmentFormInput, ShipmentItemFormInput } from "@/src/services/shipments";

type Props = {
  shipmentId?: string;
  initial: ShipmentFormInput;
  // False when Cloudinary isn't set up: photos can then only be pasted as links.
  canUpload: boolean;
};

const emptyItem = (): ShipmentItemFormInput => ({ name: "", quantity: "1", url: "", imageUrl: "", carrier: "", trackingNumber: "", estimatedArrival: "" });

// Create a shipment (one customer's order, with all its items), or edit it. Only the items, their parcel
// numbers and dates and a masked version of the contact details are ever shown to the customer.
export default function ShipmentForm({ shipmentId, initial, canUpload }: Props) {
  const router = useRouter();
  // A new shipment starts with one empty item.
  const [form, setForm] = useState(() => (initial.items.length > 0 ? initial : { ...initial, items: [emptyItem()] }));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: Exclude<keyof ShipmentFormInput, "items">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const setItem = (index: number, changes: Partial<ShipmentItemFormInput>) =>
    setForm((current) => ({ ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...changes } : item)) }));

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItem = (index: number) => setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));

  // Items bought together often travel in one parcel: one click fills the others with item 1's shipping.
  const copyShippingToAll = () =>
    setForm((current) => {
      const [first] = current.items;
      if (!first) return current;
      return { ...current, items: current.items.map((item) => ({ ...item, carrier: first.carrier, trackingNumber: first.trackingNumber, estimatedArrival: first.estimatedArrival })) };
    });

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

      <fieldset className="variantEditor">
        <legend>Items ({form.items.length})</legend>

        {form.items.map((item, index) => {
          const id = (name: string) => `s-item-${index}-${name}`;
          return (
            <div key={item.id ?? `new-${index}`} className="shipItemCard">
              <div className="shipItemHead">
                <strong>Item {index + 1}</strong>
                {form.items.length > 1 && (
                  <button type="button" className="linkBtn" onClick={() => removeItem(index)}>
                    Remove
                  </button>
                )}
              </div>

              <div className="shipItemTop">
                <div className="shipItemPhoto">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview of an address typed or uploaded just now
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <span className="muted">No photo</span>
                  )}
                </div>
                <div className="shipItemFields">
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor={id("name")}>What was ordered</label>
                      <input id={id("name")} className="input" placeholder="Wireless earbuds, black" value={item.name} onChange={(e) => setItem(index, { name: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label htmlFor={id("qty")}>Quantity</label>
                      <input id={id("qty")} className="input" inputMode="numeric" value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} required />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor={id("image")}>Photo (shown to the customer)</label>
                    <div className="shipItemUpload">
                      {canUpload && <ImageUploadButton label="Upload photo" enabled upload={uploadShipmentImageAction} onUploaded={(url) => setItem(index, { imageUrl: url })} />}
                      <input id={id("image")} className="input" placeholder="…or paste a link: https://…/photo.jpg" value={item.imageUrl} onChange={(e) => setItem(index, { imageUrl: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor={id("url")}>AliExpress link (private)</label>
                <input id={id("url")} className="input" placeholder="https://aliexpress.com/item/…" value={item.url} onChange={(e) => setItem(index, { url: e.target.value })} />
              </div>
              <div className="shipItemShipping">
                <div className="field">
                  <label htmlFor={id("carrier")}>Carrier</label>
                  <input id={id("carrier")} className="input" placeholder="Cainiao, Yanwen…" value={item.carrier} onChange={(e) => setItem(index, { carrier: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor={id("parcel")}>Parcel tracking number</label>
                  <input id={id("parcel")} className="input" value={item.trackingNumber} onChange={(e) => setItem(index, { trackingNumber: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor={id("eta")}>Estimated arrival</label>
                  <input id={id("eta")} className="input" type="date" value={item.estimatedArrival} onChange={(e) => setItem(index, { estimatedArrival: e.target.value })} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="rowActions">
          <button type="button" className="btn btnSm" onClick={addItem}>
            + Add item
          </button>
          {form.items.length > 1 && (
            <button type="button" className="btn btnSm btnGhost" onClick={copyShippingToAll}>
              Copy item 1&apos;s shipping to all items
            </button>
          )}
        </div>
      </fieldset>

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
