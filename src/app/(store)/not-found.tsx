import Link from "next/link";
import { getT } from "@/src/i18n/server";

export default async function NotFound() {
  const t = await getT();

  return (
    <div className="wrap notFound">
      <div className="code">404</div>
      <h1 style={{ fontSize: "2rem" }}>{t("notFound.title")}</h1>
      <p className="muted">{t("notFound.text")}</p>
      <Link href="/products" className="btn btnPrimary btnLg">
        {t("notFound.back")}
      </Link>
    </div>
  );
}
