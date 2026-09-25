import CartView from "@/src/components/cart/CartView";
import { AvailabilityService } from "@/src/services/availability";
import { getT, pageTitle } from "@/src/i18n/server";

export const generateMetadata = pageTitle("cart.title");

// Read per request: the admin's "available / away" status changes at any time.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [t, availability] = await Promise.all([getT(), AvailabilityService.current()]);

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{t("cart.eyebrow")}</span>
        <h1>{t("cart.title")}</h1>
      </header>
      <CartView availability={availability} />
    </div>
  );
}
