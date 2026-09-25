import type { Metadata } from "next";
import Link from "next/link";
import { ShipmentService } from "@/src/services/shipments";
import { SHIPMENT_STATUSES, statusInfo } from "@/src/lib/shipments";
import ShipmentStatusBadge from "@/src/components/tracking/ShipmentStatusBadge";
import Pagination from "@/src/components/ui/Pagination";
import { buildQuery } from "@/src/lib/query";
import { formatDate } from "@/src/lib/time";
import { getT } from "@/src/i18n/server";

export const metadata: Metadata = { title: "Shipments" };

const PAGE_SIZE = 15;

export default async function AdminShipmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const q = sp.q?.trim() || undefined;
  const status = SHIPMENT_STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await ShipmentService.listForAdmin({ q, status }, page, PAGE_SIZE);

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">AliExpress service</span>
          <h1>Shipments</h1>
        </div>
        <Link href="/admin/shipments/new" className="btn btnAccent">
          + New shipment
        </Link>
      </header>

      <form className="adminSearch" action="/admin/shipments" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <input className="input" name="q" type="search" defaultValue={q} placeholder="Search name, item, code or parcel number…" aria-label="Search shipments" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      <nav className="chips" aria-label="Filter by status">
        <Link href={`/admin/shipments${buildQuery({ q })}`} className={`chip${!status ? " active" : ""}`}>
          All
        </Link>
        {SHIPMENT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/shipments${buildQuery({ q, status: s })}`} className={`chip${status === s ? " active" : ""}`}>
            {statusInfo(t, s).label}
          </Link>
        ))}
      </nav>

      <p className="muted">{total} shipment{total === 1 ? "" : "s"}</p>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="muted">Nothing here yet. Create a shipment when a customer asks you to order from AliExpress.</p>
        </div>
      ) : (
        <ul className="orderList">
          {rows.map((shipment) => (
            <li key={shipment.id}>
              <Link href={`/admin/shipments/${shipment.id}`} className="orderCard">
                <div>
                  <strong className="orderNo">Nº {shipment.reference}</strong>
                  <p className="muted">
                    {shipment.customerName} · {shipment.itemName}
                    {shipment.contactChannel ? ` · ${shipment.contactChannel}` : ""}
                  </p>
                </div>
                <ShipmentStatusBadge status={shipment.status} />
                <span className="muted">{formatDate(shipment.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={pages} href={(p) => `/admin/shipments${buildQuery({ q, status, page: p > 1 ? p : undefined })}`} />
    </>
  );
}
