import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentService } from "@/src/services/shipments";
import ShipmentForm from "@/src/components/admin/ShipmentForm";
import ShipmentTracking from "@/src/components/admin/ShipmentTracking";
import ShipmentStatusBadge from "@/src/components/tracking/ShipmentStatusBadge";
import { formatDateTime } from "@/src/lib/time";

export const metadata: Metadata = { title: "Shipment" };

export default async function AdminShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = await ShipmentService.getForAdmin(id);

  if (!shipment) notFound();

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
            {shipment.customerName} · {shipment.itemName}
          </p>
        </div>
      </header>

      {/* The key resets the update form (chosen status, note) whenever the shipment changes. */}
      <ShipmentTracking
        key={`${shipment.status}-${shipment.events.length}`}
        shipmentId={shipment.id}
        trackingCode={shipment.trackingCode}
        firstName={shipment.customerName.split(" ")[0] ?? ""}
        itemName={shipment.itemName}
        status={shipment.status}
        events={shipment.events.map((event) => ({ id: event.id, status: event.status, note: event.note, date: formatDateTime(event.createdAt) }))}
      />

      <div className="panel formPanel">
        <h2>Details</h2>
        <ShipmentForm
          shipmentId={shipment.id}
          initial={{
            customerName: shipment.customerName,
            customerPhone: shipment.customerPhone ?? "",
            customerCity: shipment.customerCity ?? "",
            customerAddress: shipment.customerAddress ?? "",
            contactChannel: shipment.contactChannel ?? "",
            itemName: shipment.itemName,
            itemUrl: shipment.itemUrl ?? "",
            itemImageUrl: shipment.itemImageUrl ?? "",
            quantity: String(shipment.quantity),
            carrier: shipment.carrier ?? "",
            carrierTrackingNumber: shipment.carrierTrackingNumber ?? "",
            estimatedArrival: shipment.estimatedArrival ? shipment.estimatedArrival.toZonedDateTimeISO("UTC").toPlainDate().toString() : "",
            adminNotes: shipment.adminNotes,
          }}
        />
      </div>
    </>
  );
}
