"use client";

import { useState } from "react";
import { stopTrackingAlertsAction } from "@/src/actions/tracking";
import { useT } from "@/src/i18n/client";

// The "Stop the emails" button on the unsubscribe page.
export default function StopTrackingAlerts({ token }: { token: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (done) return <p className="okNote">{t("tracking.unsubscribeDone")}</p>;

  return (
    <>
      <button
        type="button"
        className="btn btnAccent"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await stopTrackingAlertsAction(token);
          setBusy(false);
          if (result.ok) setDone(true);
          else setError(result.error);
        }}
      >
        {busy ? t("tracking.alertsWorking") : t("tracking.unsubscribeButton")}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
