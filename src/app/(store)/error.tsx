"use client";

import { useEffect } from "react";
import { useT } from "@/src/i18n/client";

// Shown instead of a blank page when something breaks on the server. The error itself is in the server log.
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap notFound">
      <div className="code">Oops</div>
      <h1 style={{ fontSize: "2rem" }}>{t("errorPage.title")}</h1>
      <p className="muted">{t("errorPage.text")}</p>
      <button type="button" className="btn btnPrimary btnLg" onClick={reset}>
        {t("errorPage.retry")}
      </button>
    </div>
  );
}
