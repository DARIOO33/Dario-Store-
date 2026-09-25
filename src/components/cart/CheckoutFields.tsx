import Link from "next/link";
import { GOVERNORATES } from "@/src/lib/store";
import { rememberAfterLogin } from "@/src/lib/after-login";
import { CRYPTO_NETWORKS, ONLINE_METHODS, paymentHint, paymentLabel, type PaymentMethod } from "@/src/lib/payments";
import { useT } from "@/src/i18n/client";

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  paymentMethod: string;
  cryptoNetwork: string;
};

type Props = {
  form: CheckoutForm;
  onChange: (key: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  signedIn: boolean;
  // Digital items in the cart, but nobody is logged in (and the session has finished loading).
  needsLogin: boolean;
  requiresShipping: boolean;
  hasVirtual: boolean;
};

// The checkout form. What it asks for depends on the cart: an address only for
// physical items, and an online payment method (with an account) for digital ones.
export default function CheckoutFields({ form, onChange, onSubmit, error, signedIn, needsLogin, requiresShipping, hasVirtual }: Props) {
  const t = useT();
  const needsPayment = hasVirtual && signedIn;
  const rememberCart = () => rememberAfterLogin("/cart");

  return (
    <form id="checkout-form" className="form checkoutForm" onSubmit={onSubmit}>
      <h2>{t("checkout.details")}</h2>

      {needsLogin && (
        <div className="gate" role="note">
          <strong>{t("checkout.gateTitle")}</strong>
          <p>{t("checkout.gateText")}</p>
          <div className="gateActions">
            <Link href="/login" className="btn btnPrimary" onClick={rememberCart}>
              {t("checkout.logIn")}
            </Link>
            <Link href="/register" className="btn btnGhost" onClick={rememberCart}>
              {t("checkout.createAccount")}
            </Link>
          </div>
        </div>
      )}
      {!signedIn && !hasVirtual && (
        <p className="hint">
          {t("checkout.guestNote")}{" "}
          <Link href="/login" className="linkBtn" onClick={rememberCart}>
            {t("checkout.logIn")}
          </Link>{" "}
          {t("checkout.guestNoteEnd")}
        </p>
      )}

      <div className="grid2">
        <div className="field">
          <label htmlFor="co-name">{t("checkout.fullName")}</label>
          <input id="co-name" className="input" autoComplete="name" value={form.name} onChange={onChange("name")} required />
        </div>
        <div className="field">
          <label htmlFor="co-email">{t("checkout.email")}</label>
          <input id="co-email" className="input" type="email" autoComplete="email" value={form.email} onChange={onChange("email")} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="co-phone">{t("checkout.phone")} {requiresShipping ? "" : <span className="muted">{t("checkout.optional")}</span>}</label>
        <input id="co-phone" className="input" type="tel" autoComplete="tel" placeholder={t("checkout.phonePlaceholder")} value={form.phone} onChange={onChange("phone")} required={requiresShipping} />
      </div>

      {requiresShipping ? (
        <fieldset className="shipFields">
          <legend>{t("checkout.deliveryAddress")}</legend>
          <div className="field">
            <label htmlFor="co-address">{t("checkout.street")}</label>
            <input id="co-address" className="input" autoComplete="street-address" placeholder={t("checkout.streetPlaceholder")} value={form.address} onChange={onChange("address")} required />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="co-city">{t("checkout.city")}</label>
              <input id="co-city" className="input" list="governorates" autoComplete="address-level2" value={form.city} onChange={onChange("city")} required />
              <datalist id="governorates">
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="co-postal">{t("checkout.postalCode")} <span className="muted">{t("checkout.optional")}</span></label>
              <input id="co-postal" className="input" autoComplete="postal-code" value={form.postalCode} onChange={onChange("postalCode")} />
            </div>
          </div>
        </fieldset>
      ) : (
        <p className="deliveryNote">
          <strong>{t("checkout.digitalOrderTitle")}</strong> {t("checkout.digitalOrderText")}
        </p>
      )}

      {needsPayment ? (
        <fieldset className="payFields">
          <legend>{t("checkout.paymentMethod")}</legend>
          <div className="payGrid" role="radiogroup" aria-label={t("checkout.paymentMethod")}>
            {ONLINE_METHODS.map((method) => (
              <label key={method} className={`payOption${form.paymentMethod === method ? " active" : ""}`}>
                <input type="radio" name="paymentMethod" value={method} checked={form.paymentMethod === method} onChange={onChange("paymentMethod")} required />
                <strong>{paymentLabel(t, method)}</strong>
              </label>
            ))}
          </div>
          {form.paymentMethod === "CRYPTO" && (
            <div className="field">
              <label htmlFor="co-network">{t("checkout.network")}</label>
              <select id="co-network" className="input" value={form.cryptoNetwork} onChange={onChange("cryptoNetwork")} required>
                <option value="">{t("checkout.chooseNetwork")}</option>
                {CRYPTO_NETWORKS.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="hint">
            {ONLINE_METHODS.includes(form.paymentMethod as PaymentMethod)
              ? paymentHint(t, form.paymentMethod as PaymentMethod)
              : t("checkout.paymentDefaultHint")}
          </p>
        </fieldset>
      ) : (
        !hasVirtual && (
          <p className="deliveryNote">
            <strong>{t("checkout.codTitle")}</strong> {t("checkout.codText")}
          </p>
        )
      )}

      <div className="field">
        <label htmlFor="co-notes">{t("checkout.note")} <span className="muted">{t("checkout.optional")}</span></label>
        <textarea id="co-notes" className="input" style={{ minHeight: "5rem" }} value={form.notes} onChange={onChange("notes")} maxLength={500} />
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
