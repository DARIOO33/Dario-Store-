import type { ChatPayment } from "@/src/services/messages";
import { dateTimeLabel, timeLabel } from "@/src/components/chat/format";
import { useT } from "@/src/i18n/client";

type Props = {
  payment: ChatPayment | null;
  closed: boolean;
  asAdmin: boolean;
  busy: boolean;
  onMarkSent: () => void;
  onAskNewProof: () => void;
};

// The banner above the messages: the customer's "Payment sent" button (which
// needs a proof photo first), then, once sent, the "waiting for verification"
// notice, which gives the admin a way to ask for a clearer proof.
export default function PaymentBar({ payment, closed, asAdmin, busy, onMarkSent, onAskNewProof }: Props) {
  const t = useT();

  return (
    <>
      {payment && !closed && !asAdmin && payment.canMarkSent && (
        <div className="payBar">
          <div>
            <strong>{t("chat.paidAlready")}</strong>
            <p>
              {payment.hasProof ? t("chat.proofUploaded") : t("chat.proofNeeded")}
            </p>
          </div>
          <button type="button" className="btn btnAccent" onClick={onMarkSent} disabled={busy || !payment.hasProof}>
            {t("chat.paymentSentButton")}
          </button>
        </div>
      )}

      {payment?.stage && !closed && (
        <div className="payBar payBarDone">
          <div>
            <strong>{t.messages.chat.stage[payment.stage.status]}</strong>
            <p>{t(asAdmin ? "chat.stageAtAdmin" : "chat.stageAt", { date: dateTimeLabel(payment.stage.at, t.locale) })}</p>
          </div>
        </div>
      )}

      {payment?.sentAt && !payment.stage && !closed && (
        <div className="payBar payBarDone">
          <div>
            <strong>{asAdmin ? t("chat.customerSaysSent") : t("chat.waitingForStore")}</strong>
            <p>
              {asAdmin ? t("chat.adminOpenProof") : t("chat.toldUsAt", { time: timeLabel(payment.sentAt, t.locale) })}
            </p>
          </div>
          {payment.canRequestNewProof && (
            <button type="button" className="btn" onClick={onAskNewProof} disabled={busy}>
              {t("chat.askNewProof")}
            </button>
          )}
        </div>
      )}
    </>
  );
}
