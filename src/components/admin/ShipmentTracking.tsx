"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addShipmentUpdateAction, removeShipmentEventAction } from "@/src/actions/shipments";
import { SHIPMENT_STEPS, statusInfo, type ShipmentStatus } from "@/src/lib/shipments";
import { useT } from "@/src/i18n/client";

type Props = {
  shipmentId: string;
  trackingCode: string;
  firstName: string;
  itemName: string;
  status: ShipmentStatus;
  // Newest first, with dates already formatted.
  events: { id: string; status: ShipmentStatus; note: string; date: string }[];
};

// The admin's control room for one shipment: the link to send the customer,
// the "move to the next stage / add a note" form, and the history.
export default function ShipmentTracking({ shipmentId, trackingCode, firstName, itemName, status, events }: Props) {
  const t = useT();
  const router = useRouter();
  const [next, setNext] = useState<ShipmentStatus>(status);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const link = () => `${window.location.origin}/track/${trackingCode}`;

  const copy = async (what: "link" | "message") => {
    const text = what === "link" ? link() : `Hi ${firstName}! You can follow your order (${itemName}) here: ${link()}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Couldn't copy automatically — select the link and copy it by hand.");
    }
  };

  const addUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await addShipmentUpdateAction(shipmentId, next, note);
    if (!result.ok) setError(result.error);
    else {
      setNote("");
      router.refresh();
    }
    setBusy(false);
  };

  const removeEvent = async (eventId: string) => {
    if (!confirm("Remove this update from the history?")) return;
    setBusy(true);
    setError("");
    const result = await removeShipmentEventAction(shipmentId, eventId);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusy(false);
  };

  return (
    <div className="shipmentTracking">
      <section className="panel shareBox">
        <h2>Tracking link</h2>
        <p className="muted">Send this to the customer on Instagram, Facebook or WhatsApp. They can open it without an account.</p>
        <code className="shareLink">/track/{trackingCode}</code>
        <div className="rowActions">
          <button type="button" className="btn btnSm btnAccent" onClick={() => copy("link")}>
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <button type="button" className="btn btnSm" onClick={() => copy("message")}>
            {copied === "message" ? "Copied" : "Copy message"}
          </button>
          <a href={`/track/${trackingCode}`} target="_blank" rel="noopener noreferrer" className="btn btnSm btnGhost">
            Open page ↗
          </a>
        </div>
      </section>

      <section className="panel">
        <h2>Update status</h2>
        <form className="form" onSubmit={addUpdate}>
          <div className="grid2">
            <div className="field">
              <label htmlFor="u-status">Status</label>
              <select id="u-status" className="input" value={next} onChange={(e) => setNext(e.target.value as ShipmentStatus)}>
                {SHIPMENT_STEPS.map((step) => (
                  <option key={step.status} value={step.status}>
                    {statusInfo(t, step.status).label}
                  </option>
                ))}
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="u-note">Note for the customer (optional)</label>
              <input id="u-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Held at customs, we're handling it" maxLength={240} />
            </div>
          </div>
          <div className="formActions">
            <button type="submit" className="btn btnAccent" disabled={busy}>
              {next === status ? "Add note" : "Update status"}
            </button>
          </div>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="panel">
        <h2>History</h2>
        <ol className="trackTimeline">
          {events.map((event, i) => (
            <li key={event.id}>
              <strong>{statusInfo(t, event.status).label}</strong>
              <time className="muted">{event.date}</time>
              {event.note && <p>{event.note}</p>}
              {i < events.length - 1 && (
                <button type="button" className="linkBtn removeEvent" onClick={() => removeEvent(event.id)} disabled={busy}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
