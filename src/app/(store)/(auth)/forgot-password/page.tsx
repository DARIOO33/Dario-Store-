"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import { useT } from "@/src/i18n/client";

// Forgot password: email -> 6-digit code by email -> new password. The code is sent whether or
// not the account exists (better-auth), so this page can't be used to find out who has an account.
export default function ForgotPasswordPage() {
  const t = useT();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: failure } = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
    setLoading(false);
    if (failure) setError(failure.message ?? t("auth.somethingWrong"));
    else setStep("reset");
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: failure } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp, password });
    setLoading(false);
    if (failure) setError(failure.message ?? t("auth.invalidCode"));
    else setStep("done");
  };

  return (
    <main className="authPage">
      <div className="card">
        <h1 className="cardTitle">{t("auth.forgotTitle")}</h1>
        <p className="cardText">
          {step === "email" ? t("auth.forgotText") : step === "reset" ? t("auth.sentCode", { email: email.trim() }) : t("auth.resetDone")}
        </p>

        {step === "done" ? (
          <Link href="/login" className="btn btnPrimary" style={{ width: "100%" }}>
            {t("auth.logIn")}
          </Link>
        ) : step === "email" ? (
          <form className="form" onSubmit={requestCode}>
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
            <div className="field">
              <label htmlFor="fp-email">{t("auth.email")}</label>
              <input id="fp-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btnPrimary" style={{ width: "100%" }} disabled={loading}>
              {loading ? t("auth.wait") : t("auth.sendCode")}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={reset}>
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
            <div className="field">
              <label htmlFor="fp-otp">{t("auth.otpLabel")}</label>
              <input
                id="fp-otp"
                className="input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1.1rem" }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="fp-password">{t("auth.newPassword")}</label>
              <input id="fp-password" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <span className="hint">{t("auth.passwordHint")}</span>
            </div>
            <button type="submit" className="btn btnPrimary" style={{ width: "100%" }} disabled={loading || otp.length !== 6}>
              {loading ? t("auth.wait") : t("auth.resetButton")}
            </button>
          </form>
        )}

        <p className="cardFooter">
          <Link href="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </main>
  );
}
