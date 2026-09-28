import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentService } from "@/src/services/shipments";
import ShipmentForm from "@/src/components/admin/ShipmentForm";
import ShipmentTracking from "@/src/components/admin/ShipmentTracking";
import ShipmentStatusBadge from "@/src/components/tracking/ShipmentStatusBadge";
import { cloudinaryConfigured } from "@/src/lib/cloudinary";
import { formatDateTime } from "@/src/lib/time";
import { requirePageRole } from "@/src/lib/guards";
import { TEAM } from "@/src/lib/roles";

export const metadata: Metadata = { title: "Shipment" };

const dateInput = (instant: Temporal.Instant | null) => (instant ? instant.toZonedDateTimeISO("UTC").toPlainDate().toString() : "");

export default async function AdminShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  // Checked here too, not only in the admin layout: a layout is skipped when the browser asks for just this page.
  await requirePageRole(...TEAM);
  const { id } = await params;
  const shipment = await ShipmentService.getForAdmin(id);

  if (!shipment) notFound();

  const itemName = (itemId: string | null) => (itemId ? (shipment.items.find((item) => item.id === itemId)?.name ?? null) : null);
  const summary = shipment.items.length > 1 ? `${shipment.items.length} items` : (shipment.items[0]?.name ?? "");

  return (
    <>
      <header className="adminHead">
        <div>
          <Link href="/admin/shipments" className="linkBtn">
            ← Shipments
          </Link>
          <h1>
            Nº {shipment.reference} <ShipmentStatusBadge status={shipment.status} />
          </h1>
          <p className="muted">
            {shipment.customerName} · {summary}
          </p>
        </div>
      </header>

      {/* The key resets the update form (chosen items, status, note) whenever the shipment changes. */}
      <ShipmentTracking
        key={`${shipment.status}-${shipment.events.length}-${shipment.items.map((item) => item.status).join()}`}
        shipmentId={shipment.id}
        trackingCode={shipment.trackingCode}
        firstName={shipment.customerName.split(" ")[0] ?? ""}
        items={shipment.items.map((item) => ({ id: item.id, name: item.name, status: item.status }))}
        status={shipment.status}
        events={shipment.events.map((event) => ({ id: event.id, status: event.status, note: event.note, itemName: itemName(event.itemId), date: formatDateTime(event.createdAt) }))}
        subscribers={shipment.subscribers}
      />

      <div className="panel formPanel">
        <h2>Details</h2>
        <ShipmentForm
          key={shipment.items.map((item) => item.id).join()}
          shipmentId={shipment.id}
          canUpload={cloudinaryConfigured()}
          initial={{
            customerName: shipment.customerName,
            customerPhone: shipment.customerPhone ?? "",
            customerCity: shipment.customerCity ?? "",
            customerAddress: shipment.customerAddress ?? "",
            contactChannel: shipment.contactChannel ?? "",
            adminNotes: shipment.adminNotes,
            items: shipment.items.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: String(item.quantity),
              url: item.url ?? "",
              imageUrl: item.imageUrl ?? "",
              carrier: item.carrier ?? "",
              trackingNumber: item.trackingNumber ?? "",
              estimatedArrival: dateInput(item.estimatedArrival),
            })),
          }}
        />
      </div>
    </>
  );
}
