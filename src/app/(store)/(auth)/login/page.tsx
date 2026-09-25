"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import GoogleIcon from "@/src/components/auth/GoogleIcon";
import EmailAuthForm from "@/src/components/auth/EmailAuthForm";
import { useT } from "@/src/i18n/client";

export default function LoginPage() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
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
        <h1 className="cardTitle">{t("auth.welcomeBack")}</h1>
        <p className="cardText">{t("auth.loginText")}</p>

        <EmailAuthForm mode="login" />

        <p className="hint" style={{ margin: "1.25rem 0", textAlign: "center" }}>
          {t("auth.or")}
        </p>

        {error && <p className="error">{error}</p>}

        <button onClick={handleGoogleLogin} disabled={loading} className="googleBtn">
          <GoogleIcon />
          {loading ? t("auth.redirecting") : t("auth.continueGoogle")}
        </button>

        <p className="cardFooter">
          {t("auth.noAccount")} <Link href="/register">{t("auth.register")}</Link>
        </p>
      </div>
    </main>
  );
}
