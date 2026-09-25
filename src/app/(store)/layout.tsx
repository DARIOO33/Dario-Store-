import { CartProvider } from "@/src/components/cart/CartProvider";
import Ticker from "@/src/components/layout/Ticker";
import Header from "@/src/components/layout/Header";
import Footer from "@/src/components/layout/Footer";
import PointerFx from "@/src/components/layout/PointerFx";
import { CategoryService } from "@/src/services/categories";
import { getLocale } from "@/src/i18n/server";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await CategoryService.navigation(await getLocale());

  return (
    <CartProvider>
      <PointerFx />
      <Ticker />
      <Header categories={categories} />
      <main>{children}</main>
      <Footer categories={categories} />
    </CartProvider>
  );
}
