import CopyValue from "@/src/components/ui/CopyValue";
import { CRYPTO_NETWORKS, PAYMENT_INFO, paymentHint, paymentLabel, paymentLineLabel, type PaymentMethod } from "@/src/lib/payments";
import { getT } from "@/src/i18n/server";
import type { OrderStatus } from "@/src/prisma/orders";
import { formatMillimes } from "@/src/lib/money";

type Props = {
  method: PaymentMethod;
  cryptoNetwork: string | null;
  status: OrderStatus;
  paymentSentAt: Temporal.Instant | null;
  totalMillimes: number;
  // Customers see where to send the money; admins only need the summary.
  showInstructions: boolean;
};

export default async function PaymentPanel({ method, cryptoNetwork, status, paymentSentAt, totalMillimes, showInstructions }: Props) {
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

      {method === "CASH_ON_DELIVERY" ? (
        <p className="muted">{t("payment.cashDue", { amount: formatMillimes(totalMillimes) })}</p>
      ) : status === "PAID" || status === "SHIPPED" || status === "DELIVERED" ? (
        <p className="okNote">{t("payment.confirmed")}</p>
      ) : status === "CANCELLED" ? (
        <p className="muted">{t("payment.cancelled")}</p>
      ) : waiting && paymentSentAt ? (
        <p className="sentNote">
          {t("payment.sent")} {showInstructions ? t("payment.sentCustomer") : t("payment.sentAdmin")}
        </p>
      ) : waiting && showInstructions ? (
        <>
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
