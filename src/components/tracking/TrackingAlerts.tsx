"use client";

import { useState } from "react";
import { requestTrackingAlertsCodeAction, verifyTrackingAlertsAction } from "@/src/actions/tracking";
import { useT } from "@/src/i18n/client";

// "Get email updates" on the tracking page: email -> 6-digit code sent to it -> on. The code makes sure
// nobody can sign someone else's address up (see services/shipment-notifications.ts).
export default function TrackingAlerts({ trackingCode }: { trackingCode: string }) {
  const t = useT();
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError("");
    const result = await requestTrackingAlertsCodeAction(trackingCode, email);
    setBusy(false);

    if (!result.ok) return setError(result.error);
    if (result.alreadyEnabled) {
      setStep("done");
      setMessage(t("tracking.alertsAlreadyOn", { email: email.trim() }));
      return;
    }
    setStep("code");
    setCode("");
    setMessage(t("tracking.alertsCodeSent", { email: email.trim() }));
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await verifyTrackingAlertsAction(trackingCode, email, code);
    setBusy(false);

    if (!result.ok) return setError(result.error);
    setStep("done");
    setMessage(t("tracking.alertsOn", { email: email.trim() }));
  };

  return (
    <section className="panel trackAlerts" aria-live="polite">
      <h2>{t("tracking.alertsTitle")}</h2>

      {step === "done" ? (
        <p className="okNote">{message}</p>
      ) : step === "email" ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <p className="muted">{t("tracking.alertsText")}</p>
          <div className="field">
            <label htmlFor="alerts-email">{t("tracking.alertsEmail")}</label>
            <input id="alerts-email" className="input" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn btnAccent" disabled={busy}>
            {busy ? t("tracking.alertsWorking") : t("tracking.alertsSend")}
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={verify}>
          <p>{message}</p>
          <div className="field">
            <label htmlFor="alerts-code">{t("tracking.alertsCode")}</label>
            <input
              id="alerts-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn btnAccent" disabled={busy || code.length !== 6}>
            {busy ? t("tracking.alertsWorking") : t("tracking.alertsVerify")}
          </button>
          <p className="trackAlertsLinks">
            <button type="button" className="linkBtn" onClick={() => void sendCode()} disabled={busy}>
              {t("tracking.alertsResend")}
            </button>
            <button
              type="button"
              className="linkBtn"
              onClick={() => {
                setStep("email");
                setError("");
              }}
              disabled={busy}
            >
              {t("tracking.alertsChangeEmail")}
            </button>
          </p>
        </form>
      )}
    </section>
  );
}
