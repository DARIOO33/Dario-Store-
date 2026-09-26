import type { Metadata } from "next";
import Link from "next/link";
import ShipmentForm from "@/src/components/admin/ShipmentForm";
import { requirePageRole } from "@/src/lib/guards";
import { TEAM } from "@/src/lib/roles";

export const metadata: Metadata = { title: "New shipment" };

export default async function NewShipmentPage() {
  // Checked here too, not only in the admin layout: a layout is skipped when the browser asks for just this page.
  await requirePageRole(...TEAM);
  return (
    <>
      <header className="adminHead">
        <div>
          <Link href="/admin/shipments" className="linkBtn">
            ← Shipments
          </Link>
          <h1>New shipment</h1>
        </div>
      </header>
      <div className="panel formPanel">
        <ShipmentForm
          initial={{
            customerName: "",
            customerPhone: "",
            customerCity: "",
            customerAddress: "",
            contactChannel: "",
            itemName: "",
            itemUrl: "",
            itemImageUrl: "",
            quantity: "1",
            carrier: "",
            carrierTrackingNumber: "",
            estimatedArrival: "",
            adminNotes: "",
          }}
        />
      </div>
    </>
  );
}
