import { getT } from "@/src/i18n/server";
import type { MessageKey } from "@/src/i18n/translate";
import { availableMethodsText } from "@/src/lib/payments";

const MESSAGES: MessageKey[] = [
  "ticker.delivery",
  "ticker.payment",
  "ticker.chat",
  "ticker.prices",
  "ticker.iemsDelivery",
  "ticker.iemsFree",
];

// The messages are repeated and the track slides left by half its width, so
// the loop has no visible seam (see the ticker rules in styles/chrome.css).
export default async function Ticker() {
  const t = await getT();
  const messages = MESSAGES.map((key) => t(key, { methods: availableMethodsText(t) }));

  return (
    <div className="ticker" aria-hidden="true">
      <div className="tickerTrack">
        {[...messages, ...messages, ...messages, ...messages].map((message, i) => (
          <span key={i}>{message}</span>
        ))}
      </div>
    </div>
  );
}
