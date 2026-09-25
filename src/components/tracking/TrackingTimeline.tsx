import { statusInfo, type ShipmentStatus } from "@/src/lib/shipments";
import { getT } from "@/src/i18n/server";

type Event = { id: string; status: ShipmentStatus; note: string; date: string };

// Every update we've made, newest first, as the customer sees it.
export default async function TrackingTimeline({ events }: { events: Event[] }) {
  const t = await getT();

  return (
    <ol className="trackTimeline">
      {events.map((event) => (
        <li key={event.id}>
          <strong>{statusInfo(t, event.status).label}</strong>
          <time className="muted">{event.date}</time>
          {event.note && <p>{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
