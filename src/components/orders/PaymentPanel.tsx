import CopyValue from "@/src/components/ui/CopyValue";
import { CRYPTO_NETWORKS, PAYMENT_INFO, paymentHint, paymentLabel, paymentLineLabel, type PaymentMethod } from "@/src/lib/payments";
import { getT } from "@/src/i18n/server";
import type { OrderStatus, PaymentStatus } from "@/src/prisma/orders";
import MarkRefundedButton from "@/src/components/admin/MarkRefundedButton";
import { formatMillimes } from "@/src/lib/money";

type Props = {
  method: PaymentMethod;
  cryptoNetwork: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalMillimes: number;
  // Customers see where to send the money; admins only need the summary.
  showInstructions: boolean;
  // Admin view only: lets the admin mark a cancelled, paid order as refunded.
  orderId?: string;
};

export default async function PaymentPanel({ method, cryptoNetwork, status, paymentStatus, totalMillimes, showInstructions, orderId }: Props) {
  const t = await getT();
  const info = PAYMENT_INFO[method];
  const network = CRYPTO_NETWORKS.find((n) => n.id === cryptoNetwork);
  const lines = method === "CRYPTO" && network ? [{ label: "Address", value: network.address }] : info.lines;
  const waiting = status === "PENDING" && method !== "CASH_ON_DELIVERY";

  return (
    <section className="panel payBox">
      <h2>{t("payment.title")}</h2>
      <p>
        <strong>{paymentLabel(t, method, cryptoNetwork)}</strong>
      </p>

      {!showInstructions && (
        <p className="muted">
          {t("payment.statusLabel")}: <strong>{t.messages.paymentStatus[paymentStatus]}</strong>
        </p>
      )}

      {paymentStatus === "REFUNDED" ? (
        <p className="muted">{t("payment.refunded")}</p>
      ) : method === "CASH_ON_DELIVERY" ? (
        <p className="muted">{t("payment.cashDue", { amount: formatMillimes(totalMillimes) })}</p>
      ) : status === "PAID" || status === "SHIPPED" || status === "DELIVERED" ? (
        <p className="okNote">{t("payment.confirmed")}</p>
      ) : status === "CANCELLED" ? (
        <>
          <p className="muted">{paymentStatus === "VERIFIED" ? t("payment.cancelledPaid") : t("payment.cancelled")}</p>
          {orderId && paymentStatus === "VERIFIED" && <MarkRefundedButton orderId={orderId} />}
        </>
      ) : waiting && paymentStatus === "SUBMITTED" ? (
        <p className="sentNote">
          {t("payment.sent")} {showInstructions ? t("payment.sentCustomer") : t("payment.sentAdmin")}
        </p>
      ) : waiting && showInstructions ? (
        <>
          {paymentStatus === "FAILED" && <p className="warnNote">{t("payment.failed")}</p>}
          <p className="muted">{paymentHint(t, method)}</p>
          <dl className="payLines">
            <div>
              <dt>{t("payment.amount")}</dt>
              <dd>
                {formatMillimes(totalMillimes)}
                {method === "CRYPTO" && <span className="muted">{t("payment.exactCrypto")}</span>}
              </dd>
            </div>
            {lines.map((line) => (
              <div key={line.label}>
                <dt>{paymentLineLabel(t, line.label)}</dt>
                <dd>
                  <code>{line.value}</code>
                  <CopyValue value={line.value} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="warnNote">{t("payment.warning")}</p>
        </>
      ) : (
        <p className="muted">{t("payment.waitingCustomer")}</p>
      )}
    </section>
  );
}
