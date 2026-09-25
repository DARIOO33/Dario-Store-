import { formatMillimes } from "@/src/lib/money";
import { FREE_SHIPPING_FROM_MILLIMES } from "@/src/lib/store";
import type { summarize } from "@/src/components/cart/totals";
import { useT } from "@/src/i18n/client";

type Props = {
  totals: ReturnType<typeof summarize>;
  submitting: boolean;
  disabled: boolean;
  needsLogin: boolean;
  needsPayment: boolean;
  hasUnavailable: boolean;
};

// The right-hand card: totals, the free-shipping progress bar and the
// "Place order" button (which submits the checkout form by its id).
export default function OrderSummary({ totals, submitting, disabled, needsLogin, needsPayment, hasUnavailable }: Props) {
  const t = useT();
  const { subtotal, physicalSubtotal, requiresShipping, shipping, total } = totals;
  const untilFree = FREE_SHIPPING_FROM_MILLIMES - physicalSubtotal;

  return (
    <div className="summary">
      <h2>{t("summary.title")}</h2>

      {requiresShipping && (
        <div className="freeShip">
          {untilFree > 0 ? (
            <p>{t("summary.addForFree", { amount: formatMillimes(untilFree) })}</p>
          ) : (
            <p>
              <strong>{t("summary.freeUnlocked")}</strong> ✺
            </p>
          )}
          <div className="progressTrack">
            <div style={{ width: `${Math.min(100, (physicalSubtotal / FREE_SHIPPING_FROM_MILLIMES) * 100)}%` }} />
          </div>
        </div>
      )}

      <dl className="totals">
        <div>
          <dt>{t("summary.subtotal")}</dt>
          <dd>{formatMillimes(subtotal)}</dd>
        </div>
        <div>
          <dt>{t("summary.shipping")}</dt>
          <dd>{requiresShipping ? (shipping === 0 ? t("summary.free") : formatMillimes(shipping)) : t("summary.notNeeded")}</dd>
        </div>
        <div className="grand">
          <dt>{t("summary.total")}</dt>
          <dd>{formatMillimes(total)}</dd>
        </div>
      </dl>

      <button type="submit" form="checkout-form" className="btn btnAccent btnLg btnBlock" disabled={disabled}>
        {submitting && <span className="spinner spinnerSm" aria-hidden="true" />}
        {submitting ? t("summary.placing") : needsLogin ? t("summary.logInToOrder") : t("summary.placeOrder", { total: formatMillimes(total) })}
      </button>
      {hasUnavailable && <p className="cartWarn" style={{ marginTop: "0.6rem" }}>{t("summary.removeUnavailable")}</p>}
      <p className="hint" style={{ marginTop: "0.8rem" }}>
        {t("summary.recheck")}
        {needsPayment ? t("summary.recheckChat") : ""}
      </p>
    </div>
  );
}
