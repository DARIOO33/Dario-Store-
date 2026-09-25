"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewDeliveryEmailAction, sendDeliveryEmailAction } from "@/src/actions/orders";

type Props = {
  orderId: string;
  customerEmail: string;
  // False until SMTP is set up in .env: the panel still previews, but can't send.
  emailReady: boolean;
  // "12 Sept 2026, 14:05" once a delivery email has gone out.
  sentAt: string | null;
  alreadyDelivered: boolean;
};

// Sends the customer what they bought, in the designed email. Safer than pasting it in the chat.
export default function DeliverByEmail({ orderId, customerEmail, emailReady, sentAt, alreadyDelivered }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [markDelivered, setMarkDelivered] = useState(!alreadyDelivered);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "send">("");

  const showPreview = async () => {
    setBusy("preview");
    setError("");
    const result = await previewDeliveryEmailAction(orderId, message);
    if (result.ok) setPreview(result.html);
    else setError(result.error);
    setBusy("");
  };

  const send = async () => {
    if (!confirm(`Send this email to ${customerEmail}?`)) return;

    setBusy("send");
    setError("");
    const result = await sendDeliveryEmailAction(orderId, message, markDelivered);
    if (result.ok) {
      setMessage("");
      setPreview("");
      router.refresh();
    } else {
      setError(result.error);
    }
    setBusy("");
  };

  return (
    <section className="panel">
      <h2>Deliver by email</h2>
      <p className="muted">
        Sends the customer their order to <strong>{customerEmail}</strong> in the shop&apos;s email design.
        {sentAt && <> Last sent {sentAt}.</>}
      </p>
      {!emailReady && <p className="notice" style={{ marginBottom: "1rem" }}>Email isn&apos;t set up yet, so you can preview but not send. Add SMTP_HOST and MAIL_FROM (and the other SMTP_* values) to the .env file, then restart the server.</p>}

      <div className="field">
        <label htmlFor="deliver-message">What the customer receives</label>
        <textarea
          id="deliver-message"
          className="input"
          style={{ minHeight: "9rem", fontFamily: "var(--font-mono)" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={"Email: account@example.com\nPassword: ••••••\nHow to log in: …"}
          maxLength={4000}
        />
        <span className="hint">Shown in a dark box, line breaks kept. It is not saved on the website, only emailed.</span>
      </div>

      <label className="check">
        <input type="checkbox" checked={markDelivered} onChange={(e) => setMarkDelivered(e.target.checked)} />
        Mark the order as Delivered after sending
      </label>

      <div className="formActions" style={{ marginTop: "0.8rem" }}>
        <button type="button" className="btn btnGhost" onClick={showPreview} disabled={busy !== ""}>
          {busy === "preview" ? "Loading…" : "Preview email"}
        </button>
        <button type="button" className="btn btnAccent" onClick={send} disabled={busy !== "" || !message.trim() || !emailReady}>
          {busy === "send" ? "Sending…" : "Send email"}
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {preview && <iframe title="Email preview" srcDoc={preview} sandbox="" style={{ width: "100%", height: "34rem", marginTop: "1rem", border: "2px solid var(--ink)", background: "#fff" }} />}
    </section>
  );
}
