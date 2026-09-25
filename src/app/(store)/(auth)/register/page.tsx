"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import GoogleIcon from "@/src/components/auth/GoogleIcon";
import EmailAuthForm from "@/src/components/auth/EmailAuthForm";
import { useT } from "@/src/i18n/client";

export default function RegisterPage() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/success?type=login",
        newUserCallbackURL: "/success?type=register",
      });
    } catch {
      setError(t("auth.somethingWrong"));
      setLoading(false);
    }
  };

  return (
    <main className="authPage">
      <div className="card">
        <h1 className="cardTitle">{t("auth.createTitle")}</h1>
        <p className="cardText">{t("auth.createText")}</p>

        <EmailAuthForm mode="register" />

        <p className="hint" style={{ margin: "1.25rem 0", textAlign: "center" }}>
          {t("auth.or")}
        </p>

        {error && <p className="error">{error}</p>}

        <button onClick={handleGoogleRegister} disabled={loading} className="googleBtn">
          <GoogleIcon />
          {loading ? t("auth.redirecting") : t("auth.signUpGoogle")}
        </button>

        <p className="cardFooter">
          {t("auth.haveAccount")} <Link href="/login">{t("auth.logIn")}</Link>
        </p>
      </div>
    </main>
  );
}
