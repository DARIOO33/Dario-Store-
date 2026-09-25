import Link from "next/link";
import { STORE_NAME } from "@/src/lib/store";
import { ONLINE_METHODS, paymentLabel } from "@/src/lib/payments";
import { getT } from "@/src/i18n/server";
import LanguageSwitcher from "@/src/components/layout/LanguageSwitcher";

type NavCategory = { slug: string; name: string };

export default async function Footer({ categories }: { categories: NavCategory[] }) {
  const t = await getT();

  return (
    <footer className="footer">
      <div className="footerCta">
        <div className="wrap footerCtaInner">
          <div>
            <h3>{t("footer.ctaTitle")}</h3>
            <p>{t("footer.ctaText")}</p>
          </div>
          <Link href="/orders" className="btn btnPrimary btnLg">
            {t("footer.ctaButton")}
          </Link>
        </div>
      </div>

      <div className="wrap footerMain">
        <div className="footerAbout">
          <strong>{STORE_NAME}</strong>
          <p>{t("store.tagline")}.</p>
          <ul className="payChips" aria-label={t("footer.paymentMethods")}>
            {ONLINE_METHODS.map((method) => (
              <li key={method}>{paymentLabel(t, method)}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4>{t("footer.shop")}</h4>
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/c/${category.slug}`}>{category.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/products">{t("footer.everything")}</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>{t("footer.account")}</h4>
          <ul>
            <li><Link href="/cart">{t("footer.yourCart")}</Link></li>
            <li><Link href="/orders">{t("footer.myOrders")}</Link></li>
            <li><Link href="/track">{t("footer.trackAliexpress")}</Link></li>
            <li><Link href="/login">{t("footer.logIn")}</Link></li>
            <li><Link href="/register">{t("footer.createAccount")}</Link></li>
          </ul>
        </div>

        <div>
          <h4>{t("footer.howItWorks")}</h4>
          <ol className="footerSteps">
            <li>{t("footer.step1")}</li>
            <li>{t("footer.step2")}</li>
            <li>{t("footer.step3")}</li>
            <li>{t("footer.step4")}</li>
          </ol>
        </div>
      </div>

      <div className="footerWord" aria-hidden="true">
        {STORE_NAME}
      </div>

      <div className="wrap footerBottom">
        <span>{t("footer.copyright", { year: new Date().getFullYear(), name: STORE_NAME })}</span>
        <span>{t("footer.place")}</span>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
