"use client";

import { useState } from "react";
import { reportProblemAction } from "@/src/actions/messages";
import ContactLinks from "@/src/components/layout/ContactLinks";
import { dateTimeLabel } from "@/src/components/chat/format";
import { PROBLEM_REASONS, type ProblemReason } from "@/src/lib/problems";
import type { ProblemReportState } from "@/src/services/messages";
import { useT } from "@/src/i18n/client";

const MAX_LENGTH = 1000;

// Under a chat the store closed (customer side): "Report a problem" reopens it with a message,
// for a limited time after delivery. Once that time has passed, the shop's contact channels are shown.
export default function ReportProblem({ orderId, state, onReported }: { orderId: string; state: ProblemReportState; onReported: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ProblemReason | "">("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (state.kind !== "available") {
    return (
      <div className="chatProblem">
        <p>{state.kind === "expired" ? t("chat.problemExpired", { days: state.days }) : t("chat.problemWait", { time: dateTimeLabel(state.after, t.locale) })}</p>
        <ContactLinks className="chatContact" />
      </div>
    );
  }

  if (!open) {
    return (
      <div className="chatProblem">
        <p>{t("chat.problemIntro")}</p>
        {state.until && <p className="muted">{t("chat.problemUntil", { date: dateTimeLabel(state.until, t.locale) })}</p>}
        <button type="button" className="btn btnAccent" onClick={() => setOpen(true)}>
          {t("chat.problemButton")}
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!reason) {
      setError(t("errors.problemReason"));
      return;
    }

    setBusy(true);
    const result = await reportProblemAction(orderId, reason, text);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onReported();
  };

  return (
    <form className="chatProblem" onSubmit={handleSubmit}>
      <label className="field">
        <span>{t("chat.problemReason")}</span>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ProblemReason)}>
          <option value="" disabled>
            —
          </option>
          {PROBLEM_REASONS.map((value) => (
            <option key={value} value={value}>
              {t.messages.chat.problemReasons[value]}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="input"
        rows={3}
        value={text}
        maxLength={MAX_LENGTH}
        required
        onChange={(e) => setText(e.target.value)}
        placeholder={t("chat.problemPlaceholder")}
        aria-label={t("chat.message")}
      />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="formActions">
        <button type="submit" className="btn btnAccent" disabled={busy || !text.trim()}>
          {busy ? t("chat.sending") : t("chat.problemSend")}
        </button>
        <button type="button" className="btn btnGhost" onClick={() => setOpen(false)} disabled={busy}>
          {t("chat.problemCancel")}
        </button>
      </div>
    </form>
  );
}
