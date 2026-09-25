"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAvailableAction, setAwayAction } from "@/src/actions/availability";
import { availabilityText, formatResponseTime, RESPONSE_CHOICES, type Availability } from "@/src/lib/availability";
import { useT } from "@/src/i18n/client";

// Admin dashboard: tell customers how fast you answer, or that you're away until a given time.
export default function AvailabilityPanel({ availability, suggestedBackAt }: { availability: Availability; suggestedBackAt: string }) {
  const t = useT();
  const router = useRouter();
  const [minutes, setMinutes] = useState(availability.responseMinutes);
  const [backAt, setBackAt] = useState(suggestedBackAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const away = availability.awayUntilMs !== null;
  const choices = RESPONSE_CHOICES.includes(minutes) ? RESPONSE_CHOICES : [...RESPONSE_CHOICES, minutes].sort((a, b) => a - b);

  const save = async (work: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setBusy(true);
    setError("");
    const result = await work();
    if (result.ok) router.refresh();
    else setError(result.error);
    setBusy(false);
  };

  return (
    <section className="panel" aria-label="Your availability">
      <div className="panelHead">
        <h2>Your availability</h2>
        <span className={`pill ${away ? "pillAmber" : "pillGreen"}`}>{away ? "Away" : "Available"}</span>
      </div>
      <p className="muted">
        Customers see: <strong>{availabilityText(t, availability)}</strong>
      </p>

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="av-minutes">Average response time</label>
        <select id="av-minutes" className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {formatResponseTime(choice)}
            </option>
          ))}
        </select>
      </div>
      <div className="formActions" style={{ marginTop: "0.8rem" }}>
        <button type="button" className="btn btnAccent" disabled={busy} onClick={() => save(() => setAvailableAction(minutes))}>
          {away ? "I'm back — available" : "Save response time"}
        </button>
      </div>

      <div className="field" style={{ marginTop: "1.4rem" }}>
        <label htmlFor="av-back">Away until (Tunisia time)</label>
        <input id="av-back" type="datetime-local" className="input" value={backAt} onChange={(e) => setBackAt(e.target.value)} />
        <span className="hint">Going to sleep? Pick when you&apos;ll answer again. You go back to &quot;available&quot; by yourself at that time.</span>
      </div>
      <div className="formActions" style={{ marginTop: "0.8rem" }}>
        <button type="button" className="btn btnGhost" disabled={busy || !backAt} onClick={() => save(() => setAwayAction(backAt))}>
          {away ? "Change return time" : "Set me away"}
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
