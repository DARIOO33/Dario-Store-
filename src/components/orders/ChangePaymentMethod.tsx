"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePaymentMethodAction } from "@/src/actions/orders";
import { AVAILABLE_CRYPTO_NETWORKS, AVAILABLE_ONLINE_METHODS, paymentLabel, type PaymentMethod } from "@/src/lib/payments";
import { useT } from "@/src/i18n/client";

type Props = { orderId: string; method: PaymentMethod; cryptoNetwork: string | null };

// The customer picked the wrong way to pay at checkout: lets them switch while the order still waits for the money.
export default function ChangePaymentMethod({ orderId, method, cryptoNetwork }: Props) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>(method);
  const [network, setNetwork] = useState(cryptoNetwork ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button type="button" className="linkBtn" onClick={() => setOpen(true)}>
        {t("order.changePayment")}
      </button>
    );
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await changePaymentMethodAction(orderId, chosen, chosen === "CRYPTO" ? network : "");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("order.changePaymentFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={save}>
      <fieldset className="payFields payChange" disabled={pending}>
        <legend>{t("order.changePayment")}</legend>
        <p className="hint">{t("order.changePaymentHint")}</p>
        <div className="payGrid" role="radiogroup" aria-label={t("checkout.paymentMethod")}>
          {AVAILABLE_ONLINE_METHODS.map((m) => (
            <label key={m} className={`payOption${chosen === m ? " active" : ""}`}>
              <input type="radio" name="changePaymentMethod" value={m} checked={chosen === m} onChange={() => setChosen(m)} required />
              <strong>{paymentLabel(t, m)}</strong>
            </label>
          ))}
        </div>
        {chosen === "CRYPTO" && (
          <div className="field">
            <label htmlFor="change-network">{t("checkout.network")}</label>
            <select id="change-network" className="input" value={network} onChange={(e) => setNetwork(e.target.value)} required>
              <option value="">{t("checkout.chooseNetwork")}</option>
              {AVAILABLE_CRYPTO_NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="payChangeActions">
          <button type="submit" className="btn btnAccent btnSm">
            {pending ? t("order.changePaymentSaving") : t("order.changePaymentSave")}
          </button>
          <button type="button" className="linkBtn" onClick={() => setOpen(false)}>
            {t("order.changePaymentKeep")}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </fieldset>
    </form>
  );
}
