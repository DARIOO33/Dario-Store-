"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { useT } from "@/src/i18n/client";

type Props = {
  mode: "login" | "register";
};

const RESEND_SECONDS = 30;

// Email + password, then a 6-digit code to prove the email is real. Register
// and login share this: an unverified account that tries to log in is sent
// straight to the code step too.
export default function EmailAuthForm({ mode }: Props) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // better-auth's own message when we don't know its code, or our fallback text.
  const authMessage = (failure: { code?: string; message?: string }, fallback: string) => {
    const known: Record<string, string> = t.messages.auth.codes;
    return (failure.code && known[failure.code]) || failure.message || fallback;
  };

  const goToCodeStep = (message: string) => {
    setStep("otp");
    setInfo(message);
    setError("");
    setOtp("");
    setCooldown(RESEND_SECONDS);
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(authMessage(signUpError, t("auth.signUpFailed")));
          return;
        }
        goToCodeStep(t("auth.sentCode", { email: email.trim() }));
        return;
      }

      const { error: signInError } = await authClient.signIn.email({ email: email.trim(), password });
      if (signInError?.code === "EMAIL_NOT_VERIFIED") {
        goToCodeStep(t("auth.notVerified", { email: email.trim() }));
        return;
      }
      if (signInError) {
        setError(authMessage(signInError, t("auth.invalidLogin")));
        return;
      }
      router.push("/success?type=login");
    } catch {
      setError(t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp });
      if (verifyError) {
        setError(authMessage(verifyError, t("auth.invalidCode")));
        return;
      }
      router.push(`/success?type=${mode === "register" ? "register" : "login"}`);
    } catch {
      setError(t("auth.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setCooldown(RESEND_SECONDS);
    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "email-verification",
      });
      if (resendError) {
        setError(authMessage(resendError, t("auth.resendFailed")));
        return;
      }
      setInfo(t("auth.sentNewCode", { email: email.trim() }));
    } catch {
      setError(t("auth.somethingWrong"));
    }
  };

  if (step === "otp") {
    return (
      <form className="form" onSubmit={handleVerify}>
        {info && <p className="hint" style={{ margin: 0 }}>{info}</p>}
        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

        <div className="field">
          <label htmlFor="auth-otp">{t("auth.otpLabel")}</label>
          <input
            id="auth-otp"
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1.1rem" }}
            required
          />
        </div>

        <button type="submit" className="btn btnPrimary" style={{ width: "100%" }} disabled={loading || otp.length !== 6}>
          {loading ? t("auth.verifying") : t("auth.verify")}
        </button>

        <p className="hint" style={{ margin: 0, textAlign: "center" }}>
          <button type="button" className="linkBtn" style={{ marginLeft: 0 }} onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
          </button>
          {" · "}
          <button type="button" className="linkBtn" style={{ marginLeft: 0 }} onClick={() => setStep("credentials")}>
            {t("auth.differentEmail")}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="form" onSubmit={handleCredentials}>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

      {mode === "register" && (
        <div className="field">
          <label htmlFor="auth-name">{t("auth.name")}</label>
          <input
            id="auth-name"
            className="input"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="auth-email">{t("auth.email")}</label>
        <input
          id="auth-email"
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="auth-password">{t("auth.password")}</label>
        <input
          id="auth-password"
          className="input"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === "register" && <span className="hint">{t("auth.passwordHint")}</span>}
      </div>

      <button type="submit" className="btn btnPrimary" style={{ width: "100%" }} disabled={loading}>
        {loading ? t("auth.wait") : mode === "register" ? t("auth.createAccount") : t("auth.logIn")}
      </button>
    </form>
  );
}
