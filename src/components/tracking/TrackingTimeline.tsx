import { statusInfo, type ShipmentStatus } from "@/src/lib/shipments";
import { getT } from "@/src/i18n/server";

// `itemName`: which item the line is about, when the order has several (null = the whole order).
type Event = { id: string; status: ShipmentStatus; note: string; itemName?: string | null; date: string };

// Every update we've made, newest first, as the customer sees it.
export default async function TrackingTimeline({ events, severalItems = false }: { events: Event[]; severalItems?: boolean }) {
  const t = await getT();

  return (
    <ol className="trackTimeline">
      {events.map((event) => (
        <li key={event.id}>
          <strong>{statusInfo(t, event.status).label}</strong>
          {(event.itemName || severalItems) && <span className="trackEventItem">{event.itemName ?? t("tracking.allItems")}</span>}
          <time className="muted">{event.date}</time>
          {event.note && <p>{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
