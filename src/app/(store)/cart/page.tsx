import CartView from "@/src/components/cart/CartView";
import { getT, pageTitle } from "@/src/i18n/server";

export const generateMetadata = pageTitle("cart.title");

export default async function CartPage() {
  const t = await getT();

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("cart.eyebrow")}</span>
        <h1>{t("cart.title")}</h1>
      </header>
      <CartView />
    </div>
  );
}
